"""
Grok AI 분석 모듈 (Groq SDK 사용)
"""
import json, logging, re
from typing import Dict, List, Optional
from groq import Groq
from google import genai
from config import GROQ_API_KEY, GEMINI_API_KEY

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

    # ── [1단계] 뉴스 분석 ─────────────────────────────────────────
    analysis_prompt = f"""아래 뉴스를 읽고, 만화로 표현하기 위해 필요한 핵심 정보를 JSON으로 추출하세요.

[뉴스 제목]: {news_title}
[뉴스 내용]: {news_body}

다음 JSON 구조에 맞춰서 답하세요:
{{
  "category": "뉴스 분야 (정치/경제/사회/국제/스포츠/연예/과학기술 중 하나)",
  "main_actors": ["주요 인물 또는 기관 1", "주요 인물 또는 기관 2"],
  "location": "주요 배경 장소",
  "core_event": "핵심 사건을 한 문장으로",
  "cause": "사건의 원인 또는 배경",
  "consequence": "결과 또는 파장",
  "emotion": "이 뉴스의 전반적 감정/분위기",
  "visual_keywords": ["시각 키워드 1", "키워드 2", "키워드 3"]
}}"""

    try:
        # 기존 직접 호출 대신 fallback 헬퍼 함수 사용
        analysis_text = await generate_with_fallback(analysis_prompt)
        news_analysis = json.loads(analysis_text)
        logger.info(f"[만화 #{news_id}] 분석 완료: {news_analysis.get('category')} / {news_analysis.get('core_event', '')[:40]}")
    except Exception as e:
        logger.warning(f"뉴스 분석 실패, 기본 분석으로 진행: {e}")
        news_analysis = {
            "category": "일반", "main_actors": [], "location": "Korea",
            "core_event": news_title, "cause": "", "consequence": "",
            "emotion": "neutral", "visual_keywords": []
        }

    # ── [2단계] 만화 시나리오 생성 ─────────────────────────────────────────
    category        = news_analysis.get("category", "일반")
    main_actors     = ", ".join(news_analysis.get("main_actors", [])) or "관련 인물들"
    location        = news_analysis.get("location", "Korea")
    core_event      = news_analysis.get("core_event", news_title)
    cause           = news_analysis.get("cause", "")
    consequence     = news_analysis.get("consequence", "")
    emotion         = news_analysis.get("emotion", "neutral")
    visual_keywords = ", ".join(news_analysis.get("visual_keywords", []))

    category_hints = {
        "정치":   "government building interior, politicians in suits, parliament hall",
        "경제":   "stock market trading floor, financial charts on screens",
        "사회":   "Korean city street, diverse citizens, public space",
        "국제":   "international meeting room, world map",
        "스포츠": "sports stadium, athletes in action",
        "연예":   "entertainment stage, spotlights",
        "과학기술": "modern laboratory, tech office",
    }
    bg_hint = category_hints.get(category, "Korean urban setting, realistic background")

  
    comic_prompt = f"""당신은 세계 최고의 '뉴스 스토리보드 아티스트'이자 '풍자 웹툰 작가'입니다. 
아래 뉴스의 핵심 내용을 요약하여, 대중이 직관적이고 아주 재미있게 이해할 수 있는 4컷 만화 시나리오를 작성하세요.

━━━ 뉴스 분석 결과 ━━━
- 분야: {category}
- 핵심 사건: {core_event}
- 주요 인물/기관: {main_actors}
- 배경: {location}
- 원인: {cause}
- 결과/파장: {consequence}
- 감정/분위기: {emotion}
- 시각 키워드: {visual_keywords}
━━━━━━━━━━━━━━━━━━━━━━

━━━ 📖 4컷 만화 스토리보드 구성 규칙 (기승전결) ━━━
뉴스의 본문 내용과 철저히 연관되게 구성하며, 누구나 "아, 이 뉴스 이야기구나!" 하고 무릎을 탁 칠 수 있도록 만드세요.
- 1컷 (흥미 유발/발단): 뉴스의 가장 핵심적인 이슈나 충격적인 사실을 직관적으로 보여주며 독자의 시선 집중!
- 2컷 (전개/설명 1): 사건의 원인이나 배경을 재미있는 비유나 상황으로 쉽게 설명.
- 3컷 (위기/설명 2): 사건이 최고조에 달한 상황이나 예상치 못한 전개를 과장되고 코믹하게 묘사.
- 4컷 (결말/펀치라인): 사건의 결과나 파장을 유머러스하게 마무리하며 여운(또는 뼈 있는 농담/풍자) 남기기.

━━━ 🎨 영문 프롬프트(prompt) 작성 절대 규칙 (텍스트/말풍선 묘사 절대 금지) ━━━
이미지 생성 AI가 글씨 없이 **순수하게 인물과 배경 그림만** 완벽하게 뽑아내도록 해야 합니다.
1. [텍스트 렌더링 금지]: 프롬프트 안에 text, speech bubble, typography, words, caption 등의 단어를 **절대** 넣지 마세요. 그림 안에 이상한 글씨가 뭉개져서 생성되는 것을 막아야 합니다.
2. [캐릭터 수 제한]: 한 컷당 등장인물은 **최대 1~2명**으로 제한하세요. 
3. [필수 퀄리티 태그]: 영문 프롬프트 맨 마지막에는 무조건 아래의 보정 태그를 붙이세요.
   ", {bg_hint}, masterpiece, high quality, flawless anatomy, clear facial features, korean webtoon style, 2D comic illustration, flat cel-shading, dynamic angle, highly expressive faces, humorous tone"

━━━ 💬 캡션(caption) 작성 규칙 (프론트엔드 UI 적용) ━━━
실제 캐릭터의 대사와 설명은 프론트엔드 웹페이지 상에서 UI로 그려집니다. 따라서 반드시 아래 형식을 정확히 지켜서 작성해야 합니다.
형식: "[나레이션] 상황을 설명하는 재치있는 문장 [대사] 캐릭터가 하는 생동감 넘치는 짧은 대사"

다음 JSON 배열 구조로만 정확하게 반환하세요:
```json
[
  {{"prompt": "영문 프롬프트...", "caption": "[나레이션] ... [대사] ..."}},
  {{"prompt": "영문 프롬프트...", "caption": "[나레이션] ... [대사] ..."}},
  {{"prompt": "영문 프롬프트...", "caption": "[나레이션] ... [대사] ..."}},
  {{"prompt": "영문 프롬프트...", "caption": "[나레이션] ... [대사] ..."}}
]"""

    try:
        # 시나리오 생성 단계에도 동일하게 fallback 적용
        comic_text = await generate_with_fallback(comic_prompt)
        scenes = json.loads(comic_text)
    except Exception as e:
        logger.error(f"만화 시나리오 생성 실패: {e}")
        raise Exception("만화 시나리오 생성 중 오류가 발생했습니다.")
    # ── [3단계] Pollinations 이미지 URL 결합 ────────────────────────────────
    comic_data = []
    raw_urls = []

    for idx, scene in enumerate(scenes[:4]):
        prompt_text = scene.get("prompt", "korean webtoon style comic illustration")
        encoded_prompt = urllib.parse.quote(prompt_text)
        
        seed_value = news_id * 100 + idx
        url = (
            f"https://image.pollinations.ai/prompt/{encoded_prompt}"
            f"?model=flux&width=800&height=400&nologo=true&seed={seed_value}"
        )
        
        comic_data.append({"url": url, "caption": scene.get("caption", f"[나레이션] 장면 {idx + 1} [대사] ")})
        raw_urls.append(url)

    return comic_data, raw_urls
