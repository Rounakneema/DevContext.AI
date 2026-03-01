const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

// Test ALL available models including Amazon models
const MODELS = [
  // Amazon Nova models (might work without payment)
  { id: 'amazon.nova-micro-v1:0', name: 'Amazon Nova Micro', provider: 'Amazon', format: 'nova' },
  { id: 'amazon.nova-lite-v1:0', name: 'Amazon Nova Lite', provider: 'Amazon', format: 'nova' },
  { id: 'amazon.nova-pro-v1:0', name: 'Amazon Nova Pro', provider: 'Amazon', format: 'nova' },
  { id: 'amazon.nova-2-lite-v1:0', name: 'Amazon Nova 2 Lite', provider: 'Amazon', format: 'nova' },
  
  // Claude 3 models (older, might work)
  { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku', provider: 'Anthropic', format: 'claude' },
  { id: 'anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet', provider: 'Anthropic', format: 'claude' },
  { id: 'anthropic.claude-3-5-sonnet-20240620-v1:0', name: 'Claude 3.5 Sonnet v1', provider: 'Anthropic', format: 'claude' },
  
  // Claude 4.5 models (newest)
  { id: 'anthropic.claude-haiku-4-5-20251001-v1:0', name: 'Claude Haiku 4.5', provider: 'Anthropic', format: 'claude' },
  { id: 'anthropic.claude-opus-4-5-20251101-v1:0', name: 'Claude Opus 4.5', provider: 'Anthropic', format: 'claude' },
  
  // Global inference profiles
  { id: 'global.anthropic.claude-haiku-4-5-20251001-v1:0', name: 'Claude Haiku 4.5 (Global)', provider: 'Anthropic', format: 'claude' },
  { id: 'global.amazon.nova-2-lite-v1:0', name: 'Amazon Nova 2 Lite (Global)', provider: 'Amazon', format: 'nova' },
  
  // APAC inference profiles
  { id: 'apac.amazon.nova-micro-v1:0', name: 'Amazon Nova Micro (APAC)', provider: 'Amazon', format: 'nova' },
  { id: 'apac.anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku (APAC)', provider: 'Anthropic', format: 'claude' },
];

async function testModel(model) {
  console.log(`\n🧪 Testing: ${model.name}`);
  console.log(`   Provider: ${model.provider}`);
  console.log(`   Model ID: ${model.id}`);
  console.log('-'.repeat(70));
  
  const client = new BedrockRuntimeClient({ region: 'ap-southeast-1' });
  
  // Different request formats for different providers
  let requestBody;
  
  if (model.format === 'claude') {
    requestBody = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: 'Say "Hello" in 3 words.'
        }
      ],
      temperature: 0.3
    };
  } else if (model.format === 'nova') {
    requestBody = {
      messages: [
        {
          role: 'user',
          content: [
            {
              text: 'Say "Hello" in 3 words.'
            }
          ]
        }
      ],
      inferenceConfig: {
        max_new_tokens: 50,
        temperature: 0.3
      }
    };
  }
  
  try {
    const command = new InvokeModelCommand({
      modelId: model.id,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    });
    
    const startTime = Date.now();
    const response = await client.send(command);
    const duration = Date.now() - startTime;
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Extract response text based on format
    let responseText;
    if (model.format === 'claude') {
      responseText = responseBody.content[0].text;
    } else if (model.format === 'nova') {
      responseText = responseBody.output?.message?.content?.[0]?.text || JSON.stringify(responseBody).substring(0, 100);
    }
    
    console.log('✅ SUCCESS!');
    console.log(`   Response: ${responseText}`);
    console.log(`   Duration: ${duration}ms`);
    
    return { success: true, duration, response: responseText };
    
  } catch (error) {
    console.log('❌ FAILED');
    console.log(`   Error: ${error.name}`);
    
    // Show first 150 chars of error message
    const shortMessage = error.message.substring(0, 150);
    console.log(`   Message: ${shortMessage}${error.message.length > 150 ? '...' : ''}`);
    
    return { success: false, error: error.name, message: error.message };
  }
}

async function main() {
  console.log('🚀 Testing ALL Available Models (Including Amazon)');
  console.log('='.repeat(70));
  console.log(`Total models to test: ${MODELS.length}`);
  console.log('Using root user credentials\n');
  
  const results = [];
  
  for (const model of MODELS) {
    const result = await testModel(model);
    results.push({ 
      ...model,
      ...result 
    });
    
    // Wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('='.repeat(70));
  
  const amazonResults = results.filter(r => r.provider === 'Amazon');
  const claudeResults = results.filter(r => r.provider === 'Anthropic');
  
  console.log('\n🔹 Amazon Models:');
  amazonResults.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}`);
  });
  
  console.log('\n🔹 Claude Models:');
  claudeResults.forEach(r => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}`);
  });
  
  const workingModels = results.filter(r => r.success);
  
  console.log('\n📈 Statistics:');
  console.log(`   Total tested: ${results.length}`);
  console.log(`   ✅ Working: ${workingModels.length}`);
  console.log(`   ❌ Failed: ${results.length - workingModels.length}`);
  
  if (workingModels.length > 0) {
    console.log('\n✨ WORKING MODELS FOUND!');
    console.log('   You can use these models:');
    workingModels.forEach(m => {
      console.log(`   - ${m.name} (${m.id})`);
    });
  } else {
    console.log('\n⚠️  NO MODELS WORKING');
    console.log('   This means you need to add a payment method to your AWS account.');
    console.log('   Go to: https://console.aws.amazon.com/billing/home#/paymentmethods');
    console.log('   Add a credit/debit card, wait 2-5 minutes, then test again.');
  }
}

main().catch(console.error);
