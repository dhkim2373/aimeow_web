import os
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# config.py의 설정 로드/저장 헬퍼 및 settings 가져오기
from config import load_server_config, save_server_config, settings

router = APIRouter(prefix="/api", tags=["Settings"])


# 🐾 Pydantic 모델: 모든 필드에 Optional과 기본값("")을 부여하여 422 에러 방지
class ConfigRequest(BaseModel):
    target_api_url: Optional[str] = ""
    api_key: Optional[str] = ""
    image_upload_url: Optional[str] = ""
    image_server_token: Optional[str] = ""


@router.get("/config")
def get_config():
    """서버 설정 조회 API"""
    try:
        return load_server_config()
    except Exception as e:
        print(f"⚠️ 설정 로드 오류: {e}")
        return {
            "target_api_url": getattr(settings, "TARGET_REST_API_URL", ""),
            "api_key": getattr(settings, "TARGET_REST_API_KEY", ""),
            "image_upload_url": getattr(settings, "IMAGE_UPLOAD_URL", ""),
            "image_server_token": getattr(settings, "IMAGE_SERVER_TOKEN", "")
        }


@router.post("/config")
def save_config(config: ConfigRequest):
    """서버 설정 저장 및 메모리/JSON 파일 동기화 API"""
    try:
        data = {
            "target_api_url": config.target_api_url or "",
            "api_key": config.api_key or "",
            "image_upload_url": config.image_upload_url or "",
            "image_server_token": config.image_server_token or ""
        }
        
        # server_config.json 저장 및 메모리 settings 즉시 갱신
        save_server_config(data)
        
        return {
            "status": "success", 
            "message": "설정이 성공적으로 저장 및 적용되었습니다.",
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"설정 저장 실패: {str(e)}")