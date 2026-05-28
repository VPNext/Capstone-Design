"""
기사 본문 스크래퍼
- 뉴스사별 CSS 선택자 매핑
- 범용 폴백(fallback) 파서 내장
- 재시도 로직 포함
"""

import time
import random
import logging
from typing import Dict, Optional

import requests
from bs4 import BeautifulSoup
from config import REQUEST_TIMEOUT, MAX_RETRIES, REQUEST_DELAY, USER_AGENT

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent":      USER_AGENT,
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Connection":      "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control":   "max-age=0",
}

# 사이트별 본문 / 제목 CSS 선택자
SELECTORS: Dict[str, Dict[str, str]] = {
    "naver.com":     {"content": "#dic_area, .go_trans._article_content, #articleBodyContents, #newsEndContents", "title": ".media_end_head_headline, h2.media_end_head_headline, #articleTitle, h2.media_end_head_title"},
    "daum.net":      {"content": ".article_view, #harmonyContainer",             "title": ".tit_view"},
    "yonhap":        {"content": ".story-news article",                          "title": "h1.tit"},
    "kbs.co.kr":     {"content": "#cont_newstext, .detail-body",                 "title": ".tit-w"},
    "sbs.co.kr":     {"content": ".article_cont_wrap, #news_body_id",            "title": "h1.sbs_title"},
    "jtbc.co.kr":    {"content": ".article_content, .news-text",                 "title": ".article-title"},
    "hani.co.kr":    {"content": ".article-text, .text",                         "title": "h4.title"},
    "khan.co.kr":    {"content": ".art_body",                                    "title": "article header h1"},
    "chosun.com":    {"content": ".article-body",                                "title": "h1"},
    "donga.com":     {"content": ".news_view, .article_txt",                    "title": "h1.title, h1"},
    "mk.co.kr":      {"content": "#article_body, .art_txt",                      "title": "h1.top_title"},
    "hankyung.com":  {"content": "#articletxt, .article-body",                   "title": "h1.headline"},
}


def _get_selectors(url: str) -> Dict[str, str]:
    for domain, sel in SELECTORS.items():   
        if domain in url:
            return sel
    return {"content": "article, .article, .content, main, .news_view", "title": "h1, .title, .headline"}


def _generic_content(soup: BeautifulSoup) -> str:
    for tag in soup.find_all(["script", "style", "nav", "header", "footer", "aside", "iframe"]):
        tag.decompose()
    candidates = soup.find_all(["article", "main", "div", "section"],
                               class_=lambda c: c and any(
                                   kw in str(c).lower()
                                   for kw in ["article", "content", "body", "text", "news"]
                               ))
    if candidates:
        best = max(candidates, key=lambda x: len(x.get_text()))
        paras = [p.get_text(strip=True) for p in best.find_all("p") if len(p.get_text(strip=True)) > 20]
        if paras:
            return "\n".join(paras)
        # p 태그가 없는 경우 텍스트 직접 추출
        text = best.get_text(separator="\n", strip=True)
        if len(text) > 100:
            return text

    # 최종 fallback: 너무 짧지 않은 모든 p 태그 또는 전체 텍스트
    all_paras = [p.get_text(strip=True) for p in soup.find_all("p") if len(p.get_text(strip=True)) > 30]
    if all_paras:
        return "\n".join(all_paras)
    
    return soup.get_text(separator="\n", strip=True)


def scrape(url: str) -> Optional[Dict]:
    """단일 URL 본문 추출. 실패 시 None 반환"""
    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            resp.raise_for_status()
            if resp.encoding is None or resp.encoding.lower() == 'iso-8859-1':
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
                
                # br 태그를 개행 문자로 교체하여 p 태그가 없는 경우 줄바꿈 유지
                for br in c_elem.find_all("br"):
                    br.replace_with("\n")

                paras = [p.get_text(strip=True) for p in c_elem.find_all("p") if len(p.get_text(strip=True)) > 10]
                content = "\n".join(paras) if paras else c_elem.get_text(separator="\n", strip=True)
            if not content:
                content = _generic_content(soup)
            
            # 본문이 유실되었을 경우 og:description을 최종 백업 필드로 사용
            if not content:
                og_desc = soup.find("meta", property="og:description")
                if og_desc and og_desc.get("content"):
                    content = og_desc["content"]

            # ── OG 이미지 ───────────────────
            og_img = soup.find("meta", property="og:image")
            image_url = og_img["content"] if og_img else None

            return {"title": title, "content": content, "image_url": image_url, "url": url}

        except requests.RequestException as e:
            logger.warning(f"스크래핑 시도 {attempt+1}/{MAX_RETRIES} ({url}): {e}")
            if attempt < MAX_RETRIES - 1:
                jitter = random.uniform(0.5, 1.5)
                time.sleep((REQUEST_DELAY * (attempt + 1)) + jitter)
        except Exception as e:
            logger.error(f"스크래핑 오류 ({url}): {e}")
            break
    return None


from urllib.parse import urlparse

def get_source_from_url(url: str) -> str:
    """URL 도메인을 분석하여 한국어 언론사명을 반환"""
    domain_map = {
        "naver.com": "네이버 뉴스",
        "daum.net": "다음 뉴스",
        "yonhapnewstv.co.kr": "연합뉴스TV",
        "kbs.co.kr": "KBS",
        "sbs.co.kr": "SBS",
        "jtbc.co.kr": "JTBC",
        "hani.co.kr": "한겨레",
        "khan.co.kr": "경향신문",
        "chosun.com": "조선일보",
        "donga.com": "동아일보",
        "mk.co.kr": "매일경제",
        "hankyung.com": "한국경제",
    }
    
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()
        
        for domain, name in domain_map.items():
            if domain in netloc:
                return name
                
        # 매핑되지 않은 도메인은 도메인명 자체를 가공해 반환
        parts = netloc.split('.')
        # www. 혹은 news. 등 서브도메인이 있을 수 있으므로 뒤에서 2개 세그먼트 활용
        if len(parts) >= 2:
            return f"{parts[-2]}.{parts[-1]}"
        return netloc
    except Exception as e:
        logger.error(f"URL 출처 파싱 오류 ({url}): {e}")
        return "외부 뉴스"

