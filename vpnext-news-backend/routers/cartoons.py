from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, Article
from services.comic_service import generate_comic_data
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["cartoons"])

class ComicGenerateRequest(BaseModel):
    custom_prompt: Optional[str] = None

@router.post("/news/{news_id}/comic")
async def generate_comic_endpoint(
    news_id: int, 
    payload: Optional[ComicGenerateRequest] = None,
    db: Session = Depends(get_db)
):
    article = db.query(Article).filter(Article.id == news_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="기사를 찾을 수 없습니다.")

    news_title = article.title or ""
    # 요약본을 최우선적으로 확보하여 기반으로 삼음
    news_summary = article.ai_summary or article.summary or ""
    if not news_summary and article.content:
        # 요약본이 없으면 본문 앞부분을 대안으로 사용
        news_summary = article.content[:1000]
    
    news_body = news_summary.strip() if news_summary else news_title

    custom_prompt = payload.custom_prompt if payload else None

    try:
        comic_data, raw_urls = await generate_comic_data(news_id, news_title, news_body, custom_prompt)
    except Exception as e:
        logger.error(f"만화 생성 실패: {e}")
        raise HTTPException(status_code=500, detail="만화 시나리오 생성 중 오류가 발생했습니다.")

    # DB에 저장
    article.comic_script = json.dumps(comic_data, ensure_ascii=False)
    db.commit()

    return {
        "message": "만화 생성 완료",
        "comic_urls": comic_data,
        "prewarming": False,  
    }

@router.get("/cartoons", summary="AI 만화 모음집 조회")
def get_cartoons(db: Session = Depends(get_db)):
    articles = (
        db.query(Article)
        .filter(Article.comic_script.isnot(None))
        .order_by(Article.created_at.desc()) 
        .all()
    )

    result = []
    for a in articles:
        try:
            urls = json.loads(a.comic_script)
            if urls:
                result.append({
                    "news_id":    a.id,
                    "title":      a.title,
                    "source":     a.source,
                    "summary":    a.ai_summary or a.summary or "",
                    "comic_urls": urls,
                    "published_at": a.published_at,
                })
        except Exception:
            continue

    return result
