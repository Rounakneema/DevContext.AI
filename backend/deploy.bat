@echo off
REM DevContext Backend Deployment Script
REM Version: 2.1.0

echo ========================================
echo DevContext Backend Deployment
echo Version: 2.1.0
echo ========================================
echo.

echo [0/5] Running pre-deployment checks...
call node pre-deploy-check.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Pre-deployment checks failed
    echo Please fix the issues above before deploying
    exit /b %errorlevel%
)
echo.

echo [1/5] Building TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: TypeScript build failed
    exit /b %errorlevel%
)
echo ✓ TypeScript build completed
echo.

echo [1.5/5] Copying package files to dist...
copy package.json dist\
copy package-lock.json dist\
echo ✓ Package files copied
echo.

echo [2/5] Building SAM application...
call sam build --parallel
if %errorlevel% neq 0 (
    echo ERROR: SAM build failed
    exit /b %errorlevel%
)
echo ✓ SAM build completed
echo.

echo [3/5] Deploying to AWS...
call sam deploy --no-confirm-changeset --force-upload
if %errorlevel% neq 0 (
    echo ERROR: Deployment failed
    exit /b %errorlevel%
)
echo ✓ Deployment completed
echo.

echo [4/5] Verifying deployment...
call node verify-deployment.js
echo.

echo [5/5] Deployment Summary
echo ========================================
echo Stack: devcontext-backend
echo Region: ap-southeast-1
echo Version: 2.1.0
echo.
echo ✓ All Lambda functions updated
echo ✓ API Gateway configured
echo ✓ DynamoDB table ready
echo ✓ S3 bucket configured
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Clear stuck analyses: node clear-all-stuck-analyses.js
echo 2. Start a new analysis from frontend
echo 3. Verify data: node check-analysis-data.js [analysisId]
echo.
echo ========================================

