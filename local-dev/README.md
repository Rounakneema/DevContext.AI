# Local Development Tools

This folder contains testing and development scripts. **NOT included in git.**

## Files

- `get-token.js` - Get Cognito authentication tokens
- `set-password.js` - Set new password for Cognito user
- `test-api.js` - Test API endpoints
- `config.json` - Local configuration (create this)

## Setup

1. Install dependencies in backend folder:
```bash
cd ../backend
npm install
```

2. Create `config.json` with your values:
```json
{
  "cognitoClientId": "your-client-id",
  "cognitoUserPoolId": "your-pool-id",
  "apiEndpoint": "https://your-api.execute-api.ap-southeast-1.amazonaws.com/prod",
  "region": "ap-southeast-1"
}
```

3. Update credentials in test scripts

## Usage

### Get Authentication Token
```bash
node get-token.js
```

### Set New Password
```bash
node set-password.js
```

### Test API
```bash
node test-api.js
```

## Security

⚠️ **Never commit this folder to git!**
- Contains credentials and tokens
- Included in .gitignore
- For local development only
