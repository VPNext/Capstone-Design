from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db, Article, SessionLocal
from rss_crawler import crawl_all
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["news"])

def _crawl_and_save():
    db = SessionLocal()
    try:
        articles = crawl_all()
        saved = 0
        for a in articles:
            if not db.query(Article).filter(Article.url == a["url"]).first():
                db.add(Article(**a))
                saved += 1
        db.commit()
        logger.info(f"크롤링 완료: {saved}건 저장")
    except Exception as e:
        logger.error(f"크롤링 저장 오류: {e}")
        db.rollback()
    finally:
        db.close()

@router.post("/crawl", summary="RSS 크롤링 즉시 실행")
async def trigger_crawl(bg: BackgroundTasks):
    bg.add_task(_crawl_and_save)
    return {"message": "백그라운드 크롤링 시작"}

@router.get("/news", summary="뉴스 목록")
def list_news(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    source: Optional[str] = None,
    keyword: Optional[str] = None,
    is_analyzed: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Article).order_by(Article.published_at.desc())
    if source:
        # 오직 네이버 뉴스 탭을 선택한 경우에만 외부 출처 기사 분석 오류를 방지하기 위해 
        # 기사 URL에 실제 naver.com이 포함된 실제 네이버 뉴스만 반환하도록 처리 (타 뉴스사는 영향 없음)
        if source.lower() == "naver":
            q = q.filter(Article.url.contains("naver.com"))
        else:
            from sqlalchemy import or_
            eng_to_kor = {
                "hani": "한겨레",
                "mk": "매일경제",
                "donga": "동아일보",
                "yonhap": "연합",
                "sbs": "SBS",
                "naver": "네이버",
                "khan": "경향",
                "hankyung": "한국경제"
            }
            kor_val = eng_to_kor.get(source.lower(), source)
            q = q.filter(or_(Article.source.contains(source), Article.source.contains(kor_val)))
    if keyword:
        q = q.filter(Article.title.contains(keyword))
    if is_analyzed is not None:
        q = q.filter(Article.is_analyzed == is_analyzed)
    total    = q.count()
    articles = q.offset((page - 1) * size).limit(size).all()
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [
            {
                "id":                a.id,
                "title":             a.title,
                "url":               a.url,
                "source":            a.source,
                "summary":           a.summary,
                "ai_summary":        a.ai_summary,
                "image_url":         a.image_url,
                "published_at":      a.published_at,
                "credibility_score": a.credibility_score,
                "credibility_label": a.credibility_label,
                "is_analyzed":       a.is_analyzed,
            }
            for a in articles
        ],
    }

@router.get("/news/{article_id}", summary="뉴스 상세")
def get_news(article_id: int, db: Session = Depends(get_db)):
    a = db.query(Article).filter(Article.id == article_id).first()
    if not a:
        raise HTTPException(404, "기사를 찾을 수 없습니다.")
    return {
        "id":                  a.id,
        "title":               a.title,
        "url":                 a.url,
        "source":              a.source,
        "summary":             a.summary,
        "content":             a.content,
        "image_url":           a.image_url,
        "published_at":        a.published_at,
        "created_at":          a.created_at,
        "credibility_score":   a.credibility_score,
        "credibility_label":   a.credibility_label,
        "credibility_reason":  a.credibility_reason,
        "red_flags":           a.red_flags,
        "ai_summary":          a.ai_summary,
        "key_persons":         a.key_persons,
        "difficult_terms":     a.difficult_terms,
        "comic_script":        a.comic_script,
        "is_analyzed":         a.is_analyzed,
    }

@router.get("/search", summary="뉴스 검색")
def search(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Article)
        .filter(Article.title.contains(q) | Article.content.contains(q))
        .order_by(Article.published_at.desc())
    )
    total    = query.count()
    articles = query.offset((page - 1) * size).limit(size).all()
    return {
        "query": q,
        "total": total,
        "page":  page,
        "items": [
            {
                "id":                a.id,
                "title":             a.title,
                "source":            a.source,
                "url":               a.url,
                "published_at":      a.published_at,
                "credibility_label": a.credibility_label,
                "image_url":         a.image_url,
            }
            for a in articles
        ],
    }
