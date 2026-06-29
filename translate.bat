@echo off
setlocal

if "%~1"=="" (
  echo Usage:
  echo   translate.bat "ACADEMY_VIDEO_URL"
  exit /b 1
)

set "TOOL_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%TOOL_DIR%scripts\New-AcademyKoreanSubtitle.ps1" -Url "%~1" -OutDir "%TOOL_DIR%subtitles" -TranslateWithCodex
exit /b %ERRORLEVEL%
