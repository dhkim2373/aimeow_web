import os
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# config.py의 설정 로드/저장 헬퍼 및 settings 가져오기
from config import load_server_config, save_server_config, settings

router = APIRouter(prefix="/api", tags=["Settings"])


# 🐾 Pydantic 모델: 새로 추가된 file_field_name, response_url_key 포함
class ConfigRequest(BaseModel):
    target_api_url: Optional[str] = ""
    api_key: Optional[str] = ""
    image_upload_url: Optional[str] = ""
    image_server_token: Optional[str] = ""
    file_field_name: Optional[str] = "file"      # 🎯 Form Data 파일 키 (기본값: "file")
    response_url_key: Optional[str] = "auto"     # 🎯 응답 JSON URL 키 경로 (기본값: "auto")


@router.get("/config")
def get_config():
    """서버 설정 조회 API"""
    try:
        config_data = load_server_config()
        # 기본값 폴백 보장
        config_data.setdefault("file_field_name", "file")
        config_data.setdefault("response_url_key", "auto")
        return config_data
    except Exception as e:
        print(f"⚠️ 설정 로드 오류: {e}")
        return {
            "target_api_url": getattr(settings, "TARGET_REST_API_URL", ""),
            "api_key": getattr(settings, "TARGET_REST_API_KEY", ""),
            "image_upload_url": getattr(settings, "IMAGE_UPLOAD_URL", ""),
            "image_server_token": getattr(settings, "IMAGE_SERVER_TOKEN", ""),
            "file_field_name": getattr(settings, "FILE_FIELD_NAME", "file"),
            "response_url_key": getattr(settings, "RESPONSE_URL_KEY", "auto")
        }


@router.post("/config")
def save_config(config: ConfigRequest):
    """서버 설정 저장 및 메모리/JSON 파일 동기화 API"""
    try:
        data = {
            "target_api_url": (config.target_api_url or "").strip(),
            "api_key": (config.api_key or "").strip(),
            "image_upload_url": (config.image_upload_url or "").strip(),
            "image_server_token": (config.image_server_token or "").strip(),
            "file_field_name": (config.file_field_name or "file").strip(),
            "response_url_key": (config.response_url_key or "auto").strip()
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