#!/usr/bin/env node

/**
 * Clear stuck analyses that are in "in_progress" status
 * 
 * Usage:
 *   node clear-stuck-analysis.js <userId>
 * 
 * Example:
 *   node clear-stuck-analysis.js user123
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = 'ap-southeast-1';
const TABLE_NAME = 'devcontext-main';

const client = new DynamoDBClient({ region: REGION });
const dynamoClient = DynamoDBDocumentClient.from(client);

async function clearStuckAnalyses(userId) {
  try {
    console.log(`\n🔍 Searching for stuck analyses for user: ${userId}...`);
    
    // Query all analyses for this user
    const result = await dynamoClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :userPK AND begins_with(GSI1SK, :analysisSK)',
      ExpressionAttributeValues: {
        ':userPK': `USER#${userId}`,
        ':analysisSK': 'ANALYSIS#'
      }
    }));
    
    if (!result.Items || result.Items.length === 0) {
      console.log('❌ No analyses found for this user');
      return;
    }
    
    console.log(`\n📊 Found ${result.Items.length} total analyses`);
    
    // Find stuck analyses (in_progress status)
    const stuckAnalyses = result.Items.filter(item => 
      item.status === 'in_progress' || 
      item.status === 'processing'
    );
    
    if (stuckAnalyses.length === 0) {
      console.log('✅ No stuck analyses found. All analyses are completed or failed.');
      return;
    }
    
    console.log(`\n⚠️  Found ${stuckAnalyses.length} stuck analyses:`);
    
    for (const analysis of stuckAnalyses) {
      console.log(`\n  Analysis ID: ${analysis.analysisId}`);
      console.log(`  Status: ${analysis.status}`);
      console.log(`  Repository: ${analysis.repositoryUrl}`);
      console.log(`  Created: ${analysis.createdAt}`);
      console.log(`  Current Stage: ${analysis.currentStage || 'unknown'}`);
      
      // Update to failed status
      await dynamoClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: analysis.PK,
          SK: analysis.SK
        },
        UpdateExpression: 'SET #status = :status, #errorMsg = :errorMsg, updatedAt = :now',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#errorMsg': 'errorMessage'
        },
        ExpressionAttributeValues: {
          ':status': 'failed',
          ':errorMsg': 'Analysis was stuck and cleared by admin',
          ':now': new Date().toISOString()
        }
      }));
      
      console.log(`  ✅ Cleared (marked as failed)`);
    }
    
    console.log(`\n🎉 Successfully cleared ${stuckAnalyses.length} stuck analyses!`);
    console.log('You can now start a new analysis.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

async function main() {
  const userId = process.argv[2];
  
  if (!userId) {
    console.error('❌ Error: User ID required');
    console.log('\nUsage:');
    console.log('   node clear-stuck-analysis.js <userId>');
    console.log('\nExample:');
    console.log('   node clear-stuck-analysis.js user123');
    console.log('\nTo find your user ID, check the Cognito User Pool or look at the');
    console.log('userId field in any existing analysis in DynamoDB.');
    process.exit(1);
  }
  
  await clearStuckAnalyses(userId);
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
