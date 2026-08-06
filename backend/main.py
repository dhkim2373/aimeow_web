import re 
import uvicorn
import shutil
import os
import time
import json  # 👈 [수정] json 모듈 import 추가
import requests
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from config import settings

# 🎯 구글 API 대체용 로컬 PDF 마크다운 고속 파서 로드
import pymupdf4llm

# 🎯 [DB 연동]: 최신 psycopg v3 모듈 로드
import psycopg

# ============================================================
# 🗄️ DATABASE 접속 정보 (psycopg v3 호환)
# ============================================================
DB_CONFIG = {
    "host": "localhost",
    "dbname": "redbombz",
    "user": "redbombz",
    "password": "a11223344*",
    "port": 5432
}

def get_db_connection():
    """psycopg v3 커넥션을 생성합니다."""
    return psycopg.connect(**DB_CONFIG)

app = FastAPI()
CONFIG_FILE_PATH = "./server_config.json"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# 🎯 Pydantic 데이터 모델 정의
# ============================================================

# 👈 [수정] 설정 저장용 Pydantic 모델 추가 (함수보다 위에 선언)
class ConfigRequest(BaseModel):
    target_api_url: str
    api_key: str

class ChunkItem(BaseModel):
    line_index: str
    text: str
    is_split_point: bool
    page_number: int

class SaveRequest(BaseModel):
    global_prefix: Optional[str] = ""  # 🎯 React에서 보낸 공통 헤더 메타 수신 영역
    user_name: Optional[str] = "admin"  # 🎯 작성자 / 사용자 명
    source_filename: Optional[str] = "DIRECT_INPUT" # 🎯 원본 파일명
    chunks: List[ChunkItem]

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


# 임시 파일 저장소 생성
UPLOAD_DIR = "./temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def strip_markdown(text_content: str) -> str:
    """
    🎯 DB 적재 및 텍스트 임베딩 최적화를 위해
    마크다운 특수문자(#, **, |, --- 등)를 순수 텍스트로 정리합니다.
    """
    if not text_content:
        return ""
    
    # 🎯 <br> 태그를 공백으로 정제
    text_content = re.sub(r'<br\s*/?>', ' ', text_content, flags=re.IGNORECASE)
    
    # 1. 헤더 기호 제거 (## 제목 -> 제목)
    text_content = re.sub(r'#{1,6}\s+', '', text_content)
    
    # 2. 볼드/이탤릭 제거 (**텍스트** 또는 *텍스트* -> 텍스트)
    text_content = re.sub(r'\*\*([^*]+)\*\*?', r'\1', text_content)
    text_content = re.sub(r'\*([^*]+)\*', r'\1', text_content)
    
    # 3. 마크다운 표(Table) 구분선(|---|---| 등) 제거
    text_content = re.sub(r'\|[\s\-\|]*\|', '', text_content)
    
    # 4. 표의 파이프 기호(|)를 공백으로 치환하여 텍스트 분리
    text_content = text_content.replace('|', ' ')
    
    # 5. 연속된 공백 및 줄바꿈 정제
    lines = [line.strip() for line in text_content.split('\n') if line.strip()]
    return "\n".join(lines)


@app.post("/api/upload-pdf")
def upload_pdf(file: UploadFile = File(...)):
    """
    React에서 선택한 PDF 파일을 받아 pymupdf4llm의 페이지 분할 추출 기능(page_chunks=True)을 가동,
    각 행마다 텍스트 정보뿐 아니라 소속 페이지 메타데이터까지 함께 바인딩하여 반환합니다.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")
    
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    # 1. 브라우저가 보낸 임시 파일 물리 스트림 저장
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        t_start = time.time()
        print(f"🎬 [PDF 파싱 가동] 파일명: {file.filename}")
        
        # 2. page_chunks=True 활성화
        md_pages = pymupdf4llm.to_markdown(file_path, page_chunks=True)
        
        print(f" 📑 마크다운 페이지 분할 성공 : 소요시간 {time.time() - t_start:.4f}초")

        # 3. React UI 연동용 메타데이터 융합 빌드
        response_data = []
        global_line_idx = 0
        
        for idx, page_chunk in enumerate(md_pages):
            current_page_num = page_chunk.get("page")
            if current_page_num is None:
                current_page_num = page_chunk.get("page_idx", idx)
            
            current_page_num = int(current_page_num) + 1
            page_text = page_chunk.get("text", "")
            
            page_lines = [line.strip() for line in page_text.split('\n') if line.strip()]
            
            for line in page_lines:
                response_data.append({
                    "line_index": str(global_line_idx),
                    "text": line,
                    "is_split_point": False,
                    "is_deleted": False,
                    "page_number": current_page_num,
                    "source_filename": file.filename
                })
                global_line_idx += 1
            
        print(f" 📦 정제 완료: 총 {len(response_data)}개 조절 라인 변환 완료")
        return response_data

    except Exception as e:
        print(f"❌ PDF 파싱 크래시: {str(e)}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"PDF 파싱 실패: {str(e)}")


# 👈 [수정] 저장된 파일(server_config.json)을 최우선으로 읽고, 없으면 settings 기본값 반환
@app.get("/api/config")
def get_config():
    if os.path.exists(CONFIG_FILE_PATH):
        try:
            with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ 설정 파일 로드 오류: {e}")
            
    return {
        "target_api_url": getattr(settings, "TARGET_REST_API_URL", ""),
        "api_key": getattr(settings, "TARGET_REST_API_KEY", "")
    }    


# 👈 [수정] 프론트엔드 연동 설정 저장 API (POST)
@app.post("/api/config")
def save_config(config: ConfigRequest):
    try:
        data = {
            "target_api_url": config.target_api_url,
            "api_key": config.api_key
        }
        with open(CONFIG_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return {"status": "success", "message": "설정이 성공적으로 저장되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"설정 저장 실패: {str(e)}")    


# 💾 정제 완료 후 고객사 REST API로 데이터 전송
@app.post("/api/save-chunks")
def save_chunks(data: dict):
    # 1. 전달받은 target_api_url이 없으면 파일에 저장된 설정값 -> settings 기본값 순으로 사용
    saved_config = get_config()
    target_url = data.get("target_api_url") or saved_config.get("target_api_url")
    api_key = data.get("api_key") or saved_config.get("api_key")

    # 2. 고객사 REST API로 정제된 청크 데이터 발송 (Webhook)
    if target_url:
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        
        try:
            response = requests.post(target_url, json=data, headers=headers, timeout=10)
            return {"status": "success", "message": f"고객사 API({target_url})로 전송 완료! (응답: {response.status_code})"}
        except Exception as e:
            return {"status": "error", "message": f"Target API 전송 실패: {str(e)}"}

    return {"status": "success", "message": "저장되었습니다."}


@app.post("/api/webhook/ingest")
def webhook_ingest_chunks(payload: WebhookPayload):
    """
    외부 또는 내부 서비스로부터 청크 정제 결과 데이터를 웹훅(Webhook)으로 수신하여,
    마크다운 서식을 제거(Plain Text)하고 공통 접두어를 결합한 뒤 
    PostgreSQL public.tb_raw_document 테이블에 psycopg v3로 적재합니다.
    """
    print("\n" + "="*60)
    print("🎯 Webhook 청크 데이터 수신 및 PostgreSQL 적재 접수 완료 (psycopg v3):")
    if payload.global_prefix:
        print(f"📌 공통 메타 헤더: {payload.global_prefix}")
    print(f"📂 소스 파일명: {payload.source_filename} | 요청자: {payload.user_name}")
    print("-"*60)
    
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
            
            if item.is_split_point or idx == len(valid_chunks) - 1:
                raw_markdown_content = "\n".join(current_chunk_buffer).strip()
                
                if raw_markdown_content:
                    clean_plain_text = strip_markdown(raw_markdown_content)
                    
                    prefix_str = payload.global_prefix.strip() if payload.global_prefix else ""
                    if prefix_str:
                        clean_plain_text = f"[{prefix_str}]\n{clean_plain_text}"
                    
                    filename_val = payload.source_filename if payload.source_filename else "WEBHOOK_INPUT"
                    
                    cursor.execute(insert_query, (
                        payload.user_name,
                        clean_plain_text,
                        filename_val
                    ))
                    
                    print(f"💾 [PostgreSQL INSERT 완료 - raw_id #{chunk_group_idx}] Page: {item.page_number}")
                    print(f"--- [최종 DB 적재 텍스트 스냅샷] ---\n{clean_plain_text}")
                    print("-" * 40)
                    
                    chunk_group_idx += 1
                    current_chunk_buffer = [] 
        
        conn.commit()
        cursor.close()
        
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ Webhook DB 적재 중 에러 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Webhook DB 적재 실패: {str(e)}")
    finally:
        if conn:
            conn.close()
                
    print("="*60 + "\n")
    return {
        "status": "success", 
        "message": f"성공적으로 {chunk_group_idx - 1}개의 순수 청크가 웹훅을 통해 public.tb_raw_document 테이블에 적재되었습니다!"
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8100, reload=True)