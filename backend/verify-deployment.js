/**
 * Verify Backend Deployment
 * Checks if all Lambda functions are deployed and accessible
 */

const { LambdaClient, GetFunctionCommand } = require('@aws-sdk/client-lambda');
const { CloudFormationClient, DescribeStacksCommand } = require('@aws-sdk/client-cloudformation');

const lambdaClient = new LambdaClient({ region: 'ap-southeast-1' });
const cfnClient = new CloudFormationClient({ region: 'ap-southeast-1' });

const STACK_NAME = 'devcontext-backend';

async function verifyDeployment() {
  console.log('\n🔍 Verifying DevContext Backend Deployment');
  console.log('='.repeat(80));
  
  try {
    // Check CloudFormation stack
    console.log('\n📦 Checking CloudFormation Stack...');
    const stackResult = await cfnClient.send(new DescribeStacksCommand({
      StackName: STACK_NAME
    }));
    
    const stack = stackResult.Stacks[0];
    console.log(`✅ Stack Status: ${stack.StackStatus}`);
    console.log(`   Last Updated: ${stack.LastUpdatedTime || stack.CreationTime}`);
    
    // Get outputs
    const outputs = {};
    stack.Outputs?.forEach(output => {
      outputs[output.OutputKey] = output.OutputValue;
    });
    
    console.log('\n📊 Stack Outputs:');
    console.log(`   API Endpoint: ${outputs.ApiEndpoint}`);
    console.log(`   Main Table: ${outputs.MainTableName}`);
    console.log(`   Cache Bucket: ${outputs.CacheBucketName}`);
    
    // Check Lambda functions
    console.log('\n⚡ Checking Lambda Functions...');
    
    const functions = [
      'devcontext-backend-OrchestratorFunction',
      'devcontext-backend-RepoProcessorFunction',
      'devcontext-backend-Stage1Function',
      'devcontext-backend-Stage2Function',
      'devcontext-backend-Stage3Function',
      'devcontext-backend-AnswerEvalFunction',
      'devcontext-backend-CostApiFunction'
    ];
    
    let allFunctionsOk = true;
    
    for (const functionName of functions) {
      try {
        const result = await lambdaClient.send(new GetFunctionCommand({
          FunctionName: functionName
        }));
        
        const config = result.Configuration;
        const shortName = functionName.replace('devcontext-backend-', '');
        console.log(`   ✅ ${shortName}`);
        console.log(`      Runtime: ${config.Runtime}`);
        console.log(`      Last Modified: ${config.LastModified}`);
        console.log(`      Memory: ${config.MemorySize}MB`);
        console.log(`      Timeout: ${config.Timeout}s`);
      } catch (error) {
        console.log(`   ❌ ${functionName} - ${error.message}`);
        allFunctionsOk = false;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    
    if (allFunctionsOk && stack.StackStatus === 'UPDATE_COMPLETE') {
      console.log('✅ Deployment Verified Successfully!');
      console.log('\n📝 Next Steps:');
      console.log('   1. Test API: curl ' + outputs.ApiEndpoint + 'health');
      console.log('   2. Start new analysis from frontend');
      console.log('   3. Verify data: node check-analysis-data.js [analysisId]');
    } else {
      console.log('⚠️  Deployment verification found issues');
      console.log('   Please check the errors above and redeploy if needed');
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('\n💡 Make sure you have:');
    console.error('   1. Deployed the stack: sam deploy');
    console.error('   2. AWS credentials configured');
    console.error('   3. Correct region (ap-southeast-1)');
  }
}

verifyDeployment();
