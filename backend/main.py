import os
import uvicorn
import psycopg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional

# 공통 설정 및 라우터 모듈 불러오기
from config import BASE_UPLOAD_DIR, get_db_connection
from routers import settings, image_chunking, text_chunking

app = FastAPI(
    title="AI Meow Precision Chunking Engine",
    docs_url=None,     # 👈 Swagger UI 접근 비활성화 (/docs 숨김)
    redoc_url=None,    # 👈 Redoc 접근 비활성화 (/redoc 숨김)
    openapi_url=None   # 👈 OpenAPI JSON 메타데이터 비활성화 (/openapi.json 숨김)
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
# 📁 정적 파일 마운트 (업로드 디렉토리)
# ============================================================
uploads_dir = os.path.join(os.path.dirname(__file__), BASE_UPLOAD_DIR)
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=uploads_dir), name="static")

# ============================================================
# 🎯 모듈별 APIRouter 등록
# ============================================================
app.include_router(settings.router)
app.include_router(image_chunking.router)
app.include_router(text_chunking.router)


# ============================================================
# 📩 웹훅 수신 전용 Pydantic 모델 & 마크다운 정제 헬퍼
# ============================================================
class ChunkLine(BaseModel):
    line_index: str
    page_number: Optional[int] = 1
    text: str
    is_split_point: Optional[bool] = False
    is_deleted: Optional[bool] = False

class WebhookPayload(BaseModel):
    user_name: Optional[str] = "SYSTEM"
    global_prefix: Optional[str] = ""
    source_filename: Optional[str] = "WEBHOOK_INPUT"
    chunks: List[ChunkLine]

def strip_markdown(text_content: str) -> str:
    import re
    if not text_content: 
        return ""
    text_content = re.sub(r'<br\s*/?>', ' ', text_content, flags=re.IGNORECASE)
    text_content = re.sub(r'#{1,6}\s+', '', text_content)
    text_content = re.sub(r'\*\*([^*]+)\*\*?', r'\1', text_content)
    text_content = re.sub(r'\*([^*]+)\*', r'\1', text_content)
    lines = [line.strip() for line in text_content.split('\n') if line.strip()]
    return "\n".join(lines)


# ============================================================
# ⚓ [수신 전용 Webhook] 고객사/시스템으로부터 전달받은 청크 DB 적재
# ============================================================
@app.post("/api/webhook/ingest", tags=["Webhook Service"])
def webhook_ingest_chunks(payload: WebhookPayload):
    """
    고객사/외부 시스템에서 청킹 가공이 끝난 데이터를 수신하여
    PostgreSQL 지식 DB(public.tb_raw_document) 테이블에 적재하는 엔드포인트
    """
    valid_chunks = [item for item in payload.chunks if not getattr(item, 'is_deleted', False)]
    current_chunk_buffer = []
    chunk_group_idx = 1
    conn = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        insert_query = """
            INSERT INTO public.tb_raw_document (user_name, content, status, source_filename) 
            VALUES (%s, %s, 'READY', %s);
        """
        
        for idx, item in enumerate(valid_chunks):
            current_chunk_buffer.append(item.text)
            
            # 분할 지점이거나 마지막 청크인 경우 DB 적재 수행
            if item.is_split_point or idx == len(valid_chunks) - 1:
                raw_markdown_content = "\n".join(current_chunk_buffer).strip()
                if raw_markdown_content:
                    clean_plain_text = strip_markdown(raw_markdown_content)
                    prefix_str = payload.global_prefix.strip() if payload.global_prefix else ""
                    if prefix_str: 
                        clean_plain_text = f"[{prefix_str}]\n{clean_plain_text}"
                    
                    filename_val = payload.source_filename if payload.source_filename else "WEBHOOK_INPUT"
                    
                    cursor.execute(insert_query, (payload.user_name, clean_plain_text, filename_val))
                    chunk_group_idx += 1
                    current_chunk_buffer = [] 
        
        conn.commit()
        cursor.close()
    except Exception as e:
        if conn: 
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Webhook DB 적재 실패: {str(e)}")
    finally:
        if conn: 
            conn.close()
                
    return {
        "status": "success", 
        "message": f"성공적으로 {chunk_group_idx - 1}개의 청크가 지식 DB에 수신/적재되었습니다!"
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8100, reload=True)