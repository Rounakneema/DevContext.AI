const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testBedrock() {
  console.log('\n🧪 Testing Bedrock Models in us-west-2 (Converse API)');
  console.log('='.repeat(80));
  
  const models = [
    {
      name: 'Meta Llama 3.3 70B Instruct (Inference Profile)',
      id: 'us.meta.llama3-3-70b-instruct-v1:0',
      region: 'us-west-2'
    },
    {
      name: 'Meta Llama 3.1 70B Instruct (Inference Profile)',
      id: 'us.meta.llama3-1-70b-instruct-v1:0',
      region: 'us-west-2'
    }
  ];
  
  for (const model of models) {
    console.log(`\n📋 Testing: ${model.name}`);
    console.log(`   Model ID: ${model.id}`);
    console.log(`   Region: ${model.region}`);
    console.log('-'.repeat(80));
    
    try {
      const client = new BedrockRuntimeClient({ region: model.region });
      
      const command = new ConverseCommand({
        modelId: model.id,
        messages: [
          {
            role: 'user',
            content: [{ text: 'Say "Hello, I am working!" and nothing else.' }]
          }
        ],
        inferenceConfig: {
          maxTokens: 50,
          temperature: 0.3
        }
      });
      
      const startTime = Date.now();
      const response = await client.send(command);
      const duration = Date.now() - startTime;
      
      const content = response.output?.message?.content?.[0]?.text || 'No response';
      
      console.log(`   ✅ SUCCESS (${duration}ms)`);
      console.log(`   Response: ${content}`);
      console.log(`   Tokens: ${response.usage?.inputTokens} in, ${response.usage?.outputTokens} out`);
      
    } catch (error) {
      console.log(`   ❌ FAILED`);
      console.log(`   Error: ${error.message}`);
      
      if (error.name === 'ValidationException') {
        console.log(`   💡 This model may not be available in ${model.region}`);
      } else if (error.name === 'AccessDeniedException') {
        console.log(`   💡 Check IAM permissions for bedrock:InvokeModel`);
      } else if (error.message.includes('Could not resolve')) {
        console.log(`   💡 Check AWS credentials and region configuration`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Bedrock test complete\n');
}

testBedrock().catch(console.error);
