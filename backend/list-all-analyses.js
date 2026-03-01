const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-southeast-1' }));
const TABLE_NAME = process.env.MAIN_TABLE || 'devcontext-main';

async function listAllAnalyses() {
  console.log('\n📊 Listing All Analyses');
  console.log('='.repeat(80));
  
  try {
    let allAnalyses = [];
    let lastEvaluatedKey = undefined;
    
    // Scan for all analysis metadata
    do {
      const result = await client.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'SK = :metadata',
        ExpressionAttributeValues: {
          ':metadata': 'METADATA'
        },
        ExclusiveStartKey: lastEvaluatedKey
      }));
      
      if (result.Items) {
        allAnalyses = allAnalyses.concat(result.Items);
      }
      
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    
    console.log(`\n✅ Found ${allAnalyses.length} total analyses\n`);
    
    // Group by status
    const byStatus = {};
    allAnalyses.forEach(analysis => {
      const status = analysis.status || 'unknown';
      if (!byStatus[status]) {
        byStatus[status] = [];
      }
      byStatus[status].push(analysis);
    });
    
    // Print summary
    console.log('📈 Status Summary:');
    Object.entries(byStatus).forEach(([status, analyses]) => {
      const icon = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⚙️';
      console.log(`   ${icon} ${status}: ${analyses.length}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 All Analyses:\n');
    
    // Sort by creation date (newest first)
    allAnalyses.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });
    
    // Print each analysis
    allAnalyses.forEach((analysis, index) => {
      const statusIcon = analysis.status === 'completed' ? '✅' : 
                        analysis.status === 'failed' ? '❌' : 
                        analysis.status === 'processing' ? '⚙️' : '❓';
      
      console.log(`${index + 1}. ${statusIcon} ${analysis.status?.toUpperCase() || 'UNKNOWN'}`);
      console.log(`   Analysis ID: ${analysis.analysisId}`);
      console.log(`   Repository: ${analysis.repositoryUrl || 'N/A'}`);
      console.log(`   Created: ${analysis.createdAt || 'N/A'}`);
      console.log(`   Completed: ${analysis.completedAt || 'Not completed'}`);
      
      // Show stage status
      if (analysis.stages) {
        const stageNames = Object.keys(analysis.stages);
        const completedStages = stageNames.filter(s => analysis.stages[s]?.status === 'completed');
        console.log(`   Stages: ${completedStages.length}/${stageNames.length} completed`);
        
        stageNames.forEach(stageName => {
          const stage = analysis.stages[stageName];
          const stageIcon = stage.status === 'completed' ? '✓' : 
                           stage.status === 'failed' ? '✗' : '○';
          console.log(`      ${stageIcon} ${stageName}: ${stage.status}`);
        });
      }
      
      if (analysis.errorMessage) {
        console.log(`   ❌ Error: ${analysis.errorMessage}`);
      }
      
      console.log('   ' + '-'.repeat(76));
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Commands:');
    console.log('   Check specific analysis: node check-analysis-data.js [analysisId]');
    console.log('   Delete analysis: node delete-analysis.js [analysisId]');
    console.log('   Clear stuck analyses: node clear-all-stuck-analyses.js');
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error listing analyses:', error.message);
    console.error(error);
  }
}

listAllAnalyses();
