@echo off
echo Switching to root user profile...
set AWS_PROFILE=root
echo.
echo ✅ AWS CLI is now using the 'root' profile
echo.
echo Current identity:
aws sts get-caller-identity
echo.
echo To switch back to default profile, run:
echo   set AWS_PROFILE=
echo.
