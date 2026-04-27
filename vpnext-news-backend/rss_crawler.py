"""
RSS 피드 크롤러
feedparser 로 XML을 파싱 → 기사 메타데이터(제목/URL/요약/발행일) 반환
"""

import time
import logging
import requests
from datetime import datetime
from typing import Dict, List, Optional

import feedparser
from config import RSS_FEEDS, REQUEST_DELAY, USER_AGENT, REQUEST_TIMEOUT

logger = logging.getLogger(__name__)


def _parse_date(entry) -> Optional[datetime]:
    for attr in ("published_parsed", "updated_parsed"):
        val = getattr(entry, attr, None)
        if val:
            try:
                return datetime(*val[:6])
            except Exception:
                pass
    return datetime.now()


def crawl_feed(name: str, url: str) -> List[Dict]:
    articles = []
    try:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT)
        resp.encoding = "utf-8"  # 강제 UTF-8
        feed = feedparser.parse(resp.content)

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
    """전체 RSS 수집 + 중복 URL 제거"""
    if feeds is None:
        feeds = RSS_FEEDS

    all_articles: List[Dict] = []
    for name, url in feeds.items():
        all_articles.extend(crawl_feed(name, url))
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
