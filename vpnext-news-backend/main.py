"""
뉴스 정보 나침반 - FastAPI 백엔드 (리팩토링 버전)
"""
import sys
import asyncio
import logging
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import APP_HOST, APP_PORT
from database import init_db
from routers import news, analyze, cartoons

# Windows 환경일 경우 aiodns 충돌 방지를 위해 SelectorEventLoop 정책 설정
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="뉴스 정보 나침반 API",
    description="허위뉴스 판별 + 뉴스 이해도 향상 서비스 (VPNext / 팀4)",
    version="1.2.0",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(news.router)
app.include_router(analyze.router)
app.include_router(cartoons.router)

@app.on_event("startup")
def on_startup():
    init_db()
    logger.info("DB 초기화 완료 및 서비스 시작")

@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host=APP_HOST, 
        port=APP_PORT, 
        reload=True, 
        reload_includes=["*.py"],
        reload_excludes=["*.db", "news_compass.db*", "*.db-journal", "*.db-wal", "*.db-shm", "server.log"]
    )
