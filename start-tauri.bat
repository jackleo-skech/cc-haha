@echo off
setlocal
cd /d "%~dp0"

title Claude Code Haha - Tauri Desktop

echo ========================================
echo   Claude Code Haha - Tauri Desktop
echo ========================================
echo   (Includes native interactive terminal)
echo ========================================
echo.

echo [1/6] Checking Bun...
where bun >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Bun not found. Install it first: powershell -c "irm bun.sh/install.ps1 | iex"
    pause
    exit /b 1
)
echo [1/6] Checking Bun... OK
echo.

echo [2/6] Checking Rust...
set "CARGO_BIN=%USERPROFILE%\.cargo\bin"
if exist "%CARGO_BIN%\rustc.exe" (
    set "PATH=%CARGO_BIN%;%PATH%"
)

where rustc >nul 2>nul
if %errorlevel% neq 0 (
    echo [Error] Rust not found.
    echo.
    echo Install Rust from: https://rustup.rs/
    echo Or run: winget install Rustlang.Rustup
    pause
    exit /b 1
)
for /f "delims=" %%i in ('rustc --version') do echo Rust: %%i
for /f "delims=" %%i in ('cargo --version') do echo Cargo: %%i
echo [2/6] Checking Rust... OK
echo.

echo [3/6] Checking LiteLLM...
set "HAHA_DIR=%~dp0"
set "LITELLM_START=%~dp0lite-llm\start.bat"
set "LITELLM_BASE=http://localhost:4000"
set "LITELLM_URL=http://localhost:4000/v1/models"
set "LITELLM_TOKEN=sk-lite-llm-prod-key-2024"

powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$headers = @{ Authorization = 'Bearer %LITELLM_TOKEN%' }; try { Invoke-WebRequest -UseBasicParsing -Uri '%LITELLM_URL%' -Headers $headers -TimeoutSec 3 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
    if not exist "%LITELLM_START%" (
        echo [Warn] LiteLLM starter not found: %LITELLM_START%
        echo [Info] Starting without LiteLLM...
    ) else (
        echo LiteLLM not running. Starting...
        start "LiteLLM" cmd /k "cd /d ""%HAHA_DIR%"" && call lite-llm\start.bat"
        echo Waiting for LiteLLM...
        powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$headers = @{ Authorization = 'Bearer %LITELLM_TOKEN%' }; $deadline = (Get-Date).AddSeconds(20); while ((Get-Date) -lt $deadline) { try { Invoke-WebRequest -UseBasicParsing -Uri '%LITELLM_URL%' -Headers $headers -TimeoutSec 3 | Out-Null; exit 0 } catch { Start-Sleep -Milliseconds 500 } }; exit 1"
        if errorlevel 1 (
            echo [Warn] LiteLLM startup timed out, continuing anyway...
        ) else (
            echo LiteLLM ready.
        )
    )
) else (
    echo LiteLLM already running.
)
echo.

echo [4/6] Installing dependencies...
cd /d "%~dp0"
call bun install >nul 2>&1
if %errorlevel% neq 0 (
    echo [Warn] Root dependency install had issues, continuing...
)

cd /d "%~dp0desktop"
call bun install >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] Desktop dependency install failed
    pause
    exit /b 1
)

if not exist "%~dp0.env" (
    if exist "%~dp0.env.example" (
        copy "%~dp0.env.example" "%~dp0.env" >nul
    )
)
cd /d "%~dp0"
echo [4/6] Dependencies ready
echo.

echo [5/6] Starting API Server...
set "SERVER_ACTUAL_PORT=3456"
start "Claude Code Server" cmd /k "cd /d ""%~dp0"" && bun run src/server/index.ts"
timeout /t 4 /nobreak >nul
for /f "usebackq tokens=*" %%p in (`powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '$env:USERPROFILE\.claude\cc-haha\server-port' -ErrorAction SilentlyContinue"`) do set SERVER_ACTUAL_PORT=%%p
if not defined SERVER_ACTUAL_PORT set SERVER_ACTUAL_PORT=3456
echo API Server ready at http://127.0.0.1:%SERVER_ACTUAL_PORT%
echo.

echo [6/6] Starting Feishu Adapter...
cd /d "%~dp0adapters"
call bun install >nul 2>&1
start "Feishu Adapter" cmd /k "bun run feishu"
cd /d "%~dp0"
echo Feishu Adapter started.
echo.

echo ========================================
echo   Starting Tauri Desktop App...
echo ========================================
echo.
echo   Terminal:  Available (native PTY)
echo   Stats:     Available
echo   Prompts:   Available
echo.
echo   Press Ctrl+C to stop
echo ========================================
echo.

start "Tauri Desktop" cmd /k "cd /d ""%~dp0desktop"" && bun run tauri dev"
echo Tauri Desktop started in a separate window.
pause
