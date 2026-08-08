import os
import re
import json
from dotenv import load_dotenv

# .env 파일 자동 로드
load_dotenv()

# JSON 설정 파일 경로 및 기본 업로드 경로
CONFIG_FILE_PATH = "./server_config.json"
BASE_UPLOAD_DIR = "uploads"


class Settings:
    TARGET_REST_API_URL: str = os.getenv("TARGET_REST_API_URL", "")
    TARGET_REST_API_KEY: str = os.getenv("TARGET_REST_API_KEY", "")
    IMAGE_UPLOAD_URL: str = os.getenv("IMAGE_UPLOAD_URL", "")
    IMAGE_SERVER_TOKEN: str = os.getenv("IMAGE_SERVER_TOKEN", "")
    
    # 📌 Poppler 실행 바이너리 경로 (Windows 개발 시 .env에서 설정, Linux/Docker 환경 시 빈값/None)
    POPPLER_PATH: str = os.getenv("POPPLER_PATH", "")


settings = Settings()


def load_server_config() -> dict:
    """server_config.json 파일이 존재하면 읽어오고, 없으면 기본값(환경변수) 반환"""
    config_data = {
        "target_api_url": settings.TARGET_REST_API_URL,
        "api_key": settings.TARGET_REST_API_KEY,
        "image_upload_url": settings.IMAGE_UPLOAD_URL,
        "image_server_token": settings.IMAGE_SERVER_TOKEN,
        "poppler_path": settings.POPPLER_PATH
    }
    
    if os.path.exists(CONFIG_FILE_PATH):
        try:
            with open(CONFIG_FILE_PATH, "r", encoding="utf-8") as f:
                saved = json.load(f)
                config_data.update(saved)
        except Exception as e:
            print(f"⚠️ server_config.json 읽기 실패: {e}")
            
    return config_data


def save_server_config(data: dict):
    """server_config.json에 설정값 저장 및 메모리 settings 업데이트"""
    try:
        with open(CONFIG_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        # 메모리 설정 즉시 동기화
        settings.TARGET_REST_API_URL = data.get("target_api_url", "")
        settings.TARGET_REST_API_KEY = data.get("api_key", "")
        settings.IMAGE_UPLOAD_URL = data.get("image_upload_url", "")
        settings.IMAGE_SERVER_TOKEN = data.get("image_server_token", "")
        settings.POPPLER_PATH = data.get("poppler_path", settings.POPPLER_PATH)
    except Exception as e:
        print(f"⚠️ server_config.json 저장 실패: {e}")


def get_user_workspace(user_id: str = "default_user", subfolder: str = "") -> str:
    """
    사용자 ID 기반 디렉터리 경로 반환: uploads/{user_id}/{subfolder}
    """
    if not user_id or not str(user_id).strip():
        safe_user_id = "default_user"
    else:
        safe_user_id = re.sub(r'[^a-zA-Z0-9_\-]', '', str(user_id)).strip() or "default_user"

    path = os.path.join(BASE_UPLOAD_DIR, safe_user_id, subfolder)
    os.makedirs(path, exist_ok=True)
    return path


# 🐾 모듈 로드 시점에 저장된 JSON 설정값을 읽어 초기 메모리 settings 동기화
_initial_config = load_server_config()
settings.TARGET_REST_API_URL = _initial_config.get("target_api_url", settings.TARGET_REST_API_URL)
settings.TARGET_REST_API_KEY = _initial_config.get("api_key", settings.TARGET_REST_API_KEY)
settings.IMAGE_UPLOAD_URL = _initial_config.get("image_upload_url", settings.IMAGE_UPLOAD_URL)
settings.IMAGE_SERVER_TOKEN = _initial_config.get("image_server_token", settings.IMAGE_SERVER_TOKEN)
settings.POPPLER_PATH = _initial_config.get("poppler_path", settings.POPPLER_PATH)