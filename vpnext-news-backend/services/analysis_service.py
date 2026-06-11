import asyncio
import logging
from typing import Dict, Optional, Any
from ai_analyzer import (
    analyze_credibility,
    extract_persons,
    extract_terms
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
                "tags":      cached_art.tags or [],
            },
            "key_persons":     cached_art.key_persons or [],
            "difficult_terms": cached_art.difficult_terms or [],
            "comic_script":    cached_art.comic_script,
            "views":           cached_art.views or 0,
        }

    # 2. 스크래핑 및 폴백 예외 처리 (안정성 보장)
    scraped = await asyncio.to_thread(scrape, article_url)
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

    # SBS 기사 중 본문 내용이 너무 빈약하거나 동영상 전용인 경우 제외 처리
    if source_name == "SBS" and len(content.strip()) < 150:
        raise ValueError("SBS 동영상 전용 기사 또는 본문 내용이 빈약한 기사는 AI 분석 대상에서 제외됩니다.")

    # 3. 과거 유사 기사 검색 (비교 분석용)
    import re
    from datetime import datetime, timedelta
    related_arts = []
    is_old_article = False
    
    # 기사 발행일 확인 (1년 이상된 기사인지 체크)
    if title:
        # 흔한 일반 명사(불용어) 정의
        STOPWORDS = {
            "대통령", "정부", "국민", "의원", "의혹", "논란", "뉴스", "오늘", "속보", 
            "선거", "후보", "시장", "경찰", "수사", "검찰", "대표", "회장", "사건", 
            "사고", "결과", "기사", "보도", "발표", "출신", "공개", "주장", "지적", 
            "우려", "논란이", "대해", "위해", "기자", "밝혀", "때문", "관련"
        }
        
        # 1. 2글자 이상의 한글/영문/숫자 키워드 추출 후 불용어 필터링
        keywords = [w for w in re.findall(r'[가-힣A-Za-z0-9]+', title) if len(w) >= 2 and w not in STOPWORDS]
        # 만약 필터링 후 남은 키워드가 없으면 불용어 필터를 해제하여 검색 시도
        if not keywords:
            keywords = [w for w in re.findall(r'[가-힣A-Za-z0-9]+', title) if len(w) >= 2]
            
        search_query = db.query(Article).filter(Article.url != article_url)
        if keywords:
            from sqlalchemy import or_
            # 상위 최대 5개 키워드 중 하나라도 포함된 후보 기사 100건 수집
            filters = [Article.title.like(f"%{kw}%") for kw in keywords[:5]]
            candidates = search_query.filter(or_(*filters)).order_by(Article.created_at.desc()).limit(100).all()
            
            # 2. 파이썬에서 정밀 키워드 매칭 비율 검증
            similar_from_db = []
            for sa in candidates:
                # 후보 기사 제목에서 일치하는 키워드 수 계산
                matched = sum(1 for kw in keywords if kw in sa.title)
                # 키워드가 3개 이상일 경우 최소 2개 이상, 1~2개일 경우 최소 1개 이상 일치 조건 부여
                required_match = 2 if len(keywords) >= 3 else 1
                if matched >= required_match:
                    similar_from_db.append(sa)
                    if len(similar_from_db) >= 7:
                        break
            
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
        analyze_credibility(title, content, source_name, related_arts, is_old_article),
        extract_persons(title, content),
        extract_terms(content)
    ]

    results = await asyncio.gather(*tasks)
    
    credibility = results[0]
    key_persons = results[1]
    difficult_terms = results[2]
    comic_script = None  # 최초 분석 시에는 만화 텍스트 스크립트 생성을 제외 (프론트 요청 시 요약본 기준 온디맨드로 생성)

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
    art.tags               = credibility.get("tags", [])
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
        "comic_script": comic_script,
        "views": art.views or 0
    }
