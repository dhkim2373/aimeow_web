import os
import uuid
import base64
import requests
import asyncio
import fitz  # PyMuPDF
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from config import get_user_workspace
from routers.settings import get_config  # RAG 연동 설정 조회

router = APIRouter(prefix="/api", tags=["Image Chunking"])


def upload_to_external_image_server(local_file_path: str, upload_api_url: str, auth_token: Optional[str] = None) -> Optional[str]:
    """등록된 외부/운영 이미지 서버로 파일을 업로드하고 영구 URL 수신"""
    try:
        headers = {}
        if auth_token and auth_token.strip():
            headers["Authorization"] = f"Bearer {auth_token.strip()}"

        with open(local_file_path, "rb") as f:
            files = {"file": f}
            response = requests.post(upload_api_url.strip(), files=files, headers=headers, timeout=10)

        if response.status_code in [200, 201]:
            res_json = response.json()
            remote_url = (
                res_json.get("url")
                or res_json.get("image_url")
                or res_json.get("link")
                or res_json.get("location")
                or res_json.get("data", {}).get("url")
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
    """PDF 또는 이미지 파일에서 뷰어용 이미지(동적 Host URL 및 Base64) 추출"""
    filename = file.filename.lower()
    file_bytes = await file.read()
    
    base_url = str(request.base_url).rstrip('/')
    user_img_dir = get_user_workspace(user_id=user_id, subfolder="images")
    extracted_images = []

    try:
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

        elif filename.endswith('.pdf'):
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                
                image_id = f"img_p{page_idx + 1}_{uuid.uuid4().hex[:4]}"
                save_filename = f"{image_id}.png"
                save_path = os.path.join(user_img_dir, save_filename)

                with open(save_path, "wb") as f:
                    f.write(img_bytes)

                full_static_url = f"{base_url}/static/{user_id}/images/{save_filename}"
                base64_data = base64.b64encode(img_bytes).decode('utf-8')

                extracted_images.append({
                    "image_id": image_id,
                    "page_number": page_idx + 1,
                    "preview_url": full_static_url,
                    "image_data_base64": f"data:image/png;base64,{base64_data}"
                })

        return {
            "status": "success",
            "user_id": user_id,
            "total": len(extracted_images),
            "images": extracted_images
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 추출 실패: {str(e)}")

@router.post("/save-image-chunk")
async def save_image_chunk(request: Request):
    """
    🎯 이미지 정보 가공 후 고객사 웹훅(Target REST API)으로만 전송하는 엔드포인트 (타임아웃 및 데드락 방지 적용)
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

        ext_upload_url = str(body.get("external_image_upload_url") or body.get("externalImageUploadUrl") or "")
        ext_token = str(body.get("external_image_token") or body.get("externalImageToken") or "")

        # 2. 외부 이미지 서버 이관 업로드 처리
        if ext_upload_url and ext_upload_url.strip() and input_image_url:
            filename_part = input_image_url.split("/")[-1]
            user_img_dir = get_user_workspace(user_id=user_id, subfolder="images")
            local_image_path = os.path.join(user_img_dir, filename_part)

            if os.path.exists(local_image_path):
                remote_url = upload_to_external_image_server(
                    local_file_path=local_image_path,
                    upload_api_url=ext_upload_url.strip(),
                    auth_token=ext_token
                )
                if remote_url:
                    final_image_url = remote_url

        # 3. 텍스트/메타데이터 정제 및 본문 가공
        prefix_str = global_prefix.strip() if global_prefix else ""
        manual_text = ocr_text.strip() if ocr_text else ""
        caption_str = f"캡션: {caption}\n" if caption else ""
        type_str = f"유형: {image_type}\n" if image_type else ""
        tag_str = f"태그: {tags}\n" if tags else ""
        
        content_body = f"![이미지]({final_image_url})\n\n{caption_str}{type_str}{tag_str}\n{manual_text}".strip()

        # 4. 설정된 고객사 Target REST API (웹훅) 주소 확보
        saved_config = get_config()
        target_url = body.get("target_api_url") or saved_config.get("target_api_url")
        api_key = body.get("api_key") or saved_config.get("api_key")

        if not target_url:
            raise HTTPException(
                status_code=400, 
                detail="설정된 Target REST API (Webhook) URL이 없습니다. RAG 연동 설정을 확인해 주세요."
            )

        # 5. 웹훅 전송 규격 데이터 포맷팅
        webhook_payload = {
            "user_name": user_name,
            "global_prefix": prefix_str,
            "source_filename": source_filename,
            "chunks": [
                {
                    "line_index": "0",
                    "page_number": 1,
                    "text": content_body,
                    "is_split_point": True,
                    "is_deleted": False
                }
            ]
        }

        # 6. 동기 HTTP 요청을 별도 스레드로 분리하여 셀프 데드락(Read Timed Out) 방지
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