@echo off
echo ============================================
echo   Techub POC - SMTP Server Local
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Python nao encontrado. Instale o Python 3.10+ em: https://python.org
    pause
    exit /b 1
)

REM Go to the smtp_server directory
cd /d "%~dp0smtp_server"

REM Create venv if it doesn't exist
if not exist ".venv" (
    echo [INFO] Criando ambiente virtual Python...
    python -m venv .venv
)

REM Activate venv
call .venv\Scripts\activate.bat

REM Install requirements
echo [INFO] Instalando dependencias...
pip install -r requirements.txt --quiet

REM Start the server
echo.
echo [INFO] Iniciando servidor SMTP na porta 3001...
echo [INFO] Acesse: http://localhost:3001/health
echo [INFO] Pressione CTRL+C para parar.
echo.
uvicorn main:app --reload --port 3001 --host 127.0.0.1

pause
