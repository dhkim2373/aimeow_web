# ==========================================
# STAGE 1: React 프론트엔드 빌드
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# 패키지 설치 최적화를 위한 package.json 복사
COPY frontend/package*.json ./
RUN npm install

# 프론트엔드 소스 복사 및 빌드
COPY frontend/ .
RUN npm run build

# ==========================================
# STAGE 2: Python FastAPI 백엔드 및 실행 환경 구축
# ==========================================
FROM python:3.11-slim

WORKDIR /app/backend

# 시스템 필수 패키지 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 백엔드 의존성 설치
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 백엔드 소스코드 복사
COPY backend/ .

# STAGE 1에서 빌드된 React dist 결과를 백엔드 내 frontend_dist 디렉터리로 복사
COPY --from=frontend-builder /app/frontend/dist ./frontend_dist

# 업로드 파일 저장을 위한 디렉터리 생성
RUN mkdir -p uploads

# 포트 노출
EXPOSE 8100

# FastAPI 서버 실행 (main:app)
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8100"]