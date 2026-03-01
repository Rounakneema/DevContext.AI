const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

async function testWithRootUser() {
  console.log('Testing Bedrock with root user credentials...\n');
  
  // AWS SDK will automatically use the AWS_PROFILE environment variable
  // or the default profile from ~/.aws/credentials
  const client = new BedrockRuntimeClient({ 
    region: 'ap-southeast-1'
  });
  
  const modelId = 'anthropic.claude-3-haiku-20240307-v1:0';
  
  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 50,
    messages: [
      {
        role: 'user',
        content: 'Say "Hello from root user!" in 5 words.'
      }
    ],
    temperature: 0.3
  };
  
  try {
    console.log(`Testing model: ${modelId}`);
    
    const command = new InvokeModelCommand({
      modelId: modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    });
    
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log('✅ SUCCESS!');
    console.log(`Response: ${responseBody.content[0].text}`);
    console.log(`Usage: ${JSON.stringify(responseBody.usage)}`);
    
  } catch (error) {
    console.log('❌ FAILED');
    console.log(`Error: ${error.name}`);
    console.log(`Message: ${error.message}`);
  }
}

testWithRootUser().catch(console.error);
