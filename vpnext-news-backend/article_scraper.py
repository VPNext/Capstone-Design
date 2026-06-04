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
    "sbs.co.kr":     {"content": ".article_cont_wrap, #news_body_id",            "title": "h1.sbs_title"},
    "hani.co.kr":    {"content": ".article-text, .text",                         "title": "h4.title"},
    "khan.co.kr":    {"content": ".art_body",                                    "title": "article header h1"},
    "donga.com":     {"content": ".news_view, .article_txt",                    "title": "h1.title, h1"},
    "mk.co.kr":      {"content": "#article_body, .art_txt",                      "title": "h1.top_title"},
    "hankyung.com":  {"content": "#articletxt, .article-body",                   "title": "h1.headline"},
    "chosun.com":    {"content": ".article-body, section.article-body",          "title": "h1, #article-title, h1.headline"},
    "kmib.co.kr":    {"content": "#articleBody, .tx, .article_content",          "title": ".article_header h1, h1"},
}


def _get_selectors(url: str) -> Dict[str, str]:
    for domain, sel in SELECTORS.items():   
        if domain in url:
            return sel
    return {"content": "article, .article, .content, main, .news_view", "title": "h1, .title, .headline"}


def extract_body_by_density(soup: BeautifulSoup) -> str:
    """마침표 밀도 및 하이퍼링크 비율을 계산하여 가장 본문다운 노드를 자동 검출"""
    # 원본 복제하여 작업 진행 (원본 훼손 방지)
    import copy
    temp_soup = copy.copy(soup)
    
    # 1. 불필요 레이아웃 노드를 선제 소거
    for bad_tag in temp_soup.find_all(["script", "style", "nav", "header", "footer", "aside", "iframe", "button", "input", "form"]):
        bad_tag.decompose()
        
    candidates = []
    # 기사 본문이 들어있을 만한 블록 엘리먼트 순회
    for el in temp_soup.find_all(["div", "section", "article"]):
        text = el.get_text(strip=True)
        if len(text) < 150:
            continue
            
        score = 0
        # 마침표(.) 및 종결어미 개수 기반 가산
        score += text.count(".") * 10
        score += (text.count("다.") + text.count("요.")) * 20
        score += min(len(text) / 12, 60)
        
        # 링크 텍스트 비율이 35% 이상인 추천 목록 영역 감점 (추천 뉴스판 등)
        links = el.find_all("a")
        links_text_len = sum(len(a.get_text(strip=True)) for a in links)
        if links_text_len / (len(text) or 1) > 0.35:
            score -= 100
            
        candidates.append((score, el))
        
    if not candidates:
        return ""
        
    # 점수가 가장 높은 엘리먼트를 기사 본문 영역으로 확정
    candidates.sort(key=lambda x: x[0], reverse=True)
    best_el = candidates[0][1]
    
    # 문단 정제 후 단락 구분 반환
    paras = [p.get_text(strip=True) for p in best_el.find_all("p") if len(p.get_text(strip=True)) > 15]
    return "\n\n".join(paras) if paras else best_el.get_text("\n\n", strip=True)


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

            # 조선일보 Fusion Engine 특수 파싱
            if "chosun.com" in url:
                fusion_script = None
                for s in soup.find_all("script"):
                    if s.string and "Fusion.globalContent" in s.string:
                        fusion_script = s.string
                        break
                if fusion_script:
                    import re
                    import json
                    match = re.search(r'Fusion\.globalContent\s*=\s*(\{.*)', fusion_script, re.DOTALL)
                    if match:
                        text = match.group(1)
                        brace_count = 0
                        json_str = ""
                        for char in text:
                            if char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                            json_str += char
                            if brace_count == 0:
                                break
                        try:
                            data = json.loads(json_str)
                            paras = []
                            for ce in data.get("content_elements", []):
                                if ce.get("type") == "text":
                                    para_text = ce.get("content", "").strip()
                                    if para_text:
                                        import html
                                        para_text = html.unescape(para_text)
                                        if "<" in para_text:
                                            clean_para = BeautifulSoup(para_text, "lxml").get_text(strip=True)
                                        else:
                                            clean_para = para_text
                                        if clean_para:
                                            paras.append(clean_para)
                            if paras:
                                content = "\n".join(paras)
                            
                            if not title and "headlines" in data:
                                title = data["headlines"].get("basic", "")
                        except Exception as e:
                            logger.error(f"조선일보 Fusion JSON 파싱 실패 ({url}): {e}")

            if not content:
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
                content = extract_body_by_density(soup) or _generic_content(soup)
            
            # 본문이 유실되었을 경우 og:description을 최종 백업 필드로 사용
            if not content:
                og_desc = soup.find("meta", property="og:description")
                if og_desc and og_desc.get("content"):
                    content = og_desc["content"]

            # ── OG 이미지 ───────────────────
            og_img = soup.find("meta", property="og:image")
            image_url = og_img["content"] if og_img else None

            return {"title": title, "content": content, "image_url": image_url, "url": url, "soup": soup}

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

def get_source_from_url(url: str, soup: BeautifulSoup = None) -> str:
    """URL 도메인을 분석하여 한국어 언론사명을 반환 (네이버 경유 시 메타태그 역매핑 적용)"""
    
    # 네이버 뉴스 플랫폼 유입의 경우, 메타데이터 파싱을 통해 실제 언론사명 역추적
    if "naver.com" in url and soup:
        # og:article:author 메타 태그 추적 (예: "매일경제", "한겨레")
        meta_author = soup.find("meta", property="og:article:author")
        if meta_author and meta_author.get("content"):
            return meta_author["content"].strip()
            
        # twitter:creator 메타 태그 추적 (예: "SBS 뉴스", "KBS 뉴스")
        meta_creator = soup.find("meta", attrs={"name": "twitter:creator"})
        if meta_creator and meta_creator.get("content"):
            cleaned = meta_creator["content"].replace(" 뉴스", "").replace("News", "").strip()
            if cleaned:
                return cleaned

    domain_map = {
        "naver.com": "네이버 뉴스",
        "daum.net": "다음 뉴스",
        "yonhapnewstv.co.kr": "연합뉴스TV",
        "sbs.co.kr": "SBS",
        "hani.co.kr": "한겨레",
        "khan.co.kr": "경향신문",
        "donga.com": "동아일보",
        "mk.co.kr": "매일경제",
        "hankyung.com": "한국경제",
        "chosun.com": "조선일보",
        "kmib.co.kr": "국민일보",
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

