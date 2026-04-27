from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

# ArticleBase 클래스 : 뉴스 기사 기본 정보 모델
class ArticleBase(BaseModel):
    title: str
    url: str
    source: str
    published_at: Optional[datetime] = None
    summary: Optional[str] = None

# ArticleCreate 클래스 : 뉴스 기사 생성 모델(content 필드에 본문 추가), ArticleBase 상속
class ArticleCreate(ArticleBase):
    content: Optional[str] = None


# CredibilityInfo 클래스 : 신뢰도 분석 결과 모델
class CredibilityInfo(BaseModel):
    score: float                    # 0.0 ~ 1.0
    label: str                      # 신뢰 / 주의 / 허위 의심
    reason: str
    red_flags: List[str] = []
    summary: str = ""

# PersonInfo클래스 : 주요 인물 정보 모델
class PersonInfo(BaseModel):
    name: str
    role: str
    description: str
    relation: str

# TermInfo 클래스 : 어려운 용어 정보 모델
class TermInfo(BaseModel):
    term: str
    explanation: str
    category: str
    dict_definition: Optional[str] = None
    dict_link: Optional[str] = None

# AnalysisResponse 클래스 : 분석 결과 응답 모델
class AnalysisResponse(BaseModel):
    cached: bool = False
    credibility: CredibilityInfo
    key_persons: List[PersonInfo] = []
    difficult_terms: List[TermInfo] = []
    comic_script: Optional[str] = None
