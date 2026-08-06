import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from config import CONFIG_FILE_PATH, settings

router = APIRouter(prefix="/api", tags=["Settings"])

class ConfigRequest(BaseModel):
    target_api_url: str
    api_key: str

@router.get("/config")
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

@router.post("/config")
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