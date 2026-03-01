const { CognitoIdentityProviderClient, InitiateAuthCommand, RespondToAuthChallengeCommand } = require('@aws-sdk/client-cognito-identity-provider');

// Configuration - UPDATE THESE VALUES
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE';
const USERNAME = 'your-email@example.com';
const TEMP_PASSWORD = 'TemporaryPassword123!';
const NEW_PASSWORD = 'YourNewPassword123!';
const REGION = 'ap-southeast-1';

async function setPasswordAndGetToken() {
  const client = new CognitoIdentityProviderClient({ region: REGION });
  
  try {
    console.log('Step 1: Authenticating with temporary password...');
    
    const initiateCommand = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: USERNAME,
        PASSWORD: TEMP_PASSWORD
      }
    });

    const initiateResponse = await client.send(initiateCommand);
    
    if (initiateResponse.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      console.log('✓ Challenge received: NEW_PASSWORD_REQUIRED\n');
      
      console.log('Step 2: Setting new password...');
      const challengeCommand = new RespondToAuthChallengeCommand({
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        ClientId: CLIENT_ID,
        ChallengeResponses: {
          USERNAME: USERNAME,
          NEW_PASSWORD: NEW_PASSWORD
        },
        Session: initiateResponse.Session
      });

      const challengeResponse = await client.send(challengeCommand);
      
      if (challengeResponse.AuthenticationResult) {
        console.log('✅ Password set successfully!\n');
        console.log('=== TOKENS ===\n');
        console.log('ID Token:');
        console.log(challengeResponse.AuthenticationResult.IdToken);
        console.log(`\n✓ Your new password is: ${NEW_PASSWORD}`);
        console.log('✓ Use get-token.js for future logins');
      }
    } else {
      console.log('✅ No password change required!');
      console.log('Use get-token.js to get your tokens');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setPasswordAndGetToken();
