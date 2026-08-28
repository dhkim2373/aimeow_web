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
from langchain_text_splitters import MarkdownHeaderTextSplitter

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


@router.post("/chunking/markdown-split")
def split_markdown_text(data: dict):
    lines_payload = data.get("lines", [])
    text = data.get("text", "")
    
    if not lines_payload and text:
        lines_payload = [{"text": line, "page_number": 1} for line in text.split('\n') if line.strip()]

    full_text = "\n".join([item.get("text", "") for item in lines_payload])
    
    headers_to_split_on = [
        ("#", "Header 1"),
        ("##", "Header 2"),
        ("###", "Header 3"),
        ("####", "Header 4"),
    ]
    splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on)
    splits = splitter.split_text(full_text)
    
    new_response_lines = []
    global_idx = 0
    current_search_idx = 0
    
    for idx, split in enumerate(splits):
        metadata = split.metadata
        content = split.page_content
        
        # 1. 현재 청크에 속한 상위 헤더들을 라인으로 생성
        header_lines_to_add = []
        for header_key in ["Header 1", "Header 2", "Header 3", "Header 4"]:
            if header_key in metadata:
                level = header_key[-1]
                hashes = "#" * int(level)
                header_text = f"{hashes} {metadata[header_key]}"
                header_lines_to_add.append(header_text)
        
        # 상위 헤더 추가 (페이지 번호는 현재 검색 중인 원본 라인의 페이지 번호 상속)
        current_page = 1
        if current_search_idx < len(lines_payload):
            current_page = lines_payload[current_search_idx].get("page_number", 1)

        for h_text in header_lines_to_add:
            new_response_lines.append({
                "line_index": f"header_{global_idx}",
                "text": h_text,
                "is_split_point": False,
                "is_deleted": False,
                "page_number": current_page,
                "source_filename": lines_payload[0].get("source_filename", "") if lines_payload else ""
            })
            global_idx += 1

        # 2. 본문 내용 라인 처리 및 마지막 줄 절단선(is_split_point) 매핑
        content_lines = [l.strip() for l in content.split('\n') if l.strip()]
        
        for c_idx, c_line in enumerate(content_lines):
            is_last = (c_idx == len(content_lines) - 1)
            
            # 원본 라인에서 해당 텍스트를 찾아 원래의 page_number와 line_index를 최대한 유지
            matched_page = current_page
            matched_line_idx = f"content_{global_idx}"
            
            found_original = False
            for i in range(current_search_idx, len(lines_payload)):
                orig_text = lines_payload[i].get("text", "").strip()
                if orig_text == c_line or c_line in orig_text:
                    matched_page = lines_payload[i].get("page_number", current_page)
                    matched_line_idx = lines_payload[i].get("line_index", f"content_{global_idx}")
                    current_search_idx = i + 1
                    found_original = True
                    break
            
            new_response_lines.append({
                "line_index": matched_line_idx,
                "text": c_line,
                "is_split_point": is_last, # 청크의 마지막 줄에 정확히 절단선 지정
                "is_deleted": False,
                "page_number": int(matched_page),
                "source_filename": lines_payload[0].get("source_filename", "") if lines_payload else ""
            })
            global_idx += 1

    return {
        "status": "success",
        "lines": new_response_lines
    }

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
    🎯 텍스트 청크 저장 및 웹훅 전송
    """
    try:
        body = await request.json()
        print("📦 [수신된 텍스트 청크 저장 페이로드]:", body)

        user_name = str(body.get("user_name") or body.get("userName") or "admin")
        global_prefix = str(body.get("global_prefix") or body.get("globalPrefix") or "").strip()
        source_filename = str(body.get("source_filename") or body.get("sourceFilename") or "TEXT_INPUT").strip()
        raw_chunks = body.get("chunks", [])

        if not raw_chunks:
            raise HTTPException(status_code=400, detail="전송할 청크 데이터가 존재하지 않습니다.")

        formatted_chunks = []
        current_chunk_buffer = []
        chunk_page_start = None
        chunk_page_end = None

        for idx, item in enumerate(raw_chunks):
            item_text = item.get("text", "") if isinstance(item, dict) else getattr(item, "text", "")
            is_deleted = item.get("is_deleted", False) if isinstance(item, dict) else getattr(item, "is_deleted", False)
            is_split_point = item.get("is_split_point", False) if isinstance(item, dict) else getattr(item, "is_split_point", False)
            
            raw_page = item.get("page_number") or item.get("page_no") if isinstance(item, dict) else 1
            try:
                page_number = int(raw_page)
            except (ValueError, TypeError):
                page_number = 1

            if is_deleted:
                continue

            if chunk_page_start is None:
                chunk_page_start = page_number
            chunk_page_end = page_number

            current_chunk_buffer.append(item_text)

            if is_split_point or idx == len(raw_chunks) - 1:
                raw_markdown_content = "\n".join(current_chunk_buffer).strip()

                if raw_markdown_content:
                    clean_plain_text = strip_markdown(raw_markdown_content)
                    clean_prefix = strip_markdown(global_prefix)
                    if clean_prefix:
                        final_text = f"[{clean_prefix}]\n\n{clean_plain_text}"
                    else:
                        final_text = clean_plain_text

                    if chunk_page_start == chunk_page_end:
                        page_no_str = str(chunk_page_start)
                    else:
                        page_no_str = f"{chunk_page_start}~{chunk_page_end}"

                    formatted_chunks.append({
                        "page_no": page_no_str,
                        "text": final_text
                    })

                current_chunk_buffer = []
                chunk_page_start = None
                chunk_page_end = None

        saved_config = get_config()
        target_url = body.get("target_api_url") or saved_config.get("target_api_url")
        api_key = body.get("api_key") or saved_config.get("api_key")

        if not target_url:
            raise HTTPException(
                status_code=400, 
                detail="설정된 Target REST API (Webhook) URL이 없습니다. RAG 연동 설정을 확인해 주세요."
            )

        webhook_payload = {
            "user_name": user_name,
            "global_prefix": strip_markdown(global_prefix),
            "source_filename": source_filename,
            "chunks": formatted_chunks
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
            "message": f"총 {len(formatted_chunks)}개의 청크가 웹훅({target_url})에 성공적으로 전송되었습니다!",
            "target_api_response_code": res.status_code
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ 텍스트 청크 저장 및 웹훅 전송 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"청크 저장 실패: {str(e)}")