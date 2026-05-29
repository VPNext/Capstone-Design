import os
from dotenv import load_dotenv

load_dotenv()
# api키, 데이터베이스 url등 받아오기
GEMINI_API_KEY       = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY         = os.getenv("GROQ_API_KEY", "")
GATEWAY_API_KEY     = os.getenv("GATEWAY_API_KEY", "")
KOREAN_DICT_API_KEY  = os.getenv("KOREAN_DICT_API_KEY", "")

# 네이버 뉴스 검색 API 키
NAVER_CLIENT_ID     = os.getenv("NAVER_CLIENT_ID", "")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET", "")
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
    # 동작 확인된 RSS 피드 목록
    "jtbc":      "https://fs.jtbc.co.kr/RSS/newsflash.xml",
    "hani":     "https://www.hani.co.kr/rss/",
    "yonhap":    "https://www.yonhapnewstv.co.kr/category/news/headline/feed/",
    "sbs":       "https://news.sbs.co.kr/news/SectionRssFeed.do?sectionId=01",
    "khan":      "https://www.khan.co.kr/rss/rssdata/total_news.xml",
    "donga":     "https://rss.donga.com/total.xml",
    "mk":        "https://www.mk.co.kr/rss/30000001/",
    "hankyung":  "https://www.hankyung.com/feed/all-news",
}

# 네이버 뉴스 검색 키워드 (API용)
NAVER_SEARCH_KEYWORDS = ["정치", "경제", "사회", "세계", "IT", "연예", "스포츠"]
