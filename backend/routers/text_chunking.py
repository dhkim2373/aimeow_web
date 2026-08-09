import os
import re
import time
import shutil
import requests
import asyncio
import pymupdf as fitz
import pymupdf4llm
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from config import get_user_workspace
from routers.settings import get_config

router = APIRouter(prefix="/api", tags=["Text Chunking"])


def strip_markdown(text_content: str) -> str:
    """마크다운 태그, 강조, 헤더 및 HTML 줄바꿈 제거"""
    if not text_content: 
        return ""
    text_content = re.sub(r'<br\s*/?>', ' ', text_content, flags=re.IGNORECASE)
    text_content = re.sub(r'#{1,6}\s+', '', text_content)
    text_content = re.sub(r'\*\*([^*]+)\*\*?', r'\1', text_content)
    text_content = re.sub(r'\*([^*]+)\*', r'\1', text_content)
    lines = [line.strip() for line in text_content.split('\n') if line.strip()]
    return "\n".join(lines)


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
        
        md_pages = pymupdf4llm.to_markdown(file_path, page_chunks=True)

        for page_idx, page_data in enumerate(md_pages):
            page_metadata = page_data.get("metadata", {}) if isinstance(page_data, dict) else {}
            
            current_page_num = (
                page_metadata.get("page_number") 
                or (page_metadata.get("page") + 1 if page_metadata.get("page") is not None else None)
                or (page_idx + 1)
            )
            
            raw_text = page_data.get("text", "") if isinstance(page_data, dict) else str(page_data)
            lines = raw_text.split('\n')
            
            for line in lines:
                clean_line = line.strip()
                if not clean_line:
                    continue
                
                response_data.append({
                    "line_index": str(global_line_idx),
                    "text": clean_line,
                    "is_split_point": False,
                    "is_deleted": False,
                    "page_number": int(current_page_num),
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


@router.post("/save-chunks")
async def save_chunks(request: Request):
    """
    🎯 텍스트 청크 저장 및 웹훅 전송 (마크다운 정제 적용)
    """
    try:
        body = await request.json()
        print("📦 [수신된 텍스트 청크 저장 페이로드]:", body)

        user_name = str(body.get("user_name") or body.get("userName") or "admin")
        global_prefix = str(body.get("global_prefix") or body.get("globalPrefix") or "")
        source_filename = str(body.get("source_filename") or body.get("sourceFilename") or "TEXT_INPUT")
        raw_chunks = body.get("chunks", [])

        if not raw_chunks:
            raise HTTPException(status_code=400, detail="전송할 청크 데이터가 존재하지 않습니다.")

        # 🎯 마크다운 제거 처리 (strip_markdown 적용)
        cleaned_chunks = []
        for chk in raw_chunks:
            chk_copy = dict(chk)
            if "text" in chk_copy and chk_copy["text"]:
                chk_copy["text"] = strip_markdown(chk_copy["text"])
            cleaned_chunks.append(chk_copy)

        # RAG 연동 설정 조회
        saved_config = get_config()
        target_url = body.get("target_api_url") or saved_config.get("target_api_url")
        api_key = body.get("api_key") or saved_config.get("api_key")

        if not target_url:
            raise HTTPException(
                status_code=400, 
                detail="설정된 Target REST API (Webhook) URL이 없습니다. RAG 연동 설정을 확인해 주세요."
            )

        # 마크다운이 제거된 글로벌 프리픽스 및 청크 적용
        webhook_payload = {
            "user_name": user_name,
            "global_prefix": strip_markdown(global_prefix.strip()),
            "source_filename": source_filename,
            "chunks": cleaned_chunks
        }

        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        def send_request():
            return requests.post(target_url, json=webhook_payload, headers=headers, timeout=10)

        res = await asyncio.to_thread(send_request)
        print(f"🚀 [Target REST API 웹훅 발송 완료]: {target_url} (응답 코드: {res.status_code})")

        return {
            "status": "success",
            "message": f"총 {len(cleaned_chunks)}개의 텍스트 청크(순수 텍스트)가 설정된 웹훅({target_url})으로 성공적으로 전송되었습니다!",
            "target_api_response_code": res.status_code
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ 텍스트 청크 저장 및 웹훅 전송 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"청크 저장 실패: {str(e)}")