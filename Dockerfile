# ==========================================
# STAGE 1: React 프론트엔드 빌드
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
# npm 패키지 설치 및 빌드
RUN npm ci || npm install

COPY frontend/ .
RUN npm run build

# ==========================================
# STAGE 2: Python FastAPI 백엔드 및 통합 실행 환경 구축
# ==========================================
FROM python:3.11-slim

WORKDIR /app/backend

# 🐾 PDF/이미지 청킹 처리에 필요한 poppler 패키지 및 C/C++ 빌드 의존성 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    poppler-utils \
    libpoppler-cpp-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# pip 최신화 및 백엔드 의존성 라이브러리 설치
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 백엔드 소스코드 복사
COPY backend/ .

# STAGE 1에서 빌드된 React dist 정적 결과를 백엔드 내 static/frontend_dist 디렉터리로 복사
COPY --from=frontend-builder /app/frontend/dist ./frontend_dist

# 파일 업로드 및 데이터 처리를 위한 작업 디렉터리 생성
RUN mkdir -p uploads

EXPOSE 8100

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8100"]