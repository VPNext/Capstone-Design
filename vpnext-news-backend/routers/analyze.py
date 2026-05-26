from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from services.analysis_service import run_full_analysis
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["analysis"])

@router.post("/analyze", summary="기사 AI 분석")
async def analyze(
    article_url: str,
    include_comic: bool = False,
    db: Session = Depends(get_db),
):
    try:
        analysis_result = await run_full_analysis(article_url, include_comic, db)
        return analysis_result
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        logger.error(f"분석 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="AI 분석 중 예상치 못한 오류가 발생했습니다.")
