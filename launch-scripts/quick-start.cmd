@echo off
REM Quick Start Claude Monitor (assumes already built)
REM Lightweight launcher for daily use

cd /d "%~dp0\.."

REM Kill existing instance
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /f /pid %%a >nul 2>&1
)

REM Start monitor
echo Starting Claude Monitor...
start "" node dist/index.js --web-only --plan Max20

REM Wait and open browser
timeout /t 2 /nobreak >nul
start "" http://localhost:3000

echo Claude Monitor running at http://localhost:3000