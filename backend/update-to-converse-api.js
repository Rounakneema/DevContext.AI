const fs = require('fs');
const path = require('path');

console.log('\n🔄 Updating Stage Files to use Bedrock Converse API');
console.log('='.repeat(80));

const files = [
  'src/stage1-review.ts',
  'src/stage2-intelligence.ts',
  'src/stage3-questions.ts'
];

const updates = {
  // Update imports
  'InvokeModelCommand': 'ConverseCommand',
  
  // Update model IDs to inference profiles
  "'meta.llama3-3-70b-instruct-v1:0'": "'us.meta.llama3-3-70b-instruct-v1:0'",
  "'cohere.command-r-plus-v1:0'": "'us.cohere.command-r-plus-v1:0'",
  
  // Update command creation pattern (this is complex, will need manual fix)
};

for (const file of files) {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${file} (not found)`);
    continue;
  }
  
  console.log(`\n📝 Processing: ${file}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Update imports
  if (content.includes('InvokeModelCommand')) {
    content = content.replace(/InvokeModelCommand/g, 'ConverseCommand');
    console.log('   ✅ Updated import: InvokeModelCommand → ConverseCommand');
    changed = true;
  }
  
  // Update model IDs
  if (content.includes("'meta.llama3-3-70b-instruct-v1:0'")) {
    content = content.replace(/'meta\.llama3-3-70b-instruct-v1:0'/g, "'us.meta.llama3-3-70b-instruct-v1:0'");
    console.log('   ✅ Updated model ID: meta.llama3-3-70b-instruct-v1:0 → us.meta.llama3-3-70b-instruct-v1:0');
    changed = true;
  }
  
  if (content.includes("'cohere.command-r-plus-v1:0'")) {
    content = content.replace(/'cohere\.command-r-plus-v1:0'/g, "'us.cohere.command-r-plus-v1:0'");
    console.log('   ✅ Updated model ID: cohere.command-r-plus-v1:0 → us.cohere.command-r-plus-v1:0');
    changed = true;
  }
  
  // Update command creation (complex pattern)
  const oldPattern = /const command = new InvokeModelCommand\(\{[\s\S]*?modelId: MODEL_ID,[\s\S]*?contentType: 'application\/json',[\s\S]*?accept: 'application\/json',[\s\S]*?body: JSON\.stringify\(requestBody\)[\s\S]*?\}\);/g;
  
  if (oldPattern.test(content)) {
    // This is complex - need to replace the entire command block
    console.log('   ⚠️  Found InvokeModelCommand usage - needs manual conversion to ConverseCommand');
    console.log('   💡 Pattern: new InvokeModelCommand({ modelId, body: JSON.stringify(requestBody) })');
    console.log('   💡 Should be: new ConverseCommand({ modelId, messages, inferenceConfig })');
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('   💾 File updated');
  } else {
    console.log('   ℹ️  No changes needed');
  }
}

console.log('\n' + '='.repeat(80));
console.log('✅ Update complete');
console.log('\n⚠️  MANUAL STEPS REQUIRED:');
console.log('1. Replace InvokeModelCommand blocks with ConverseCommand');
console.log('2. Change requestBody format from { messages, inferenceConfig } to direct params');
console.log('3. Update response parsing from response.body to response.output.message');
console.log('='.repeat(80) + '\n');
