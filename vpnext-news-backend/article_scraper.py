"""
기사 본문 스크래퍼
- 뉴스사별 CSS 선택자 매핑
- 범용 폴백(fallback) 파서 내장
- 재시도 로직 포함
"""

import time
import logging
from typing import Dict, Optional

import requests
from bs4 import BeautifulSoup
from config import REQUEST_TIMEOUT, MAX_RETRIES, REQUEST_DELAY, USER_AGENT

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent":      USER_AGENT,
    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# 사이트별 본문 / 제목 CSS 선택자
SELECTORS: Dict[str, Dict[str, str]] = {
    "naver.com":     {"content": "#dic_area, .go_trans._article_content",       "title": ".media_end_head_headline"},
    "daum.net":      {"content": ".article_view, #harmonyContainer",             "title": ".tit_view"},
    "yonhap":        {"content": ".story-news article",                          "title": "h1.tit"},
    "ytn.co.kr":     {"content": ".article-txt, #CmAdContent",                  "title": "h1.tit"},
    "kbs.co.kr":     {"content": "#cont_newstext, .detail-body",                 "title": ".tit-w"},
    "imbc.com":      {"content": ".news_txt, #content_body",                     "title": "h2.title"},
    "sbs.co.kr":     {"content": ".article_cont_wrap, #news_body_id",            "title": "h1.sbs_title"},
    "jtbc.co.kr":    {"content": ".article_content, .news-text",                 "title": ".article-title"},
    "hani.co.kr":    {"content": ".article-text, .text",                         "title": "h4.title"},
    "khan.co.kr":    {"content": ".art_body",                                    "title": "h1.headline"},
    "chosun.com":    {"content": ".article-body",                                "title": "h1"},
    "joins.com":     {"content": "#article_body",                                "title": "h1.headline"},
    "joongang.co.kr":{"content": "#article_body",                                "title": "h1.headline"},
    "donga.com":     {"content": ".article_txt",                                 "title": "h1.title"},
    "mk.co.kr":      {"content": "#article_body, .art_txt",                      "title": "h1.top_title"},
    "hankyung.com":  {"content": "#articletxt, .article-body",                   "title": "h1.headline"},
}


def _get_selectors(url: str) -> Dict[str, str]:
    for domain, sel in SELECTORS.items():   
        if domain in url:
            return sel
    return {"content": "article, .article, .content, main", "title": "h1"}


def _generic_content(soup: BeautifulSoup) -> str:
    for tag in soup.find_all(["script", "style", "nav", "header", "footer", "aside", "iframe"]):
        tag.decompose()
    candidates = soup.find_all(["article", "main", "div"],
                               class_=lambda c: c and any(
                                   kw in str(c).lower()
                                   for kw in ["article", "content", "body", "text", "news"]
                               ))
    if candidates:
        best = max(candidates, key=lambda x: len(x.get_text()))
        paras = [p.get_text(strip=True) for p in best.find_all("p") if len(p.get_text(strip=True)) > 20]
        if paras:
            return "\n".join(paras)
    return "\n".join(
        p.get_text(strip=True) for p in soup.find_all("p") if len(p.get_text(strip=True)) > 30
    )


def scrape(url: str) -> Optional[Dict]:
    """단일 URL 본문 추출. 실패 시 None 반환"""
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            resp.raise_for_status()
            resp.encoding = resp.apparent_encoding
            soup = BeautifulSoup(resp.text, "lxml")
            sel  = _get_selectors(url)

            # ── 제목 ────────────────────────
            title = ""
            t_elem = soup.select_one(sel["title"])
            if t_elem:
                title = t_elem.get_text(strip=True)
            if not title:
                og = soup.find("meta", property="og:title")
                title = og["content"] if og else ""

            # ── 본문 ────────────────────────
            content = ""
            c_elem = soup.select_one(sel["content"])
            if c_elem:
                for bad in c_elem.find_all(["script", "style", "figure"]):
                    bad.decompose()
                paras = [p.get_text(strip=True) for p in c_elem.find_all("p") if len(p.get_text(strip=True)) > 10]
                content = "\n".join(paras) if paras else c_elem.get_text(separator="\n", strip=True)
            if not content:
                content = _generic_content(soup)

            # ── OG 이미지 ───────────────────
            og_img = soup.find("meta", property="og:image")
            image_url = og_img["content"] if og_img else None

            return {"title": title, "content": content, "image_url": image_url, "url": url}

        except requests.RequestException as e:
            logger.warning(f"스크래핑 시도 {attempt+1}/{MAX_RETRIES} ({url}): {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(REQUEST_DELAY * (attempt + 1))
        except Exception as e:
            logger.error(f"스크래핑 오류 ({url}): {e}")
            break
    return None
