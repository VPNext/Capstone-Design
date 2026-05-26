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

    # 2. 스크래핑
    scraped = scrape(article_url)
    if not scraped or not scraped.get("content"):
        raise ValueError("기사 본문을 가져올 수 없습니다.")

    title = scraped["title"]
    content = scraped["content"]
    source_name = get_source_from_url(article_url)

    # 3. 병렬 AI 분석 실행
    tasks = [
        async_analyze_credibility(title, content, source_name),
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
        difficult_terms = enrich(difficult_terms)

    # 5. DB 저장
    art = db.query(Article).filter(Article.url == article_url).first()
    if not art:
        art = Article(title=title, url=article_url)
        db.add(art)

    art.source    = source_name or art.source
    art.content   = content
    art.title     = title
    if scraped.get("image_url"):
        art.image_url = scraped["image_url"]

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
