#!/usr/bin/env node

/**
 * List all stuck analyses across all users
 * 
 * Usage:
 *   node list-stuck-analyses.js
 * 
 * Optional: Filter by user
 *   node list-stuck-analyses.js <userId>
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = 'ap-southeast-1';
const TABLE_NAME = 'devcontext-main';

const client = new DynamoDBClient({ region: REGION });
const dynamoClient = DynamoDBDocumentClient.from(client);

async function listStuckAnalyses(userId = null) {
  try {
    console.log('\n🔍 Searching for stuck analyses...\n');
    
    let items = [];
    
    if (userId) {
      // Query specific user
      console.log(`Filtering by user: ${userId}`);
      const result = await dynamoClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :userPK AND begins_with(GSI1SK, :analysisSK)',
        ExpressionAttributeValues: {
          ':userPK': `USER#${userId}`,
          ':analysisSK': 'ANALYSIS#'
        }
      }));
      items = result.Items || [];
    } else {
      // Scan all analyses
      console.log('Scanning all users...');
      const result = await dynamoClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :analysisPK)',
        ExpressionAttributeValues: {
          ':analysisPK': 'ANALYSIS#'
        }
      }));
      items = result.Items || [];
    }
    
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
    
    const completedAnalyses = items.filter(item => item.status === 'completed');
    const failedAnalyses = items.filter(item => item.status === 'failed');
    
    console.log('📈 Status Summary:');
    console.log(`   ✅ Completed: ${completedAnalyses.length}`);
    console.log(`   ❌ Failed: ${failedAnalyses.length}`);
    console.log(`   ⚠️  Stuck (in_progress/processing): ${stuckAnalyses.length}\n`);
    
    if (stuckAnalyses.length === 0) {
      console.log('✅ No stuck analyses found. All analyses are completed or failed.');
      return;
    }
    
    console.log('⚠️  STUCK ANALYSES:\n');
    console.log('═'.repeat(80));
    
    stuckAnalyses.forEach((analysis, index) => {
      const createdDate = new Date(analysis.createdAt);
      const now = new Date();
      const hoursStuck = Math.floor((now - createdDate) / (1000 * 60 * 60));
      const minutesStuck = Math.floor((now - createdDate) / (1000 * 60)) % 60;
      
      console.log(`\n${index + 1}. Analysis ID: ${analysis.analysisId}`);
      console.log(`   User ID: ${analysis.userId}`);
      console.log(`   Status: ${analysis.status}`);
      console.log(`   Repository: ${analysis.repositoryUrl || 'N/A'}`);
      console.log(`   Current Stage: ${analysis.currentStage || 'unknown'}`);
      console.log(`   Created: ${analysis.createdAt}`);
      console.log(`   Stuck for: ${hoursStuck}h ${minutesStuck}m`);
      
      if (analysis.stage1Status) {
        console.log(`   Stage 1: ${analysis.stage1Status}`);
      }
      if (analysis.stage2Status) {
        console.log(`   Stage 2: ${analysis.stage2Status}`);
      }
      if (analysis.stage3Status) {
        console.log(`   Stage 3: ${analysis.stage3Status}`);
      }
      
      console.log('   ─'.repeat(78));
    });
    
    console.log('\n═'.repeat(80));
    console.log(`\n📋 Total stuck analyses: ${stuckAnalyses.length}`);
    console.log('\n💡 To clear these analyses, run:');
    
    if (userId) {
      console.log(`   node clear-stuck-analysis.js ${userId}`);
    } else {
      console.log('   node clear-stuck-analysis.js <userId>');
      console.log('\n   Or clear all stuck analyses:');
      console.log('   node clear-all-stuck-analyses.js');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    throw error;
  }
}

async function main() {
  const userId = process.argv[2];
  
  if (userId) {
    console.log(`Filtering by user: ${userId}`);
  } else {
    console.log('Listing all stuck analyses across all users');
  }
  
  await listStuckAnalyses(userId);
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
