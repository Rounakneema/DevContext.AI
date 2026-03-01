#!/usr/bin/env node

/**
 * Clear ALL stuck analyses across all users
 * 
 * Usage:
 *   node clear-all-stuck-analyses.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = 'ap-southeast-1';
const TABLE_NAME = 'devcontext-main';

const client = new DynamoDBClient({ region: REGION });
const dynamoClient = DynamoDBDocumentClient.from(client);

async function clearAllStuckAnalyses() {
  try {
    console.log('\n🔍 Searching for stuck analyses...\n');
    
    // Scan all analyses
    const result = await dynamoClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :analysisPK)',
      ExpressionAttributeValues: {
        ':analysisPK': 'ANALYSIS#'
      }
    }));
    
    const items = result.Items || [];
    
    if (items.length === 0) {
      console.log('❌ No analyses found');
      return;
    }
    
    console.log(`📊 Found ${items.length} total analyses\n`);
    
    // Filter stuck analyses
    const stuckAnalyses = items.filter(item => 
      item.status === 'in_progress' || 
      item.status === 'processing' ||
      item.status === 'pending'
    );
    
    if (stuckAnalyses.length === 0) {
      console.log('✅ No stuck analyses found. All analyses are completed or failed.');
      return;
    }
    
    console.log(`⚠️  Found ${stuckAnalyses.length} stuck analyses\n`);
    console.log('Clearing...\n');
    
    let cleared = 0;
    
    for (const analysis of stuckAnalyses) {
      const createdDate = new Date(analysis.createdAt);
      const now = new Date();
      const hoursStuck = Math.floor((now - createdDate) / (1000 * 60 * 60));
      
      console.log(`  ${cleared + 1}. ${analysis.analysisId}`);
      console.log(`     User: ${analysis.userId}`);
      console.log(`     Stuck for: ${hoursStuck}h`);
      
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
          ':errorMsg': 'Analysis was stuck and auto-cleared by system',
          ':now': new Date().toISOString()
        }
      }));
      
      console.log(`     ✅ Cleared\n`);
      cleared++;
    }
    
    console.log(`\n🎉 Successfully cleared ${cleared} stuck analyses!`);
    console.log('All users can now start new analyses.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

async function main() {
  console.log('⚠️  WARNING: This will clear ALL stuck analyses for ALL users!');
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await clearAllStuckAnalyses();
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
