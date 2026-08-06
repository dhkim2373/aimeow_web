import os
import re
import psycopg
from dotenv import load_dotenv

load_dotenv()

class Settings:
    TARGET_REST_API_URL: str = os.getenv("TARGET_REST_API_URL", "")
    TARGET_REST_API_KEY: str = os.getenv("TARGET_REST_API_KEY", "")

settings = Settings()

CONFIG_FILE_PATH = "./server_config.json"
BASE_UPLOAD_DIR = "uploads"

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "dbname": os.getenv("DB_NAME", "redbombz"),
    "user": os.getenv("DB_USER", "redbombz"),
    "password": os.getenv("DB_PASSWORD", "a11223344*"),
    "port": int(os.getenv("DB_PORT", 5432))
}

def get_db_connection():
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