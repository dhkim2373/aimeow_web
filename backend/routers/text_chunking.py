import os
import re
import time
import shutil
import requests
import pymupdf4llm
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from config import get_db_connection, get_user_workspace
from routers.settings import get_config

router = APIRouter(prefix="/api", tags=["Text Chunking"])

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
    if not text_content: return ""
    text_content = re.sub(r'<br\s*/?>', ' ', text_content, flags=re.IGNORECASE)
    text_content = re.sub(r'#{1,6}\s+', '', text_content)
    text_content = re.sub(r'\*\*([^*]+)\*\*?', r'\1', text_content)
    text_content = re.sub(r'\*([^*]+)\*', r'\1', text_content)
    lines = [line.strip() for line in text_content.split('\n') if line.strip()]
    return "\n".join(lines)

@router.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form("default_user")  # 👈 사용자 ID 수신
):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")
    
    # 🎯 사용자 ID 기반 저장 디렉터리 지정: uploads/{user_id}/pdf/
    user_pdf_dir = get_user_workspace(user_id=user_id, subfolder="pdf")
    file_path = os.path.join(user_pdf_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        t_start = time.time()
        md_pages = pymupdf4llm.to_markdown(file_path, page_chunks=True)
        response_data = []
        global_line_idx = 0
        
        for idx, page_chunk in enumerate(md_pages):
            current_page_num = page_chunk.get("page", page_chunk.get("page_idx", idx))
            current_page_num = int(current_page_num) + 1
            page_lines = [line.strip() for line in page_chunk.get("text", "").split('\n') if line.strip()]
            
            for line in page_lines:
                response_data.append({
                    "line_index": str(global_line_idx),
                    "text": line,
                    "is_split_point": False,
                    "is_deleted": False,
                    "page_number": current_page_num,
                    "source_filename": file.filename,
                    "user_id": user_id
                })
                global_line_idx += 1
            
        return response_data
    except Exception as e:
        if os.path.exists(file_path): os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"PDF 파싱 실패: {str(e)}")

@router.post("/save-chunks")
def save_chunks(data: dict):
    saved_config = get_config()
    target_url = data.get("target_api_url") or saved_config.get("target_api_url")
    api_key = data.get("api_key") or saved_config.get("api_key")

    if target_url:
        headers = {"Content-Type": "application/json"}
        if api_key: headers["Authorization"] = f"Bearer {api_key}"
        try:
            response = requests.post(target_url, json=data, headers=headers, timeout=10)
            return {"status": "success", "message": f"고객사 API({target_url})로 전송 완료! (응답: {response.status_code})"}
        except Exception as e:
            return {"status": "error", "message": f"Target API 전송 실패: {str(e)}"}

    return {"status": "success", "message": "저장되었습니다."}

@router.post("/webhook/ingest")
def webhook_ingest_chunks(payload: WebhookPayload):
    valid_chunks = [item for item in payload.chunks if not getattr(item, 'is_deleted', False)]
    current_chunk_buffer = []
    chunk_group_idx = 1
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        insert_query = "INSERT INTO public.tb_raw_document (user_name, content, status, source_filename) VALUES (%s, %s, 'READY', %s);"
        
        for idx, item in enumerate(valid_chunks):
            current_chunk_buffer.append(item.text)
            if item.is_split_point or idx == len(valid_chunks) - 1:
                raw_markdown_content = "\n".join(current_chunk_buffer).strip()
                if raw_markdown_content:
                    clean_plain_text = strip_markdown(raw_markdown_content)
                    prefix_str = payload.global_prefix.strip() if payload.global_prefix else ""
                    if prefix_str: clean_plain_text = f"[{prefix_str}]\n{clean_plain_text}"
                    filename_val = payload.source_filename if payload.source_filename else "WEBHOOK_INPUT"
                    cursor.execute(insert_query, (payload.user_name, clean_plain_text, filename_val))
                    chunk_group_idx += 1
                    current_chunk_buffer = [] 
        
        conn.commit()
        cursor.close()
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"Webhook DB 적재 실패: {str(e)}")
    finally:
        if conn: conn.close()
                
    return {"status": "success", "message": f"성공적으로 {chunk_group_idx - 1}개의 순수 청크가 적재되었습니다!"}