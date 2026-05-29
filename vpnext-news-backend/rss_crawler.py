"""
RSS 피드 크롤러
feedparser 로 XML을 파싱 → 기사 메타데이터(제목/URL/요약/발행일) 반환
"""

import time
import logging
import re
import requests
from datetime import datetime
from typing import Dict, List, Optional

import feedparser
from config import (
    RSS_FEEDS, REQUEST_DELAY, USER_AGENT, REQUEST_TIMEOUT,
    NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_SEARCH_KEYWORDS
)

logger = logging.getLogger(__name__)


def _parse_date(entry) -> Optional[datetime]:
    # feedparser용 날짜 파싱
    for attr in ("published_parsed", "updated_parsed"):
        val = getattr(entry, attr, None)
        if val:
            try:
                return datetime(*val[:6])
            except Exception:
                pass
    return datetime.now()


def _parse_naver_date(date_str: str) -> datetime:
    # 네이버 API 날짜 형식 파싱: "Tue, 28 May 2024 15:00:00 +0900"
    try:
        return datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S +0900")
    except Exception:
        return datetime.now()


def fetch_naver_news(keyword: str) -> List[Dict]:
    """네이버 검색 API를 통해 뉴스 수집"""
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        logger.warning("네이버 API 키가 설정되지 않았습니다.")
        return []

    url = "https://openapi.naver.com/v1/search/news.json"
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    }
    params = {
        "query": keyword,
        "display": 20,
        "sort": "sim",  # 'sim' (유사도) 또는 'date' (날짜순)
    }

    try:
        resp = requests.get(url, headers=headers, params=params, timeout=REQUEST_TIMEOUT)
        if resp.status_code != 200:
            logger.error(f"[naver_{keyword}] API 호출 실패 ({resp.status_code})")
            return []

        data = resp.json()
        articles = []
        for item in data.get("items", []):
            # HTML 태그 제거
            title = re.sub(r"<[^>]+>", "", item["title"])
            summary = re.sub(r"<[^>]+>", "", item["description"])
            
            articles.append({
                "source": f"naver_{keyword}",
                "title": title,
                "url": item["link"],
                "summary": summary,
                "published_at": _parse_naver_date(item["pubDate"]),
            })
        logger.info(f"[naver_{keyword}] {len(articles)}건 수집 (API)")
        return articles
    except Exception as e:
        logger.error(f"[naver_{keyword}] API 수집 실패: {e}")
        return []


def crawl_feed(name: str, url: str) -> List[Dict]:
    articles = []
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT)
        resp.encoding = "utf-8"  # 강제 UTF-8
        feed = feedparser.parse(resp.text)

        if feed.bozo:
            logger.warning(f"[{name}] RSS 파싱 경고: {feed.bozo_exception}")

        for entry in feed.entries:
            title = getattr(entry, "title", "").strip()
            link  = getattr(entry, "link",  "").strip()
            if not title or not link:
                continue
            articles.append({
                "source":       name,
                "title":        title,
                "url":          link,
                "summary":      getattr(entry, "summary", "").strip(),
                "published_at": _parse_date(entry),
            })

        logger.info(f"[{name}] {len(articles)}건 수집")
    except Exception as e:
        logger.error(f"[{name}] 크롤링 실패: {e}")
    return articles


def crawl_all(feeds: Dict[str, str] = None) -> List[Dict]:
    """전체 RSS 수집 + 네이버 API 수집 + 중복 URL 제거"""
    if feeds is None:
        feeds = RSS_FEEDS

    all_articles: List[Dict] = []
    
    # 1. 기존 RSS 수집
    for name, url in feeds.items():
        all_articles.extend(crawl_feed(name, url))
        time.sleep(REQUEST_DELAY)
    
    # 2. 네이버 뉴스 API 수집
    for keyword in NAVER_SEARCH_KEYWORDS:
        all_articles.extend(fetch_naver_news(keyword))
        time.sleep(REQUEST_DELAY)

    seen: set = set()
    unique = []
    for a in all_articles:
        if a["url"] not in seen:
            seen.add(a["url"])
            unique.append(a)

    logger.info(f"전체 수집 완료: {len(unique)}건 (중복 제거 후)")
    return unique


if __name__ == "__main__":
    items = crawl_all()
    for i in items[:5]:
        print(f"[{i['source']}] {i['title']}")
        print(f"  {i['url']}")
