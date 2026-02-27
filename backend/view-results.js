const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'ap-southeast-1' }));

const ANALYSIS_ID = process.argv[2] || '62c77ab4-c210-4ffd-ad58-dba217997b4d';
const TABLE_NAME = 'devcontext-analyses';

async function viewResults() {
  try {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { analysisId: ANALYSIS_ID }
    });
    
    const result = await client.send(command);
    
    if (!result.Item) {
      console.log('❌ Analysis not found');
      return;
    }
    
    const analysis = result.Item;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 DEVCONTEXT AI - ANALYSIS RESULTS');
    console.log('='.repeat(80));
    console.log(`Repository: ${analysis.repositoryUrl}`);
    console.log(`Status: ${analysis.status.toUpperCase()}`);
    console.log(`Completed Stages: ${analysis.completedStages?.join(', ') || 'None'}`);
    console.log('='.repeat(80));
    
    // Stage 1: Project Review
    if (analysis.projectReview) {
      const pr = analysis.projectReview;
      console.log('\n📝 STAGE 1: PROJECT REVIEW');
      console.log('-'.repeat(80));
      
      console.log('\n🎯 Code Quality:');
      console.log(`   Overall Score: ${pr.codeQuality.score}/100`);
      console.log(`   - Readability: ${pr.codeQuality.readability}/100`);
      console.log(`   - Maintainability: ${pr.codeQuality.maintainability}/100`);
      console.log(`   - Best Practices: ${pr.codeQuality.bestPractices}/100`);
      console.log(`   Justification: ${pr.codeQuality.justification}`);
      
      console.log('\n💼 Employability Signal:');
      console.log(`   Score: ${pr.employabilitySignal.score}/100`);
      console.log(`   ${pr.employabilitySignal.justification}`);
      
      console.log('\n✨ Strengths:');
      pr.strengths.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.pattern}`);
        console.log(`      ${s.description}`);
        console.log(`      Files: ${s.fileReferences.join(', ')}`);
      });
      
      console.log('\n🔧 Improvement Areas:');
      pr.improvementAreas.forEach((ia, i) => {
        console.log(`   ${i + 1}. [${ia.priority.toUpperCase()}] ${ia.issue}`);
        console.log(`      Suggestion: ${ia.actionableSuggestion}`);
        if (ia.codeExample) {
          console.log(`      Example: ${ia.codeExample}`);
        }
      });
      
      console.log('\n🔍 Project Authenticity:');
      console.log(`   Score: ${pr.projectAuthenticity.score}/100`);
      console.log(`   ${pr.projectAuthenticity.commitDiversity}`);
      if (pr.projectAuthenticity.warning) {
        console.log(`   ⚠️  ${pr.projectAuthenticity.warning}`);
      }
    }
    
    // Stage 3: Interview Questions
    if (analysis.interviewSimulation) {
      const is = analysis.interviewSimulation;
      console.log('\n\n💬 STAGE 3: INTERVIEW SIMULATION');
      console.log('-'.repeat(80));
      
      console.log(`\nGenerated ${is.questions.length} interview questions:`);
      console.log(`Categories: Architecture (${is.categoryCounts.architecture}), Implementation (${is.categoryCounts.implementation}), Trade-offs (${is.categoryCounts.tradeoffs}), Scalability (${is.categoryCounts.scalability})`);
      console.log(`Difficulty: Junior (${is.difficultyDistribution.junior}), Mid-level (${is.difficultyDistribution.midLevel}), Senior (${is.difficultyDistribution.senior})`);
      
      console.log('\n📋 Sample Questions:\n');
      is.questions.slice(0, 5).forEach((q, i) => {
        console.log(`${i + 1}. [${q.category.toUpperCase()} - ${q.difficulty}]`);
        console.log(`   ${q.question}`);
        console.log(`   Files: ${q.fileReferences.join(', ')}`);
        console.log(`   Topics: ${q.expectedTopics.join(', ')}`);
        console.log('');
      });
      
      if (is.questions.length > 5) {
        console.log(`   ... and ${is.questions.length - 5} more questions`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Analysis Complete!');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('Error viewing results:', error.message);
  }
}

viewResults();
