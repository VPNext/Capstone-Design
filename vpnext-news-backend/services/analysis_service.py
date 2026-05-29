import asyncio
import logging
from typing import Dict, Optional, Any
from ai_analyzer import (
    async_analyze_credibility,
    async_extract_persons,
    async_extract_terms,
    async_generate_comic_script
)
from dictionary_api import enrich
from article_scraper import scrape, get_source_from_url
from database import Article
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

async def run_full_analysis(
    article_url: str,
    include_comic: bool,
    db: Session
) -> Dict[str, Any]:
    """
    기사 분석을 병렬로 실행하고 DB에 저장합니다.
    """
    # 1. 기존 분석 데이터 확인 (캐시)
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

    # 2. 스크래핑 및 폴백 예외 처리 (안정성 보장)
    scraped = scrape(article_url)
    title = ""
    content = ""
    image_url = None
    
    # DB에 기존 적재된 정보 조회 (폴백 대조용)
    existing_art = db.query(Article).filter(Article.url == article_url).first()
    
    if scraped and scraped.get("content") and len(scraped["content"].strip()) > 100:
        title = scraped["title"] or (existing_art.title if existing_art else "제목 없음")
        content = scraped["content"]
        image_url = scraped.get("image_url")
    else:
        # 스크래핑 실패 시 폴백 처리 (외부 언론사 차단 방어)
        logger.warning(f"기사 본문 스크래핑 실패 ({article_url}). 기존 수집 요약본으로 분석을 지속합니다.")
        if existing_art:
            title = existing_art.title
            content = existing_art.summary if existing_art.summary else f"본문 크롤링이 불가능한 기사입니다. 제목인 '{title}'을 기준으로 신뢰도를 판별해 주세요."
            image_url = existing_art.image_url
        else:
            title = "기사 제목 없음"
            content = "기사 본문 스크래핑 실패로 인한 분석 데이터 부재"

    source_name = get_source_from_url(article_url)

    # 3. 과거 유사 기사 검색 (비교 분석용)
    import re
    from datetime import datetime, timedelta
    related_arts = []
    is_old_article = False
    
    # 기사 발행일 확인 (1년 이상된 기사인지 체크)
    # scraped 데이터에 날짜 정보가 없으면 DB의 created_at 활용
    art_date = None
    # 만약 scraped에 날짜 정보가 있다면 활용 (현재는 없으므로 DB 필드 등 고려)
    # 여기서는 간단히 DB에 저장된 시간 또는 현재 시간 기준으로 시뮬레이션
    
    if title:
        keywords = [w for w in re.findall(r'[가-힣A-Za-z0-9]+', title) if len(w) >= 2]
        
        search_query = db.query(Article).filter(Article.url != article_url)
        if keywords:
            from sqlalchemy import or_
            filters = [Article.title.like(f"%{kw}%") for kw in keywords[:3]]
            # 최소 5개 이상 교차 분석을 위해 limit을 7로 상향
            similar_from_db = search_query.filter(or_(*filters)).order_by(Article.created_at.desc()).limit(7).all()
            
            for sa in similar_from_db:
                related_arts.append({
                    "title": sa.title,
                    "source": sa.source,
                    "url": sa.url,
                    "summary": sa.ai_summary or sa.summary or ""
                })
        
        logger.info(f"교차 분석용 기사 검색 완료: {len(related_arts)}건 발견")

    # 4. 병렬 AI 분석 실행
    tasks = [
        async_analyze_credibility(title, content, source_name, related_arts, is_old_article),
        async_extract_persons(title, content),
        async_extract_terms(content)
    ]
    
    if include_comic:
        tasks.append(async_generate_comic_script(title, content))

    results = await asyncio.gather(*tasks)
    
    credibility = results[0]
    key_persons = results[1]
    difficult_terms = results[2]
    comic_script = results[3] if include_comic else None

    # 4. 어려운 용어 보완 (사전 링크 등)
    if difficult_terms:
        difficult_terms = await enrich(difficult_terms)

    # 5. DB 저장
    art = db.query(Article).filter(Article.url == article_url).first()
    if not art:
        art = Article(title=title, url=article_url)
        db.add(art)

    art.source    = source_name or art.source
    art.content   = content
    art.title     = title
    if image_url:
        art.image_url = image_url

    art.credibility_score  = credibility.get("score")
    art.credibility_label  = credibility.get("label")
    art.credibility_reason = credibility.get("reason")
    art.red_flags          = credibility.get("red_flags", [])
    art.ai_summary         = credibility.get("summary")
    art.key_persons        = key_persons
    art.difficult_terms    = difficult_terms
    art.comic_script       = comic_script
    art.is_analyzed        = True
    
    db.commit()

    return {
        "cached": False,
        "credibility": credibility,
        "key_persons": key_persons,
        "difficult_terms": difficult_terms,
        "comic_script": comic_script
    }
