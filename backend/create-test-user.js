#!/usr/bin/env node
/**
 * Create a test user in AWS Cognito for E2E testing
 * 
 * Usage:
 *   node create-test-user.js <email> <password>
 * 
 * Example:
 *   node create-test-user.js test@example.com TestPassword123!
 */

const https = require('https');

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'ap-southeast-1_QVTlLVXey';
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || 'k3nk7p3klgm40rp3qami77lot';
const COGNITO_REGION = process.env.COGNITO_REGION || 'ap-southeast-1';

const email = process.argv[2] || 'test@example.com';
const password = process.argv[3] || 'TestPassword123!';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        ...options.headers
      }
    };
    
    const req = https.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            body: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function createUser() {
  console.log('Creating test user in Cognito...');
  console.log(`Email: ${email}`);
  console.log(`User Pool: ${COGNITO_USER_POOL_ID}`);
  console.log(`Client ID: ${COGNITO_CLIENT_ID}`);
  console.log('');
  
  try {
    // Step 1: Sign Up
    console.log('Step 1: Signing up user...');
    const signUpResponse = await makeRequest(
      `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`,
      {
        headers: {
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp'
        },
        body: {
          ClientId: COGNITO_CLIENT_ID,
          Username: email,
          Password: password,
          UserAttributes: [
            {
              Name: 'email',
              Value: email
            }
          ]
        }
      }
    );
    
    if (signUpResponse.statusCode !== 200) {
      console.error('❌ Sign up failed:', JSON.stringify(signUpResponse.body, null, 2));
      
      if (signUpResponse.body.__type === 'UsernameExistsException') {
        console.log('\n✅ User already exists! You can use this email for testing.');
        console.log('\nIf you forgot the password, you can reset it using:');
        console.log(`  aws cognito-idp admin-set-user-password --user-pool-id ${COGNITO_USER_POOL_ID} --username ${email} --password ${password} --permanent`);
      }
      
      process.exit(1);
    }
    
    console.log('✅ User signed up successfully!');
    console.log(`User Sub: ${signUpResponse.body.UserSub}`);
    console.log('');
    
    // Step 2: Confirm user (admin action - requires AWS CLI or SDK)
    console.log('Step 2: Confirming user...');
    console.log('⚠️  You need to confirm the user using AWS CLI:');
    console.log('');
    console.log(`  aws cognito-idp admin-confirm-sign-up --user-pool-id ${COGNITO_USER_POOL_ID} --username ${email}`);
    console.log('');
    console.log('Or if auto-verification is enabled, check your email for the verification code.');
    console.log('');
    console.log('✅ Test user creation initiated!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Confirm the user (see command above)');
    console.log('2. Run the E2E tests:');
    console.log(`   TEST_EMAIL="${email}" TEST_PASSWORD="${password}" node test-complete-flow.js`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createUser();
