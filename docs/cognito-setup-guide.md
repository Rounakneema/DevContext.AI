# Cognito Setup Guide (Person 2)

## Overview
You'll create a Cognito User Pool for user authentication. This takes about 15-20 minutes.

## Step-by-Step Instructions

### 1. Navigate to Cognito

1. Sign in to AWS Console: https://console.aws.amazon.com/
2. Search for "Cognito" in the search bar
3. Click "Amazon Cognito"

### 2. Create User Pool

1. Click **"Create user pool"**

### 3. Configure Sign-in Experience

**Step 1: Configure sign-in experience**

- **Authentication providers:**
  - ✅ Cognito user pool
  
- **Cognito user pool sign-in options:**
  - ✅ Email
  - ⬜ Phone number (optional, skip for MVP)
  - ⬜ Username (not needed)

- **User name requirements:**
  - Select: **"Make email address case insensitive"**

- Click **"Next"**

### 4. Configure Security Requirements

**Step 2: Configure security requirements**

- **Password policy:**
  - Select: **"Cognito defaults"**
  - Minimum length: 8 characters
  - Contains: uppercase, lowercase, numbers, special characters

- **Multi-factor authentication (MFA):**
  - Select: **"No MFA"** (for MVP simplicity)
  - ⚠️ Note: Enable MFA for production

- **User account recovery:**
  - ✅ Enable self-service account recovery
  - Recovery method: **"Email only"**

- Click **"Next"**

### 5. Configure Sign-up Experience

**Step 3: Configure sign-up experience**

- **Self-service sign-up:**
  - ✅ Enable self-registration

- **Attribute verification and user account confirmation:**
  - ✅ Allow Cognito to automatically send messages to verify and confirm
  - Verification method: **"Send email message, verify email address"**

- **Required attributes:**
  - ✅ email (already selected)
  - ⬜ name (optional)
  - ⬜ phone_number (skip for MVP)

- **Custom attributes:** (Skip for MVP)

- Click **"Next"**

### 6. Configure Message Delivery

**Step 4: Configure message delivery**

- **Email provider:**
  - Select: **"Send email with Cognito"**
  - ⚠️ Note: Limited to 50 emails/day. For production, use SES.

- **FROM email address:**
  - Leave default: `no-reply@verificationemail.com`

- **REPLY-TO email address:**
  - Optional: Add your email if you want users to reply

- Click **"Next"**

### 7. Integrate Your App

**Step 5: Integrate your app**

- **User pool name:**
  - Enter: `devcontext-ai-users`

- **Hosted authentication pages:**
  - ⬜ Use the Cognito Hosted UI (skip for MVP, we'll use custom UI)

- **Initial app client:**
  - App type: **"Public client"**
  - App client name: `devcontext-frontend`
  - Client secret: **"Don't generate a client secret"**

- **Advanced app client settings:**
  - Authentication flows:
    - ✅ ALLOW_USER_PASSWORD_AUTH
    - ✅ ALLOW_REFRESH_TOKEN_AUTH
    - ⬜ ALLOW_USER_SRP_AUTH (optional)

- Click **"Next"**

### 8. Review and Create

**Step 6: Review and create**

- Review all settings
- Click **"Create user pool"**

### 9. Save Important Information

After creation, you'll see the User Pool details. **Copy these values:**

```
User Pool ID: us-east-1_XXXXXXXXX
User Pool ARN: arn:aws:cognito-idp:us-east-1:XXXX:userpool/us-east-1_XXXXXXXXX
```

### 10. Get App Client ID

1. In your User Pool, click **"App integration"** tab
2. Scroll down to **"App clients and analytics"**
3. Click on your app client: `devcontext-frontend`
4. **Copy the Client ID:** `1a2b3c4d5e6f7g8h9i0j`

### 11. Configure App Client Settings (Optional - GitHub OAuth)

If you want GitHub OAuth for private repos:

1. In App client settings, scroll to **"Hosted UI settings"**
2. Add **Callback URLs:**
   - `http://localhost:3000/callback` (for local development)
   - `https://your-domain.com/callback` (for production)
3. Add **Sign out URLs:**
   - `http://localhost:3000/`
4. **OAuth 2.0 grant types:**
   - ✅ Authorization code grant
5. **OAuth scopes:**
   - ✅ email
   - ✅ openid
   - ✅ profile

⚠️ **Note:** GitHub OAuth setup is complex. Skip for MVP and just use email/password.

## Share These Values with Person 1

Create a file `aws-config.env` (add to .gitignore!):

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# Cognito
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_USER_POOL_ARN=arn:aws:cognito-idp:us-east-1:XXXX:userpool/us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
COGNITO_REGION=us-east-1

# API Gateway (fill in after creating)
API_GATEWAY_REST_URL=
API_GATEWAY_WEBSOCKET_URL=
```

## Frontend Integration (Your React App)

In your React app, create `.env.local`:

```bash
REACT_APP_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
REACT_APP_COGNITO_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
REACT_APP_COGNITO_REGION=us-east-1
```

## Test Cognito Setup

### Option 1: AWS Console

1. Go to your User Pool
2. Click **"Users"** tab
3. Click **"Create user"**
4. Enter email and temporary password
5. Try signing in

### Option 2: AWS CLI

```bash
# Create a test user
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username test@example.com \
  --user-attributes Name=email,Value=test@example.com \
  --temporary-password TempPass123! \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username test@example.com \
  --password TestPass123! \
  --permanent
```

### Option 3: React App (Week 1)

Once you build the signup form, test it there!

## Troubleshooting

### Issue: Email not sending
**Solution:** Check email delivery settings. Cognito free tier allows 50 emails/day.

### Issue: Password policy too strict
**Solution:** Go to User Pool → Sign-in experience → Password policy → Edit

### Issue: Can't find User Pool ID
**Solution:** User Pool → User pool overview → User pool ID is at the top

### Issue: Client ID not working
**Solution:** Make sure you copied the Client ID, not the Client Secret (we don't use secrets for public clients)

## Security Notes

For MVP/Hackathon:
- ✅ Email verification enabled
- ✅ Password policy enforced
- ⬜ MFA disabled (for simplicity)
- ⬜ Advanced security features disabled

For Production (after hackathon):
- Enable MFA
- Use Amazon SES for email
- Enable advanced security features
- Add rate limiting
- Enable CloudWatch logging

## Next Steps

After Cognito setup:
1. ✅ Share User Pool ID and Client ID with Person 1
2. ✅ Add values to your React app's `.env.local`
3. ✅ Move on to API Gateway setup
4. ✅ Start building authentication UI in Week 1

---

**Estimated Time:** 15-20 minutes
**Difficulty:** Easy
**Cost:** Free (within free tier limits)
