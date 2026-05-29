"""
Gemini AI 분석 모듈 (Gemini SDK 사용) - 리팩토링 버전
"""
import json
import logging
import re
import asyncio
from typing import Dict, List, Optional, Any
from google import genai
from config import GEMINI_API_KEY, GATEWAY_API_KEY
import httpx

logger = logging.getLogger(__name__)

# --- AI Clients ---

def _parse_json(text: str) -> Optional[Dict[str, Any]]:
    if not text:
        return None
    try:
        # JSON 코드 블록 추출 시도
        m = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
        if m:
            parsed = json.loads(m.group(1))
            return parsed if isinstance(parsed, dict) else None

        # 순수 JSON 추출 시도
        start_idx = text.find("{")
        end_idx = text.rfind("}") + 1
        if start_idx != -1 and end_idx > start_idx:
            parsed = json.loads(text[start_idx:end_idx])
            return parsed if isinstance(parsed, dict) else None
    except (json.JSONDecodeError, ValueError) as err:
        logger.error(f"JSON 파싱 실패: {err}")
    return None


class GeminiClient:
    MODELS = [
        "gemini-3.5-flash",       # 새롭게 추가되어 한번 써보겠습니다.
        "gemini-2.5-flash",       # 1순위: 가장 빠르고 똑똑한 메인 모델
        "gemini-3.1-flash-lite",  # 2순위: 일일 한도가 넉넉한 라이트 모델
        "gemini-2.5-flash-lite",  # 3순위: 백업용 구형 라이트 모델
        "gemini-3-flash"          # 4순위: 최신 플래시 모델
    ]

    def __init__(self):
        self.client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
        # 안전 설정 최대로 완화 (모든 카테고리 차단 해제)
        # 뉴스 분석 시 민감한 사회 이슈(사건, 사고 등)로 인한 오차단 방지
        self.safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_CIVIC_INTEGRITY", "threshold": "BLOCK_NONE"},
        ]

    def call(self, prompt: str) -> Optional[str]:
        if not self.client:
            return None
            
        last_error = None
        for model_id in self.MODELS:
            try:
                # 안전 정책을 완전히 끄고 호출
                response = self.client.models.generate_content(
                    model=model_id,
                    contents=prompt,
                    config={
                        "safety_settings": self.safety_settings,
                        "temperature": 0.3,
                    }
                )
                
                # 안전 정책에 의해 일부 또는 전체가 차단된 경우
                if not hasattr(response, 'text') or not response.text:
                    logger.warning(f"Gemini {model_id} 차단됨 (Safety Filter Triggered)")
                    continue
                     
                return response.text.strip()
            except Exception as e:
                error_msg = str(e).lower()
                last_error = e
                # 차단 관련 에러 메시지 상세 로깅
                if "safety" in error_msg or "blocked" in error_msg:
                    logger.warning(f"Gemini {model_id} 안전 차단됨: {e}")
                    continue
                if any(err in error_msg for err in ["503", "unavailable", "429", "quota"]):
                    logger.warning(f"Gemini {model_id} 과부하/한도초과. 다음 모델 시도.")
                    continue
                logger.error(f"Gemini {model_id} 오류: {e}")
        return None


# Global clients
gemini_client = GeminiClient()

def call_ai(prompt: str) -> Optional[Dict[str, Any]]:
    """Gemini API를 사용하여 분석 수행"""
    logger.info("Gemini API를 호출합니다...")
    try:
        content = gemini_client.call(prompt)
        if content:
            return _parse_json(content)
    except Exception as e:
        logger.error(f"Gemini API 호출 중 최종 실패: {e}")
        
    return None

# --- Analysis Components ---

def analyze_credibility(
    title: str, 
    content: str, 
    source: Optional[str] = None, 
    related_articles: Optional[List[Dict[str, str]]] = None,
    is_old_article: bool = False
) -> Dict:
    source_name = source if source else "출처 불분명"
    
    # 관련 기사(과거 기사 포함) 텍스트 및 언론사 목록 구성
    related_context = ""
    related_names_links = "없음"
    if related_articles:
        links_list = []
        related_context = "\n[교차 분석용 뉴스 데이터 (최소 5개 권장)]\n"
        for i, art in enumerate(related_articles):
            s_name = art.get('source', '알 수 없음')
            s_url = art.get('url', '#')
            links_list.append(f"[{s_name}]({s_url})")
            related_context += f"기사 {i+1}: {art.get('title', '')} ({s_name}) - URL: {s_url}\n"
            related_context += f"요약: {art.get('summary', '')[:200]}...\n\n"
        related_names_links = ", ".join(list(set(links_list)))
    else:
        related_context = "\n[교차 분석용 데이터 없음]: 비교 가능한 기사가 충분하지 않습니다.\n"

    time_context = "이 기사는 과거에 발행된 기사입니다. 제공된 관련 데이터를 바탕으로 현재 상황과 달라진 점이 있는지 확인하세요." if is_old_article else ""

    prompt = f"""
당신은 뉴스 팩트체크 및 신뢰도 분석 전문가입니다. 
제시된 기사의 제목과 본문을 분석하고, 제공된 '교차 분석용 뉴스 데이터' 및 당신이 학습한 정보를 바탕으로 신뢰도를 평가하세요.

[분석 대상 기사 정보]
출처: {source_name}
제목: {title}
본문: {content[:3000]}
{time_context}
{related_context}

분석 및 판정 가이드라인:
1. 분야 판별 (필수): 기사가 정치, 경제, 사회, 과학, 의학 등 팩트가 중요한 분야인지, 아니면 연예 가심, 단순 일상, 에세이, 리뷰, 책 소개, 제품소개인지 판별하세요.
   - 가심/주관적 기사일 경우: 아래 JSON의 'is_subjective'를 true로 설정하세요.
2. 교차 분석 (최소 5개 기사 대조): 분석하는 뉴스와 대조할 뉴스가 같을 경우에 제공된 데이터들과 내용을 대조하여 사실 여부 및 편향성을 분석하세요.
   - 우선적으로 기사 제목과 요약을 비교하여 핵심 내용이 일치하는지 확인하세요.
   - 인물이 등장하는 경우 해당 인물이 동일한지, 역할이 유사한지 비교하세요.
   - 만약 분석할 뉴스와 비교할 뉴스가 다르다면 참조기사에 추가하지 마십시오.
   - 만약 관련기사가 아니라면 최소 기사 수 부족으로 의심표현으로 'red_flags'에 포함하세요.
   - 그리고 관련기사가 반대될 경우 "제공된 관련 기사들과 상반되는 내용이 있습니다."라고 의심표현으로 'red_flags'에 포함하세요. 
3. 제목-내용 일치도 (낚시성 판별): 제목의 키워드가 본문의 핵심 내용과 괴리가 큰지 분석하여 '과장/낚시성' 여부를 판단하세요.
4. 시계열 검증: 과거 기사인 경우 최신 데이터와 대조하여 현재 시점에서의 유효성을 판단하세요.
5. 기준 날짜는 2026년 5월을 기준으로 하며, 그 이후의 사건이나 정보는 알지 못하다고 가정하세요.

참조 표시: 비교 분석 시 활용한 기사의 출처는 반드시 Markdown 하이퍼링크 형식(예: [언론사명](URL))으로 'summary'에 포함하세요.

아래 JSON 형식으로만 응답:
```json
{{
  "is_subjective": false,
  "score": 0.00, 
  "label": "신뢰/주의/허위 의심/과장/낚시성 중 선택",
  "reason": "교차 분석 결과, 제목-본문 일치성, 과장 표현 유무를 종합하여 상세히 작성 (참조 기사 하이퍼링크 포함)",
  "red_flags": ["의심 표현1", "의심 표현2"],
  "summary": "[{source_name} 보도 요약] 본문 요약 및 (과거 기사인 경우) 현재 상황과 달라진 점을 포함하여 3~4줄로 작성 (참조 기사 하이퍼링크 {related_names_links} 활용)"
}}
```
score 범위: 0.7이상→신뢰, 0.4~0.7→주의, 0.4미만→허위 의심
(가심/주관적 기사(is_subjective: true)인 경우 score는 1.0으로 설정하고 reason에 '해당 기사는 주관적 의견이나 단순 가심을 다루고 있어 별도의 신뢰도 검증이 필요하지 않습니다.'라는 문구를 포함하세요.)
"""
    result = call_ai(prompt)
    
    # 가심성 기사 처리 로직
    if result and result.get("is_subjective"):
        result["summary"] = "⚠️ 해당 기사는 주관적 의견이나 단순 가심을 다루고 있어 별도의 신뢰도 검증이 필요하지 않습니다.\n" + result.get("summary", "")
        result["label"] = "주관적/가심"
        result["score"] = 1.0

    # 출처 불분명 보정
    if result and not result.get("is_subjective") and source_name == "출처 불분명" and result.get("score", 1.0) > 0.6:
        result["score"] = 0.6
        result["label"] = "주의"
        result["reason"] = "[시스템 보정] 출처가 불분명하여 신뢰도를 하향 조정함. " + result.get("reason", "")

    return result or {
        "score": 0.3, "label": "분석 불가",
        "reason": "모든 AI 분석 도구 호출 실패", "red_flags": [], "summary": "",
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
    result = call_ai(prompt)
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
    result = call_ai(prompt)
    return result.get("persons", []) if result else []

def generate_comic_script(title: str, content: str) -> str:
    prompt = f"""
당신은 뉴스 기사를 4컷 만화 시나리오로 변환하는 전문가입니다.
아래 기사 내용을 바탕으로 4컷 만화 스크립트를 생성하세요.

[중요 지침]
- 기사 내용에 사건, 사고, 범죄 등 민감한 내용이 포함되어 있더라도, 이를 직접적으로 묘사하거나 자극적인 언어를 사용하지 마세요.
- 대신 상황을 객관적으로 설명하거나 비유적인 표현을 사용하여 안전 정책(AI Safety Policy)에 저촉되지 않도록 하세요.
- 어린이도 이해할 수 있도록 쉽고 유익하게 구성하세요.

[기사 제목] {title}
[기사 본문] {content[:1500]}

아래 JSON 형식으로만 응답:
```json
{{
  "comic_title": "만화 제목 (공익적/객관적 문구)",
  "panels": [
    {{
      "panel": 1,
      "scene_prompt": "이미지 생성 AI용 영어 프롬프트 (안전하고 비폭력적인 묘사)",
      "dialogue": "등장인물 대사 또는 나레이션 (한국어)",
      "description": "장면 요약 (한국어)"
    }}
  ]
}}
```
"""
    result = call_ai(prompt)
    return json.dumps(result, ensure_ascii=False, indent=2) if result else "{}"

# async로 호출할 수 있도록 래핑
async def async_analyze_credibility(
    title: str, 
    content: str, 
    source: Optional[str] = None,
    related_articles: Optional[List[Dict[str, str]]] = None,
    is_old_article: bool = False
) -> Dict:
    return await asyncio.to_thread(analyze_credibility, title, content, source, related_articles, is_old_article)

async def async_extract_terms(content: str) -> List[Dict]:
    return await asyncio.to_thread(extract_terms, content)

async def async_extract_persons(title: str, content: str) -> List[Dict]:
    return await asyncio.to_thread(extract_persons, title, content)

async def async_generate_comic_script(title: str, content: str) -> str:
    return await asyncio.to_thread(generate_comic_script, title, content)
