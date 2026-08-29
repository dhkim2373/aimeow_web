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
from langchain_text_splitters import RecursiveCharacterTextSplitter

router = APIRouter(prefix="/api", tags=["Text Chunking"])

# 🎯 랭체인 멀티 구분자 리커시브 캐릭터 스플리터 적용 엔드포인트
@router.post("/chunking/recursive-split")
def recursive_split_text(data: dict):
    """
    🎯 청크 사이즈가 0이거나 없을 경우 랭체인 강제 분할을 거치지 않고 오직 멀티 구분자로만 순수 분할
    """
    text_content = data.get("text", "")
    chunk_size = int(data.get("chunk_size", 500))
    chunk_overlap = int(data.get("chunk_overlap", 50))
    delimiters = data.get("delimiters", ["\n\n", "\n", " ", ""])
    
    if not text_content.strip():
        return {"status": "success", "chunks": []}

    # 💡 청크 사이즈를 0으로 준 경우: 오직 첫 번째(가장 큰 단위) 구분자로만 순수 분할
    if chunk_size <= 0:
        primary_delimiter = delimiters[0] if delimiters else "\n\n"
        raw_chunks = text_content.split(primary_delimiter)
        split_texts = [c.strip() for c in raw_chunks if c.strip()]
    else:
        # 일반적인 랭체인 리커시브 스플리터 수행
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=delimiters,
            length_function=len,
        )
        split_texts = splitter.split_text(text_content)
    
    preview_chunks = []
    for idx, chunk_text in enumerate(split_texts):
        clean_plain_text = strip_markdown(chunk_text)
        if clean_plain_text:
            preview_chunks.append({
                "chunk_index": idx + 1,
                "raw_content": chunk_text,
                "clean_text": clean_plain_text,
                "line_count": len(chunk_text.split('\n'))
            })

    return {
        "status": "success",
        "chunks": preview_chunks
    }

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
    """
    🎯 계단식 분할 시 상위 헤더 메타데이터가 유실되지 않도록 완벽하게 누적 병합하는 스플리터
    """
    lines_payload = data.get("lines", [])
    
    if not lines_payload:
        return {"status": "success", "chunks": []}

    active_lines = [item for item in lines_payload if not item.get("is_deleted", False)]
    full_text = "\n".join([item.get("text", "") for item in active_lines])
    
    def cascading_split(text: str, level: int, inherited_metadata: dict) -> list:
        if not text.strip():
            return []
            
        if level == 1:
            headers = [("#", "Header 1")]
        elif level == 2:
            headers = [("#", "Header 1"), ("##", "Header 2")]
        else:
            headers = [("#", "Header 1"), ("##", "Header 2"), ("###", "Header 3")]
            
        splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers)
        splits = splitter.split_text(text)
        
        if not splits:
            return [(inherited_metadata, text)]
        
        refined_splits = []
        for split in splits:
            content = split.page_content
            # 현재 스플릿에서 나온 메타데이터와 상위에서 물려받은 메타데이터를 병합합니다.
            current_metadata = {**inherited_metadata, **split.metadata}
            
            if len(content) > 500 and level < 3:
                sub_splits = cascading_split(content, level + 1, current_metadata)
                refined_splits.extend(sub_splits)
            else:
                refined_splits.append((current_metadata, content))
                
        return refined_splits

    # 초기 빈 메타데이터로 계단식 분할 시작
    raw_splits = cascading_split(full_text, level=1, inherited_metadata={})
    
    preview_chunks = []
    for idx, (metadata, content) in enumerate(raw_splits):
        header_lines = []
        # Header 1, Header 2, Header 3 순서대로 상위 타이틀을 조립합니다.
        for header_key in ["Header 1", "Header 2", "Header 3"]:
            if header_key in metadata:
                level_num = header_key.split()[-1]
                hashes = "#" * int(level_num)
                header_lines.append(f"{hashes} {metadata[header_key]}")
        
        content_lines = [l.strip() for l in content.split('\n') if l.strip()]
        
        # 본문 내용 내부에 이미 동일한 헤더가 포함되어 있는 경우 중복 추가를 방지합니다.
        filtered_content_lines = []
        for line in content_lines:
            if not any(line == hl for hl in header_lines):
                filtered_content_lines.append(line)

        chunk_lines = header_lines + filtered_content_lines
        chunk_text_raw = "\n".join(chunk_lines)
        clean_plain_text = strip_markdown(chunk_text_raw)
        
        if clean_plain_text:
            preview_chunks.append({
                "chunk_index": idx + 1,
                "raw_content": chunk_text_raw,
                "clean_text": clean_plain_text,
                "line_count": len(chunk_lines)
            })

    return {
        "status": "success",
        "chunks": preview_chunks
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
        for item in raw_chunks:
            chunk_text = item.get("text") or item.get("clean_text") or item.get("raw_content", "")
            page_no_str = str(item.get("page_no") or item.get("page_number") or "1")

            clean_plain_text = strip_markdown(chunk_text)
            clean_prefix = strip_markdown(global_prefix)
            
            if clean_prefix:
                final_text = f"[{clean_prefix}]\n\n{clean_plain_text}"
            else:
                final_text = clean_plain_text

            formatted_chunks.append({
                "page_no": page_no_str,
                "text": final_text
            })

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