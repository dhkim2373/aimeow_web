import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import BASE_UPLOAD_DIR
from routers import settings, image_chunking, text_chunking

os.makedirs(BASE_UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="AI Meow RAG Engine")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 정적 파일 마운트
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=uploads_dir), name="static")

# 🎯 라우터 등록
app.include_router(settings.router)
app.include_router(image_chunking.router)
app.include_router(text_chunking.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8100, reload=True)


