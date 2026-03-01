#!/usr/bin/env node

/**
 * Add a user to the Admins group in Cognito
 * 
 * Usage:
 *   node add-admin-user.js <email>
 * 
 * Example:
 *   node add-admin-user.js admin@example.com
 */

const { 
  CognitoIdentityProviderClient, 
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CreateGroupCommand
} = require('@aws-sdk/client-cognito-identity-provider');

const USER_POOL_ID ='ap-southeast-1_QVTlLVXey';
const REGION = 'ap-southeast-1';

const client = new CognitoIdentityProviderClient({ region: REGION });

async function createAdminGroup() {
  try {
    const command = new CreateGroupCommand({
      GroupName: 'Admins',
      UserPoolId: USER_POOL_ID,
      Description: 'Administrator users with access to cost analytics and admin features',
    });
    
    await client.send(command);
    console.log('✅ Created Admins group');
  } catch (error) {
    if (error.name === 'GroupExistsException') {
      console.log('ℹ️  Admins group already exists');
    } else {
      throw error;
    }
  }
}

async function addUserToAdminGroup(email) {
  try {
    const command = new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      GroupName: 'Admins',
    });
    
    await client.send(command);
    console.log(`✅ Added ${email} to Admins group`);
    console.log(`\n🎉 ${email} now has admin access to:`);
    console.log('   - Cost Analytics Dashboard (/admin/cost-analytics)');
    console.log('   - All admin features');
  } catch (error) {
    if (error.name === 'UserNotFoundException') {
      console.error(`❌ User ${email} not found in Cognito User Pool`);
      console.log('\nTo create the user first, run:');
      console.log(`   node create-user.js ${email}`);
    } else {
      throw error;
    }
  }
}

async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('❌ Error: Email address required');
    console.log('\nUsage:');
    console.log('   node add-admin-user.js <email>');
    console.log('\nExample:');
    console.log('   node add-admin-user.js admin@example.com');
    process.exit(1);
  }
  
  if (!USER_POOL_ID || USER_POOL_ID.includes('xxx')) {
    console.error('❌ Error: COGNITO_USER_POOL_ID environment variable not set');
    console.log('\nSet it in your environment:');
    console.log('   export COGNITO_USER_POOL_ID=ap-southeast-1_xxxxxxxxx');
    console.log('\nOr update the USER_POOL_ID constant in this script');
    process.exit(1);
  }
  
  console.log(`\n🔐 Adding ${email} to Admins group...`);
  console.log(`   User Pool: ${USER_POOL_ID}`);
  console.log(`   Region: ${REGION}\n`);
  
  // Ensure Admins group exists
  await createAdminGroup();
  
  // Add user to group
  await addUserToAdminGroup(email);
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
