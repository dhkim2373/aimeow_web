import os
import io
import uuid
import base64
import re
import requests
import asyncio
import fitz  # 🐾 PyMuPDF (PyMuPDF4LLM 기반 고속 처리)
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from PIL import Image

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
    - URL 내 {key} / {api_key} 템플릿 자동 치환
    - Form Data 파일 키 동적 지원 (file, image 등)
    - 지정된 응답 JSON 키 경로(data.url 등) 동적 파싱 지원
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


@router.post("/extract-images")
async def extract_images(
    request: Request,
    file: UploadFile = File(...),
    user_id: Optional[str] = Form("default_user")
):
    """
    PDF 또는 이미지 파일에서 뷰어용 이미지(동적 Host URL 및 Base64) 추출
    🎯 (Poppler/pdf2image 의존성 없이 PyMuPDF로 고속 추출)
    """
    filename = file.filename.lower()
    file_bytes = await file.read()
    
    base_url = str(request.base_url).rstrip('/')
    user_img_dir = get_user_workspace(user_id=user_id, subfolder="images")
    extracted_images = []

    try:
        # 1. 단일 이미지 파일 처리 (PNG, JPG, WEBP 등)
        if filename.endswith(('.png', '.jpg', '.jpeg', '.webp')):
            image_id = f"img_{uuid.uuid4().hex[:8]}"
            ext = filename.split('.')[-1]
            save_filename = f"{image_id}.{ext}"
            save_path = os.path.join(user_img_dir, save_filename)

            with open(save_path, "wb") as f:
                f.write(file_bytes)

            full_static_url = f"{base_url}/static/{user_id}/images/{save_filename}"
            base64_data = base64.b64encode(file_bytes).decode('utf-8')

            extracted_images.append({
                "image_id": image_id,
                "page_number": 1,
                "preview_url": full_static_url,
                "image_data_base64": f"data:image/{ext};base64,{base64_data}"
            })

        # 2. PDF 문서 파일 처리 (PyMuPDF / fitz 기반 고속 이미지 렌더링)
        elif filename.endswith('.pdf'):
            pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")

            for page_idx in range(len(pdf_doc)):
                page_num = page_idx + 1
                page = pdf_doc[page_idx]

                zoom = 150 / 72
                mat = fitz.Matrix(zoom, zoom)
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
    except Exception as e:
        print(f"❌ 이미지 추출 실패 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"이미지 추출 실패: {str(e)}")


@router.post("/save-image-chunk")
async def save_image_chunk(request: Request):
    """
    🎯 이미지 정보 가공 후 고객사 웹훅(Target REST API)으로 
    source_filename, global_prefix, chunks([page_no, text]) 규격에 맞춰 전송
    """
    try:
        body = await request.json()
        print("📦 [수신된 이미지 청크 정보]:", body)

        # 1. 중첩 페이로드 언패킹
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

        # 설정 조회 및 외부 이미지 업로드 설정 추출
        saved_config = get_config()
        ext_upload_url = str(body.get("external_image_upload_url") or body.get("externalImageUploadUrl") or saved_config.get("image_upload_url") or "")
        ext_token = str(body.get("external_image_token") or body.get("externalImageToken") or saved_config.get("image_server_token") or "")
        file_field_name = str(body.get("file_field_name") or saved_config.get("file_field_name") or "file")
        response_url_key = str(body.get("response_url_key") or saved_config.get("response_url_key") or "auto")

        # 2. 외부 이미지 서버 이관 업로드 처리
        if ext_upload_url and ext_upload_url.strip() and input_image_url:
            filename_part = input_image_url.split("/")[-1]
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

        # 3. 텍스트/메타데이터 정제 및 본문 가공 (마크다운 정제 적용)
        caption_str = f"캡션: {caption}\n" if caption else ""
        type_str = f"유형: {image_type}\n" if image_type else ""
        tag_str = f"태그: {tags}\n" if tags else ""
        
        raw_content_body = f"![이미지]({final_image_url})\n\n{caption_str}{type_str}{tag_str}\n{ocr_text.strip()}".strip()
        clean_plain_text = strip_markdown(raw_content_body)

        # 4. global_prefix가 있는 경우 맨 앞에 [Prefix] 형태로 삽입
        clean_prefix = strip_markdown(global_prefix)
        if clean_prefix:
            final_text = f"[{clean_prefix}]\n\n{clean_plain_text}"
        else:
            final_text = clean_plain_text

        # 5. 설정된 고객사 Target REST API (웹훅) 주소 확보
        target_url = body.get("target_api_url") or saved_config.get("target_api_url")
        api_key = body.get("api_key") or saved_config.get("api_key")

        if not target_url:
            raise HTTPException(
                status_code=400, 
                detail="설정된 Target REST API (Webhook) URL이 없습니다. RAG 연동 설정을 확인해 주세요."
            )

        # 6. 최신 웹훅 전송 규격 데이터 포맷팅 (source_filename 상위, chunks 내부 page_no, text)
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

        # 7. 동기 HTTP 요청을 별도 스레드로 분리하여 셀프 데드락 방지
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