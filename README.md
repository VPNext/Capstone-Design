# 뉴스 정보 나침반 (News Compass)

> RSS 피드 및 네이버 뉴스 API를 연동하여 기사를 자동 수집하고, Groq AI(Llama) 및 Gemini AI를 활용하여 뉴스 신뢰도 평가, 요약, 핵심 인물 프로필, 전문 용어 설명 및 4컷 만화 시나리오 요약을 제공하는 뉴스 이해도 향상 서비스입니다.

---

## 주요 기능 소개

| 기능                     | 설명                                                                                | 비고             |
| :----------------------- | :---------------------------------------------------------------------------------- | :--------------- |
| **다채널 뉴스 수집**     | 한겨레·조선·연합뉴스 등 8대 언론사의 실시간 RSS 피드 수집                           | 크롤링 기능      |
| **네이버 뉴스 API 연동** | 주요 키워드(속보, 정치, 경제, 사회, IT과학 등) 기반 실시간 검색 기사 수집           | 크롤링 기능      |
| **AI 기사 신뢰도 평가**  | AI가 본문을 판독하여 신뢰도 점수(0~100%), 분석 라벨, 주의 표출 단어 하이라이트 제공 | Groq AI          |
| **AI 3줄 핵심 요약**     | 기사 본문의 핵심 요지를 3줄로 축약하여 본문 상단에 시각적 배치                      | 가독성 극대화    |
| **어려운 용어 해설**     | 전문 용어, 시사 용어를 자동으로 해설하고 국립국어원 표준대사전 검색 링크 연동       | 사전 API 연동    |
| **핵심 인물 프로필**     | 뉴스 기사 속에 등장하는 주요 인물들의 직책, 역할, 기사 내 관계망 추출               | 프로필 링크 연동 |
| **AI 뉴스 4컷 만화**     | 기사의 줄거리를 요약한 4컷 만화 시나리오 및 이미지 자동 생성                        | Gemini AI        |

---

## 전체 아키텍처 및 데이터 흐름

```mermaid
flowchart TD
    subgraph 수집 단계 (Data Crawling)
        A1[8대 언론사 RSS Feeds] -->|rss_crawler.py| B[기사 메타데이터 추출]
        A2[Naver News Search API] -->|rss_crawler.py| B
    end

    subgraph 가공 단계 (Scraping & Storage)
        B -->|기사 URL| C[article_scraper.py]
        C -->|본문 HTML 파싱 및 클렌징| D[(SQLite Database)]
    end

    subgraph 분석 단계 (AI Processing)
        D -->|사용자 요청 시 본문 전달| E[ai_analyzer.py]
        E -->|Groq Llama 3.3| F[신뢰도/주의 단어/요약/인물 추출]
        E -->|Gemini API| G[4컷 만화 요약/시나리오 생성]
        F -->|국어사전 API 보완| H[dictionary_api.py]
        G --> H
    end

    subgraph 서비스 제공 (Presentation)
        H -->|분석 결과 적재| D
        D -->|REST API 응답| I[React Frontend Web App]
    end
```

---

## 프로젝트 디렉터리 구조

```
news-compass/
│
├── vpnext-news-backend/         ← Python FastAPI 백엔드 서버
│   ├── main.py                  ← FastAPI 서버 진입점 및 API 라우팅
│   ├── config.py                ← 환경 변수, RSS 설정, 네이버 API 상수 로드
│   ├── database.py              ← SQLite DB 커넥션 및 SQLAlchemy 세션 관리
│   ├── models.py                ← Pydantic 데이터 검증 모델 정의
│   ├── rss_crawler.py           ← RSS 파싱 및 네이버 뉴스 검색 API 호출 처리
│   ├── article_scraper.py       ← 언론사별 맞춤 본문 HTML 스크래퍼
│   ├── ai_analyzer.py           ← Groq(기사 판독) 및 Gemini(만화/시나리오 생성) 연동
│   ├── dictionary_api.py        ← 국립국어원 오픈 API 연동 클래스
│   ├── scheduler.py             ← 백그라운드 주기적 크롤러 스케줄러
│   └── .env                     ← API 자격 증명 환경 변수 파일 (로컬 개별 작성)
│
└── vpnext-news-frontend/        ← React + TypeScript 프론트엔드
    └── frontend/                ← Vite 빌드 루트 디렉터리
        ├── src/
        │   ├── App.tsx          ← 라우팅 설정 (홈 / AI뉴스 / AI만화)
        │   ├── api.ts           ← Axios 기반 백엔드 API 인터페이스
        │   ├── components/      ← 공통 UI 컴포넌트 (Header, 카드, 스켈레톤 등)
        │   ├── hooks/           ← 상태 제어 커스텀 훅 (useNewsList, useNewsDetail)
        │   ├── utils/           ← 텍스트 포맷터 및 파서 유틸 (source.tsx 등)
        │   └── pages/           ← 웹 페이지 컴포넌트 (MainPage, DetailPage 등)
        └── package.json         ← 의존성 및 빌드 스크립트 정의
```

---

## 실행 전 필수 설정 (API 자격 증명 발급)

서비스를 정상적으로 실행하기 위해서는 다음과 같은 외부 API 키들이 필요합니다.

### 1. Groq API 키 (필수)

1. Groq Console(https://console.groq.com)에 로그인합니다.
2. 좌측 메뉴 API Keys > Create API Key를 클릭합니다.
3. 생성된 키(gsk\_...)를 안전하게 기록해 둡니다.

### 2. Google AI Studio API 키 (필수 - 만화 생성용)

1. Google AI Studio(https://aistudio.google.com/)에 로그인합니다.
2. Get API Key > Create API Key를 클릭합니다.
3. 발급된 키(AIzaSy...)를 복사해 둡니다.

### 3. 네이버 뉴스 검색 API 자격 증명 (필수 - 실시간 네이버 뉴스 수집)

1. 네이버 개발자 센터(https://developers.naver.com)에 접속하여 로그인합니다.
2. 상단 메뉴 Application > 애플리케이션 등록으로 이동합니다.
3. 애플리케이션 이름을 작성하고, 사용 API 메뉴에서 검색을 선택합니다.
4. 비로그인 오픈 API 서비스 환경을 웹 설정으로 두고, 웹 서비스 URL에 로컬 주소(예: http://localhost)를 입력하여 등록을 완료합니다.
5. 등록된 애플리케이션의 Client ID와 Client Secret 값을 복사해 둡니다.

### 4. 국립국어원 오픈 API 키 (선택)

1. 국립국어원 우리말샘(https://opendict.korean.go.kr)에 접속 후 회원가입을 완료합니다.
2. 오픈 API 사용자 인증 키 발급 신청을 통해 인증 키를 획득합니다.

### 5. 영남이공대 AI 캠퍼스 API 게이트웨이 키 (선택)

1. 영남이공대 AI 캠퍼스 웹 포털에 접속합니다.
2. API Gateway > API 키 생성 메뉴를 통해 인증 토큰을 생성합니다.

---

## 설치 및 실행 방법

### 사전 요구사항

- Python: 3.10 이상
- Node.js: 18.x 이상 (LTS 버전 권장)
- npm: 9.x 이상

---

### 1단계 — 백엔드 (FastAPI) 설정 및 실행

```bash
#  백엔드 디렉터리로 이동
cd vpnext-news-backend

#  Python 가상환경 구성
python -m venv venv

#  가상환경 활성화 (OS 환경에 따라 선택)
# Windows의 경우:
venv\Scripts\activate
# macOS/Linux의 경우:
source venv/bin/activate

# 패키지 설치 (requirements.txt 사용)
# `backend/requirements.txt`에 필요한 패키지들이 명시되어 있습니다.
pip install -r requirements.txt

# `google-genai` 관련: 문제가 발생하면 재설치하세요.
pip install google-genai
# 문제가 생기면 아래처럼 기존 패키지를 제거 후 재설치합니다.
# pip uninstall google-generativeai
# pip install google-genai
```

#### .env 환경 변수 설정

vpnext-news-backend/ 경로에 .env 파일을 새로 만들고 아래 양식으로 API 키들을 채워 넣습니다.

```env
# 필수: Groq API 자격증명
GROQ_API_KEY=gsk_여기에_발급받은_키_입력

# 필수: Google AI Studio API 키
GEMINI_API_KEY=AIzaSy_여기에_발급받은_키_입력

# 필수: 네이버 뉴스 API 자격증명
NAVER_CLIENT_ID=여기에_발급받은_ClientID_입력
NAVER_CLIENT_SECRET=여기에_발급받은_ClientSecret_입력

# 선택: 국립국어원 오픈 API 키 (비워둘 시 AI 자체 해설로 대체 작동)
KOREAN_DICT_API_KEY=

# 선택: 영남이공대 AI 캠퍼스 API 게이트웨이 키
GATEWAY_API_KEY=

# 데이터베이스 및 로컬 구동 기본 환경값 (수정 불필요)
DATABASE_URL=sqlite:///./news_compass.db
APP_HOST=0.0.0.0
APP_PORT=8000
CRAWL_INTERVAL_MINUTES=30
```

> [!WARNING]
> .env 파일은 절대 Git 리포지토리에 커밋하여 공개해서는 안 됩니다. (.gitignore 등록 필수)

#### 백엔드 서버 실행

```bash
python main.py
```

- 서버가 켜지면 데이터베이스 스키마가 자동으로 초기화되며, 기본적으로 http://localhost:8000 포트에서 가동을 시작합니다.
- API 연동 상태 및 문서는 http://localhost:8000/docs 대시보드를 통해 손쉽게 확인할 수 있습니다.

---

### 2단계 — 프론트엔드 (React) 설정 및 실행

````bash
#  프론트엔드 Vite 루트 경로로 이동
cd ../vpnext-news-frontend/frontend

#  의존 라이브러리 및 패키지 설치
npm install
npm install axios react-router-dom
npm install -D tailwindcss @tailwindcss/vite

#### 프론트엔드 실행

```bash
npm run dev
````

- 실행이 완료되면 터미널 화면에 로컬 웹 주소(http://localhost:5173)가 활성화됩니다. 크롬 등 웹 브라우저로 접속하시면 바로 작동합니다.

---

### 3단계 — 주기적 뉴스 수집 데몬 활성화 (선택 사항)

메인 API 웹 서버 가동과 별개로 백그라운드에서 매 30분 주기로 뉴스 수집기를 돌리고자 한다면, 새 터미널을 열고 스케줄러 데몬을 켜둡니다.

```bash
cd vpnext-news-backend
# 가상환경 활성화 상태에서 구동
python scheduler.py
```

---

## 주요 API 명세 (Endpoints)

FastAPI 서버가 제공하는 주요 REST API 목록입니다.

| HTTP 메서드 | 엔드포인트       | 역할                      | 파라미터 및 비고                       |
| :---------- | :--------------- | :------------------------ | :------------------------------------- |
| **`GET`**   | `/api/news`      | 전체 기사 목록 조회       | 페이지네이션 및 언론사 필터 기능 포함  |
| **`GET`**   | `/api/news/{id}` | 특정 기사 상세 페이지     | 기사 본문, AI 요약, 신뢰도 등 포함     |
| **`POST`**  | `/api/crawl`     | 수동 즉시 RSS 크롤링 실행 | 8대 언론사 신규 피드 강제 연동 및 적재 |
| **`POST`**  | `/api/analyze`   | AI 뉴스 분석 처리 트리거  | `article_url`을 쿼리로 주어 분석 시작  |
| **`GET`**   | `/api/search`    | 수집된 뉴스 검색          | `q=키워드`로 뉴스 제목/요약 검색       |
| **`GET`**   | `/health`        | 서버 헬스체크             | API 상태 정상성 확인                   |

---

## 사용 기술 스택

### 백엔드 (Backend)

- Web Framework: FastAPI (Uvicorn)
- ORM & Database: SQLAlchemy + SQLite
- AI Engine: Groq SDK (llama-3.3-70b) & Gemini SDK (google-genai)
- Scraper & Crawler: BeautifulSoup4, lxml, feedparser

### 프론트엔드 (Frontend)

- Framework: React 18 / Vite (React Router v7)
- Language: TypeScript
- Style: Tailwind CSS
- HTTP Client: Axios
