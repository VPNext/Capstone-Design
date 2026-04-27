# 📰 뉴스 정보 나침반 (News Compass)

> RSS 뉴스를 자동 수집하고, **Groq AI**로 신뢰도 분석 · 용어 풀이 · 인물 프로필을 제공하는 뉴스 이해도 향상 서비스

---

## 📸 주요 기능

| 기능                | 설명                                                   |
| ------------------- | ------------------------------------------------------ |
| 📡 RSS 자동 수집    | 한겨레·조선·연합뉴스 등 17개 언론사 실시간 수집        |
| 🔍 신뢰도 분석      | AI가 기사를 읽고 신뢰도 점수(0~100%)와 판단 근거 제공  |
| ✨ AI 3줄 요약      | 기사 핵심을 3문장으로 요약, 목록 화면에서도 즉시 표시  |
| 📖 어려운 용어 풀이 | 전문 용어를 쉽게 풀어 설명 (국립국어원 사전 연동 가능) |
| 👤 핵심 인물 프로필 | 기사에 등장하는 인물의 직책·역할 자동 추출             |
| ⚠️ 주의 표현 탐지   | 선동적·과장된 표현을 자동으로 감지해 하이라이트        |

---

## 🏗️ 전체 구조도

```
news-compass/
│
├── backend/                  ← Python FastAPI 서버
│   ├── main.py               ← API 엔드포인트 (진입점)
│   ├── config.py             ← 환경변수 · API키 · RSS 목록 설정
│   ├── database.py           ← SQLite DB 모델 (SQLAlchemy)
│   ├── models.py             ← Pydantic 요청/응답 타입 정의
│   ├── rss_crawler.py        ← RSS 피드 파싱 및 기사 메타데이터 수집
│   ├── article_scraper.py    ← 기사 URL → 본문 HTML 스크래핑
│   ├── ai_analyzer.py        ← Groq AI 신뢰도·용어·인물 분석
│   ├── dictionary_api.py     ← 국립국어원 표준대사전 API 연동
│   ├── scheduler.py          ← 자동 주기 크롤링 스케줄러
│   └── .env                  ← ⚠️ API 키 저장 (직접 생성 필요)
│
└── frontend/                 ← React + TypeScript + Tailwind CSS
    ├── src/
    │   ├── App.tsx            ← 라우터 설정
    │   ├── api.ts             ← axios 기본 설정 (백엔드 URL)
    │   ├── components/
    │   │   └── Header.tsx     ← 상단 헤더 · 검색창
    │   └── pages/
    │       ├── MainPage.tsx   ← 뉴스 목록 화면
    │       └── DetailPage.tsx ← 뉴스 상세 + AI 분석 화면
    └── package.json
```

### 데이터 흐름 한눈에 보기

```
[RSS 피드 17개]
      ↓ rss_crawler.py
[기사 메타데이터]  →  SQLite DB (제목, URL, 요약, 발행일)
      ↓ (사용자가 분석 버튼 클릭)
article_scraper.py → 기사 본문 스크래핑
      ↓
ai_analyzer.py (Groq llama-3.3-70b)
   ├─ 신뢰도 점수 + 레이블 + 판단근거 + 주의표현 + 요약
   ├─ 어려운 용어 10개
   └─ 핵심 인물 5명
      ↓
dictionary_api.py → 국립국어원 사전 보완 (선택)
      ↓
SQLite DB에 저장 → 프론트엔드로 응답
```

---

## ⚙️ 실행 전 준비 (API 키 발급)

### 1. Groq API 키 (필수 · 무료)

1. [https://console.groq.com](https://console.groq.com/) 접속 후 회원가입
2. 좌측 메뉴 **API Keys** → **Create API Key** 클릭
3. 생성된 키를 복사해 둡니다 (`gsk_...` 형태)

### 2. 국립국어원 API 키 (선택 · 무료)

> 없어도 동작합니다. 용어 풀이에 AI 설명만 사용됩니다.

1. [https://opendict.korean.go.kr](https://opendict.korean.go.kr/) 접속
2. 회원가입 후 **Open API** 메뉴에서 키 발급

---

## 🚀 설치 및 실행 방법

### 사전 요구사항

| 도구    | 버전      | 확인 명령          |
| ------- | --------- | ------------------ |
| Python  | 3.10 이상 | `python --version` |
| Node.js | 18 이상   | `node --version`   |
| npm     | 9 이상    | `npm --version`    |

---

### 1단계 — 프로젝트 다운로드

```bash
# 저장소 클론 (또는 zip 다운로드 후 압축 해제)
git clone <저장소_주소>
cd news-compass
```

---

### 2단계 — 백엔드 설정

```bash
# backend 폴더로 이동
cd backend

# 가상환경 생성 (권장)
python -m venv venv

# 가상환경 활성화
## Windows
venv\Scripts\activate
## macOS / Linux
source venv/bin/activate

# 패키지 설치
pip install fastapi uvicorn sqlalchemy python-dotenv \
            requests beautifulsoup4 lxml feedparser groq schedule
```

### `.env` 파일 생성

`backend/` 폴더 안에 `.env` 파일을 만들고 아래 내용을 입력합니다.

```
# ✅ 필수: Groq API 키
GROQ_API_KEY=_여기에_발급받은_키_입력

# ⚪ 선택: 국립국어원 API 키 (없으면 비워두세요)
KOREAN_DICT_API_KEY=

# ⚪ 선택: 기본값으로 동작하므로 수정 불필요
DATABASE_URL=sqlite:///./news_compass.db
APP_HOST=0.0.0.0
APP_PORT=8000
CRAWL_INTERVAL_MINUTES=30
```

> 💡 `.env` 파일은 절대 GitHub에 올리지 마세요! API 키가 노출됩니다.

---

### 3단계 — 백엔드 서버 실행

```bash
# backend/ 폴더에서 실행
python main.py
```

정상 실행 시 아래 메시지가 표시됩니다.

```
INFO:     DB 초기화 완료
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

> 브라우저에서 http://localhost:8000/docs 로 접속하면 API 문서를 볼 수 있습니다.

---

### 4단계 — 프론트엔드 설정

새 터미널 창을 열고 진행합니다.

```bash
# frontend 폴더로 이동
cd frontend

# 패키지 설치
npm install
npm install axios react-router-dom
npm install -D tailwindcss @tailwindcss/vite
```

### 백엔드 URL 확인

`src/api.ts` (또는 `src/api.js`) 파일에서 백엔드 주소를 확인합니다.

```tsx
// src/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000", // 백엔드 서버 주소
});

export default api;
```

> 백엔드를 다른 서버에서 실행할 경우 이 주소를 변경하세요.

---

### 5단계 — 프론트엔드 실행

```bash
# frontend/ 폴더에서 실행
npm run dev
```

정상 실행 시:

```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

브라우저에서 [**http://localhost:5173**](http://localhost:5173/) 접속 → 완료! 🎉

---

## 📖 사용 방법

### 뉴스 수집하기

1. 메인 화면 우측 상단 **"최신 뉴스 수집"** 버튼 클릭
2. 잠시 기다리면 17개 언론사 기사가 자동으로 수집됩니다

### AI 분석하기

1. 목록에서 기사 카드 클릭 → 상세 페이지 이동
2. 하단 **"✨ AI 분석 실행 및 본문 가져오기"** 버튼 클릭
3. 우측 사이드바에 신뢰도·용어·인물 분석 결과가 표시됩니다
4. 본문 상단에 **AI 3줄 요약**이 파란 박스로 표시됩니다

> 한 번 분석한 기사는 DB에 캐싱되어 다음 방문 시 즉시 표시됩니다.

---

## 🔄 자동 크롤링 스케줄러 (선택)

백엔드와 별도로 실행하면 30분마다 자동으로 뉴스를 수집합니다.

```bash
# 새 터미널에서 backend/ 폴더 안에서 실행
python scheduler.py
```

---

## 🛠️ 주요 API 엔드포인트

| 메서드 | 경로                           | 설명                          |
| ------ | ------------------------------ | ----------------------------- |
| `GET`  | `/api/news`                    | 뉴스 목록 조회 (페이지네이션) |
| `GET`  | `/api/news/{id}`               | 특정 기사 상세 조회           |
| `POST` | `/api/crawl`                   | RSS 크롤링 즉시 실행          |
| `POST` | `/api/analyze?article_url=...` | 기사 AI 분석 실행             |
| `GET`  | `/api/search?q=키워드`         | 뉴스 검색                     |
| `GET`  | `/health`                      | 서버 상태 확인                |

전체 API 문서: http://localhost:8000/docs

---

## ❓ 자주 발생하는 오류

### `GROQ_API_KEY` 관련 오류

```
groq.AuthenticationError: ...
```

→ `.env` 파일이 `backend/` 폴더 안에 있는지, 키가 올바른지 확인하세요.

### 포트 충돌 오류

```
ERROR: [Errno 48] Address already in use
```

→ 이미 8000번 포트를 사용 중입니다. `.env`에서 `APP_PORT=8001`로 변경 후 `api.ts`의 baseURL도 함께 수정하세요.

### 본문 스크래핑 실패 (422 오류)

일부 언론사(네이버 등)는 봇 차단 정책으로 스크래핑이 안 될 수 있습니다. 원문 링크를 클릭해 직접 확인하세요.

### `npm install` 실패

```bash
# Node.js 버전 확인 (18 이상이어야 함)
node --version

# 캐시 초기화 후 재시도
npm cache clean --force
npm install
```

---

## 🗂️ 파일별 역할 요약

| 파일                 | 역할                                    |
| -------------------- | --------------------------------------- |
| `main.py`            | FastAPI 서버 · 전체 API 엔드포인트 관리 |
| `config.py`          | 환경변수 로드 · RSS 피드 URL 목록       |
| `database.py`        | SQLite 테이블 정의 · DB 세션 관리       |
| `models.py`          | API 요청/응답 데이터 타입 (Pydantic)    |
| `rss_crawler.py`     | RSS XML 파싱 → 기사 목록 추출           |
| `article_scraper.py` | 기사 URL → 본문·제목·이미지 스크래핑    |
| `ai_analyzer.py`     | Groq AI 호출 · 신뢰도·용어·인물 분석    |
| `dictionary_api.py`  | 국립국어원 API로 용어 설명 보완         |
| `scheduler.py`       | 별도 프로세스로 주기적 자동 크롤링      |
| `App.tsx`            | React 라우터 설정 (메인/상세 페이지)    |
| `Header.tsx`         | 상단 헤더 · 검색창                      |
| `MainPage.tsx`       | 뉴스 목록 · AI 요약 미리보기            |
| `DetailPage.tsx`     | 기사 본문 · AI 분석 사이드바            |

---

## 📦 사용 기술 스택

**백엔드**

- `FastAPI` — Python 웹 프레임워크
- `SQLAlchemy` + `SQLite` — 데이터베이스
- `Groq SDK` (llama-3.3-70b) — AI 분석
- `feedparser` — RSS 파싱
- `BeautifulSoup4` + `lxml` — HTML 스크래핑

**프론트엔드**

- `React 18` + `TypeScript` — UI
- `Vite` — 빌드 도구
- `Tailwind CSS` — 스타일
- `React Router` — 페이지 라우팅
- `Axios` — HTTP 통신
