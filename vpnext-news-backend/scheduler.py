"""
자동 크롤링 스케줄러 (별도 프로세스로 실행)
"""
#중복제거 함수 추가
import logging
import time
import asyncio
import schedule
import sqlite3

from config import CRAWL_INTERVAL_MINUTES
from database import Article, SessionLocal, init_db
from rss_crawler import crawl_all
import summary_duplicate_check as dup_check
from services.optimization_service import optimize_credibility_batch

logger = logging.getLogger(__name__)


def job():
    db = SessionLocal()
    try:
        articles = crawl_all()
        saved = 0
        for a in articles:
            if not db.query(Article).filter(Article.url == a["url"]).first():
                db.add(Article(**a))
                saved += 1
        db.commit()
        logger.info(f"스케줄 크롤링 완료: {saved}건 저장")
        
        # 중복 뉴스 제거
        from config import DATABASE_URL
        sqlite_conn = sqlite3.connect(DATABASE_URL.replace("sqlite:///", ""))
        dup_check.remove_duplicate_news_sqlite(sqlite_conn, threshold=0.8)
        sqlite_conn.close()
        logger.info("중복 뉴스 제거 완료")
        
    except Exception as e:
        logger.error(f"스케줄 크롤링 오류: {e}")
    finally:
        db.close()

def optimization_job():
    """주기적으로 신뢰도 최적화 수행"""
    logger.info("신뢰도 최적화 작업 시작...")
    db = SessionLocal()
    try:
        # 비동기 함수 실행을 위해 asyncio.run 사용
        asyncio.run(optimize_credibility_batch(db, batch_size=20))
        logger.info("신뢰도 최적화 작업 완료")
    except Exception as e:
        logger.error(f"신뢰도 최적화 작업 중 오류: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
    
    # 크롤링 스케줄링
    schedule.every(CRAWL_INTERVAL_MINUTES).minutes.do(job)
    
    # 매일 새벽 3시에 신뢰도 최적화 수행 (데이터가 쌓인 후 정밀 분석)
    schedule.every().day.at("03:00").do(optimization_job)
    
    logger.info(f"스케줄러 시작 (크롤링: {CRAWL_INTERVAL_MINUTES}분 간격, 최적화: 매일 03:00)")
    
    # 최초 실행
    job()
    
    while True:
        schedule.run_pending()
        time.sleep(60)
