"""
자동 크롤링 스케줄러 (별도 프로세스로 실행)
"""
#중복제거 함수 추가
import sqlite3
import summary_duplicate_check as dup_check

import logging
import time

import schedule

from config import CRAWL_INTERVAL_MINUTES
from database import Article, SessionLocal, init_db
from rss_crawler import crawl_all

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
        
        # 중복 뉴스 제거 (SQLite 연결 객체 필요)
        from config import DATABASE_URL
        sqlite_conn = sqlite3.connect(DATABASE_URL.replace("sqlite:///", ""))
        dup_check.remove_duplicate_news_sqlite(sqlite_conn, threshold=0.8)
        sqlite_conn.close()
        logger.info("중복 뉴스 제거 완료")
        
    except Exception as e:
        logger.error(f"스케줄 크롤링 오류: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
    schedule.every(CRAWL_INTERVAL_MINUTES).minutes.do(job)
    logger.info(f"스케줄러 시작 ({CRAWL_INTERVAL_MINUTES}분 간격)")
    job()           # 최초 1회 즉시 실행
    while True:
        schedule.run_pending()
        time.sleep(60)
