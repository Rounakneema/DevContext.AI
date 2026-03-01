@echo off
echo ================================================================================
echo Quick Deploy and Test
echo ================================================================================
echo.

echo [1/3] Building TypeScript...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed!
    exit /b 1
)
echo.

echo [2/3] Deploying to AWS...
call sam deploy --no-confirm-changeset
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Deployment failed!
    exit /b 1
)
echo.

echo [3/3] Running End-to-End Tests...
node test-complete-flow.js
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Tests failed!
    exit /b 1
)

echo.
echo ================================================================================
echo SUCCESS! All steps completed.
echo ================================================================================
