@echo off

set ROOT=E:\Github\toolset\cc-haha-0.2.1

set CALLER_DIR=%CD%

cd /d %ROOT%

bun --preload "%ROOT%\preload.ts" --env-file="%ROOT%\.env" "%ROOT%\src\entrypoints\cli.tsx" %*