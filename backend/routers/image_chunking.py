import os
import uuid
import base64
import fitz  # PyMuPDF
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from pydantic import BaseModel
from config import get_db_connection, get_user_workspace

router = APIRouter(prefix="/api", tags=["Image Chunking"])


class ImageChunkSavePayload(BaseModel):
    user_name: Optional[str] = "admin"
    global_prefix: Optional[str] = ""
    source_filename: Optional[str] = "IMAGE_INPUT"
    image_url: str
    ocr_text: Optional[str] = ""  # 수동 입력 텍스트 및 표 마크다운
    caption: Optional[str] = ""
    image_type: Optional[str] = "TABLE"
    tags: Optional[str] = ""


@router.post("/extract-images")
async def extract_images(
    request: Request,
    file: UploadFile = File(...),
    user_id: Optional[str] = Form("default_user")
):
    """PDF 또는 이미지 파일에서 뷰어용 이미지(동적 Host URL 및 Base64) 추출"""
    filename = file.filename.lower()
    file_bytes = await file.read()
    
    # 🎯 요청에서 동적으로 base_url 추출 (예: http://192.168.0.10:8100/ 또는 http://mydomain.com/)
    base_url = str(request.base_url).rstrip('/')
    
    user_img_dir = get_user_workspace(user_id=user_id, subfolder="images")
    extracted_images = []

    try:
        # 1. 단일 이미지 파일 업로드 (.png, .jpg, .jpeg, .webp)
        if filename.endswith(('.png', '.jpg', '.jpeg', '.webp')):
            image_id = f"img_{uuid.uuid4().hex[:8]}"
            ext = filename.split('.')[-1]
            save_filename = f"{image_id}.{ext}"
            save_path = os.path.join(user_img_dir, save_filename)

            with open(save_path, "wb") as f:
                f.write(file_bytes)

            # 🌐 동적 Host 기반 URL
            full_static_url = f"{base_url}/static/{user_id}/images/{save_filename}"
            base64_data = base64.b64encode(file_bytes).decode('utf-8')

            extracted_images.append({
                "image_id": image_id,
                "page_number": 1,
                "preview_url": full_static_url,
                "image_data_base64": f"data:image/{ext};base64,{base64_data}"
            })

        # 2. PDF 파일 업로드 (페이지별 이미지 렌더링)
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

                # 🌐 동적 Host 기반 URL
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
async def save_image_chunk(payload: ImageChunkSavePayload):
    """이미지 URL과 수동 입력 메타데이터/텍스트를 묶어서 DB에 저장"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        prefix_str = payload.global_prefix.strip() if payload.global_prefix else ""
        manual_text = payload.ocr_text.strip() if payload.ocr_text else ""
        caption_str = f"캡션: {payload.caption}\n" if payload.caption else ""
        type_str = f"유형: {payload.image_type}\n" if payload.image_type else ""
        tag_str = f"태그: {payload.tags}\n" if payload.tags else ""
        
        # Markdown 표준 규칙에 맞춰 이미지 패스 및 입력 정보 구성
        content_body = f"![이미지]({payload.image_url})\n\n{caption_str}{type_str}{tag_str}\n{manual_text}".strip()
        if prefix_str:
            content_body = f"[{prefix_str}]\n{content_body}"

        insert_query = """
            INSERT INTO public.tb_raw_document (user_name, content, status, source_filename)
            VALUES (%s, %s, 'READY', %s);
        """
        cursor.execute(insert_query, (payload.user_name, content_body, payload.source_filename))
        conn.commit()
        cursor.close()

        return {"status": "success", "message": "🖼️ 수동 입력 메타데이터 및 이미지 정보가 성공적으로 DB에 저장되었습니다!"}
    except Exception as e:
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"이미지 청크 DB 저장 실패: {str(e)}")
    finally:
        if conn:
            conn.close()