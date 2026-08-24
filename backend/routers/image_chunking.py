import os
import io
import uuid
import json
import base64
import re
import requests
import asyncio
import pymupdf  # ✅ 최신 표준 import
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from pydantic import BaseModel
from PIL import Image
from google import genai
from google.genai import types

from config import get_user_workspace, settings
from routers.settings import get_config  # RAG 연동 설정 조회

router = APIRouter(prefix="/api", tags=["Image Chunking"])


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


def get_nested_value(d: dict, key_path: str):
    """점 표기법(data.url)으로 중첩된 dict 값을 안전하게 추출하는 헬퍼 함수"""
    keys = key_path.split('.')
    current = d
    for k in keys:
        if isinstance(current, dict) and k in current:
            current = current[k]
        else:
            return None
    return str(current) if current else None


def upload_to_external_image_server(
    local_file_path: str, 
    upload_api_url: str, 
    auth_token: Optional[str] = None,
    file_field_name: Optional[str] = "file",
    response_url_key: Optional[str] = "auto"
) -> Optional[str]:
    """
    등록된 외부/운영 이미지 서버로 파일을 업로드하고 영구 URL 수신
    """
    try:
        headers = {}
        target_url = upload_api_url.strip()
        clean_token = auth_token.strip() if auth_token else ""

        # 1. URL 내 템플릿 변수({key}, {api_key}, {token}) 치환
        if clean_token:
            target_url = target_url.replace("{key}", clean_token)\
                                   .replace("{api_key}", clean_token)\
                                   .replace("{token}", clean_token)
            
            if "{key}" not in upload_api_url and "{api_key}" not in upload_api_url:
                headers["Authorization"] = f"Bearer {clean_token}"

        # 2. Form Data 파일 키 지정 (기본값: file)
        field_key = file_field_name.strip() if file_field_name and file_field_name.strip() else "file"

        with open(local_file_path, "rb") as f:
            files = {field_key: f}
            response = requests.post(target_url, files=files, headers=headers, timeout=15)

        if response.status_code in [200, 201]:
            res_json = response.json()
            
            # 3. 지정된 response_url_key(예: "data.url")로 값 파싱
            if response_url_key and response_url_key.strip() != "auto":
                parsed_url = get_nested_value(res_json, response_url_key.strip())
                if parsed_url:
                    return parsed_url

            # 4. "auto"이거나 지정 키로 못 찾은 경우 자동 폴백 탐색
            remote_url = (
                res_json.get("url")
                or res_json.get("image_url")
                or res_json.get("link")
                or res_json.get("location")
                or (res_json.get("data", {}) if isinstance(res_json.get("data"), dict) else {}).get("url")
                or (res_json.get("data", {}) if isinstance(res_json.get("data"), dict) else {}).get("display_url")
                or (res_json.get("data", {}) if isinstance(res_json.get("data"), dict) else {}).get("link")
            )
            return remote_url
        else:
            print(f"⚠️ 외부 이미지 서버 응답 오류 [{response.status_code}]: {response.text}")
            return None
    except Exception as e:
        print(f"❌ 외부 이미지 서버 전송 실패: {e}")
        return None


# ─────────────────────────────────────────────────────────────
# 🐾 Gemini Vision 자동 추출 스키마 및 엔드포인트
# ─────────────────────────────────────────────────────────────

class VisionExtractRequest(BaseModel):
    image_url: str
    user_id: Optional[str] = "default_user"
    gemini_api_key: Optional[str] = None  # 옵션: 프론트 설정값 또는 환경변수


@router.post("/extract-vision")
async def extract_vision_metadata(req: VisionExtractRequest):
    """
    ✨ Gemini Vision을 호출하여 이미지의 텍스트, 구조, 표, 캡션, 태그를 자동 추출
    """
    try:
        # 1. 대상 이미지 파일 로컬 경로 찾기
        filename_part = req.image_url.split("/")[-1].split("?")[0]
        user_img_dir = get_user_workspace(user_id=req.user_id, subfolder="images")
        local_image_path = os.path.join(user_img_dir, filename_part)

        if not os.path.exists(local_image_path):
            raise HTTPException(status_code=404, detail=f"서버에서 로컬 이미지 파일을 찾을 수 없습니다: {filename_part}")

        # 2. 이미지 바이트 및 확장자 판별
        with open(local_image_path, "rb") as f:
            image_bytes = f.read()

        ext = filename_part.split(".")[-1].lower()
        mime_type = "image/png" if ext == "png" else "image/jpeg" if ext in ["jpg", "jpeg"] else "image/webp"

        # 3. Gemini Client 설정 (요청 본문 키 or 환경변수 or 설정 파일)
        saved_config = get_config()
        api_key = req.gemini_api_key or saved_config.get("gemini_api_key") or os.getenv("GEMINI_API_KEY")
        
        if not api_key:
            raise HTTPException(status_code=400, detail="Gemini API Key가 설정되지 않았습니다. Target API 설정 또는 환경변수를 확인해 주세요.")

        client = genai.Client(api_key=api_key)

        # 4. 구조화 추출용 시스템 프롬프트
        prompt = """
        당신은 엔터프라이즈 RAG 시스템의 문서 이미지 전처리 전문가입니다.
        제공된 이미지를 분석하여 검색 및 지식 DB에 저장하기 위한 최적의 메타데이터를 작성해 주세요.

        반드시 아래의 JSON 구조로만 응답해야 합니다:
        {
          "manual_text": "이미지 내부의 모든 텍스트, 메뉴 계층 구조, 표(Markdown 테이블 형식), 핵심 내용을 충실하게 복원한 본문",
          "caption": "이미지의 목적이나 핵심 주제를 명확하게 나타내는 1줄 요약 제목 (예: 아웃룩 폴더 트리 구조)",
          "image_type": "표 / 양식 | 다이어그램 / 구조도 | UI / 화면캡처 | 차트 / 그래프 | 일반 이미지 중 택1",
          "tags": "검색에 유용한 핵심 키워드 3~5개를 쉼표로 구분 (예: 메일함, 보관, 편지함, 아웃룩)"
        }
        """

        # 5. Gemini 2.5 Flash 호출 (비동기 스레드 실행)
        def call_gemini():
            return client.models.generate_content(
                model='gemini-2.5-flash',
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2
                )
            )

        response = await asyncio.to_thread(call_gemini)
        
        # 6. JSON 응답 파싱
        raw_text = response.text.strip()
        parsed_result = json.loads(raw_text)

        return {
            "status": "success",
            "data": {
                "manual_text": parsed_result.get("manual_text", ""),
                "caption": parsed_result.get("caption", ""),
                "image_type": parsed_result.get("image_type", "UI / 화면캡처"),
                "tags": parsed_result.get("tags", "")
            }
        }

    except HTTPException as he:
        raise he
    except json.JSONDecodeError:
        print(f"❌ Gemini 응답 JSON 파싱 실패: {response.text}")
        raise HTTPException(status_code=500, detail="Gemini 응답을 JSON으로 파싱하지 못했습니다.")
    except Exception as e:
        print(f"❌ Gemini Vision 호출 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Vision 추출 실패: {str(e)}")


# ─────────────────────────────────────────────────────────────
# 기존 업로드 / 추출 / 청크 저장 엔드포인트 유지
# ─────────────────────────────────────────────────────────────

@router.post("/upload-image")
async def upload_single_image(
    request: Request,
    file: UploadFile = File(...),
    user_id: Optional[str] = Form("default_user")
):
    filename = file.filename.lower()
    file_bytes = await file.read()
    
    base_url = str(request.base_url).rstrip('/')
    user_img_dir = get_user_workspace(user_id=user_id, subfolder="images")

    try:
        if not filename.endswith(('.png', '.jpg', '.jpeg', '.webp')):
            raise HTTPException(status_code=400, detail="지원하지 않는 이미지 형식입니다.")

        image_id = f"img_{uuid.uuid4().hex[:8]}"
        ext = filename.split('.')[-1]
        save_filename = f"{image_id}.{ext}"
        save_path = os.path.join(user_img_dir, save_filename)

        with open(save_path, "wb") as f:
            f.write(file_bytes)

        full_static_url = f"{base_url}/static/{user_id}/images/{save_filename}"
        base64_data = base64.b64encode(file_bytes).decode('utf-8')

        return {
            "status": "success",
            "image_id": image_id,
            "preview_url": full_static_url,
            "image_url": full_static_url,
            "image_data_base64": f"data:image/{ext};base64,{base64_data}"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ 단일 이미지 업로드 실패 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"이미지 업로드 실패: {str(e)}")


@router.post("/extract-images")
async def extract_images(
    request: Request,
    file: UploadFile = File(...),
    user_id: Optional[str] = Form("default_user")
):
    filename = file.filename.lower()
    file_bytes = await file.read()
    
    base_url = str(request.base_url).rstrip('/')
    user_img_dir = get_user_workspace(user_id=user_id, subfolder="images")
    extracted_images = []

    try:
        if not filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="PDF 파일 형식이 아닙니다.")

        pdf_doc = pymupdf.open(stream=file_bytes, filetype="pdf")

        for page_idx in range(len(pdf_doc)):
            page_num = page_idx + 1
            page = pdf_doc[page_idx]

            zoom = 150 / 72
            mat = pymupdf.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)

            image_id = f"img_p{page_num}_{uuid.uuid4().hex[:4]}"
            save_filename = f"{image_id}.png"
            save_path = os.path.join(user_img_dir, save_filename)

            pix.save(save_path)

            img_bytes = pix.tobytes("png")
            base64_data = base64.b64encode(img_bytes).decode('utf-8')

            full_static_url = f"{base_url}/static/{user_id}/images/{save_filename}"

            extracted_images.append({
                "image_id": image_id,
                "page_number": page_num,
                "preview_url": full_static_url,
                "image_data_base64": f"data:image/png;base64,{base64_data}"
            })

        pdf_doc.close()

        return {
            "status": "success",
            "user_id": user_id,
            "total": len(extracted_images),
            "images": extracted_images
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ 이미지 추출 실패 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"이미지 추출 실패: {str(e)}")


@router.post("/save-image-chunk")
async def save_image_chunk(request: Request):
    try:
        body = await request.json()
        print("📦 [수신된 이미지 청크 정보]:", body)

        if isinstance(body.get("global_prefix"), dict):
            inner_data = body.get("global_prefix")
            for k, v in inner_data.items():
                if k not in body or not body[k]:
                    body[k] = v
            body["global_prefix"] = inner_data.get("global_prefix", "")

        user_name = str(body.get("user_name") or body.get("userName") or "admin")
        user_id = str(body.get("user_id") or body.get("userId") or "default_user")
        
        raw_prefix = body.get("global_prefix")
        global_prefix = str(raw_prefix) if raw_prefix and isinstance(raw_prefix, str) else ""

        source_filename = str(body.get("source_filename") or body.get("sourceFilename") or "IMAGE_INPUT")
        page_number = int(body.get("page_number") or body.get("pageNumber") or 1)
        
        input_image_url = str(
            body.get("image_url") 
            or body.get("imageUrl") 
            or body.get("preview_url") 
            or body.get("previewUrl") 
            or ""
        )
        final_image_url = input_image_url

        ocr_text = str(body.get("ocr_text") or body.get("ocrText") or body.get("manual_text") or "")
        caption = str(body.get("caption") or "")
        image_type = str(body.get("image_type") or body.get("imageType") or "TABLE")
        tags = str(body.get("tags") or "")

        saved_config = get_config()
        ext_upload_url = str(body.get("external_image_upload_url") or body.get("externalImageUploadUrl") or saved_config.get("image_upload_url") or "")
        ext_token = str(body.get("external_image_token") or body.get("externalImageToken") or saved_config.get("image_server_token") or "")
        file_field_name = str(body.get("file_field_name") or saved_config.get("file_field_name") or "file")
        response_url_key = str(body.get("response_url_key") or saved_config.get("response_url_key") or "auto")

        if ext_upload_url and ext_upload_url.strip() and input_image_url:
            filename_part = input_image_url.split("/")[-1].split("?")[0]
            user_img_dir = get_user_workspace(user_id=user_id, subfolder="images")
            local_image_path = os.path.join(user_img_dir, filename_part)

            if os.path.exists(local_image_path):
                remote_url = upload_to_external_image_server(
                    local_file_path=local_image_path,
                    upload_api_url=ext_upload_url.strip(),
                    auth_token=ext_token,
                    file_field_name=file_field_name,
                    response_url_key=response_url_key
                )
                if remote_url:
                    final_image_url = remote_url

        caption_str = f"캡션: {caption}\n" if caption else ""
        type_str = f"유형: {image_type}\n" if image_type else ""
        tag_str = f"태그: {tags}\n" if tags else ""
        
        raw_content_body = f"![이미지]({final_image_url})\n\n{caption_str}{type_str}{tag_str}\n{ocr_text.strip()}".strip()
        clean_plain_text = strip_markdown(raw_content_body)

        clean_prefix = strip_markdown(global_prefix)
        if clean_prefix:
            final_text = f"[{clean_prefix}]\n\n{clean_plain_text}"
        else:
            final_text = clean_plain_text

        target_url = body.get("target_api_url") or saved_config.get("target_api_url")
        api_key = body.get("api_key") or saved_config.get("api_key")

        if not target_url:
            raise HTTPException(
                status_code=400, 
                detail="설정된 Target REST API (Webhook) URL이 없습니다. RAG 연동 설정을 확인해 주세요."
            )

        webhook_payload = {
            "user_name": user_name,
            "global_prefix": clean_prefix,
            "source_filename": source_filename,
            "chunks": [
                {
                    "page_no": str(page_number),
                    "text": final_text
                }
            ]
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
            "message": f"🐾 이미지 청크 정보가 가공되어 설정된 웹훅({target_url})으로 전송되었습니다!",
            "target_api_response_code": res.status_code,
            "final_image_url": final_image_url
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ 웹훅 전송 처리 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=f"웹훅 전송 실패: {str(e)}")