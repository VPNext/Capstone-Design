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

    ⚠️ 병렬 요청 금지: Pollinations 무료 tier는 동시 요청 시 402 Payment Required를 반환합니다.
       반드시 순차 요청 + 요청 간 딜레이를 지켜야 합니다.
    """
    logger.info(f"[만화 #{news_id}] 이미지 프리워밍 시작 ({len(urls)}장, 순차 처리)")

    async with httpx.AsyncClient() as client:
        for idx, url in enumerate(urls):
            if idx > 0:
                await asyncio.sleep(3)
            try:
                response = await client.get(url, timeout=120.0, follow_redirects=True)
                if response.status_code == 200:
                    size_kb = len(response.content) // 1024
                    logger.info(f"  ✅ [{idx+1}/{len(urls)}] 프리워밍 완료 ({size_kb}KB)")
                elif response.status_code == 402:
                    logger.warning(f"  ⚠️  [{idx+1}/{len(urls)}] 402 — 5초 후 재시도")
                    await asyncio.sleep(5)
                    retry = await client.get(url, timeout=120.0, follow_redirects=True)
                    if retry.status_code == 200:
                        size_kb = len(retry.content) // 1024
                        logger.info(f"  ✅ [{idx+1}/{len(urls)}] 재시도 성공 ({size_kb}KB)")
                    else:
                        logger.warning(f"  ❌ [{idx+1}/{len(urls)}] 재시도 실패 (HTTP {retry.status_code})")
                else:
                    logger.warning(f"  ⚠️  [{idx+1}/{len(urls)}] HTTP {response.status_code}")
            except httpx.TimeoutException:
                logger.warning(f"  ⏱️  [{idx+1}/{len(urls)}] 타임아웃")
            except Exception as e:
                logger.warning(f"  ❌ [{idx+1}/{len(urls)}] 실패: {e}")

    logger.info(f"[만화 #{news_id}] 이미지 프리워밍 완료")


# 1. 만화 생성 API (상세 페이지에서 호출)
@app.post("/api/news/{news_id}/comic")
async def generate_comic(news_id: int, bg: BackgroundTasks, db: Session = Depends(get_db)):
    article = db.query(Article).filter(Article.id == news_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="기사를 찾을 수 없습니다.")

    from config import GROQ_API_KEY
    groq_api_key = os.getenv("GROQ_API_KEY", GROQ_API_KEY)

    # ── 뉴스 컨텍스트 최대한 확보 ─────────────────────────────────────────
    news_title = article.title or ""
    # ai_summary + content 모두 활용해 LLM이 뉴스를 깊이 이해하도록 함
    news_summary = article.ai_summary or ""
    news_content = article.content or article.summary or ""
    # summary + content 합쳐서 최대 1500자 (토큰 절약 + 풍부한 맥락)
    combined_body = (news_summary + "\n\n" + news_content).strip()
    news_body = combined_body[:1500] if combined_body else news_title

    # ─────────────────────────────────────────────────────────────────────
    # [1단계] 뉴스 분석: LLM이 먼저 뉴스를 구조적으로 파악하게 합니다.
    # 바로 프롬프트를 생성하면 generic해지는 문제를 방지합니다.
    # ─────────────────────────────────────────────────────────────────────
    analysis_prompt = f"""아래 뉴스를 읽고, 만화로 표현하기 위해 필요한 핵심 정보를 JSON으로 추출하세요.

[뉴스 제목]: {news_title}
[뉴스 내용]: {news_body}

다음 JSON 형식으로만 답하세요 (다른 말 금지):
{{
  "category": "뉴스 분야 (정치/경제/사회/국제/스포츠/연예/과학기술 중 하나)",
  "main_actors": ["주요 인물 또는 기관 1", "주요 인물 또는 기관 2"],
  "location": "주요 배경 장소 (예: 국회의사당, 법원, 주식시장, 전쟁터, 서울 시내 등)",
  "core_event": "핵심 사건을 한 문장으로 (무엇이 일어났나)",
  "cause": "사건의 원인 또는 배경",
  "consequence": "결과 또는 파장",
  "emotion": "이 뉴스의 전반적 감정/분위기 (예: 충격, 긴장, 희망, 분노, 유머 등)",
  "visual_keywords": ["시각적으로 표현할 수 있는 키워드 1", "키워드 2", "키워드 3"]
}}"""

    try:
        async with httpx.AsyncClient() as client:
            analysis_response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_api_key}"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": analysis_prompt}],
                    "temperature": 0.3,   # 분석은 정확해야 하므로 낮은 temperature
                    "max_tokens": 600,
                },
                timeout=20.0,
            )
            analysis_response.raise_for_status()
        
        raw_analysis = analysis_response.json()["choices"][0]["message"]["content"]
        clean_analysis = re.sub(r"```(?:json)?", "", raw_analysis).replace("```", "").strip()
        news_analysis = json.loads(clean_analysis)
        logger.info(f"[만화 #{news_id}] 뉴스 분석 완료: {news_analysis.get('category')} / {news_analysis.get('core_event', '')[:40]}")

    except Exception as e:
        logger.warning(f"뉴스 분석 실패, 기본 분석으로 진행: {e}")
        news_analysis = {
            "category": "일반",
            "main_actors": [],
            "location": "Korea",
            "core_event": news_title,
            "cause": "",
            "consequence": "",
            "emotion": "neutral",
            "visual_keywords": [],
        }

    # ─────────────────────────────────────────────────────────────────────
    # [2단계] 만화 시나리오 생성: 분석 결과를 바탕으로 구체적인 프롬프트 생성
    # ─────────────────────────────────────────────────────────────────────
    category        = news_analysis.get("category", "일반")
    main_actors     = ", ".join(news_analysis.get("main_actors", [])) or "관련 인물들"
    location        = news_analysis.get("location", "Korea")
    core_event      = news_analysis.get("core_event", news_title)
    cause           = news_analysis.get("cause", "")
    consequence     = news_analysis.get("consequence", "")
    emotion         = news_analysis.get("emotion", "neutral")
    visual_keywords = ", ".join(news_analysis.get("visual_keywords", []))

    # 카테고리별 배경/스타일 힌트 (이미지 품질 향상)
    category_hints = {
        "정치":   "government building interior, politicians in suits, parliament hall, voting scene",
        "경제":   "stock market trading floor, financial charts on screens, businesspeople in boardroom",
        "사회":   "Korean city street, diverse citizens, public space, everyday life scene",
        "국제":   "international meeting room, world map, diplomats shaking hands, foreign country setting",
        "스포츠": "sports stadium, athletes in action, cheering crowd, competition scene",
        "연예":   "entertainment stage, spotlights, fans cheering, media press conference",
        "과학기술": "modern laboratory, tech office, computers and robots, futuristic setting",
    }
    bg_hint = category_hints.get(category, "Korean urban setting, realistic background")

    comic_prompt = f"""당신은 세계 최고의 웹툰 작가입니다. 아래 뉴스 분석 결과를 바탕으로 4컷 만화 시나리오를 만드세요.

━━━ 뉴스 분석 결과 ━━━
- 분야: {category}
- 핵심 사건: {core_event}
- 주요 인물/기관: {main_actors}
- 주요 배경: {location}
- 원인: {cause}
- 결과/파장: {consequence}
- 감정/분위기: {emotion}
- 시각 키워드: {visual_keywords}
- 원본 뉴스 제목: {news_title}
━━━━━━━━━━━━━━━━━━━━━━

🎨 [4컷 구성 - 기승전결]
1컷(기): {cause or core_event}가 시작되는 장면
2컷(승): 사건이 전개되며 {main_actors}가 반응하는 장면
3컷(전): 가장 극적인 순간 — 핵심 충돌 또는 반전
4컷(결): {consequence or "결말"} — 교훈 또는 여운

━━━━━━━━━━━━━━━━━━━━━━
🖼️ [이미지 프롬프트 작성 규칙]
━━━━━━━━━━━━━━━━━━━━━━
① 배경 힌트(필수 반영): {bg_hint}
② 주요 인물을 영어로 외모/행동과 함께 구체적으로 묘사하세요.
   예) "middle-aged Korean male politician in navy suit, pointing finger aggressively at podium microphone"
   예) "group of Korean workers in hard hats, looking worried at factory machinery shutting down"
③ 배경, 인물, 행동이 모두 담긴 하나의 완성된 장면을 묘사하세요.
④ 각 prompt 마지막에 반드시 이것을 그대로 붙이세요:
   ", korean webtoon style, 2D comic illustration, expressive cartoon characters with visible emotions, bold black outlines, flat cel-shading colors, dynamic composition, cinematic comic panel"

━━━━━━━━━━━━━━━━━━━━━━
💬 [한글 캡션 작성 규칙]
━━━━━━━━━━━━━━━━━━━━━━
① 반드시 100% 순수 한글만 사용 (영어 단자 하나도 금지)
② 뉴스의 실제 상황을 반영한 구체적인 대사나 나레이션
③ 25자 이내, 임팩트 있고 공감 가는 문장
④ 4컷 캡션을 순서대로 읽으면 뉴스 전체 흐름이 이해되어야 함

━━━━━━━━━━━━━━━━━━━━━━
📌 출력 형식 — JSON 배열만, 절대 다른 말 금지
━━━━━━━━━━━━━━━━━━━━━━
[
  {{"prompt": "...", "caption": "..."}},
  {{"prompt": "...", "caption": "..."}},
  {{"prompt": "...", "caption": "..."}},
  {{"prompt": "...", "caption": "..."}}
]"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_api_key}"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": comic_prompt}],
                    "temperature": 0.8,
                    "max_tokens": 1800,
                },
                timeout=25.0,
            )
            response.raise_for_status()

        raw_content = response.json()["choices"][0]["message"]["content"]
        clean_json = re.sub(r"```(?:json)?", "", raw_content).replace("```", "").strip()
        scenes = json.loads(clean_json)

    except Exception as e:
        logger.error(f"만화 시나리오 생성/파싱 실패: {e}")
        raise HTTPException(status_code=500, detail="만화 시나리오 생성 중 오류가 발생했습니다.")

    # Pollinations URL 생성
    comic_data = []
    raw_urls = []  # 프리워밍용 순수 URL 목록

    for idx, scene in enumerate(scenes[:4]):
        prompt_text = scene.get("prompt", "korean webtoon style comic illustration")
        encoded_prompt = urllib.parse.quote(prompt_text)

        # ─── URL 파라미터 설명 ───────────────────────────────────────────────
        # width=1024, height=512 : 가로 비율 (만화 컷에 적합)
        # model=flux             : Pollinations의 최고 품질 모델
        # nologo=true            : 워터마크 제거
        # seed                   : 같은 기사의 같은 컷은 항상 동일한 이미지 생성 (재현성)
        # ────────────────────────────────────────────────────────────────────
        seed_value = news_id * 100 + idx
        url = (
            f"https://image.pollinations.ai/prompt/{encoded_prompt}"
            f"?model=flux&width=1024&height=512&nologo=true&seed={seed_value}"
        )

        comic_data.append({"url": url, "caption": scene.get("caption", f"Scene {idx + 1}")})
        raw_urls.append(url)

    # DB에 저장
    article.comic_script = json.dumps(comic_data, ensure_ascii=False)
    db.commit()

    # ─── [핵심 수정] 백그라운드에서 이미지 프리워밍 시작 ────────────────────────
    # Pollinations는 첫 GET 요청 시 이미지를 생성합니다.
    # 클라이언트가 페이지를 열기 전에 백엔드에서 미리 요청해 캐시를 채웁니다.
    bg.add_task(_prewarm_pollinations_images, raw_urls, news_id)
    # ─────────────────────────────────────────────────────────────────────────

    return {
        "message": "만화 생성 완료 (이미지 서버 준비 중, 약 30~60초 후 완성됩니다)",
        "comic_urls": comic_data,
        "prewarming": True,  # 프론트엔드에서 이 플래그를 보고 로딩 UI를 표시할 수 있습니다
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