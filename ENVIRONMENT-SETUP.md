# Environment Configuration Guide

## Frontend Environment Variables

The frontend uses environment variables to configure AWS services and API endpoints. These are defined in `frontend/.env`.

### Required Variables:

```bash
# ============================================================================
# AWS Cognito Configuration
# ============================================================================
REACT_APP_COGNITO_USER_POOL_ID=ap-southeast-1_QVTlLVXey
REACT_APP_COGNITO_CLIENT_ID=k3nk7p3klgm40rp3qami77lot
REACT_APP_COGNITO_REGION=ap-southeast-1

# ============================================================================
# API Gateway Endpoint (Backend)
# ============================================================================
REACT_APP_API_ENDPOINT=https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod

# ============================================================================
# Frontend Configuration
# ============================================================================
PORT=3000
REACT_APP_DISABLE_WEBSOCKET=true

# ============================================================================
# Feature Flags
# ============================================================================
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_DEBUG=false
```

### How to Get These Values:

1. **Cognito Configuration**:
   - Go to AWS Cognito Console
   - Select your User Pool
   - Copy the Pool ID and Client ID

2. **API Gateway Endpoint**:
   - Run `sam deploy` in the backend folder
   - Copy the API endpoint from the output
   - OR go to AWS API Gateway Console and copy the invoke URL

### Usage in Code:

```typescript
// In aws-config.ts
const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID!,
      userPoolClientId: process.env.REACT_APP_COGNITO_CLIENT_ID!,
      region: process.env.REACT_APP_COGNITO_REGION!,
    },
  },
};

// In api.ts
const API_BASE = process.env.REACT_APP_API_ENDPOINT || 
  'https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod';
```

## Backend Environment Variables

The backend uses environment variables set in `backend/template.yaml` and passed to Lambda functions.

### Lambda Environment Variables:

```yaml
Environment:
  Variables:
    MAIN_TABLE: !Ref MainTable
    CACHE_BUCKET: !Ref CacheBucket
    BEDROCK_REGION: ap-southeast-1
    COGNITO_USER_POOL_ID: !Ref CognitoUserPoolId
    COGNITO_CLIENT_ID: !Ref CognitoClientId
```

### SAM Parameters:

When deploying with SAM, you can override parameters:

```bash
sam deploy --parameter-overrides \
  CognitoUserPoolId=ap-southeast-1_QVTlLVXey \
  CognitoClientId=k3nk7p3klgm40rp3qami77lot
```

## Common Issues & Solutions

### Issue 1: "Failed to load resource: net::ERR_CONNECTION_REFUSED"

**Cause**: Frontend trying to connect to localhost instead of AWS API

**Solution**: 
1. Check `.env` file exists in `frontend/` folder
2. Verify `REACT_APP_API_ENDPOINT` is set correctly
3. Restart the development server: `npm start`

### Issue 2: CORS Errors

**Cause**: API Gateway not returning proper CORS headers

**Solution**:
1. Verify Lambda functions have CORS headers in responses
2. Check API Gateway CORS configuration in `template.yaml`
3. Redeploy backend: `sam build && sam deploy`

### Issue 3: "Password did not conform with policy"

**Cause**: Cognito password policy requires:
- At least 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character

**Solution**: Use a password like `Abcd@1234`

### Issue 4: WebSocket Connection Errors

**Cause**: React DevTools trying to connect via WebSocket

**Solution**: These are harmless warnings and can be ignored. To suppress:
```bash
REACT_APP_DISABLE_WEBSOCKET=true
```

## Development Workflow

### Starting Frontend:
```bash
cd frontend
npm install
npm start
```

### Starting Backend (Local):
```bash
cd backend
sam build
sam local start-api
```

### Deploying Backend:
```bash
cd backend
npm run build  # Compile TypeScript
sam build      # Build SAM application
sam deploy     # Deploy to AWS
```

## Environment Files

- `frontend/.env` - Active environment variables (DO NOT commit with real values)
- `frontend/.env.example` - Template for environment variables (safe to commit)
- `backend/template.yaml` - SAM template with CloudFormation parameters
- `backend/samconfig.toml` - SAM deployment configuration

## Security Notes

1. **Never commit `.env` files with real credentials**
2. Use `.env.example` as a template
3. Rotate credentials regularly
4. Use AWS Secrets Manager for sensitive data in production
5. Enable MFA on AWS accounts
6. Use least-privilege IAM policies

## Troubleshooting Commands

```bash
# Check if environment variables are loaded
echo $REACT_APP_API_ENDPOINT

# View Lambda logs
sam logs -n OrchestratorFunction --stack-name devcontext-backend --tail

# Test API endpoint
curl https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod/user/stats

# Check Cognito configuration
aws cognito-idp describe-user-pool --user-pool-id ap-southeast-1_QVTlLVXey
```
