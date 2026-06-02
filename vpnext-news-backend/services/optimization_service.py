import logging
import asyncio
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import Article, SessionLocal
from ai_analyzer import analyze_credibility
from article_scraper import get_source_from_url

logger = logging.getLogger(__name__)

async def optimize_credibility_batch(db: Session, batch_size: int = 10):
    """
    저장된 기사 중 분석된 지 오래되었거나, 관련 기사가 새로 많이 쌓인 기사를 재분석하여 신뢰도를 최적화합니다.
    데이터 과다 참조로 인한 부정확성을 방지하기 위해 '스마트 샘플링'을 적용합니다.
    """
    # 1. 재분석 대상 선정: 
    # 이미 분석되었지만(is_analyzed=True), 
    # 해당 기사와 유사한 제목을 가진 다른 기사가 5건 이상 존재하며,
    # 마지막 업데이트 이후 시간이 꽤 흐른 기사들 (단순화를 위해 여기서는 랜덤 또는 순차 선정)
    
    # 예시: 최근 10개의 분석된 기사 중 재검증이 필요한 것 선정
    target_articles = db.query(Article).filter(
        Article.is_analyzed == True,
        Article.content != None
    ).order_by(func.random()).limit(batch_size).all()

    if not target_articles:
        logger.info("최적화할 기사가 없습니다.")
        return

    for art in target_articles:
        # 2. 스마트 샘플링 (Noise Filtering):
        # 너무 많은 데이터 참조는 AI가 핵심 맥락을 놓치게 하므로, 
        # 가장 관련성이 높고 '신뢰도가 높은' 소스의 기사 3~5개만 선별합니다.
        
        keyword = art.title[:10]
        related_pool = db.query(Article).filter(
            Article.title.like(f"%{keyword}%"),
            Article.url != art.url,
            Article.is_analyzed == True
        ).all()

        # 데이터가 너무 적으면 최적화 의미가 없음
        if len(related_pool) < 3:
            continue

        # 신뢰도가 높은 순서 + 최신순으로 정렬하여 상위 5개만 추출 (과다 참조 방지)
        # score가 높은 기사를 우선적으로 참조하여 '정확한' 기준점 제시
        sorted_related = sorted(
            related_pool, 
            key=lambda x: (x.credibility_score or 0, x.created_at), 
            reverse=True
        )[:5]

        related_data = [
            {
                "title": r.title,
                "source": r.source or get_source_from_url(r.url),
                "summary": r.ai_summary or r.summary or ""
            }
            for r in sorted_related
        ]

        logger.info(f"기사 최적화 시작: {art.title[:30]}... (참조 기사: {len(related_data)}건)")

        try:
            # 3. 재분석 실행
            new_credibility = await analyze_credibility(
                title=art.title,
                content=art.content,
                source=art.source,
                related_articles=related_data
            )

            # 4. 결과 업데이트
            if new_credibility:
                art.credibility_score = new_credibility.get("score")
                art.credibility_label = new_credibility.get("label")
                art.credibility_reason = f"[최적화 업데이트] {new_credibility.get('reason')}"
                art.red_flags = new_credibility.get("red_flags", [])
                art.ai_summary = new_credibility.get("summary")
                
                db.commit()
                logger.info(f"기사 최적화 완료: {art.title[:30]}")
        except Exception as e:
            logger.error(f"최적화 중 오류 발생 ({art.url}): {e}")
            db.rollback()

async def run_optimization():
    db = SessionLocal()
    try:
        logger.info("=== 수동 신뢰도 최적화 배치 시작 ===")
        await optimize_credibility_batch(db)
        logger.info("=== 수동 신뢰도 최적화 배치 정상 완료 ===")
    except Exception as e:
        logger.error(f"최적화 작업 중 치명적 오류 발생: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # 독립 실행 시 테스트용
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    print("\n[안내] 신뢰도 최적화 단독 실행을 시작합니다...")
    asyncio.run(run_optimization())
    print("[안내] 모든 작업이 종료되었습니다.\n")