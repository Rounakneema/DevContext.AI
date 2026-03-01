const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-southeast-1' }));

// Get analysis ID from command line or use default
const ANALYSIS_ID = process.argv[2] || 'aa0db8bf-d21a-4d76-a7e6-3425fde8f818';
const TABLE_NAME = process.env.MAIN_TABLE || 'devcontext-main';

async function checkAnalysis() {
  try {
    console.log(`\n🔍 Checking Analysis: ${ANALYSIS_ID}`);
    console.log(`📦 Table: ${TABLE_NAME}`);
    console.log('='.repeat(80));
    
    // Batch get all analysis components
    const result = await client.send(new BatchGetCommand({
      RequestItems: {
        [TABLE_NAME]: {
          Keys: [
            { PK: `ANALYSIS#${ANALYSIS_ID}`, SK: 'METADATA' },
            { PK: `ANALYSIS#${ANALYSIS_ID}`, SK: 'REPO_METADATA' },
            { PK: `ANALYSIS#${ANALYSIS_ID}`, SK: 'PROJECT_REVIEW' },
            { PK: `ANALYSIS#${ANALYSIS_ID}`, SK: 'INTELLIGENCE_REPORT' },
            { PK: `ANALYSIS#${ANALYSIS_ID}`, SK: 'INTERVIEW_SIMULATION' }
          ]
        }
      }
    }));
    
    const items = result.Responses?.[TABLE_NAME] || [];
    
    if (items.length === 0) {
      console.log('❌ Analysis not found in database');
      console.log('\n💡 This analysis may have been deleted or never created.');
      return;
    }
    
    const metadata = items.find(item => item.SK === 'METADATA');
    const repository = items.find(item => item.SK === 'REPO_METADATA');
    const projectReview = items.find(item => item.SK === 'PROJECT_REVIEW');
    const intelligenceReport = items.find(item => item.SK === 'INTELLIGENCE_REPORT');
    const interviewSimulation = items.find(item => item.SK === 'INTERVIEW_SIMULATION');
    
    console.log('\n📊 ANALYSIS METADATA');
    console.log('-'.repeat(80));
    if (metadata) {
      console.log(`✅ Found`);
      console.log(`   Repository: ${metadata.repositoryUrl}`);
      console.log(`   Status: ${metadata.status}`);
      console.log(`   Created: ${metadata.createdAt}`);
      console.log(`   Completed: ${metadata.completedAt || 'Not completed'}`);
      console.log(`   Stages:`, JSON.stringify(metadata.stages, null, 2));
    } else {
      console.log(`❌ Not found`);
    }
    
    console.log('\n📁 REPOSITORY METADATA');
    console.log('-'.repeat(80));
    if (repository) {
      console.log(`✅ Found`);
      console.log(`   Total Files: ${repository.totalFiles}`);
      console.log(`   Total Size: ${(repository.totalSizeBytes / 1024).toFixed(2)} KB`);
      console.log(`   Languages:`, repository.languages);
    } else {
      console.log(`❌ Not found`);
    }
    
    console.log('\n🔍 STAGE 1: PROJECT REVIEW');
    console.log('-'.repeat(80));
    if (projectReview) {
      console.log(`✅ Found`);
      console.log(`   Code Quality: ${projectReview.codeQualityScore}/100`);
      console.log(`   Architecture: ${projectReview.architectureScore}/100`);
      console.log(`   Best Practices: ${projectReview.bestPracticesScore}/100`);
      console.log(`   Overall: ${projectReview.overallScore}/100`);
      console.log(`   Strengths: ${projectReview.strengths?.length || 0}`);
      console.log(`   Weaknesses: ${projectReview.weaknesses?.length || 0}`);
    } else {
      console.log(`❌ Not found - Stage 1 not completed or data not saved`);
    }
    
    console.log('\n🧠 STAGE 2: INTELLIGENCE REPORT');
    console.log('-'.repeat(80));
    if (intelligenceReport) {
      console.log(`✅ Found`);
      console.log(`   Employability Signal: ${intelligenceReport.employabilitySignal}/100`);
      console.log(`   Authenticity Score: ${intelligenceReport.authenticityScore}/100`);
      console.log(`   Technical Depth: ${intelligenceReport.technicalDepth}`);
      console.log(`   Design Decisions: ${intelligenceReport.designDecisions?.length || 0}`);
      console.log(`   Technical Insights: ${intelligenceReport.technicalInsights?.length || 0}`);
    } else {
      console.log(`❌ Not found - Stage 2 not completed or data not saved`);
    }
    
    console.log('\n💬 STAGE 3: INTERVIEW QUESTIONS');
    console.log('-'.repeat(80));
    if (interviewSimulation) {
      console.log(`✅ Found`);
      console.log(`   Total Questions: ${interviewSimulation.questions?.length || 0}`);
      console.log(`   Categories:`, interviewSimulation.categoryCounts);
      console.log(`   Difficulty:`, interviewSimulation.difficultyDistribution);
    } else {
      console.log(`❌ Not found - Stage 3 not completed or data not saved`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 SUMMARY');
    console.log(`   Metadata: ${metadata ? '✅' : '❌'}`);
    console.log(`   Repository: ${repository ? '✅' : '❌'}`);
    console.log(`   Project Review: ${projectReview ? '✅' : '❌'}`);
    console.log(`   Intelligence Report: ${intelligenceReport ? '✅' : '❌'}`);
    console.log(`   Interview Questions: ${interviewSimulation ? '✅' : '❌'}`);
    
    if (!projectReview && !intelligenceReport && !interviewSimulation) {
      console.log('\n⚠️  WARNING: No stage results found!');
      console.log('   This means the stages may have run but failed to save results.');
      console.log('   Check Lambda logs for errors during stage execution.');
    }
    
  } catch (error) {
    console.error('\n❌ Error checking analysis:', error.message);
    console.error(error);
  }
}

checkAnalysis();
