"""
뉴스 정보 나침반 - FastAPI 백엔드
"""

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

from ai_analyzer import full_analysis
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

# 1. 만화 생성 API (상세 페이지에서 호출)
@app.post("/api/news/{news_id}/comic")
async def generate_comic(news_id: int, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == news_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="기사를 찾을 수 없습니다.")

    # 1. 뉴스 텍스트 준비
    news_content = article.ai_summary if article.ai_summary else article.title

    # 2. Groq API를 통해 4컷 만화 시나리오 JSON으로 받기
    from config import GROQ_API_KEY
    groq_api_key = os.getenv("GROQ_API_KEY", GROQ_API_KEY)
    
    system_prompt = """
    당신은 기발하고 핵심을 잘 짚는 웹툰 작가입니다. 
    제공된 뉴스 기사 요약을 읽고, 내용을 4컷 만화(Comic Strip)로 구성해주세요.
    
    [🔥 매우 중요한 화풍 및 연출 지침 🔥]
    1. 뉴스 본문에 등장하는 '핵심 고유명사(인물, 브랜드, 동물, 특정 사물 등)'를 반드시 영어 prompt에 직접 포함하세요. 
       (예: 포켓몬 기사면 Pikachu, 회사 기사면 office workers, 정치 기사면 politician in suit 등)
    2. 추상적이거나 배경만 있는 그림은 절대 금지합니다. '누가, 어디서, 무엇을 하고 있는지' 구체적인 행동을 묘사하세요.
    3. 모든 prompt의 끝에는 반드시 다음 화풍 지정 문구를 똑같이 복사해서 넣으세요:
       ", korean webtoon style, 2D comic illustration, expressive characters, bold outlines, flat colors, comic panel"
    4. 4컷의 내용이 하나의 만화 스토리처럼 기승전결로 이어져야 합니다.
    
    반드시 아래 JSON 배열 형식으로만 응답해야 합니다. (다른 말은 절대 금지)
    [
      {
        "prompt": "[핵심 고유명사가 포함된 구체적인 영어 묘사 + 지정된 화풍 문구]",
        "caption": "[만화 컷 하단에 들어갈 재미있고 직관적인 한글 대사 또는 설명]"
      },
      ... (총 4개)
    ]
    """

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_api_key}"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"뉴스 내용:\n{news_content}"}
                    ],
                    "temperature": 0.7
                },
                timeout=15.0
            )
            response.raise_for_status()
            
        content = response.json()["choices"][0]["message"]["content"]
        # 마크다운 백틱(```json)이 붙어올 수 있으므로 제거
        clean_json = content.replace("```json", "").replace("```", "").strip()
        scenes = json.loads(clean_json)
    except Exception as e:
        logger.error(f"만화 시나리오 생성/파싱 실패: {e}")
        raise HTTPException(status_code=500, detail="만화 시나리오 생성 중 오류가 발생했습니다.")

    comic_data = []
    for idx, scene in enumerate(scenes[:4]): # 안전을 위해 최대 4컷으로 제한
        encoded_prompt = urllib.parse.quote(scene.get("prompt", "comic book illustration"))
        # 가로 비율을 위해 width=1024, height=512 적용
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?model=flux&width=1024&height=512&nologo=true&seed={news_id}{idx}"
        
        # URL과 자막을 함께 묶어서 저장
        comic_data.append({
            "url": url,
            "caption": scene["caption"]
        })

    # DB에 JSON 문자열로 저장
    article.comic_script = json.dumps(comic_data)
    db.commit()

    return {"message": "만화 생성 완료", "comic_urls": comic_data}

# 2. 만화 모음집 조회 API (AI 만화 모음집 페이지에서 호출)
@app.get("/api/cartoons")
def get_cartoons(db: Session = Depends(get_db)):
    # comic_script가 존재하는(만화가 생성된) 기사만 최신순으로 가져오기
    articles = db.query(Article).filter(Article.comic_script.isnot(None)).order_by(Article.published_at.desc()).all()
    
    result = []
    for a in articles:
        try:
            urls = json.loads(a.comic_script)
            if urls:
                result.append({
                    "news_id": a.id,
                    "title": a.title,
                    "comic_urls": urls,
                    "published_at": a.published_at
                })
        except:
            continue
            
    return result


# ─── 헬스체크 ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=APP_HOST, port=APP_PORT, reload=True)
