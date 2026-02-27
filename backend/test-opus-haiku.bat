@echo off
echo ========================================
echo Testing Claude Opus 4.5 and Haiku 4.5
echo ========================================
echo.
echo Setting AWS_PROFILE to root...
set AWS_PROFILE=root
echo.
node test-opus-haiku-45.js
echo.
pause
