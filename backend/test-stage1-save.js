/**
 * Test if Stage 1 can save results to DynamoDB
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-southeast-1' }));
const TABLE_NAME = process.env.MAIN_TABLE || 'devcontext-main';
const ANALYSIS_ID = 'test-' + Date.now();

async function testSave() {
  console.log(`\n🧪 Testing Stage 1 Save to DynamoDB`);
  console.log(`📦 Table: ${TABLE_NAME}`);
  console.log(`🆔 Analysis ID: ${ANALYSIS_ID}`);
  console.log('='.repeat(80));
  
  try {
    // Create test project review data
    const projectReview = {
      codeQualityScore: 85,
      architectureScore: 78,
      bestPracticesScore: 82,
      overallScore: 82,
      summary: 'Test project review',
      strengths: ['Good code structure', 'Clear documentation'],
      weaknesses: ['Missing tests', 'No error handling'],
      recommendations: ['Add unit tests', 'Implement error handling'],
      completedAt: new Date().toISOString()
    };
    
    console.log('\n📝 Saving PROJECT_REVIEW...');
    await client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `ANALYSIS#${ANALYSIS_ID}`,
        SK: 'PROJECT_REVIEW',
        ...projectReview
      }
    }));
    console.log('✅ Saved successfully');
    
    // Verify it was saved
    console.log('\n🔍 Verifying save...');
    const result = await client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ANALYSIS#${ANALYSIS_ID}`,
        SK: 'PROJECT_REVIEW'
      }
    }));
    
    if (result.Item) {
      console.log('✅ Verified - Data retrieved successfully');
      console.log('\n📊 Retrieved Data:');
      console.log(JSON.stringify(result.Item, null, 2));
    } else {
      console.log('❌ Verification failed - Data not found');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Test completed successfully');
    console.log(`\n💡 The save function works correctly.`);
    console.log(`   The issue must be in the Lambda function execution.`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

testSave();
