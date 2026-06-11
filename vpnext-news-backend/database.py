from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String,
    Float, Boolean, Text, DateTime, JSON,
)
from sqlalchemy.orm import declarative_base, sessionmaker
from config import DATABASE_URL

engine       = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()


class Article(Base):
    __tablename__ = "articles"

    id          = Column(Integer, primary_key=True, index=True)
    title       = Column(String(500), nullable=False)
    url         = Column(String(1000), unique=True, nullable=False, index=True)
    source      = Column(String(100))
    summary     = Column(Text)
    content     = Column(Text)
    image_url   = Column(String(1000))
    published_at = Column(DateTime)
    created_at  = Column(DateTime, default=datetime.now)

    # AI 분석 결과
    credibility_score  = Column(Float)
    credibility_label  = Column(String(20))
    credibility_reason = Column(Text)
    red_flags          = Column(JSON)
    ai_summary         = Column(Text)
    key_persons        = Column(JSON)
    difficult_terms    = Column(JSON)
    comic_script       = Column(Text)
    is_analyzed        = Column(Boolean, default=False)
    views              = Column(Integer, default=0, nullable=False)
    likes              = Column(Integer, default=0, nullable=False)
    tags               = Column(JSON)


def init_db():
    Base.metadata.create_all(bind=engine)
    
    # SQLite 마이그레이션: 컬럼이 없으면 자동으로 추가
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('articles')]
    
    if 'views' not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE articles ADD COLUMN views INTEGER DEFAULT 0 NOT NULL"))
    if 'likes' not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE articles ADD COLUMN likes INTEGER DEFAULT 0 NOT NULL"))
    if 'tags' not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE articles ADD COLUMN tags JSON"))



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
