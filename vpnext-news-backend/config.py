import os
from dotenv import load_dotenv

load_dotenv()
# api키, 데이터베이스 url등 받아오기
# GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY         = os.getenv("GROQ_API_KEY", "")
KOREAN_DICT_API_KEY  = os.getenv("KOREAN_DICT_API_KEY", "")
DATABASE_URL         = os.getenv("DATABASE_URL", "sqlite:///./news_compass.db")
APP_HOST             = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT             = int(os.getenv("APP_PORT", "8000"))
CRAWL_INTERVAL_MINUTES = int(os.getenv("CRAWL_INTERVAL_MINUTES", "30"))

REQUEST_TIMEOUT = 10
MAX_RETRIES     = 3
REQUEST_DELAY   = 1.0   # 요청 사이 대기(초)
USER_AGENT      = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

# ─── RSS 피드 목록 ─────────
RSS_FEEDS = {
    # 네이버 뉴스 섹션 RSS
    # 현재 네이버 rss지원을 안함 
    """
    "naver_politics":      "https://search.naver.com/search.naver?where=news&query=경제",
    "naver_economy":       "https://news.naver.com/main/rss/economy.nhn",
    "naver_society":       "https://news.naver.com/main/rss/society.nhn",
    "naver_world":         "https://news.naver.com/main/rss/world.nhn",
    "naver_it":            "https://news.naver.com/main/rss/it.nhn",
    "naver_entertainment": "https://news.naver.com/main/rss/entertainment.nhn",
    "naver_sports":        "https://news.naver.com/main/rss/sports.nhn",
    네이버는 일단 크롤링이 싹다 안되므로 주석처리
    """
    # 다음 뉴스 RSS
    "daum_politics":  "https://news.daum.net/rss/politics",
    "daum_economy":   "https://news.daum.net/rss/economic",
    "daum_society":   "https://news.daum.net/rss/society",
    "daum_world":     "https://news.daum.net/rss/foreign",
    "daum_it":        "https://news.daum.net/rss/digital",
    # 방송/언론사
    "yonhap":    "https://www.yonhapnewstv.co.kr/category/news/headline/feed/",
    "ytn":       "https://www.ytn.co.kr/rss/rss.php?t=0",
    "kbs":       "http://world.kbs.co.kr/rss/rss_news.htm?lang=k",
    "mbc":       "https://imnews.imbc.com/rss/news/news_00.xml",
    "sbs":       "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01",
    "jtbc":      "https://fs.jtbc.co.kr/RSS/newsflash.xml",
    # 신문사
    "hani":     "https://www.hani.co.kr/rss/",
    "khan":     "https://www.khan.co.kr/rss/rssdata/total_news.xml",
    "chosun":   "https://www.chosun.com/arc/outboundfeeds/rss/",
    "joongang": "https://rss.joins.com/joins_news_list.xml",
    "donga":    "https://rss.donga.com/total.xml",
    "mk":       "https://www.mk.co.kr/rss/30000001/",
    "hankyung": "https://www.hankyung.com/feed/all-news",
}
