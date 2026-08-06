import os
import uuid
import base64
import fitz  # PyMuPDF
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from config import get_db_connection, get_user_workspace

router = APIRouter(prefix="/api", tags=["Image Chunking"])

class ImageChunkSavePayload(BaseModel):
    user_name: Optional[str] = "admin"
    global_prefix: Optional[str] = ""
    source_filename: Optional[str] = "IMAGE_INPUT"
    image_url: str
    ocr_text: Optional[str] = ""

@router.post("/extract-images")
async def extract_images(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form("default_user")  # 👈 사용자 ID 수신
):
    filename = file.filename.lower()
    file_bytes = await file.read()
    
    # 🎯 사용자 ID 기반 저장 디렉터리 지정: uploads/{user_id}/images/
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

            static_url = f"http://localhost:8100/static/{user_id}/images/{save_filename}"
            base64_data = base64.b64encode(file_bytes).decode('utf-8')

            extracted_images.append({
                "image_id": image_id,
                "page_number": 1,
                "preview_url": static_url,
                "image_data_base64": f"data:image/{ext};base64,{base64_data}"
            })

        elif filename.endswith('.pdf'):
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                for img_idx, img_info in enumerate(page.get_images(full=True)):
                    xref = img_info[0]
                    base_image = doc.extract_image(xref)
                    img_bytes = base_image["image"]
                    img_ext = base_image["ext"]

                    image_id = f"img_p{page_idx + 1}_{img_idx + 1}_{uuid.uuid4().hex[:4]}"
                    save_filename = f"{image_id}.{img_ext}"
                    save_path = os.path.join(user_img_dir, save_filename)

                    with open(save_path, "wb") as f:
                        f.write(img_bytes)

                    static_url = f"http://localhost:8100/static/{user_id}/images/{save_filename}"
                    base64_data = base64.b64encode(img_bytes).decode('utf-8')

                    extracted_images.append({
                        "image_id": image_id,
                        "page_number": page_idx + 1,
                        "preview_url": static_url,
                        "image_data_base64": f"data:image/{img_ext};base64,{base64_data}"
                    })

        return {"status": "success", "user_id": user_id, "total": len(extracted_images), "images": extracted_images}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 추출 실패: {str(e)}")

@router.post("/process-image-ocr")
async def process_image_ocr(
    image_id: str = Form(...),
    preview_url: str = Form(...),
    user_id: Optional[str] = Form("default_user")
):
    try:
        mock_ocr = f"[OCR 분석 완료]\n- 사용자: {user_id}\n- 이미지 ID: {image_id}\n- 파싱 텍스트 가공 완료"
        return {"status": "success", "image_server_url": preview_url, "ocr_text": mock_ocr}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR 파싱 실패: {str(e)}")

@router.post("/save-image-chunk")
async def save_image_chunk(payload: ImageChunkSavePayload):
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        prefix_str = payload.global_prefix.strip() if payload.global_prefix else ""
        clean_text = payload.ocr_text.strip() if payload.ocr_text else ""
        content_body = f"![이미지]({payload.image_url})\n\n{clean_text}".strip()
        if prefix_str:
            content_body = f"[{prefix_str}]\n{content_body}"

        insert_query = """
            INSERT INTO public.tb_raw_document (user_name, content, status, source_filename)
            VALUES (%s, %s, 'READY', %s);
        """
        cursor.execute(insert_query, (payload.user_name, content_body, payload.source_filename))
        conn.commit()
        cursor.close()

        return {"status": "success", "message": "🖼️ 이미지 청크가 지식 DB에 적재되었습니다!"}
    except Exception as e:
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=f"이미지 청크 DB 저장 실패: {str(e)}")
    finally:
        if conn: conn.close()