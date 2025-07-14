@echo off
REM Claude Monitor Launcher for Windows
REM This batch file launches the Claude Monitor web interface

echo Starting Claude Monitor...
echo.

REM Change to the claude-monitor directory
cd /d "%~dp0\.."

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if dist directory exists
if not exist "dist" (
    echo Building project...
    call npm run build
    if errorlevel 1 (
        echo Failed to build project
        pause
        exit /b 1
    )
)

REM Kill any existing instance on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /f /pid %%a >nul 2>&1
)

REM Start the web server
echo Starting Claude Monitor web interface...
echo Opening http://localhost:3000 in your browser...
start "" node dist/index.js --web-only --plan Max20

REM Wait a moment for the server to start
timeout /t 3 /nobreak >nul

REM Open in default browser
start "" http://localhost:3000

echo.
echo Claude Monitor is running at http://localhost:3000
echo Close this window to stop the monitor
echo.
pause