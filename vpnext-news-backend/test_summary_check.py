#테스트로 중복제거를 하기 위한 파일입니다.
#실제로는 스케쥴러 내에서 크롤링 후 동작할 기능입니다.
from config import DATABASE_URL
import sqlite3
import summary_duplicate_check as dup_check
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 중복 뉴스 제거 (SQLite 연결 객체 필요)
sqlite_conn = sqlite3.connect(DATABASE_URL.replace("sqlite:///", ""))
dup_check.remove_duplicate_news_sqlite(sqlite_conn, threshold=0.8)
sqlite_conn.close()
logger.info("중복 뉴스 제거 완료")
# 솔직히 이게 뭐 되는지 모르겠음
# 실제로 중복을 없애는가? 확인하려면 뭐가 사라졌는지 로그를 찍어야될듯?