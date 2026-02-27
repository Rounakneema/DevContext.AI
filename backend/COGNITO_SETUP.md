# Cognito Authentication Setup

## Current Status
The API is deployed but authentication is **not configured** because Cognito IDs are empty.

## Secure Setup (Recommended)

### Step 1: Copy the Example Config

```bash
cd backend
cp samconfig.toml.example samconfig.toml
```

### Step 2: Get Your Cognito IDs

```bash
# List your User Pools
aws cognito-idp list-user-pools --max-results 10 --region ap-southeast-1

# List App Clients for your pool
aws cognito-idp list-user-pool-clients --user-pool-id ap-southeast-1_XXXXX --region ap-southeast-1
```

### Step 3: Edit samconfig.toml

Open `backend/samconfig.toml` and replace the placeholders:

```toml
parameter_overrides = "CognitoUserPoolId=\"ap-southeast-1_QVTlLVXey\" CognitoClientId=\"your-actual-client-id\""
```

**IMPORTANT:** 
- ✅ `samconfig.toml` is in `.gitignore` - it will NOT be committed to GitHub
- ✅ Your IDs stay private on your local machine
- ✅ Each developer uses their own `samconfig.toml`

### Step 4: Deploy

```bash
sam build
sam deploy
```

The deployment will automatically use your Cognito IDs from `samconfig.toml`.

---

## Alternative: Pass IDs During Deployment

If you prefer not to store IDs in a file:

```bash
sam deploy --parameter-overrides \
  CognitoUserPoolId=ap-southeast-1_QVTlLVXey \
  CognitoClientId=your-client-id
```

---

## For Testing: Disable Authentication

If you want to test without authentication (NOT recommended for production):

1. Edit `backend/template.yaml`
2. Comment out the Auth section in DevContextApi:

```yaml
DevContextApi:
  Type: AWS::Serverless::Api
  Properties:
    StageName: prod
    Cors:
      AllowMethods: "'GET,POST,DELETE,OPTIONS'"
      AllowHeaders: "'Content-Type,Authorization'"
      AllowOrigin: "'*'"
    # Auth:
    #   DefaultAuthorizer: CognitoAuthorizer
    #   Authorizers:
    #     CognitoAuthorizer:
    #       UserPoolArn: !Sub arn:aws:cognito-idp:${AWS::Region}:${AWS::AccountId}:userpool/${CognitoUserPoolId}
```

3. Redeploy: `sam build && sam deploy`

---

## Impact

**Without proper Cognito IDs:**
- ❌ API calls return 401 Unauthorized
- ❌ Tokens from `local-dev/get-token.js` won't work
- ✅ Lambda functions work fine (backend logic is OK)

**After adding Cognito IDs:**
- ✅ Full authentication working
- ✅ Secure API access
- ✅ Production-ready
- ✅ Your IDs stay private (not in git)
