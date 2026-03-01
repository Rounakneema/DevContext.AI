/**
 * Pre-Deployment Checklist
 * Verifies everything is ready before deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n🔍 Pre-Deployment Checklist');
console.log('='.repeat(80));

let allChecksPass = true;

// Check 1: TypeScript files exist
console.log('\n[1/8] Checking TypeScript source files...');
const requiredFiles = [
  'src/orchestrator.ts',
  'src/repo-processor.ts',
  'src/stage1-review.ts',
  'src/stage2-intelligence.ts',
  'src/stage3-questions.ts',
  'src/answer-eval.ts',
  'src/cost-api.ts',
  'src/db-utils.ts',
  'src/types.ts'
];

let missingFiles = [];
requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    missingFiles.push(file);
    allChecksPass = false;
  }
});

if (missingFiles.length > 0) {
  console.log('❌ Missing files:', missingFiles.join(', '));
} else {
  console.log('✅ All source files present');
}

// Check 2: package.json exists
console.log('\n[2/8] Checking package.json...');
if (!fs.existsSync('package.json')) {
  console.log('❌ package.json not found');
  allChecksPass = false;
} else {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`✅ Package: ${pkg.name} v${pkg.version}`);
  
  // Check required dependencies
  const requiredDeps = [
    '@aws-sdk/client-bedrock-runtime',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-lambda',
    '@aws-sdk/client-s3',
    '@aws-sdk/lib-dynamodb'
  ];
  
  const missingDeps = requiredDeps.filter(dep => !pkg.dependencies[dep]);
  if (missingDeps.length > 0) {
    console.log('⚠️  Missing dependencies:', missingDeps.join(', '));
    console.log('   Run: npm install');
  }
}

// Check 3: node_modules exists
console.log('\n[3/8] Checking node_modules...');
if (!fs.existsSync('node_modules')) {
  console.log('❌ node_modules not found');
  console.log('   Run: npm install');
  allChecksPass = false;
} else {
  console.log('✅ Dependencies installed');
}

// Check 4: TypeScript can compile
console.log('\n[4/8] Checking TypeScript compilation...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ TypeScript compiles successfully');
} catch (error) {
  console.log('❌ TypeScript compilation failed');
  console.log('   Run: npm run build');
  console.log('   Fix errors and try again');
  allChecksPass = false;
}

// Check 5: dist folder exists
console.log('\n[5/8] Checking dist folder...');
if (!fs.existsSync('dist')) {
  console.log('❌ dist folder not found');
  console.log('   Run: npm run build');
  allChecksPass = false;
} else {
  const distFiles = fs.readdirSync('dist');
  const requiredJsFiles = [
    'orchestrator.js',
    'repo-processor.js',
    'stage1-review.js',
    'stage2-intelligence.js',
    'stage3-questions.js',
    'answer-eval.js',
    'cost-api.js'
  ];
  
  const missingJsFiles = requiredJsFiles.filter(file => !distFiles.includes(file));
  if (missingJsFiles.length > 0) {
    console.log('⚠️  Missing compiled files:', missingJsFiles.join(', '));
    console.log('   Run: npm run build');
  } else {
    console.log(`✅ All ${requiredJsFiles.length} handlers compiled`);
  }
}

// Check 6: template.yaml exists
console.log('\n[6/8] Checking template.yaml...');
if (!fs.existsSync('template.yaml')) {
  console.log('❌ template.yaml not found');
  allChecksPass = false;
} else {
  const template = fs.readFileSync('template.yaml', 'utf8');
  if (template.includes('nodejs20.x')) {
    console.log('✅ Template configured for Node.js 20');
  } else {
    console.log('⚠️  Template may be using old Node.js version');
  }
}

// Check 7: samconfig.toml exists
console.log('\n[7/8] Checking samconfig.toml...');
if (!fs.existsSync('samconfig.toml')) {
  console.log('❌ samconfig.toml not found');
  allChecksPass = false;
} else {
  const config = fs.readFileSync('samconfig.toml', 'utf8');
  if (config.includes('devcontext-backend')) {
    console.log('✅ SAM config ready');
  } else {
    console.log('⚠️  SAM config may need updating');
  }
}

// Check 8: AWS credentials
console.log('\n[8/8] Checking AWS credentials...');
try {
  execSync('aws sts get-caller-identity', { stdio: 'pipe' });
  const identity = JSON.parse(execSync('aws sts get-caller-identity', { encoding: 'utf8' }));
  console.log(`✅ AWS credentials configured`);
  console.log(`   Account: ${identity.Account}`);
  console.log(`   User: ${identity.Arn.split('/').pop()}`);
} catch (error) {
  console.log('❌ AWS credentials not configured');
  console.log('   Run: aws configure');
  allChecksPass = false;
}

// Summary
console.log('\n' + '='.repeat(80));
if (allChecksPass) {
  console.log('✅ All checks passed! Ready to deploy.');
  console.log('\n📦 Next steps:');
  console.log('   1. Run: deploy.bat');
  console.log('   2. Or: sam build && sam deploy --no-confirm-changeset');
  console.log('   3. Verify: node verify-deployment.js');
} else {
  console.log('❌ Some checks failed. Please fix the issues above before deploying.');
  console.log('\n🔧 Common fixes:');
  console.log('   - npm install');
  console.log('   - npm run build');
  console.log('   - aws configure');
}
console.log('='.repeat(80) + '\n');

process.exit(allChecksPass ? 0 : 1);
