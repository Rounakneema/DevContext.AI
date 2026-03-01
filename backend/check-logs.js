const { CloudWatchLogsClient, FilterLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');

const client = new CloudWatchLogsClient({ region: 'ap-southeast-1' });

async function checkLogs(analysisId) {
  console.log(`\n🔍 Checking CloudWatch Logs for Analysis: ${analysisId}`);
  console.log('='.repeat(80));
  
  const logGroups = [
    '/aws/lambda/devcontext-backend-Stage1Function-YGu7NtKPxA6R',
    '/aws/lambda/devcontext-backend-Stage2Function-n0XEdHXzi073',
    '/aws/lambda/devcontext-backend-Stage3Function-TNF7l8EY96de',
    '/aws/lambda/devcontext-backend-OrchestratorFunction-kO2ejVGkScQz',
    '/aws/lambda/devcontext-backend-RepoProcessorFunction-KqM2My7Zo3lE'
  ];
  
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  
  for (const logGroup of logGroups) {
    console.log(`\n📋 Log Group: ${logGroup}`);
    console.log('-'.repeat(80));
    
    try {
      const command = new FilterLogEventsCommand({
        logGroupName: logGroup,
        startTime: oneHourAgo,
        filterPattern: analysisId,
        limit: 100
      });
      
      const response = await client.send(command);
      
      if (!response.events || response.events.length === 0) {
        console.log('   ℹ️  No logs found for this analysis');
        continue;
      }
      
      console.log(`   ✅ Found ${response.events.length} log entries\n`);
      
      response.events.forEach(event => {
        const timestamp = new Date(event.timestamp).toISOString();
        const message = event.message.trim();
        
        // Highlight important messages
        if (message.includes('ERROR') || message.includes('Error') || message.includes('failed')) {
          console.log(`   ❌ [${timestamp}] ${message}`);
        } else if (message.includes('save') || message.includes('Save') || message.includes('SAVE')) {
          console.log(`   💾 [${timestamp}] ${message}`);
        } else if (message.includes('completed') || message.includes('Completed')) {
          console.log(`   ✅ [${timestamp}] ${message}`);
        } else if (message.includes('Starting') || message.includes('starting')) {
          console.log(`   🚀 [${timestamp}] ${message}`);
        } else {
          console.log(`   📝 [${timestamp}] ${message}`);
        }
      });
      
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        console.log(`   ⚠️  Log group not found (Lambda may not have been invoked yet)`);
      } else {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('💡 Tips:');
  console.log('   - If no logs found, the Lambda may not have been invoked');
  console.log('   - Check if the stage functions are being called from orchestrator');
  console.log('   - Look for "save" or "Save" messages to see if data is being saved');
  console.log('   - Check for errors or exceptions');
  console.log('='.repeat(80) + '\n');
}

// Get analysisId from command line
const analysisId = process.argv[2];

if (!analysisId) {
  console.error('❌ Usage: node check-logs.js <analysisId>');
  process.exit(1);
}

checkLogs(analysisId).catch(console.error);
