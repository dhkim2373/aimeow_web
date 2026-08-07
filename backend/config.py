import os
import re
import json
import psycopg
from dotenv import load_dotenv

load_dotenv()

# JSON 설정 파일 경로
CONFIG_FILE_PATH = "./server_config.json"
BASE_UPLOAD_DIR = "uploads"


class Settings:
    TARGET_REST_API_URL: str = os.getenv("TARGET_REST_API_URL", "")
    TARGET_REST_API_KEY: str = os.getenv("TARGET_REST_API_KEY", "")
    # 🎯 외부/운영 이미지 서버 설정 추가
    IMAGE_UPLOAD_URL: str = os.getenv("IMAGE_UPLOAD_URL", "")
    IMAGE_SERVER_TOKEN: str = os.getenv("IMAGE_SERVER_TOKEN", "")


settings = Settings()


def load_server_config() -> dict:
    """server_config.json 파일이 존재하면 읽어오고, 없으면 기본값(환경변수) 반환"""
    config_data = {
        "target_api_url": settings.TARGET_REST_API_URL,
        "api_key": settings.TARGET_REST_API_KEY,
        "image_upload_url": settings.IMAGE_UPLOAD_URL,
        "image_server_token": settings.IMAGE_SERVER_TOKEN
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
            
        # 메모리 설정도 즉시 동기화
        settings.TARGET_REST_API_URL = data.get("target_api_url", "")
        settings.TARGET_REST_API_KEY = data.get("api_key", "")
        settings.IMAGE_UPLOAD_URL = data.get("image_upload_url", "")
        settings.IMAGE_SERVER_TOKEN = data.get("image_server_token", "")
    except Exception as e:
        print(f"⚠️ server_config.json 저장 실패: {e}")


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "dbname": os.getenv("DB_NAME", "redbombz"),
    "user": os.getenv("DB_USER", "redbombz"),
    "password": os.getenv("DB_PASSWORD", "a11223344*"),
    "port": int(os.getenv("DB_PORT", 5432))
}


def get_db_connection():
    """PostgreSQL 데이터베이스 연결 객체 반환"""
    return psycopg.connect(**DB_CONFIG)


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