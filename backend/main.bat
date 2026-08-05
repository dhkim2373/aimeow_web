@echo off
title AIMeow FastAPI 데몬

:: 작업 디렉토리 이동
cd /d "c:\workspace3\chunking-app\backend

echo ==========================================================
echo    OpenWebUI 서버 기동
echo ==========================================================
echo.

start "" "c:\workspace3\venv\Scripts\python.exe" main.py