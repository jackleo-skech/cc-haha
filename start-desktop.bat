@echo off
setlocal
cd /d "%~dp0"

title Claude Code Haha - Desktop Launcher

echo ========================================
echo   Claude Code Haha - Desktop Launcher
echo ========================================
echo.

where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Bun not found. Install it first: powershell -c "irm bun.sh/install.ps1 | iex"
    pause
    exit /b 1
)

echo [1/5] Checking Bun... OK
echo.

set "HAHA_DIR=%~dp0"
set "LITELLM_START=%~dp0lite-llm\start.bat"
set "LITELLM_BASE=http://localhost:4000"
set "LITELLM_URL=http://localhost:4000/v1/models"
set "LITELLM_TOKEN=sk-lite-llm-prod-key-2024"

echo [2/5] Checking LiteLLM...
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$headers = @{ Authorization = 'Bearer %LITELLM_TOKEN%' }; try { Invoke-WebRequest -UseBasicParsing -Uri '%LITELLM_URL%' -Headers $headers -TimeoutSec 3 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
    if not exist "%LITELLM_START%" (
        echo [Error] LiteLLM starter not found: %LITELLM_START%
        pause
        exit /b 1
    )
    echo LiteLLM not running. Starting...
    start "LiteLLM" cmd /k "cd /d ""%HAHA_DIR%"" && call lite-llm\start.bat"
    echo Waiting for LiteLLM...
    powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$headers = @{ Authorization = 'Bearer %LITELLM_TOKEN%' }; $deadline = (Get-Date).AddSeconds(20); while ((Get-Date) -lt $deadline) { try { Invoke-WebRequest -UseBasicParsing -Uri '%LITELLM_URL%' -Headers $headers -TimeoutSec 3 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 500 } }; exit 1"
    if errorlevel 1 (
        echo [Error] LiteLLM startup timed out
        pause
        exit /b 1
    )
    echo LiteLLM ready.
) else (
    echo LiteLLM already running.
)
echo.

echo [3/5] Installing root dependencies...
call bun install
if %errorlevel% neq 0 (
    echo [Error] Root dependency install failed
    pause
    exit /b 1
)
echo Root dependencies installed
echo.

echo [4/5] Installing Desktop dependencies...
cd /d "%~dp0desktop"
call bun install
if %errorlevel% neq 0 (
    echo [Error] Desktop dependency install failed
    pause
    exit /b 1
)
cd /d "%~dp0"
echo Desktop dependencies installed
echo.

if not exist ".env" (
    echo [Info] .env not found, copying from .env.example...
    if exist ".env.example" (
        copy .env.example .env >nul
        echo [Warn] Edit .env to configure your API Key. Press any key to continue...
        pause
    ) else (
        echo [Error] .env.example not found
        pause
        exit /b 1
    )
)

echo [5/5] Select launch mode...
echo.
echo   [1] Browser Mode     - Web UI at http://127.0.0.1:2024 (fast, no terminal)
echo   [2] Desktop Mode     - Tauri native app (with interactive terminal)
echo.
choice /C 12 /N /M "Select launch mode (1=Browser, 2=Desktop): "
if %errorlevel%==2 goto :TAURI_MODE
goto :BROWSER_MODE

:BROWSER_MODE
echo.
echo ========================================
echo   LiteLLM:      http://127.0.0.1:4000
echo   API Server:   http://127.0.0.1:%SERVER_ACTUAL_PORT%
echo   Desktop UI:   http://127.0.0.1:2024
echo ========================================
echo.
echo Press Ctrl+C in each window to stop
echo.

start "Claude Code Server" cmd /k "cd /d ""%~dp0"" && bun run src/server/index.ts"

timeout /t 4 /nobreak >nul

for /f "usebackq tokens=*" %%p in (`powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '$env:USERPROFILE\.claude\cc-haha\server-port' -ErrorAction SilentlyContinue"`) do set SERVER_ACTUAL_PORT=%%p
if not defined SERVER_ACTUAL_PORT set SERVER_ACTUAL_PORT=3456

start "Claude Code Desktop" cmd /k "cd /d ""%~dp0desktop"" && set VITE_DESKTOP_SERVER_URL=http://127.0.0.1:%SERVER_ACTUAL_PORT% && bun run dev --host 127.0.0.1 --port 2024"

echo.
echo ========================================
echo   All services started!
echo   LiteLLM:      http://127.0.0.1:4000
echo   API Server:   http://127.0.0.1:%SERVER_ACTUAL_PORT%
echo   Desktop UI:   http://127.0.0.1:2024
echo ========================================
echo.
echo Browser will open shortly...
echo.

timeout /t 5 /nobreak >nul

start http://127.0.0.1:2024
goto :END

:TAURI_MODE
echo.

where rustc >nul 2>nul
if %errorlevel% neq 0 (
    set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
    if exist "%CARGO_BIN%\rustc.exe" (
        set "PATH=%CARGO_BIN%;%PATH%"
    ) else (
        echo [Error] Rust not found. Install from https://rustup.rs/
        pause
        exit /b 1
    )
)

for /f "delims=" %%i in ('rustc --version 2^>nul') do echo [Rust] %%i
for /f "delims=" %%i in ('cargo --version 2^>nul') do echo [Cargo] %%i
echo.

echo ========================================
echo   Starting Tauri Desktop App...
echo   (This includes a native interactive terminal)
echo ========================================
echo.
echo Press Ctrl+C in this window to stop
echo.

cd /d "%~dp0desktop"
call bun run tauri dev
goto :END

:END
echo.
echo Done.
pause
