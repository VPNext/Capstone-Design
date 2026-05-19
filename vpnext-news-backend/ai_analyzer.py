"""
Grok AI 분석 모듈 (Groq SDK 사용)
"""
import json, logging, re
from typing import Dict, List, Optional
from groq import Groq
from google import genai
from config import GROQ_API_KEY, GEMINI_API_KEY, GATEWAY_API_KEY

logger = logging.getLogger(__name__)

client = Groq(api_key=GROQ_API_KEY)
# 1. Groq 무료 모델들을 성능/크기 순으로 정렬한 리스트
GROQ_FALLBACK_MODELS = [
    "llama-3.3-70b-versatile",  # 1순위: 가장 똑똑하지만 한도가 금방 참
    "llama-3.1-8b-instant",     # 2순위: 가볍고 빠르며 한도가 아주 넉넉함
    "mixtral-8x7b-32768",       # 3순위: 훌륭한 백업 모델
    "gemma2-9b-it"              # 4순위: 구글의 경량 모델
]

# 새로운 SDK 방식의 Client 초기화 (Groq 클라이언트와의 충돌 방지를 위해 변수명 분리)
gemini_client = genai.Client(api_key=GEMINI_API_KEY)


import re
import json
from typing import Optional
import os
import httpx
import urllib.parse

def _parse_json(text: str) -> Optional[dict]:
    """Groq AI의 텍스트 응답에서 JSON(딕셔너리)만 안전하게 추출"""
    if not text:
        return None

    try:
        # 1. ```json ... ``` 코드 블록 추출
        m = re.search(r"```json\s*(\{.*?\})\s*```", text, re.DOTALL)
        if m:
            parsed = json.loads(m.group(1))
            return parsed if isinstance(parsed, dict) else None

        # 2. 일반 텍스트에서 JSON 추출
        start_idx = text.find("{")
        end_idx = text.rfind("}") + 1

        if start_idx != -1 and end_idx > start_idx:
            parsed = json.loads(text[start_idx:end_idx])
            return parsed if isinstance(parsed, dict) else None

    except (json.JSONDecodeError, ValueError) as err:
        logger.error(f"JSON 파싱 실패: {err} \n[원본 텍스트 일부]: {text[:200]}...")

    return None

# Groq API 다중 모델 순차 호출 + 파싱 실패 시 재시도 로직
def _call(prompt: str, max_retries: int = 2) -> Optional[dict]:
    """✅ Groq API 다중 모델 순차 호출 + 파싱 실패 시 재시도 로직 추가"""
    last_error = None
    
    for model_id in GROQ_FALLBACK_MODELS:
        
        for attempt in range(max_retries):
            try:
                response = client.chat.completions.create(
                    model=model_id,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.2, 
                    max_tokens=2048,
                )
                
                
                content = response.choices[0].message.content
                
                
                parsed_data = _parse_json(content)
                
                
                if parsed_data is not None:
                    return parsed_data
                    
               
                raise ValueError("응답은 수신했으나 JSON 파싱에 실패했습니다.")

            except Exception as e:
                error_msg = str(e).lower()
                last_error = e
                
                # Case A: API 한도 초과(429) 에러인 경우
                if "429" in error_msg or "rate limit" in error_msg or "tokens" in error_msg:
                    logger.warning(f"Groq [{model_id}] 한도 초과. 다음 모델로 넘어갑니다.")
                    break  
                    
                # Case B: JSON 파싱 실패 또는 일시적 네트워크 오류인 경우
                logger.warning(f"Groq [{model_id}] 시도 {attempt+1}/{max_retries} 실패: {e}")
               
                

    logger.error(f"모든 Groq 모델 호출 및 재시도 실패. 마지막 에러: {last_error}")
    return None


# ── 분석 함수들 ─────

def analyze_credibility(title: str, content: str) -> Dict:
    """
    허위뉴스 신뢰도 분석
    score: 0.0~1.0  (1.0 = 매우 신뢰)
    label: '신뢰' | '주의' | '허위 의심'
    """
    prompt = f"""
당신은 뉴스 팩트체크 전문가입니다. 아래 기사를 분석해 신뢰도를 평가하세요.

[제목] {title}
[본문] {content[:3000]}

평가 기준:
1. 출처 명확성 (인용 출처·발언자 명시 여부)
2. 감정적·선동적 표현 여부
3. 과장·미검증 주장 여부
4. 사실과 의견의 혼동 여부
5. 제목과 본문 일치 여부

아래 JSON 형식으로만 응답:
```json
{{
  "score": 0.85,
  "label": "신뢰",
  "reason": "판단 근거 2~3문장",
  "red_flags": ["의심 표현1", "의심 표현2"],
  "summary": "기사 3줄 요약"
}}
```
score 범위: 0.7이상→신뢰, 0.4~0.7→주의, 0.4미만→허위 의심
"""
    result = _call(prompt)
    return result or {
        "score": 0.5, "label": "분석 불가",
        "reason": "AI 분석 중 오류 발생", "red_flags": [], "summary": "",
    }


def extract_terms(content: str) -> List[Dict]:
    """어려운 전문·시사 용어 추출 (최대 10개)"""
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
    result = _call(prompt)
    return result.get("terms", []) if result else []


def extract_persons(title: str, content: str) -> List[Dict]:
    """핵심 인물 추출 (최대 5명)"""
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
    result = _call(prompt)
    return result.get("persons", []) if result else []


def generate_comic(title: str, content: str) -> str:
    """4컷 만화 장면 스크립트 생성"""
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
    result = _call(prompt)
    return json.dumps(result, ensure_ascii=False, indent=2) if result else "{}"
#현재 ai이미지 url이 없음
# 이미지 생성은 별도로 프롬프트를 설정해서 생성해야 할듯함
#제미나이 무료버전으로는 이미지 생성이 안되나?



def full_analysis(title: str, content: str, include_comic: bool = False) -> Dict:
    """전체 분석 통합 실행"""
    logger.info(f"AI 분석 시작: {title[:50]}")
    result = {
        "credibility":     analyze_credibility(title, content),
        "key_persons":     extract_persons(title, content),
        "difficult_terms": extract_terms(content),
    }
    if include_comic:
        result["comic_script"] = generate_comic(title, content)
    return result

# 사용할 모델을 성능 및 선호도 순으로 정렬한 리스트
# (무료 한도가 0인 Pro 모델은 제외하고, 한도가 있는 Flash/Lite 위주로 구성)

FALLBACK_MODELS = [
    "gemini-2.5-flash",       # 1순위: 가장 빠르고 똑똑한 메인 모델
    "gemini-3.1-flash-lite",  # 2순위: 일일 한도가 넉넉한 라이트 모델
    "gemini-2.5-flash-lite",  # 3순위: 백업용 구형 라이트 모델
    "gemini-3-flash"          # 4순위: 최신 플래시 모델
]

async def generate_comic_data(news_id: int, news_title: str, news_body: str) -> tuple[list, list]:
    """
    제미나이를 활용해 뉴스를 바탕으로 대사가 포함된 4컷 만화 프롬프트를 생성하고,
    이미지 생성 API를 호출하여 완성된 이미지를 반환합니다.
    """
    logger.info(f"[만화 #{news_id}] 분석 및 만화 생성 시작")
    
    # ── [1단계] 제미나이를 통한 4컷 만화 통합 프롬프트 생성 ──
    # JSON 파싱 없이, 이미지 AI에게 던져줄 프롬프트 자체를 바로 생성하게 만듭니다.
    prompt_generator = f"""
당신은 코믹 웹툰 프롬프트 전문가입니다. 아래 뉴스를 바탕으로 고품질 4컷 만화(2x2 그리드)를 생성하기 위한 영문 프롬프트를 작성해 주세요.
반드시 각 컷(Panel)마다 상황 묘사와 함께, 말풍선(Speech bubble) 안에 들어갈 짧은 한국어 대사를 포함시켜야 합니다.

[뉴스 기사]
제목: {news_title}
본문: {news_body}

[작성 규칙]
1. 프롬프트는 영어로 작성하되, 말풍선 안의 대사는 반드시 "한국어" 그대로 적어주세요.
2. 대사는 글씨가 깨지지 않도록 최대한 짧고 간결하게 작성하세요.
3. 2x2 그리드 레이아웃(Top-Left, Top-Right, Bottom-Left, Bottom-Right)을 명확히 지시하세요.
4. 불필요한 설명 없이, 오직 이미지 생성 API에 들어갈 '프롬프트 텍스트'만 출력하세요.
"""

    final_integrated_prompt = ""
    last_error = None

    # ✨ 503 에러 대비 Fallback(대체 모델) 루프 적용
    for model_id in FALLBACK_MODELS:
        try:
            logger.info(f"[만화 #{news_id}] {model_id} 모델로 프롬프트 생성을 시도합니다...")
            response = await gemini_client.aio.models.generate_content(
                model=model_id,
                contents=prompt_generator,
            )
            final_integrated_prompt = response.text.strip()
            logger.info(f"[만화 #{news_id}] 이미지 프롬프트 생성 완료 ({model_id})")
            break  # 성공 시 루프 탈출
            
        except Exception as e:
            error_msg = str(e).lower()
            last_error = e
            
            # 503(서버 과부하) 또는 429(한도 초과) 에러인 경우 다음 모델로 시도
            if any(err in error_msg for err in ["503", "unavailable", "429", "quota", "exhausted"]):
                logger.warning(f"[만화 #{news_id}] {model_id} 서버 과부하/한도초과. 다음 모델로 재시도합니다.")
                continue
            else:
                logger.error(f"[만화 #{news_id}] {model_id} 예상치 못한 오류: {e}")
                raise e

    # 모든 모델이 실패했을 경우 예외 처리
    if not final_integrated_prompt:
        raise Exception(f"모든 AI 모델의 프롬프트 생성이 실패했습니다. (마지막 오류: {last_error})")


    # ── [2단계] 단일 이미지 생성 API 호출 ──
    comic_data = []
    raw_urls = []

    gateway_url = "https://factchat-cloud.mindlogic.ai/v1/gateway/images/generate/"
    headers = {
        "Authorization": f"Bearer {GATEWAY_API_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=65.0) as http_client:
        payload = {
            "model": "gpt-image-1-mini", 
            "prompt": final_integrated_prompt,
            "quality": "high", 
            "number_of_images": 1
        }

        try:
            logger.info(f"[만화 #{news_id}] 대사가 포함된 4컷 만화 이미지 생성 API 호출 중...")
            response = await http_client.post(gateway_url, json=payload, headers=headers)
            response.raise_for_status()
            
            res_json = response.json()
            
            if "data" in res_json and len(res_json["data"]) > 0:
                image_url = res_json["data"][0]["url"]
                
                # 프론트엔드에서 더 이상 텍스트 합성을 하지 않으므로 url만 깔끔하게 넘깁니다.
                comic_data.append({
                    "url": image_url
                })
                raw_urls.append(image_url)
                logger.info(f"[만화 #{news_id}] 만화 이미지 생성 완료.")
            else:
                logger.error(f"[만화 #{news_id}] 이미지 반환 실패. API 응답: {res_json}")
                comic_data.append({
                    "url": "https://placehold.co/600x600/1e293b/yellow?text=Blocked+by+AI+Safety+Policy", 
                    "caption": "안전 정책에 의해 차단되었습니다."
                })

        except Exception as e:
            logger.error(f"[만화 #{news_id}] 이미지 생성 실패: {e}")
            comic_data.append({"url": "", "caption": "이미지 생성에 실패했습니다."})

    return comic_data, raw_urls
