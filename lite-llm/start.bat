@echo off
set "DASHSCOPE_API_KEY=sk-01bc33272a8e49f78501487968ce1490"
set "PYTHONIOENCODING=utf-8"
REM Uncomment the next line to enable LiteLLM debug logs.
REM set "LITELLM_LOG=DEBUG"
litellm --config lite-llm\config.yaml --port 4000
