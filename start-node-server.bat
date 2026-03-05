@echo off
echo ============================================
echo   Techub POC - SMTP Server Node.js
echo ============================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado. Instale o em: https://nodejs.org
    pause
    exit /b 1
)

REM Go to the node_server directory
cd /d "%~dp0node_server"

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    npm install
)

REM Start the server
echo.
echo [INFO] Iniciando servidor SMTP na porta 3002...
echo [INFO] Acesse: http://localhost:3002/health
echo [INFO] Pressione CTRL+C para parar.
echo.
npm start

pause
