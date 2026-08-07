import os
import time
import shutil
import requests
import pymupdf4llm
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from config import get_user_workspace
from routers.settings import get_config

router = APIRouter(prefix="/api", tags=["Text Chunking"])


@router.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form("default_user")
):
    """
    PDF 파일을 업로드받아 사용자 폴더(uploads/{user_id}/pdf/)에 저장하고 
    PyMuPDF4LLM을 가동하여 라인 단위 파싱 데이터를 반환합니다.
    """
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
            
        print(f"📑 [PDF 파싱 성공] 소요시간: {time.time() - t_start:.2f}초 | 총 라인: {global_line_idx}개")
        return response_data

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"PDF 파싱 실패: {str(e)}")


@router.post("/save-chunks")
async def save_chunks(data: dict):
    """
    정제 완료된 청크 데이터를 고객사 설정 웹훅(Target REST API)으로 전송합니다.
    """
    saved_config = get_config()
    target_url = data.get("target_api_url") or saved_config.get("target_api_url")
    api_key = data.get("api_key") or saved_config.get("api_key")

    if target_url:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
            
        try:
            response = requests.post(target_url, json=data, headers=headers, timeout=10)
            return {
                "status": "success", 
                "message": f"고객사 API({target_url})로 전송 완료! (응답 코드: {response.status_code})"
            }
        except Exception as e:
            return {
                "status": "error", 
                "message": f"Target API 전송 실패: {str(e)}"
            }

    return {
        "status": "success", 
        "message": "저장할 Target REST API URL이 설정되지 않았습니다."
    }