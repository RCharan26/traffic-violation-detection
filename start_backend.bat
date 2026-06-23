@echo off
setlocal enabledelayedexpansion
title TrafficVision AI — Backend Server

echo ====================================================
echo  TrafficVision AI — FastAPI Backend
echo  Flipkart Gridlock Hackathon 2.0
echo ====================================================
echo.

:: Create data directories
if not exist "backend\data\uploads"         mkdir "backend\data\uploads"
if not exist "backend\data\uploads\debug"   mkdir "backend\data\uploads\debug"
if not exist "backend\data\evidence"        mkdir "backend\data\evidence"
if not exist "backend\data\reports"         mkdir "backend\data\reports"
if not exist "backend\data\models"          mkdir "backend\data\models"

:: Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo [1/3] Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Could not create venv. Make sure Python 3.10+ is installed.
        pause
        exit /b 1
    )
    echo Done.
    echo.
)

:: Activate virtual environment
call venv\Scripts\activate.bat

:: Install/upgrade requirements
echo [2/3] Installing backend dependencies...
pip install --quiet --upgrade pip
pip install --quiet -r backend\requirements.txt
if errorlevel 1 (
    echo ERROR: pip install failed. Check your internet connection.
    pause
    exit /b 1
)
echo Done.
echo.

:: Start uvicorn
echo [3/3] Starting FastAPI server at http://localhost:8000
echo       API Docs available at: http://localhost:8000/docs
echo       Health check: http://localhost:8000/health
echo.
echo Press Ctrl+C to stop.
echo.

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend --log-level info

pause
