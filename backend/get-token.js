const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

// Configuration - UPDATE THESE VALUES
const CLIENT_ID = 'k3nk7p3klgm40rp3qami77lot';
const USERNAME = 'neemarounak9171@gmail.com';
const PASSWORD = 'MyNewSecurePass123!';
const REGION = 'ap-southeast-1';

async function getToken() {
  const client = new CognitoIdentityProviderClient({ region: REGION });
  
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: USERNAME,
      PASSWORD: PASSWORD
    }
  });

  try {
    const response = await client.send(command);
    
    console.log('\n✅ Authentication Successful!\n');
    
    if (response.AuthenticationResult) {
      console.log('=== TOKENS ===\n');
      console.log('ID Token (use this in Authorization header):');
      console.log(response.AuthenticationResult.IdToken);
      console.log('\n---\n');
      console.log('Access Token:');
      console.log(response.AuthenticationResult.AccessToken);
      console.log('\n---\n');
      console.log('Refresh Token:');
      console.log(response.AuthenticationResult.RefreshToken);
    } else if (response.ChallengeName) {
      console.log('\n⚠️ Challenge Required:', response.ChallengeName);
      console.log('Run set-password.js to complete NEW_PASSWORD_REQUIRED challenge');
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
  }
}

getToken();
