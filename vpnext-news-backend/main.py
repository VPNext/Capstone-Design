"""
뉴스 정보 나침반 - FastAPI 백엔드
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from ai_analyzer import full_analysis
from article_scraper import scrape
from config import APP_HOST, APP_PORT
from database import Article, SessionLocal, get_db, init_db
from dictionary_api import enrich
from rss_crawler import crawl_all

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="뉴스 정보 나침반 API",
    description="허위뉴스 판별 + 뉴스 이해도 향상 서비스 (VPNext / 팀4)",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()
    logger.info("DB 초기화 완료")


# ─── 수집 ────────────────────────────────────────────────────────────────────

def _crawl_and_save():
    db = SessionLocal()
    try:
        articles = crawl_all()
        saved = 0
        for a in articles:
            if not db.query(Article).filter(Article.url == a["url"]).first():
                db.add(Article(**a))
                saved += 1
        db.commit()
        logger.info(f"크롤링 완료: {saved}건 저장")
    except Exception as e:
        logger.error(f"크롤링 저장 오류: {e}")
        db.rollback()
    finally:
        db.close()


@app.post("/api/crawl", summary="RSS 크롤링 즉시 실행")
async def trigger_crawl(bg: BackgroundTasks):
    bg.add_task(_crawl_and_save)
    return {"message": "백그라운드 크롤링 시작"}


# ─── 조회 ────────────────────────────────────────────────────────────────────

@app.get("/api/news", summary="뉴스 목록")
def list_news(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    source: Optional[str] = None,
    keyword: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Article).order_by(Article.published_at.desc())
    if source:
        q = q.filter(Article.source.contains(source))
    if keyword:
        q = q.filter(Article.title.contains(keyword))
    total    = q.count()
    articles = q.offset((page - 1) * size).limit(size).all()
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [
            {
                "id":                a.id,
                "title":             a.title,
                "url":               a.url,
                "source":            a.source,
                "summary":           a.summary,
                "ai_summary":        a.ai_summary,   # ← 추가: AI 3줄 요약
                "image_url":         a.image_url,
                "published_at":      a.published_at,
                "credibility_score": a.credibility_score,
                "credibility_label": a.credibility_label,
                "is_analyzed":       a.is_analyzed,
            }
            for a in articles
        ],
    }


@app.get("/api/news/{article_id}", summary="뉴스 상세")
def get_news(article_id: int, db: Session = Depends(get_db)):
    a = db.query(Article).filter(Article.id == article_id).first()
    if not a:
        raise HTTPException(404, "기사를 찾을 수 없습니다.")
    return {
        "id":                  a.id,
        "title":               a.title,
        "url":                 a.url,
        "source":              a.source,
        "summary":             a.summary,
        "content":             a.content,
        "image_url":           a.image_url,
        "published_at":        a.published_at,
        "created_at":          a.created_at,
        "credibility_score":   a.credibility_score,
        "credibility_label":   a.credibility_label,
        "credibility_reason":  a.credibility_reason,
        "red_flags":           a.red_flags,
        "ai_summary":          a.ai_summary,
        "key_persons":         a.key_persons,
        "difficult_terms":     a.difficult_terms,
        "comic_script":        a.comic_script,
        "is_analyzed":         a.is_analyzed,
    }


# ─── AI 분석 ─────────────────────────────────────────────────────────────────

@app.post("/api/analyze", summary="기사 AI 분석")
async def analyze(
    article_url: str,
    include_comic: bool = False,
    db: Session = Depends(get_db),
):
    cached_art = db.query(Article).filter(
        Article.url == article_url,
        Article.is_analyzed == True,
    ).first()
    if cached_art:
        return {
            "cached": True,
            "credibility": {
                "score":     cached_art.credibility_score,
                "label":     cached_art.credibility_label,
                "reason":    cached_art.credibility_reason,
                "red_flags": cached_art.red_flags or [],
                "summary":   cached_art.ai_summary or "",
            },
            "key_persons":     cached_art.key_persons or [],
            "difficult_terms": cached_art.difficult_terms or [],
            "comic_script":    cached_art.comic_script,
        }

    scraped = scrape(article_url)
    if not scraped or not scraped.get("content"):
        raise HTTPException(422, "기사 본문을 가져올 수 없습니다. 해당 언론사 사이트에서 직접 확인해 주세요.")

    analysis = full_analysis(scraped["title"], scraped["content"], include_comic)

    if analysis.get("difficult_terms"):
        analysis["difficult_terms"] = enrich(analysis["difficult_terms"])

    art = db.query(Article).filter(Article.url == article_url).first()
    if not art:
        art = Article(title=scraped["title"], url=article_url)
        db.add(art)

    art.content   = scraped.get("content", art.content)
    art.title     = scraped.get("title") or art.title
    if scraped.get("image_url"):
        art.image_url = scraped["image_url"]

    cred = analysis.get("credibility", {})
    art.credibility_score  = cred.get("score")
    art.credibility_label  = cred.get("label")
    art.credibility_reason = cred.get("reason")
    art.red_flags          = cred.get("red_flags", [])
    art.ai_summary         = cred.get("summary")
    art.key_persons        = analysis.get("key_persons", [])
    art.difficult_terms    = analysis.get("difficult_terms", [])
    art.comic_script       = analysis.get("comic_script")
    art.is_analyzed        = True
    db.commit()

    return {"cached": False, **analysis}


# ─── 검색 ─────────────────────────────────────────────────────────────────────

@app.get("/api/search", summary="뉴스 검색")
def search(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Article)
        .filter(Article.title.contains(q) | Article.content.contains(q))
        .order_by(Article.published_at.desc())
    )
    total    = query.count()
    articles = query.offset((page - 1) * size).limit(size).all()
    return {
        "query": q,
        "total": total,
        "page":  page,
        "items": [
            {
                "id":                a.id,
                "title":             a.title,
                "source":            a.source,
                "url":               a.url,
                "published_at":      a.published_at,
                "credibility_label": a.credibility_label,
                "image_url":         a.image_url,
            }
            for a in articles
        ],
    }


# ─── 헬스체크 ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=APP_HOST, port=APP_PORT, reload=True)
