const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

// All available models in ap-southeast-1
const MODELS = [
  // Direct models (no inference profile needed)
  { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku (Direct)', type: 'direct' },
  { id: 'anthropic.claude-3-5-sonnet-20240620-v1:0', name: 'Claude 3.5 Sonnet v1 (Direct)', type: 'direct' },
  { id: 'anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet (Direct)', type: 'direct' },
  { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet v2 (Direct)', type: 'direct' },
  { id: 'anthropic.claude-3-7-sonnet-20250219-v1:0', name: 'Claude 3.7 Sonnet (Direct)', type: 'direct' },
  { id: 'anthropic.claude-sonnet-4-20250514-v1:0', name: 'Claude Sonnet 4 (Direct)', type: 'direct' },
  { id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', name: 'Claude Sonnet 4.5 (Direct)', type: 'direct' },
  { id: 'anthropic.claude-haiku-4-5-20251001-v1:0', name: 'Claude Haiku 4.5 (Direct)', type: 'direct' },
  { id: 'anthropic.claude-opus-4-5-20251101-v1:0', name: 'Claude Opus 4.5 (Direct)', type: 'direct' },
  { id: 'anthropic.claude-opus-4-6-v1', name: 'Claude Opus 4.6 (Direct)', type: 'direct' },
  { id: 'anthropic.claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Direct)', type: 'direct' },
  
  // APAC Regional Inference Profiles
  { id: 'apac.anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku (APAC)', type: 'apac' },
  { id: 'apac.anthropic.claude-3-5-sonnet-20240620-v1:0', name: 'Claude 3.5 Sonnet v1 (APAC)', type: 'apac' },
  { id: 'apac.anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet (APAC)', type: 'apac' },
  { id: 'apac.anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet v2 (APAC)', type: 'apac' },
  { id: 'apac.anthropic.claude-3-7-sonnet-20250219-v1:0', name: 'Claude 3.7 Sonnet (APAC)', type: 'apac' },
  { id: 'apac.anthropic.claude-sonnet-4-20250514-v1:0', name: 'Claude Sonnet 4 (APAC)', type: 'apac' },
  { id: 'apac.amazon.nova-micro-v1:0', name: 'Amazon Nova Micro (APAC)', type: 'apac' },
  { id: 'apac.amazon.nova-lite-v1:0', name: 'Amazon Nova Lite (APAC)', type: 'apac' },
  { id: 'apac.amazon.nova-pro-v1:0', name: 'Amazon Nova Pro (APAC)', type: 'apac' },
  
  // Global Inference Profiles
  { id: 'global.anthropic.claude-haiku-4-5-20251001-v1:0', name: 'Claude Haiku 4.5 (Global)', type: 'global' },
  { id: 'global.anthropic.claude-sonnet-4-5-20250929-v1:0', name: 'Claude Sonnet 4.5 (Global)', type: 'global' },
  { id: 'global.anthropic.claude-opus-4-5-20251101-v1:0', name: 'Claude Opus 4.5 (Global)', type: 'global' },
  { id: 'global.anthropic.claude-opus-4-6-v1', name: 'Claude Opus 4.6 (Global)', type: 'global' },
  { id: 'global.anthropic.claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Global)', type: 'global' },
  { id: 'global.amazon.nova-2-lite-v1:0', name: 'Amazon Nova 2 Lite (Global)', type: 'global' },
];

async function testModel(modelId, modelName) {
  console.log(`\n🧪 Testing: ${modelName}`);
  console.log(`   Model ID: ${modelId}`);
  console.log('='.repeat(70));
  
  const client = new BedrockRuntimeClient({ region: 'ap-southeast-1' });
  
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 50,
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
    console.log(`   Message: ${error.message.substring(0, 150)}`);
    
    return { success: false, error: error.name, message: error.message };
  }
}

async function main() {
  console.log('🚀 Testing All Available Bedrock Models in ap-southeast-1');
  console.log('='.repeat(70));
  console.log(`Total models to test: ${MODELS.length}`);
  console.log('This will take a few minutes...\n');
  
  const results = {
    direct: [],
    apac: [],
    global: []
  };
  
  for (const model of MODELS) {
    const result = await testModel(model.id, model.name);
    results[model.type].push({ 
      id: model.id, 
      name: model.name, 
      ...result 
    });
    
    // Wait 1 second between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('='.repeat(70));
  
  console.log('\n🔹 Direct Models (no inference profile):');
  results.direct.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}`);
    if (!r.success) console.log(`   Error: ${r.error}`);
  });
  
  console.log('\n🔹 APAC Regional Inference Profiles:');
  results.apac.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}`);
    if (!r.success) console.log(`   Error: ${r.error}`);
  });
  
  console.log('\n🔹 Global Inference Profiles:');
  results.global.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}`);
    if (!r.success) console.log(`   Error: ${r.error}`);
  });
  
  const totalSuccess = [...results.direct, ...results.apac, ...results.global]
    .filter(r => r.success).length;
  const totalFailed = MODELS.length - totalSuccess;
  
  console.log('\n📈 Statistics:');
  console.log(`   Total tested: ${MODELS.length}`);
  console.log(`   ✅ Successful: ${totalSuccess}`);
  console.log(`   ❌ Failed: ${totalFailed}`);
  
  if (totalSuccess > 0) {
    console.log('\n✨ Working models found! You can use any of the successful models.');
    console.log('   Recommended for your app:');
    const workingModels = [...results.direct, ...results.apac, ...results.global]
      .filter(r => r.success);
    
    // Find cheapest and fastest
    const haiku = workingModels.find(r => r.name.includes('Haiku'));
    const sonnet = workingModels.find(r => r.name.includes('Sonnet') && !r.name.includes('4'));
    
    if (haiku) console.log(`   - ${haiku.name} (fastest, cheapest)`);
    if (sonnet) console.log(`   - ${sonnet.name} (balanced)`);
  } else {
    console.log('\n⚠️  No working models found. Check:');
    console.log('   1. Add a valid payment method to your AWS account');
    console.log('   2. Enable model access in AWS Bedrock console');
    console.log('   3. Wait 2-5 minutes after adding payment method');
  }
}

main().catch(console.error);
