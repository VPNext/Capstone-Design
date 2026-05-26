import logging
import httpx
import json
from typing import Optional, List, Tuple
from ai_analyzer import gemini_client
from config import GATEWAY_API_KEY

logger = logging.getLogger(__name__)

async def generate_comic_data(news_id: int, news_title: str, news_body: str, custom_prompt: str = None) -> Tuple[List, List]:
    """
    제미나이를 활용해 뉴스를 바탕으로 대사가 포함된 4컷 만화 프롬프트를 생성하고,
    이미지 생성 API를 호출하여 완성된 이미지를 반환합니다.
    (이전 브랜치 018587b1 로직 기반)
    """
    logger.info(f"[만화 #{news_id}] 분석 및 만화 생성 시작 (커스텀 프롬프트: {'O' if custom_prompt else 'X'})")
    
    base_instructions = f"""
당신은 코믹 웹툰 프롬프트 엔지니어입니다.
아래 뉴스를 바탕으로 '전연령층이 쉽게 이해할 수 있는 코믹 웹툰 스타일'의 4컷 만화(2x2 그리드) 생성용 영문 프롬프트를 작성하세요.

[뉴스 기사]
제목: {news_title}
본문: {news_body}
"""

    if custom_prompt and custom_prompt.strip():
        user_injection = f"""
[사용자 특별 요청사항 - 만화 묘사 시 아래 내용을 최우선으로 반영할 것!]
{custom_prompt}
"""
        base_instructions += user_injection

    rules = """
[이미지 프롬프트 작성 규칙 - 반드시 지킬 것]
1. 극단적 대사 압축: 말풍선 대사는 본문에서 핵심 메시지만 5~7단어로 압축해서 표현하세요. (예: "정부, 긴급 경제 대책 발표!" → "긴급 경제 대책 발표!")
2. 전연령 코믹 웹툰 화풍 고정: 프롬프트 전반에 과장된 캐릭터와 밝은 색감을 지시하세요. 
   (필수 포함 키워드: "Korean casual webtoon style, , highly expressive comic style, family-friendly, vibrant colors")
3. 직관적인 시각적 비유: 어려운 정치/경제 뉴스라도 전연령층이 이해할 수 있는 쉬운 상황으로 묘사하세요. 
4. 타이포그래피 강제: 각 컷 묘사 끝에 반드시 다음 문구를 토시 하나 틀리지 말고 포함하세요. 
   -> Speech bubble with clear, bold black sans-serif font. Exact text: "한국어대사"
5. 레이아웃: 프롬프트 시작에 'A 2x2 comic strip grid.'를 명시하고, Panel 1부터 Panel 4까지 나누어 묘사하세요.
6. 출력 형식: 부가적인 설명이나 마크다운 없이, 오직 이미지 생성 API에 직접 입력할 '단일 영문 프롬프트'만 출력하세요.
"""

    prompt_generator = base_instructions + rules
    
    try:
        # ai_analyzer의 GeminiClient.call()을 사용 (내부적으로 모델 폴백 처리됨)
        final_integrated_prompt = await gemini_client.call(prompt_generator)
        if not final_integrated_prompt:
            raise Exception("이미지 프롬프트 생성 결과가 비어 있습니다.")
        logger.info(f"[만화 #{news_id}] 이미지 프롬프트 생성 완료")
    except Exception as e:
        logger.error(f"[만화 #{news_id}] 프롬프트 생성 실패: {e}")
        raise e

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
                comic_data.append({"url": image_url})
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
