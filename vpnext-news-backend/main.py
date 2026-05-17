"""
뉴스 정보 나침반 - FastAPI 백엔드
"""

import asyncio
import logging
import re
from datetime import datetime
from typing import Optional
import json
import os
import httpx

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from ai_analyzer import full_analysis, generate_comic_data
from article_scraper import scrape
from config import APP_HOST, APP_PORT
from database import Article, SessionLocal, get_db, init_db
from dictionary_api import enrich
from rss_crawler import crawl_all
import urllib.parse

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
                "ai_summary":        a.ai_summary,
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


# ─── 이미지 프리워밍 헬퍼 ────────────────────────────────────────────────────
# Pollinations는 첫 HTTP GET 요청 시 이미지를 생성하고 캐시합니다.
# 클라이언트가 로드하기 전에 백엔드에서 미리 요청을 보내 캐시를 채워두는 함수입니다.

async def _prewarm_pollinations_images(urls: list[str], news_id: int):
    """백그라운드에서 Pollinations 이미지 URL을 순차적으로 요청해 캐시를 생성합니다.

       병렬 요청 금지: Pollinations 무료 tier는 동시 요청 시 402 Payment Required를 반환합니다.
       반드시 순차 요청 + 요청 간 딜레이를 지켜야 합니다.
    """
    logger.info(f"[만화 #{news_id}] 이미지 생성 시작 ({len(urls)}장, 순차 처리)")

    async with httpx.AsyncClient() as client:
        for idx, url in enumerate(urls):
            if idx > 0:
                await asyncio.sleep(3)
            try:
                response = await client.get(url, timeout=120.0, follow_redirects=True)
                if response.status_code == 200:
                    size_kb = len(response.content) // 1024
                    logger.info(f"   [{idx+1}/{len(urls)}] 이미지생성 완료 ({size_kb}KB)")
                elif response.status_code == 402:
                    logger.warning(f"    [{idx+1}/{len(urls)}] 402 — 5초 후 재시도")
                    await asyncio.sleep(5)
                    retry = await client.get(url, timeout=120.0, follow_redirects=True)
                    if retry.status_code == 200:
                        size_kb = len(retry.content) // 1024
                        logger.info(f"   [{idx+1}/{len(urls)}] 재시도 성공 ({size_kb}KB)")
                    else:
                        logger.warning(f"   [{idx+1}/{len(urls)}] 재시도 실패 (HTTP {retry.status_code})")
                else:
                    logger.warning(f"    [{idx+1}/{len(urls)}] HTTP {response.status_code}")
            except httpx.TimeoutException:
                logger.warning(f"    [{idx+1}/{len(urls)}] 타임아웃")
            except Exception as e:
                logger.warning(f"   [{idx+1}/{len(urls)}] 실패: {e}")

    logger.info(f"[만화 #{news_id}] 이미지 생성 완료")


# 1. 만화 생성 API (상세 페이지에서 호출)
@app.post("/api/news/{news_id}/comic")
async def generate_comic(news_id: int, bg: BackgroundTasks, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == news_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="기사를 찾을 수 없습니다.")

    news_title = article.title or ""
    news_summary = article.ai_summary or ""
    news_content = article.content or article.summary or ""
    combined_body = (news_summary + "\n\n" + news_content).strip()
    news_body = combined_body[:1500] if combined_body else news_title

    try:
        comic_data, raw_urls = await generate_comic_data(news_id, news_title, news_body)
    except Exception as e:
        logger.error(f"만화 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="만화 시나리오 생성 중 오류가 발생했습니다.")

    # DB에 저장
    article.comic_script = json.dumps(comic_data, ensure_ascii=False)
    db.commit()

    bg.add_task(_prewarm_pollinations_images, raw_urls, news_id)
    # ─────────────────────────────────────────────────────────────────────────

    return {
        "message": "만화 생성 완료 (이미지 서버 준비 중, 약 30~60초 후 완성됩니다)",
        "comic_urls": comic_data,
        "prewarming": True,  
    }


# 2. 만화 모음집 조회 API (AI 만화 모음집 페이지에서 호출)
@app.get("/api/cartoons")
def get_cartoons(db: Session = Depends(get_db)):
    articles = (
        db.query(Article)
        .filter(Article.comic_script.isnot(None))
        .order_by(Article.published_at.desc())
        .all()
    )

    result = []
    for a in articles:
        try:
            urls = json.loads(a.comic_script)
            if urls:
                result.append({
                    "news_id":    a.id,
                    "title":      a.title,
                    "source":     a.source,
                    "summary":    a.ai_summary or a.summary or "",
                    "comic_urls": urls,
                    "published_at": a.published_at,
                })
        except Exception:
            continue

    return result


# ─── 헬스체크 ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=APP_HOST, port=APP_PORT, reload=True)