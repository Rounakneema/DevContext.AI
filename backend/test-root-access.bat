@echo off
echo ========================================
echo Testing Root User Access
echo ========================================
echo.

echo Setting AWS_PROFILE to root...
set AWS_PROFILE=root
echo.

echo 1. Checking current identity...
aws sts get-caller-identity
echo.

echo 2. Testing Bedrock access...
aws bedrock list-foundation-models --region ap-southeast-1 --query "modelSummaries[0:3].{ModelId:modelId,ModelName:modelName}" --output table
echo.

echo 3. Testing Bedrock model invocation...
node test-bedrock-root.js
echo.

echo ========================================
echo Test Complete!
echo ========================================
pause
