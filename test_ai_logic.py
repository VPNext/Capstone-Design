import sys
import os
import asyncio
import logging

# Add the project directory to sys.path
sys.path.append(os.path.abspath("vpnext-news-backend"))

from ai_analyzer import (
    analyze_credibility, 
    extract_terms, 
    generate_comic_script
)

logging.basicConfig(level=logging.INFO)

async def test_analysis():
    print("--- Testing AI Analysis Logic ---")
    title = "테스트 뉴스: 인공지능 기술의 미래"
    content = "인공지능 기술은 나날이 발전하고 있으며, 우리의 삶을 크게 변화시킬 것입니다. 하지만 기술 오용에 대한 우려도 커지고 있습니다."
    source = "테스트 언론사"
    
    related = [
        {"title": "AI 발전의 명암", "source": "A사", "url": "https://a.com", "summary": "AI는 좋지만 나쁘기도 함"},
        {"title": "미래 기술 트렌드", "source": "B사", "url": "https://b.com", "summary": "AI가 대세다"}
    ]

    print("\n1. 신뢰도 분석 테스트...")
    result = await analyze_credibility(title, content, source, related)
    if result and "score" in result:
        print(f"Success! Score: {result['score']}, Label: {result['label']}")
        print(f"Reason: {result['reason'][:100]}...")
        print(f"Summary: {result['summary'][:100]}...")
    else:
        print("Failed: analyze_credibility returned invalid result")

    print("\n2. 용어 추출 테스트...")
    terms = await extract_terms(content)
    if terms:
        print(f"Success! Extracted {len(terms)} terms.")
    else:
        print("Failed: No terms extracted")

    print("\n3. 만화 스크립트 테스트 (Safety Policy Check)...")
    comic = await generate_comic_script(title, content)
    if comic:
        print("Success! Comic script generated.")
    else:
        print("Failed: Comic script generation failed or blocked")

if __name__ == "__main__":
    asyncio.run(test_analysis())

