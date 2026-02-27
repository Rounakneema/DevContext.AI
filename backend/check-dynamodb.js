const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-southeast-1' }));

const ANALYSIS_ID = '62c77ab4-c210-4ffd-ad58-dba217997b4d';
const TABLE_NAME = 'devcontext-analyses';

async function checkAnalysis() {
  try {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { analysisId: ANALYSIS_ID }
    });
    
    const result = await client.send(command);
    
    if (!result.Item) {
      console.log('❌ Analysis not found');
      return;
    }
    
    const analysis = result.Item;
    
    console.log('\n📊 Analysis Status Report');
    console.log('='.repeat(60));
    console.log(`Analysis ID: ${analysis.analysisId}`);
    console.log(`Repository: ${analysis.repositoryUrl}`);
    console.log(`Status: ${analysis.status}`);
    console.log(`Created: ${analysis.createdAt}`);
    console.log(`Updated: ${analysis.updatedAt}`);
    console.log(`Completed Stages: ${analysis.completedStages?.join(', ') || 'None'}`);
    
    if (analysis.errorMessage) {
      console.log(`\n❌ Error: ${analysis.errorMessage}`);
    }
    
    if (analysis.projectReview) {
      console.log('\n✅ Stage 1 (Project Review) - COMPLETED');
      console.log(`   Code Quality Score: ${analysis.projectReview.codeQuality?.score || 'N/A'}`);
      console.log(`   Employability Score: ${analysis.projectReview.employabilitySignal?.score || 'N/A'}`);
    }
    
    if (analysis.interviewSimulation) {
      console.log('\n✅ Stage 3 (Interview Questions) - COMPLETED');
      console.log(`   Total Questions: ${analysis.interviewSimulation.questions?.length || 0}`);
      console.log(`   Categories:`, analysis.interviewSimulation.categoryCounts);
      console.log(`   Difficulty:`, analysis.interviewSimulation.difficultyDistribution);
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Show full data if you want to inspect
    // console.log('\nFull Data:');
    // console.log(JSON.stringify(analysis, null, 2));
    
  } catch (error) {
    console.error('Error checking analysis:', error.message);
  }
}

checkAnalysis();
