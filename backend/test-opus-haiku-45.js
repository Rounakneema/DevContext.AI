const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const MODELS = [
  { id: 'anthropic.claude-haiku-4-5-20251001-v1:0', name: 'Claude Haiku 4.5 (Direct)' },
  { id: 'anthropic.claude-opus-4-5-20251101-v1:0', name: 'Claude Opus 4.5 (Direct)' },
  { id: 'global.anthropic.claude-haiku-4-5-20251001-v1:0', name: 'Claude Haiku 4.5 (Global)' },
  { id: 'global.anthropic.claude-opus-4-5-20251101-v1:0', name: 'Claude Opus 4.5 (Global)' },
];

async function testModel(modelId, modelName) {
  console.log(`\n🧪 Testing: ${modelName}`);
  console.log(`   Model ID: ${modelId}`);
  console.log('='.repeat(70));
  
  const client = new BedrockRuntimeClient({ region: 'ap-southeast-1' });
  
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: 'Say "Hello, I am working!" in exactly 5 words.'
      }
    ],
    temperature: 0.3
  };
  
  try {
    const command = new InvokeModelCommand({
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    });
    
    const startTime = Date.now();
    const response = await client.send(command);
    const duration = Date.now() - startTime;
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log('✅ SUCCESS!');
    console.log(`   Response: ${responseBody.content[0].text}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Input tokens: ${responseBody.usage.input_tokens}`);
    console.log(`   Output tokens: ${responseBody.usage.output_tokens}`);
    
    return { success: true, duration, usage: responseBody.usage };
    
  } catch (error) {
    console.log('❌ FAILED');
    console.log(`   Error: ${error.name}`);
    console.log(`   Message: ${error.message}`);
    
    return { success: false, error: error.name, message: error.message };
  }
}

async function main() {
  console.log('🚀 Testing Claude Opus 4.5 and Haiku 4.5');
  console.log('='.repeat(70));
  console.log('Using root user credentials\n');
  
  const results = [];
  
  for (const model of MODELS) {
    const result = await testModel(model.id, model.name);
    results.push({ 
      id: model.id, 
      name: model.name, 
      ...result 
    });
    
    // Wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('='.repeat(70));
  
  results.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}`);
    if (!r.success) {
      console.log(`   Error: ${r.error}`);
      if (r.message.includes('INVALID_PAYMENT_INSTRUMENT')) {
        console.log('   → Add a payment method to your AWS account');
      } else if (r.message.includes('on-demand throughput')) {
        console.log('   → Try using the global inference profile instead');
      }
    }
  });
  
  const workingModels = results.filter(r => r.success);
  
  if (workingModels.length > 0) {
    console.log('\n✨ Working models found!');
    workingModels.forEach(m => {
      console.log(`   - ${m.name}`);
    });
  } else {
    console.log('\n⚠️  No models working yet.');
    console.log('   Next step: Add a payment method to your AWS account');
    console.log('   Go to: https://console.aws.amazon.com/billing/home#/paymentmethods');
  }
}

main().catch(console.error);
