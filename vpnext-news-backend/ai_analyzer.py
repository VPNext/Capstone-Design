"""
Grok AI 분석 모듈 (Groq & Gemini SDK 사용) - 리팩토링 버전
"""
import json
import logging
import re
import asyncio
from typing import Dict, List, Optional, Any
from groq import Groq
from google import genai
from config import GROQ_API_KEY, GEMINI_API_KEY, GATEWAY_API_KEY
import httpx

logger = logging.getLogger(__name__)

# --- AI Clients ---

class GroqClient:
    MODELS = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "gemma2-9b-it"
    ]

    def __init__(self):
        self.client = Groq(api_key=GROQ_API_KEY)

    def _parse_json(self, text: str) -> Optional[Dict[str, Any]]:
        if not text:
            return None
        try:
            m = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
            if m:
                parsed = json.loads(m.group(1))
                return parsed if isinstance(parsed, dict) else None

            start_idx = text.find("{")
            end_idx = text.rfind("}") + 1
            if start_idx != -1 and end_idx > start_idx:
                parsed = json.loads(text[start_idx:end_idx])
                return parsed if isinstance(parsed, dict) else None
        except (json.JSONDecodeError, ValueError) as err:
            logger.error(f"Groq JSON 파싱 실패: {err} \n[원본 텍스트 일부]: {text[:200]}...")
        return None

    def call(self, prompt: str, max_retries: int = 2) -> Optional[Dict[str, Any]]:
        last_error = None
        for model_id in self.MODELS:
            for attempt in range(max_retries):
                try:
                    response = self.client.chat.completions.create(
                        model=model_id,
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.2,
                        max_tokens=2048,
                    )
                    content = response.choices[0].message.content
                    parsed_data = self._parse_json(content)
                    if parsed_data is not None:
                        return parsed_data
                    raise ValueError("JSON 파싱 실패")
                except Exception as e:
                    error_msg = str(e).lower()
                    last_error = e
                    if any(x in error_msg for x in ["429", "rate limit", "tokens"]):
                        logger.warning(f"Groq [{model_id}] 한도 초과. 다음 모델 시도.")
                        break
                    logger.warning(f"Groq [{model_id}] 시도 {attempt+1}/{max_retries} 실패: {e}")
        logger.error(f"모든 Groq 모델 호출 실패. 마지막 에러: {last_error}")
        return None

class GeminiClient:
    MODELS = [
        "gemini-2.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash-lite",
        "gemini-3-flash"
    ]

    def __init__(self):
        self.client = genai.Client(api_key=GEMINI_API_KEY)

    async def call(self, prompt: str) -> str:
        last_error = None
        for model_id in self.MODELS:
            try:
                response = await self.client.aio.models.generate_content(
                    model=model_id,
                    contents=prompt,
                )
                return response.text.strip()
            except Exception as e:
                error_msg = str(e).lower()
                last_error = e
                if any(err in error_msg for err in ["503", "unavailable", "429", "quota", "exhausted"]):
                    logger.warning(f"Gemini {model_id} 과부하/한도초과. 다음 모델 시도.")
                    continue
                logger.error(f"Gemini {model_id} 오류: {e}")
                raise e
        raise Exception(f"모든 Gemini 모델 호출 실패. 마지막 에러: {last_error}")

# Global clients
groq_client = GroqClient()
gemini_client = GeminiClient()

# --- Analysis Components ---

def analyze_credibility(title: str, content: str, source: Optional[str] = None) -> Dict:
    source_name = source if source else "미상(외부 뉴스)"
    prompt = f"""
당신은 뉴스 팩트체크 전문가입니다. 아래 기사를 분석해 신뢰도를 평가하세요.
특히 기사의 출처({source_name}) 정보를 바탕으로 해당 매체의 신뢰성을 평가 및 분석에 반영하세요.

[출처] {source_name}
[제목] {title}
[본문] {content[:3000]}

평가 기준:
1. 사실과 의견의 구분: 기사가 객관적 사실을 전달하는지, 아니면 작성자의 주관적 의견을 담고 있는지 분석하세요.
2. 제목과 본문의 일치성: 제목이 본문의 내용을 왜곡하거나 과장하지 않고 적절하게 반영하고 있는지 확인하세요.
3. 과장된 표현: 자극적이거나 과장된 수식어를 사용하여 사실을 부풀리고 있는지 확인하세요.
4. 미검증된 주장: 근거나 출처가 불분명한 주장을 포함하고 있는지 확인하세요.
5. 감정적·선동적 표현: 독자의 감정을 자극하거나 편향된 시각을 유도하는 선동적인 언어를 사용하는지 확인하세요.
6. 출처({source_name})의 신뢰성 검증: 해당 언론사의 보도 신뢰성 및 기존 뉴스와의 비교 결과를 판단 근거에 반영하세요.

아래 JSON 형식으로만 응답:
```json
{{
  "score": 0.85,
  "label": "신뢰",
  "reason": "출처인 {source_name}의 보도 신뢰성 및 기존 뉴스와의 비교 결과를 포함하여 3~4문장으로 작성",
  "red_flags": ["의심 표현1", "의심 표현2"],
  "summary": "[{source_name} 보도 요약] 기사 핵심 내용을 바탕으로 3줄 요약"
}}
```
score 범위: 0.7이상→신뢰, 0.4~0.7→주의, 0.4미만→허위 의심
"""
    result = groq_client.call(prompt)
    return result or {
        "score": 0.5, "label": "분석 불가",
        "reason": "AI 분석 중 오류 발생", "red_flags": [], "summary": "",
    }

def extract_terms(content: str) -> List[Dict]:
    prompt = f"""
아래 뉴스 기사에서 일반인이 이해하기 어려운 용어를 추출해 쉽게 설명하세요.

[본문] {content[:2000]}

아래 JSON 형식으로만 응답 (최대 10개):
```json
{{
  "terms": [
    {{
      "term": "용어명",
      "explanation": "쉬운 한국어 설명 (1~2문장)",
      "category": "경제|정치|법률|과학|사회|외래어|기타"
    }}
  ]
}}
```
"""
    result = groq_client.call(prompt)
    return result.get("terms", []) if result else []

def extract_persons(title: str, content: str) -> List[Dict]:
    prompt = f"""
아래 뉴스 기사에서 핵심 인물을 추출하고 역할을 설명하세요.

[제목] {title}
[본문] {content[:2000]}

아래 JSON 형식으로만 응답 (최대 5명):
```json
{{
  "persons": [
    {{
      "name": "인물명",
      "role": "현재 직함/직책",
      "description": "인물 소개 1문장",
      "relation": "이 기사에서의 역할"
    }}
  ]
}}
```
"""
    result = groq_client.call(prompt)
    return result.get("persons", []) if result else []

def generate_comic_script(title: str, content: str) -> str:
    prompt = f"""
아래 뉴스 기사를 4컷 만화로 만들기 위한 장면 스크립트를 생성하세요.
어린이도 이해할 수 있게 쉽고 재미있게 구성하세요.

[제목] {title}
[본문] {content[:1500]}

아래 JSON 형식으로만 응답:
```json
{{
  "comic_title": "만화 제목",
  "panels": [
    {{
      "panel": 1,
      "scene_prompt": "이미지 생성 AI용 영어 프롬프트",
      "dialogue": "등장인물 대사 또는 나레이션 (한국어)",
      "description": "장면 요약 (한국어)"
    }}
  ]
}}
```
"""
    result = groq_client.call(prompt)
    return json.dumps(result, ensure_ascii=False, indent=2) if result else "{}"

# async로 호출할 수 있도록 래핑
async def async_analyze_credibility(title: str, content: str, source: Optional[str] = None) -> Dict:
    return await asyncio.to_thread(analyze_credibility, title, content, source)

async def async_extract_terms(content: str) -> List[Dict]:
    return await asyncio.to_thread(extract_terms, content)

async def async_extract_persons(title: str, content: str) -> List[Dict]:
    return await asyncio.to_thread(extract_persons, title, content)

async def async_generate_comic_script(title: str, content: str) -> str:
    return await asyncio.to_thread(generate_comic_script, title, content)
