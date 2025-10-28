@echo off
setlocal ENABLEDELAYEDEXPANSION

echo === Employee Badge System: First setup & run ===

REM Ensure we are in the project root where package.json exists
if not exist "package.json" (
  echo [Error] package.json not found in current directory.
  echo Please run this script from the project root: employee-badge-system\
  pause
  exit /b 1
)

echo [1/5] Checking Node and npm...
where node >nul 2>nul || (
  echo [Error] Node.js not found. Install from https://nodejs.org/ and retry.
  pause
  exit /b 1
)
where npm >nul 2>nul || (
  echo [Error] npm not found. Ensure Node.js is installed correctly.
  pause
  exit /b 1
)

echo [2/5] Preparing environment file...
if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo Created .env from .env.example. You can edit it later if needed.
  ) else (
    echo No .env or .env.example found. Proceeding with defaults.
  )
)

echo [3/5] Installing dependencies (npm install)...
npm install
if errorlevel 1 (
  echo [Error] npm install failed.
  pause
  exit /b 1
)

REM Read PORT from .env (default 3000)
set "PORT=3000"
if exist ".env" (
  for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
    if /I "%%A"=="PORT" set "PORT=%%B"
  )
)

echo [4/5] Starting server on port %PORT% in a new window...
start "EBS Server" cmd /k npm run dev

echo [5/5] Opening the app in your default browser...
REM Wait a bit to let the server start
timeout /t 3 /nobreak >nul
start "" http://localhost:%PORT%/

echo Done. A server window should be open and your browser should load the app.
exit /b 0
