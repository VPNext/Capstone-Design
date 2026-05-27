"""
RSS 피드 크롤러 및 네이버 뉴스 검색 API 연동 모듈
- feedparser 로 XML을 파싱 → 기사 메타데이터(제목/URL/요약/발행일) 반환 (인코딩 자동 감지 적용)
- 네이버 뉴스 검색 API를 연동하여 기사를 추가 수집 및 출처 역매핑 분류
"""

import time
import logging
import requests
import html
import re
import urllib.parse
import email.utils
from datetime import datetime
from typing import Dict, List, Optional

import feedparser
from config import (
    RSS_FEEDS, REQUEST_DELAY, USER_AGENT, REQUEST_TIMEOUT,
    NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
)

logger = logging.getLogger(__name__)


def convert_naver_pc_to_mobile(url: str) -> str:
    """네이버 PC 뉴스 URL을 모바일 뉴스 URL로 변환하여 안정적인 스크래핑을 지원"""
    if "news.naver.com" in url and ("oid=" in url and "aid=" in url):
        try:
            # 쿼리 파라미터 파싱
            parsed_url = urllib.parse.urlparse(url)
            params = urllib.parse.parse_qs(parsed_url.query)
            oid = params.get("oid", [""])[0]
            aid = params.get("aid", [""])[0]
            if oid and aid:
                return f"https://n.news.naver.com/mnews/article/{oid}/{aid}"
        except Exception as e:
            logger.warning(f"네이버 PC URL 모바일 변환 실패 ({url}): {e}")
    return url


def extract_rss_image(entry) -> Optional[str]:
    """feedparser entry 요소들로부터 기사 이미지 URL 추출"""
    # 1. media_content
    if hasattr(entry, "media_content"):
        for m in entry.media_content:
            if m.get("url") and "image" in m.get("type", "image"):
                return m["url"]
    # 2. enclosures
    if hasattr(entry, "enclosures"):
        for e in entry.enclosures:
            if e.get("url") and "image" in e.get("type", "image"):
                return e["url"]
    # 3. links
    if hasattr(entry, "links"):
        for l in entry.links:
            if "image" in l.get("type", ""):
                return l.get("href")
    # 4. summary 내 inline img tag 정규식 추출
    summary = getattr(entry, "summary", "")
    if summary:
        m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', summary, re.IGNORECASE)
        if m:
            return m.group(1)
    return None


def clean_html(text: str) -> str:
    """HTML 태그를 제거하고 HTML 엔티티 문자를 디코딩하여 일반 텍스트로 정제"""
    if not text:
        return ""
    # HTML 태그 제거 (예: <b>, </b> 등)
    cleaned = re.sub(r'<[^>]+>', '', text)
    # HTML 엔티티 변환 (예: &quot; -> ", &lt; -> < 등)
    return html.unescape(cleaned)


def parse_naver_date(date_str: str) -> Optional[datetime]:
    """네이버 API의 pubDate(RFC 822 포맷) 문자열을 datetime 객체로 파싱"""
    if not date_str:
        return datetime.now()
    try:
        parsed = email.utils.parsedate_to_datetime(date_str)
        # SQLAlchemy가 다룰 수 있도록 tzinfo를 제거한 naive datetime 반환
        return parsed.replace(tzinfo=None)
    except Exception as e:
        logger.warning(f"네이버 날짜 파싱 실패 ({date_str}): {e}")
        return datetime.now()


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
        resp.raise_for_status()
        
        # [핵심 리팩토링] resp.text에 인코딩 강제를 하지 않고,
        # resp.content(바이트)를 직접 feedparser에 전달하여 XML 내부 인코딩 선언에 따르도록 함 (EUC-KR 깨짐 방지)
        feed = feedparser.parse(resp.content)

        if feed.bozo:
            logger.warning(f"[{name}] RSS 파싱 경고: {feed.bozo_exception}")

        for entry in feed.entries:
            title = getattr(entry, "title", "").strip()
            link  = getattr(entry, "link",  "").strip()
            if not title or not link:
                continue
            
            # [협업 최적화] 제목은 태그 정제를 거치되, 
            # 요약(summary)은 프론트엔드가 이미지 태그를 발라낼 수 있게 태그 원본(HTML)을 그대로 보존합니다.
            title = clean_html(title)
            summary = getattr(entry, "summary", "").strip()
            image_url = extract_rss_image(entry)
            
            articles.append({
                "source":       name,
                "title":        title,
                "url":          link,
                "summary":      summary,
                "image_url":    image_url,
                "published_at": _parse_date(entry),
            })

        logger.info(f"[{name}] {len(articles)}건 수집")
    except Exception as e:
        logger.error(f"[{name}] 크롤링 실패: {e}")
    return articles


def crawl_naver_news(query: str, display: int = 20) -> List[Dict]:
    """네이버 뉴스 검색 API를 통해 최신 뉴스를 수집하고 기존 언론사 카테고리로 역매핑"""
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        logger.warning("네이버 API ID 또는 Secret이 설정되지 않아 네이버 크롤링을 건너뜁니다.")
        return []

    articles = []
    enc_query = urllib.parse.quote(query)
    url = f"https://openapi.naver.com/v1/search/news.json?query={enc_query}&display={display}&sort=date"
    headers = {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
        "User-Agent": USER_AGENT
    }

    try:
        resp = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()

        from article_scraper import get_source_from_url
        
        # 한국어 언론사명 -> 영어 소스 키 역매핑 딕셔너리
        reverse_source_map = {
            "한겨레": "hani",
            "경향신문": "khan",
            "조선일보": "chosun",
            "중앙일보": "joongang",
            "동아일보": "donga",
            "MBC": "mbc",
            "KBS": "kbs",
            "SBS": "sbs",
            "YTN": "ytn",
            "한국경제": "hankyung",
            "매일경제": "mk",
            "연합뉴스": "yonhap",
            "연합뉴스TV": "yonhap"
        }

        for item in data.get("items", []):
            title = clean_html(item.get("title", ""))
            summary = clean_html(item.get("description", ""))
            link = item.get("link", "")
            orig_link = item.get("originallink", "")

            # 네이버 PC URL 유입 시 모바일 전용 주소로 자동 변환
            link = convert_naver_pc_to_mobile(link)
            orig_link = convert_naver_pc_to_mobile(orig_link)

            # [수집 필터링 최적화] AI 분석 및 이미지 추출의 신뢰성 보장을 위해 
            # 네이버 자체 기사(naver.com 도메인을 가지는 기사)가 유입되는 주소만 선택해 수집합니다.
            # 아웃링크 매체 뉴스(naver.com이 없는 일반 기타 웹 사이트)는 크롤링 차단 및 본문 유실 우려가 커 배제합니다.
            if "naver.com" not in link and "naver.com" not in orig_link:
                continue

            # 본문 추출이 용이한 네이버 뉴스 다이렉트 링크(n.news.naver.com) 우선 선택
            article_url = link if "naver.com" in link else (orig_link if orig_link else link)

            if not title or not article_url:
                continue

            # 도메인 기반 언론사 식별 (반드시 원본 링크 도메인을 기준으로 파싱하여 식별)
            source_kor = get_source_from_url(orig_link if orig_link else link)
            
            # 식별된 한국어 명칭을 영문 매핑 키값으로 변환
            source_key = "naver"
            for kor_name, eng_key in reverse_source_map.items():
                if kor_name in source_kor:
                    source_key = eng_key
                    break

            articles.append({
                "source":       source_key,
                "title":        title,
                "url":          article_url,
                "summary":      summary.strip(),
                "published_at": parse_naver_date(item.get("pubDate", "")),
            })
        logger.info(f"[naver_api] '{query}' 키워드로 {len(articles)}건 수집 완료")
    except Exception as e:
        logger.error(f"[naver_api] '{query}' 수집 오류: {e}")
        
    return articles


def crawl_all(feeds: Dict[str, str] = None) -> List[Dict]:
    """전체 RSS 수집 + 네이버 뉴스 검색 API 수집 후 중복 URL 제거"""
    if feeds is None:
        feeds = RSS_FEEDS

    all_articles: List[Dict] = []
    
    # 1. 활성화된 RSS 피드 수집
    for name, url in feeds.items():
        all_articles.extend(crawl_feed(name, url))
        time.sleep(REQUEST_DELAY)

    # 2. 네이버 뉴스 API 수집 (다양한 대표 카테고리성 키워드로 수집 수행)
    naver_keywords = ["속보", "정치", "경제", "사회", "IT과학"]
    for kw in naver_keywords:
        all_articles.extend(crawl_naver_news(kw, display=15))
        time.sleep(REQUEST_DELAY)

    # 3. URL 기준 중복 기사 제거
    seen: set = set()
    unique = []
    for a in all_articles:
        if a["url"] not in seen:
            seen.add(a["url"])
            unique.append(a)

    logger.info(f"전체 수집 완료: {len(unique)}건 (중복 제거 후)")
    return unique


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    items = crawl_all()
    print("\n--- 수집 샘플 5건 출력 ---")
    for i in items[:5]:
        print(f"[{i['source']}] {i['title']}")
        print(f"  {i['url']}")

