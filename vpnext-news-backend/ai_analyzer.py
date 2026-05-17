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
MODEL = "llama-3.3-70b-versatile"  # 무료 tier에서 가장 성능 좋은 모델

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


def _call(prompt: str) -> Optional[dict]:
    """✅ Groq API 호출 (Gemini → Groq 교체 핵심)"""
    # 너무 AI돌린 티가 나요...
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2048,
        )
        return _parse_json(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"Groq 호출 실패: {e}")
        return None


# analyze_credibility, extract_terms, extract_persons, generate_comic 함수는
# 기존 코드 그대로 사용 가능 — _call()만 바꿨으므로 자동 적용됨

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


async def generate_comic_data(news_id: int, news_title: str, news_body: str) -> tuple[list, list]:
    """
     Google GenAI SDK를 활용하여 뉴스를 분석하고 4컷 만화 시나리오 및 URL을 생성합니다.
    """
    # JSON 출력을 강제하는 설정 (딕셔너리 형태로 전달 가능)
    generation_config = {"response_mime_type": "application/json"}
    
    # 최신 무료 모델 지정
    MODEL_ID = "gemini-2.5-flash"

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
        # 비동기(aio) 클라이언트로 호출
        analysis_response = await gemini_client.aio.models.generate_content(
            model=MODEL_ID,
            contents=analysis_prompt,
            config=generation_config
        )
        news_analysis = json.loads(analysis_response.text)
        logger.info(f"[만화 #{news_id}] Gemini 분석 완료: {news_analysis.get('category')} / {news_analysis.get('core_event', '')[:40]}")
    except Exception as e:
        logger.warning(f"Gemini 뉴스 분석 실패, 기본 분석으로 진행: {e}")
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

    comic_prompt = f"""당신은 트렌디하고 유머러스한 세계 최고의 '뉴스 정치/사회 풍자 웹툰 작가'입니다. 
아래 분석 결과를 바탕으로 4컷 만화 시나리오를 작성하세요.

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

작성 규칙:
1. 1컷(발단), 2컷(전개), 3컷(절정), 4컷(결말)의 흐름으로 작성.
2. prompt (영문): 배경 힌트({bg_hint})를 반영하여 구체적인 행동, 표정 묘사. 마지막에 ", korean webtoon style, 2D comic illustration, highly expressive cartoon characters, dramatic lighting, bold black outlines, flat cel-shading colors, dynamic composition, cinematic comic panel, humorous tone" 태그 필수.
3. caption (한글): '[나레이션]'과 '[대사]'를 결합하여 유머러스하고 찰지게 표현. 각 컷당 30~50자 내외.

다음 JSON 배열 구조로만 정확하게 반환하세요:
[
  {{"prompt": "영문 프롬프트...", "caption": "[나레이션] ... \\n[대사] ..."}},
  {{"prompt": "영문 프롬프트...", "caption": "[나레이션] ... \\n[대사] ..."}},
  {{"prompt": "영문 프롬프트...", "caption": "[나레이션] ... \\n[대사] ..."}},
  {{"prompt": "영문 프롬프트...", "caption": "[나레이션] ... \\n[대사] ..."}}
]"""

    try:
        comic_response = await gemini_client.aio.models.generate_content(
            model=MODEL_ID,
            contents=comic_prompt,
            config=generation_config
        )
        scenes = json.loads(comic_response.text)
    except Exception as e:
        logger.error(f"Gemini 만화 시나리오 생성 실패: {e}")
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
            f"?model=flux&width=1024&height=512&nologo=true&seed={seed_value}"
        )
        
        comic_data.append({"url": url, "caption": scene.get("caption", f"Scene {idx + 1}")})
        raw_urls.append(url)

    return comic_data, raw_urls
