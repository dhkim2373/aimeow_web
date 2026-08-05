import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    TARGET_REST_API_URL: str = os.getenv("TARGET_REST_API_URL", "")
    TARGET_REST_API_KEY: str = os.getenv("TARGET_REST_API_KEY", "")

settings = Settings()