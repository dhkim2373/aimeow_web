import os
import time
import shutil
import fitz  # PyMuPDF
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
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")
    
    user_pdf_dir = get_user_workspace(user_id=user_id, subfolder="pdf")
    file_path = os.path.join(user_pdf_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        t_start = time.time()
        response_data = []
        global_line_idx = 0
        
        # 🎯 1. PyMuPDF4LLM을 활용한 페이지 청크 파싱
        md_pages = pymupdf4llm.to_markdown(file_path, page_chunks=True)

        # 🎯 2. enumerate 순회로 정확한 페이지 번호 보장
        for page_idx, page_data in enumerate(md_pages):
            page_metadata = page_data.get("metadata", {}) if isinstance(page_data, dict) else {}
            
            # 메타데이터에서 page_number/page 탐색 -> 없을 경우 enumerate의 page_idx + 1 사용
            current_page_num = (
                page_metadata.get("page_number") 
                or (page_metadata.get("page") + 1 if page_metadata.get("page") is not None else None)
                or (page_idx + 1)
            )
            
            raw_text = page_data.get("text", "") if isinstance(page_data, dict) else str(page_data)
            
            # 줄바꿈 단위 분할
            lines = raw_text.split('\n')
            
            for line in lines:
                clean_line = line.strip()
                if not clean_line:
                    continue  # 완전히 빈 줄 제외
                
                response_data.append({
                    "line_index": str(global_line_idx),
                    "text": clean_line,
                    "is_split_point": False,
                    "is_deleted": False,
                    "page_number": int(current_page_num), # 🎯 정확한 페이지 번호 전달
                    "source_filename": file.filename,
                    "user_id": user_id
                })
                global_line_idx += 1

        print(f"📑 [PyMuPDF 파싱 성공] 소요시간: {time.time() - t_start:.2f}초 | 총 {len(md_pages)}페이지 / {global_line_idx}개 라인 파싱 완료")
        return response_data

    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        print(f"❌ PDF 파싱 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"PDF 파싱 실패: {str(e)}")