@echo off
echo ================================================================================
echo Checking Stage 3 Lambda Logs (Last 10 minutes)
echo ================================================================================
echo.

aws logs tail /aws/lambda/devcontext-backend-Stage3Function-TNF7l8EY96de --since 10m --format short

echo.
echo ================================================================================
echo Done! Look for:
echo   - "Starting Stage 3" message
echo   - "Successfully parsed cleaned JSON" (success)
echo   - "JSON cleanup failed" (failure)
echo   - "Saving interview questions to DynamoDB"
echo ================================================================================
