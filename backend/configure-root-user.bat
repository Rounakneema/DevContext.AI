@echo off
echo ========================================
echo AWS CLI Configuration for Root User
echo ========================================
echo.
echo This will configure AWS CLI to use your root user credentials.
echo.
echo You will need:
echo   1. Access Key ID (starts with AKIA...)
echo   2. Secret Access Key
echo   3. Default region: ap-southeast-1
echo.
echo Press any key to continue...
pause >nul

echo.
echo Configuring AWS CLI profile 'root'...
echo.

aws configure --profile root

echo.
echo ========================================
echo Configuration Complete!
echo ========================================
echo.
echo To use this profile, run:
echo   set AWS_PROFILE=root
echo.
echo Or add --profile root to your AWS commands:
echo   aws s3 ls --profile root
echo.
echo To test the configuration:
echo   aws sts get-caller-identity --profile root
echo.
pause
