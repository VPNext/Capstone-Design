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
    "gemini-2.5-flash",       # 가장 안정적인 메인 모델
    "gemini-3.1-flash-lite",  # 일일 한도가 500으로 가장 넉넉한 모델
    "gemini-2.5-flash-lite",
    "gemini-3-flash"          # 3.0은 API 명칭이 다를 수 있어 후순위 배치
]

async def generate_comic_data(news_id: int, news_title: str, news_body: str) -> tuple[list, list]:
    """
     Google GenAI SDK를 활용하여 뉴스를 분석하고 4컷 만화 시나리오 및 URL을 생성합니다.
    """
    generation_config = {"response_mime_type": "application/json"}
    
   # 2. 헬퍼 함수 에러 핸들링 강화 (404 에러 포함)
    async def generate_with_fallback(prompt: str) -> str:
        last_error = None
        for model_id in FALLBACK_MODELS:
            try:
                logger.info(f"[만화 #{news_id}] {model_id} 모델로 생성을 시도합니다...")
                response = await gemini_client.aio.models.generate_content(
                    model=model_id,
                    contents=prompt,
                    config=generation_config
                )
                return response.text
            except Exception as e:
                error_msg = str(e).lower()
                last_error = e
              
                if any(err in error_msg for err in ["429", "quota", "exhausted", "404", "not found"]):
                    logger.warning(f"[만화 #{news_id}] {model_id} 사용 불가(한도초과 or 미지원). 다음 모델로 넘어갑니다.")
                    continue
                else:
                    
                    logger.error(f"[만화 #{news_id}] {model_id} 예상치 못한 오류: {e}")
                    raise e
                    
        raise Exception(f"모든 모델의 호출이 실패했습니다. (마지막 오류: {last_error})")

    logger.info(f"[만화 #{news_id}] 분석 및 만화 생성 시작")
    
    # ── [1단계] 뉴스 다각도 분석 ───────────────────────────────────────────────
    # (코믹 만화에 더 적합한 다각적 분석 요청)
    prompt_all = f"""당신은 날카로운 웹툰 작가입니다. 
아래 뉴스를 기반으로 코믹 만화를 그리기 위해 상세하게 분석하세요.

[뉴스 기사]
제목: {news_title}
본문: {news_body}

[분석 규칙 (영어 dialogue 생성 필수)]
1. 핵심 사건, 주요 인물, 기사의 전반적인 분위기를 파악하세요.
2. 기사의 풍자 포인트나 코믹한 상황을 잡아내세요.
3. 주요 인물들이 나눌법한 **짧고 코믹한 영문 대사(Dialogue in English)**를 4장면에 걸쳐 구상하세요. 
   (영어만 깔끔하게 텍스트로 그려지므로 영어 대사가 필수입니다).

[결과 포맷 (JSON)]
```json
{{
  "category": "분야",
  "core_event": "핵심 사건 한줄 요약",
  "main_actors": ["인물1", "인물2"],
  "emotion": "전반적 분위기(예: humorous, satirical, tense)",
  "satire_point": "풍자 포인트",
  "scenes": [
    {{
      "situation": "1컷 상황 묘사",
      "korean_dialogue": "캐릭터 A: '짧은 한국어 대사!'"
    }},
    {{
      "situation": "2컷 상황 묘사",
      "korean_dialogue": "캐릭터 B: '재미있는 한국어 답변...'"
    }},
    {{
      "situation": "3컷 상황 묘사",
      "korean_dialogue": "캐릭터 A: '역동적인 한국어 감탄사!'"
    }},
    {{
      "situation": "4컷 상황 묘사",
      "korean_dialogue": "캐릭터 B: '재치있는 한국어 마무리 대사.'"
    }}
  ]
}}
```"""

    try:
        analysis_text = await generate_with_fallback(prompt_all)
        news_analysis = json.loads(analysis_text)
        logger.info(f"[만화 #{news_id}] 1단계 분석 완료.")
    except Exception as e:
        logger.error(f"[만화 #{news_id}] 뉴스 분석 실패: {e}")
        raise Exception("뉴스 분석 중 오류가 발생했습니다.")

    # ── [2단계] 단일 4컷 코믹 만화 통합 프롬프트 생성 ───────
    
    scenes = news_analysis.get("scenes", [])
    if len(scenes) < 4:
        raise Exception("만화 장면 생성 데이터가 부족합니다.")
    
    core_theme = news_analysis.get("core_event", "a news story")
    actors_str = ", ".join(news_analysis.get("main_actors", []))
    
    final_integrated_prompt = f"""A single-image, professional-grade 4-panel comic strip grid (2x2 layout), in a vibrant Korean webtoon style, humorous tone. No captions below the image. All dialogue is inside speech bubbles.

The comic is about: {core_theme}, featuring {actors_str}.

**PANEL 1:**
Visually describe: {scenes[0]['situation']}
Dialogue: Speech bubbles with legible and accurate KOREAN text: "{scenes[0]['korean_dialogue']}"

**PANEL 2:**
Visually describe: {scenes[1]['situation']}
Dialogue: Speech bubbles with legible and accurate KOREAN text: "{scenes[1]['korean_dialogue']}"

**PANEL 3:**
Visually describe: {scenes[2]['situation']}
Dialogue: Speech bubbles with legible and accurate KOREAN text: "{scenes[2]['korean_dialogue']}"

**PANEL 4:**
Visually describe: {scenes[3]['situation']}
Dialogue: Speech bubbles with legible and accurate KOREAN text: "{scenes[3]['korean_dialogue']}"

**Style requirements:** MASTERPIECE, high definition, detailed characters, dynamic angles, expressive faces. IMPORTANT: All text inside speech bubbles MUST be written in correct KOREAN Hangul letters."""

    # ── [3단계] 단일 이미지 생성 API 호출 (OpenAI 모델 사용) ──────────────────
    comic_data = []
    raw_urls = []

    gateway_url = "https://factchat-cloud.mindlogic.ai/v1/gateway/images/generate/"
    headers = {
        "Authorization": f"Bearer {GATEWAY_API_KEY}",
        "Content-Type": "application/json"
    }

    # 타임아웃은 DALL-E 3 호출에 맞게 넉넉히 설정
    async with httpx.AsyncClient(timeout=65.0) as http_client:
        
        # 4컷 통합 프롬프트
        prompt_text = final_integrated_prompt
        # 설명글을 지우기 위해 caption을 빈 문자열로 설정
        caption = "" 
        
        # ✨ 수정: quality를 문서에 맞게 "high"로 변경 (또는 생략 가능)
        payload = {
            "model": "gpt-image-1.5", 
            "prompt": prompt_text,
            "quality": "high", 
            "number_of_images": 1
        }

        try:
            logger.info(f"[만화 #{news_id}] 4컷 코믹 웹툰 통합 이미지 생성 API 호출 중... (OpenAI 모델 사용)")
            response = await http_client.post(gateway_url, json=payload, headers=headers)
            response.raise_for_status()
            
            res_json = response.json()
            
            # ✨ 수정: 데이터가 정상적으로 들어왔는지 검사하는 방어 코드 추가
            if "data" in res_json and len(res_json["data"]) > 0:
                image_url = res_json["data"][0]["url"]
                
                # 설명글 없이 이미지 URL만 담은 데이터 배열 생성
                comic_data.append({"url": image_url, "caption": caption})
                raw_urls.append(image_url)
                logger.info(f"[만화 #{news_id}] 말풍선 포함 4컷 만화 이미지 생성 완료.")
            else:
                # 데이터가 비어있다면 OpenAI의 정책 위반(Safety) 차단일 확률이 99%입니다.
                logger.error(f"[만화 #{news_id}] 이미지 반환 실패. API 응답: {res_json}")
                comic_data.append({
                    "url": "https://placehold.co/600x600/1e293b/yellow?text=Blocked+by+AI+Safety+Policy", 
                    "caption": "정치적 이슈, 범죄, 실존 인물 등 AI 안전 정책에 의해 만화 생성이 차단되었습니다."
                })

        except Exception as e:
            logger.error(f"[만화 #{news_id}] 이미지 생성 실패: {e}")
            comic_data.append({"url": "", "caption": "이미지 생성에 실패했습니다."})

    return comic_data, raw_urls
