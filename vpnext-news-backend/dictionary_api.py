"""
국립국어원 우리말샘 사전 API (비동기 최적화 버전)
"""
import logging
import asyncio
from typing import Dict, List, Optional
import httpx
from config import KOREAN_DICT_API_KEY

logger = logging.getLogger(__name__)
DICT_URL = "https://opendict.korean.go.kr/api/search"


async def lookup(client: httpx.AsyncClient, word: str) -> Optional[Dict]:
    """단어를 국립국어원 API로 비동기 조회. API 키가 없거나 오류 시 None 반환."""
    if not KOREAN_DICT_API_KEY:
        return None
    try:
        resp = await client.get(
            DICT_URL,
            params={
                "key":      KOREAN_DICT_API_KEY,
                "q":        word,
                "req_type": "json",
                "num":      1,
                "part":     "word",
                "sort":     "dict",
            },
            timeout=3.0,
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


async def enrich(terms: List[Dict]) -> List[Dict]:
    """
    AI 분석기가 반환하는 용어 객체에 사전 정의를 비동기 병렬로 주입합니다.
    """
    if not KOREAN_DICT_API_KEY or not terms:
        return terms

    async with httpx.AsyncClient() as client:
        tasks = []
        for t in terms:
            word = t.get("term") or t.get("word", "")
            if word:
                tasks.append(lookup(client, word))
            else:
                # 빈 값인 경우 None을 반환하는 코루틴
                async def empty(): return None
                tasks.append(empty())
        
        results = await asyncio.gather(*tasks)
        
        for t, res in zip(terms, results):
            if res and res.get("definition"):
                t["definition"] = res["definition"]
                t["dict_link"]  = res.get("link", "")
                
    return terms
