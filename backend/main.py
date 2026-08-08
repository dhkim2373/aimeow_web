import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# 공통 설정 및 APIRouter 모듈 불러오기 (DB 의존성 연결 제거)
from config import BASE_UPLOAD_DIR
from routers import settings, image_chunking, text_chunking

app = FastAPI(
    title="AI Meow Precision Chunking Engine",
    docs_url=None,      # 👈 Swagger UI 접근 비활성화
    redoc_url=None,     # 👈 Redoc 접근 비활성화
    openapi_url=None    # 👈 OpenAPI JSON 메타데이터 비활성화
)

# ============================================================
# 🌐 CORS 설정
# ============================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# 🎯 모듈별 APIRouter 등록 (핵심 청킹/설정 엔진)
# ============================================================
app.include_router(settings.router)
app.include_router(image_chunking.router)
app.include_router(text_chunking.router)

# ============================================================
# 📁 정적 파일 마운트 (업로드 디렉토리)
# ============================================================
uploads_dir = os.path.join(os.path.dirname(__file__), BASE_UPLOAD_DIR)
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=uploads_dir), name="static")

# ============================================================
# 🖥️ React UI (frontend_dist) 서빙 및 SPA 라우팅
# ============================================================
dist_dir = os.path.join(os.path.dirname(__file__), "frontend_dist")

# React JS/CSS 빌드 에셋 정적 마운트
assets_dir = os.path.join(dist_dir, "assets")
if os.path.exists(assets_dir):
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

# SPA (Single Page Application) 서빙: API 경로 외 요청은 index.html로 응답
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    index_file = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "AI Meow Frontend Build (`frontend_dist`) folder not found."}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8100, reload=True)