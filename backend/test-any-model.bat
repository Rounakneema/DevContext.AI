@echo off
echo ========================================
echo Testing ALL Available Models
echo ========================================
echo Including Amazon Nova and Claude models
echo.
echo Setting AWS_PROFILE to root...
set AWS_PROFILE=root
echo.
node test-any-working-model.js
echo.
pause
