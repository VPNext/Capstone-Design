"""
국립국어원 표준국어대사전 API
"""
import logging
from typing import Dict, List, Optional
import requests
from config import KOREAN_DICT_API_KEY

logger = logging.getLogger(__name__)
DICT_URL = "https://opendict.korean.go.kr/api/search"


def lookup(word: str) -> Optional[Dict]:
    """단어를 국립국어원 API로 조회. API 키가 없거나 오류 시 None 반환."""
    if not KOREAN_DICT_API_KEY:
        return None
    try:
        resp = requests.get(
            DICT_URL,
            params={
                "key":      KOREAN_DICT_API_KEY,
                "q":        word,
                "req_type": "json",
                "num":      1,
                "part":     "word",
                "sort":     "dict",
            },
            timeout=5,
        )

        # 응답이 JSON이 아닌 경우(XML 에러 등) 안전하게 포기
        if "json" not in resp.headers.get("Content-Type", ""):
            return None

        data  = resp.json()
        items = data.get("channel", {}).get("item", [])
        if not items:
            return None

        sense = items[0].get("sense", [{}])
        sense = sense[0] if isinstance(sense, list) else sense
        return {
            "definition": sense.get("definition", ""),
            "link":       items[0].get("link", ""),
        }
    except Exception as e:
        logger.error(f"사전 API 무시됨 ({word}): {e}")
        return None


def enrich(terms: List[Dict]) -> List[Dict]:
    """
    BUG FIX: AI 분석기가 반환하는 용어 객체는 {term, explanation, category} 형태.
             사전 API 조회 결과를 "definition" 키로 저장하고,
             프론트엔드에서는 definition(사전) 또는 explanation(AI) 둘 다 활용.

    - term.term         : 용어명 (AI 반환 키)
    - term.explanation  : AI 생성 설명
    - term.definition   : 사전 API 보완 설명 (있을 때만)
    """
    for t in terms:
        # "term" 키 우선, 구버전 호환을 위해 "word" 키도 허용
        word = t.get("term") or t.get("word", "")
        if not word:
            continue
        result = lookup(word)
        if result and result.get("definition"):
            # 사전 정의가 있으면 추가 (AI 설명은 explanation에 그대로 유지)
            t["definition"] = result["definition"]
            t["dict_link"]  = result.get("link", "")
    return terms
