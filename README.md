# AIMEOW Web (AI Text & Image Chunking Service)

AIMEOW Web은 RAG(Retrieval-Augmented Generation) 및 멀티모달 LLM 전처리를 위해 텍스트와 이미지를 효과적으로 청킹(Chunking)하고 관리할 수 있는 웹 애플리케이션입니다.

---

## 💡 주요 기능

- **텍스트 청킹 (Text Chunking)**: 다양한 분할 전략을 활용한 텍스트 데이터 청킹 및 전처리 API 제공
- **이미지 청킹 (Image Chunking)**: 비전 및 멀티모달 모델 입력을 위한 이미지 데이터 영역 분할 및 처리
- **환경 설정 (Settings)**: 청킹 파라미터 및 서비스 설정 관리
- **인터랙티브 웹 UI**: React 기반의 사용자 직관적 인터페이스 제공

---

## 🛠 기술 스택

### Backend
- **Framework**: Python, FastAPI
- **Server**: Uvicorn
- **Data Validation**: Pydantic

### Frontend
- **Library**: React
- **Build Tool**: Vite
- **HTTP Client**: Fetch API / Axios (`chunkingApi.js`)

### Container & Deployment
- **Docker**: Dockerfile 기반 컨테이너화 지원

---

## 📁 프로젝트 구조

```text
aimeow_web/
├── Dockerfile
├── .dockerignore
├── .gitignore
├── LICENSE
├── backend/
│   ├── main.py                # FastAPI 애플리케이션 엔트리포인트
│   ├── config.py              # 환경 설정 관리
│   ├── requirements.txt       # 백엔드 의존성 패키지 목록
│   ├── main.bat               # 백엔드 실행 스크립트 (Windows)
│   ├── .env.example           # 환경 변수 예시 파일
│   └── routers/
│       ├── text_chunking.py   # 텍스트 청킹 관련 API 라우터
│       ├── image_chunking.py  # 이미지 청킹 관련 API 라우터
│       └── settings.py        # 시스템 설정 관리 API 라우터
└── frontend/
    ├── package.json           # 프론트엔드 의존성 및 스크립트
    ├── index.html             # HTML 템플릿
    ├── .oxlintrc.json         # Linter 설정
    └── src/
        ├── App.jsx            # 메인 React 컴포넌트
        ├── App.css            # 스타일시트
        └── api/
            └── chunkingApi.js # 백엔드 연동 API 모듈


```

## 🚀 시작하기

### 1. 백엔드 설정 및 실행 (Backend Setup)

```bash
# 백엔드 디렉터리로 이동
cd backend

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 패키지 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env

# 서버 실행
python main.py

```

### 2. 프론트엔드 설정 및 실행 (Frontend Setup)

```bash
# 프론트엔드 디렉터리로 이동
cd frontend

# 패키지 설치
npm install

# 개발 서버 실행
npm run dev

```

### 3. Docker를 통한 실행 (Docker Deployment)

```bash
# Docker 이미지 빌드
docker build -t aimeow-web .

# Docker 컨테이너 실행
docker run -d -p 8000:8000 --name aimeow-web-container aimeow-web

```

---

## 📄 라이선스

본 프로젝트는 repository 내 `LICENSE` 파일의 정책을 따릅니다.

```
