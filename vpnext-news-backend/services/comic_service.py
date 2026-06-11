import logging
import httpx
import json
import asyncio
from typing import Optional, List, Tuple, Dict
from ai_analyzer import gemini_client, _parse_json
from config import GATEWAY_API_KEY

logger = logging.getLogger(__name__)

async def generate_comic_data(news_id: int, news_title: str, news_body: str, custom_prompt: str = None) -> Tuple[List, List]:
    """
    뉴스 요약본을 기반으로 10대~20대가 직관적이고 재미있게 이해할 수 있는 3~8컷 만화 시나리오를 생성합니다.
    각 컷별로 이미지 생성 AI를 위한 영어 묘사(scene_prompt)와 하단에 노출될 한국어 대사/해설(caption)을 한 번에 생성한 후,
    이미지 생성 API를 병렬로 호출하여 결과 데이터를 반환합니다.
    """
    logger.info(f"[만화 #{news_id}] 요약본 기반 웹툰 생성 시작 (커스텀 프롬프트: {'O' if custom_prompt else 'X'})")
    
    # 1. 뉴스 요약 및 만화 스크립트(3~8컷) 생성용 프롬프트 작성
    base_instructions = f"""
당신은 어려운 뉴스를 10대와 20대가 직관적이고 재미있게 이해할 수 있도록 웹툰 시나리오로 각색하는 전문 웹툰 작가입니다.
제시된 [뉴스 요약본]을 바탕으로, 1020 세대의 눈높이에 맞추어 친근하고 자연스러운 흐름이 이어지는 **3컷에서 8컷 사이**의 만화 시나리오를 작성하세요.

[뉴스 요약본]
제목: {news_title}
내용 요약: {news_body}
"""

    if custom_prompt and custom_prompt.strip():
        user_injection = f"""
[사용자 특별 요청사항 - 만화 구성 시 반드시 최우선 반영할 것]
{custom_prompt}
"""
        base_instructions += user_injection

    rules = """
[만화 시나리오 작성 및 JSON 출력 규칙]
1. 요약본 기반 흐름 설계: 기사 요약본의 기승전결(도입 - 핵심 내용 설명 - 영향/결론)이 매끄럽게 연결되도록 최소 3컷, 최대 8컷의 만화 구성을 만드세요.
2. 타겟 독자 (1020대): 어조를 매우 친근하고 자연스럽게 구성하세요. 트렌디한 구어체, 친근한 반말이나 해요체 가능, 비속어 금지.
3. 시각적 비유 및 스토리텔링: 어려운 정치, 경제, 사회 개념을 일상적인 상황이나 비유(예: 치킨 가격, 친구 간의 대화, 게임 아이템 등)로 쉽게 변환하여 표현하세요.
4. 이미지 프롬프트 작성 (영어): 
   - 각 컷의 `scene_prompt`는 이미지 생성 AI(DALL-E)가 이해할 수 있는 구체적인 영어 묘사여야 합니다.
   - 텍스트나 말풍선이 이미지 안에 직접 포함되지 않도록 하십시오 (No text, no speech bubbles, no typography).
   - 모든 컷에서 인물과 화풍의 일관성을 유지할 수 있도록 공통 스타일 키워드를 포함하세요.
   - 필수 화풍 키워드: "Korean casual webtoon style, flat coloring, clean lines, highly expressive comic style, vibrant colors"
5. 한국어 대사/해설 (caption):
   - 이미지 내부가 아닌, 이미지 하단에 텍스트 형태로 노출될 대사나 나레이션입니다.
   - 1020 독자가 흥미를 가질 만한 생동감 넘치는 한국어 구어로 작성하세요.
6. 작성 방식 안내: 이 시나리오는 전체 내용을 영문 프롬프트로 제작한 뒤 한글로 번역하는 방식이 아닙니다. 각 컷마다 해당 컷의 '영문 이미지 묘사(scene_prompt)'와 '한국어 대사/해설(caption)'을 별도로 작성하여 JSON 구조로 출력하는 방식입니다.

아래 JSON 형식으로만 응답해야 합니다 (이외의 텍스트나 설명 절대 금지):
```json
{
  "comic_title": "1020 맞춤형 웹툰 제목",
  "panels": [
    {
      "panel_num": 1,
      "scene_prompt": "Detailed English description of the scene for AI image generator. Include character action, emotion, background. Add style keywords.",
      "caption": "컷에 해당하는 자연스러운 한국어 대사 또는 해설"
    }
  ]
}
```
"""

    prompt_generator = base_instructions + rules
    
    try:
        response_text = await gemini_client.call(prompt_generator)
        if not response_text:
            raise Exception("Gemini로부터 시나리오를 받지 못했습니다.")
            
        # JSON 파싱
        parsed = _parse_json(response_text)
        if not parsed or "panels" not in parsed:
            raise Exception(f"시나리오 JSON 파싱 실패: {response_text}")
            
        panels = parsed["panels"]
        logger.info(f"[만화 #{news_id}] {len(panels)}컷 시나리오 생성 완료. 이미지 생성 시작...")
    except Exception as e:
        logger.error(f"[만화 #{news_id}] 시나리오 생성 중 오류 발생: {e}")
        # 폴백 시나리오
        panels = [
            {"panel_num": 1, "scene_prompt": "A cute character reading news with a shocked expression, Korean casual webtoon style, vibrant colors", "caption": "어려운 뉴스를 한눈에 요약해 줄게!"},
            {"panel_num": 2, "scene_prompt": "A character explaining things on a blackboard, Korean casual webtoon style, vibrant colors", "caption": "뉴스 내용을 1020 눈높이로 쉽게 풀어 설명하는 중!"},
            {"panel_num": 3, "scene_prompt": "A happy character understanding everything, thumbs up, Korean casual webtoon style, vibrant colors", "caption": "이제 이 기사 내용이 완벽하게 이해됐어!"}
        ]

    # 2. 각 Panel에 대해 이미지 생성 API를 비동기 병렬로 호출
    gateway_url = "https://factchat-cloud.mindlogic.ai/v1/gateway/images/generate/"
    headers = {
        "Authorization": f"Bearer {GATEWAY_API_KEY}",
        "Content-Type": "application/json"
    }

    async def generate_single_panel_image(http_client: httpx.AsyncClient, panel: Dict) -> Dict:
        panel_num = panel.get("panel_num", 1)
        scene_prompt = panel.get("scene_prompt", "")
        caption = panel.get("caption", "")
        
        payload = {
            "model": "gpt-image-1", 
            "prompt": scene_prompt,
            "quality": "high", 
            "number_of_images": 1
        }
        
        try:
            logger.info(f"[만화 #{news_id} - {panel_num}컷] 이미지 생성 API 호출 중...")
            response = await http_client.post(gateway_url, json=payload, headers=headers)
            response.raise_for_status()
            res_json = response.json()
            
            if "data" in res_json and len(res_json["data"]) > 0:
                img_url = res_json["data"][0]["url"]
                logger.info(f"[만화 #{news_id} - {panel_num}컷] 이미지 생성 완료: {img_url}")
                return {"url": img_url, "caption": caption}
            else:
                logger.error(f"[만화 #{news_id} - {panel_num}컷] 이미지 주소 미반환. 응답: {res_json}")
                return {"url": "https://placehold.co/600x600/1e293b/yellow?text=Safety+Block", "caption": f"[안전 차단] {caption}"}
        except Exception as e:
            logger.error(f"[만화 #{news_id} - {panel_num}컷] 이미지 생성 에러: {e}")
            return {"url": "", "caption": caption}

    comic_data = []
    raw_urls = []

    async with httpx.AsyncClient(timeout=65.0) as http_client:
        tasks = [generate_single_panel_image(http_client, p) for p in panels]
        results = await asyncio.gather(*tasks)
        
        for res in results:
            comic_data.append(res)
            if res["url"]:
                raw_urls.append(res["url"])

    return comic_data, raw_urls
