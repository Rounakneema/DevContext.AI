/**
 * Test Progressive Workflow
 * Tests the new user-controlled stage progression
 */

const BASE_URL = 'http://localhost:3001';

async function testProgressiveWorkflow() {
  console.log('🧪 Testing Progressive Workflow\n');
  
  try {
    // Step 1: Start analysis (Stage 1 runs automatically)
    console.log('1️⃣  Starting analysis...');
    const analyzeResponse = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryUrl: 'https://github.com/facebook/react'
      })
    });
    const analyzeData = await analyzeResponse.json();
    console.log('   ✅ Analysis initiated:', analyzeData.analysisId);
    console.log('   ⏱️  Estimated time:', analyzeData.estimatedCompletionTime, 'seconds\n');
    
    const analysisId = analyzeData.analysisId;
    
    // Step 2: Check status (should show stage1_complete)
    console.log('2️⃣  Checking status after Stage 1...');
    const statusResponse = await fetch(`${BASE_URL}/analysis/${analysisId}/status`);
    const statusData = await statusResponse.json();
    console.log('   Status:', statusData.status);
    console.log('   Progress:', statusData.progress + '%');
    console.log('   Stage 1:', statusData.stages.project_review.status);
    console.log('   Stage 2:', statusData.stages.intelligence_report.status);
    console.log('   Stage 3:', statusData.stages.interview_simulation.status);
    console.log('   Next Action:', statusData.nextAction, '\n');
    
    // Step 3: User decides to continue to Stage 2
    console.log('3️⃣  User clicks "Continue to Intelligence Report"...');
    const stage2Response = await fetch(`${BASE_URL}/analysis/${analysisId}/continue-stage2`, {
      method: 'POST'
    });
    const stage2Data = await stage2Response.json();
    console.log('   ✅', stage2Data.message);
    console.log('   Status:', stage2Data.status);
    console.log('   ⏱️  Estimated time:', stage2Data.estimatedCompletionTime, 'seconds\n');
    
    // Step 4: User decides to continue to Stage 3
    console.log('4️⃣  User clicks "Start Interview Practice"...');
    const stage3Response = await fetch(`${BASE_URL}/analysis/${analysisId}/continue-stage3`, {
      method: 'POST'
    });
    const stage3Data = await stage3Response.json();
    console.log('   ✅', stage3Data.message);
    console.log('   Status:', stage3Data.status);
    console.log('   ⏱️  Estimated time:', stage3Data.estimatedCompletionTime, 'seconds\n');
    
    // Step 5: Get full analysis
    console.log('5️⃣  Getting full analysis results...');
    const analysisResponse = await fetch(`${BASE_URL}/analysis/${analysisId}`);
    const analysisData = await analysisResponse.json();
    console.log('   ✅ Analysis retrieved');
    console.log('   Repository:', analysisData.repository.totalFiles, 'files');
    console.log('   Code Quality:', analysisData.projectReview.codeQuality.overall + '/100');
    console.log('   Employability:', analysisData.projectReview.employabilitySignal.overall + '/100');
    console.log('   Questions:', analysisData.interviewSimulation.questions.length, '\n');
    
    // Step 6: Create interview session
    console.log('6️⃣  Creating interview session...');
    const sessionResponse = await fetch(`${BASE_URL}/interview/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysisId,
        config: {
          targetRole: 'Full Stack Developer',
          difficulty: 'mixed'
        }
      })
    });
    const sessionData = await sessionResponse.json();
    console.log('   ✅ Session created:', sessionData.sessionId);
    console.log('   Total questions:', sessionData.totalQuestions);
    console.log('   Status:', sessionData.status, '\n');
    
    const sessionId = sessionData.sessionId;
    
    // Step 7: Submit an answer
    console.log('7️⃣  Submitting answer to question...');
    const answerResponse = await fetch(`${BASE_URL}/interview/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 'question-1',
        answer: 'JWT provides stateless authentication by encoding user claims in a signed token...',
        timeSpentSeconds: 120
      })
    });
    const answerData = await answerResponse.json();
    console.log('   ✅ Answer evaluated');
    console.log('   Overall Score:', answerData.evaluation.overallScore + '/100');
    console.log('   Technical Accuracy:', answerData.evaluation.criteriaScores.technicalAccuracy + '/100');
    console.log('   Completeness:', answerData.evaluation.criteriaScores.completeness + '/100');
    console.log('   Clarity:', answerData.evaluation.criteriaScores.clarity + '/100');
    console.log('   Depth:', answerData.evaluation.criteriaScores.depthOfUnderstanding + '/100');
    console.log('   Strengths:', answerData.evaluation.strengths.length);
    console.log('   Weaknesses:', answerData.evaluation.weaknesses.length);
    console.log('   Category:', answerData.evaluation.comparison.yourAnswerCategory, '\n');
    
    // Step 8: Complete session
    console.log('8️⃣  Completing interview session...');
    const completeResponse = await fetch(`${BASE_URL}/interview/sessions/${sessionId}/complete`, {
      method: 'POST'
    });
    const completeData = await completeResponse.json();
    console.log('   ✅ Session completed');
    console.log('   Duration:', completeData.summary.duration, 'minutes');
    console.log('   Average Score:', completeData.summary.averageScore + '/100');
    console.log('   Architecture:', completeData.summary.categoryPerformance.architecture + '/100');
    console.log('   Implementation:', completeData.summary.categoryPerformance.implementation + '/100');
    console.log('   Trade-offs:', completeData.summary.categoryPerformance.tradeoffs + '/100');
    console.log('   Scalability:', completeData.summary.categoryPerformance.scalability + '/100');
    console.log('   Improvement Areas:', completeData.summary.improvementAreas.length);
    console.log('   Strengths:', completeData.summary.strengths.length);
    console.log('   Recommended Next Steps:', completeData.summary.recommendedNextSteps.length, '\n');
    
    // Step 9: Get user stats
    console.log('9️⃣  Getting user statistics...');
    const statsResponse = await fetch(`${BASE_URL}/user/stats`);
    const statsData = await statsResponse.json();
    console.log('   ✅ Stats retrieved');
    console.log('   Total Analyses:', statsData.totalAnalyses);
    console.log('   Avg Code Quality:', statsData.averageCodeQuality + '/100');
    console.log('   Total Interview Sessions:', statsData.totalInterviewSessions);
    console.log('   Avg Interview Score:', statsData.averageInterviewScore + '/100', '\n');
    
    // Step 10: Get user progress
    console.log('🔟 Getting user progress...');
    const progressResponse = await fetch(`${BASE_URL}/user/progress`);
    const progressData = await progressResponse.json();
    console.log('   ✅ Progress retrieved');
    console.log('   Improvement Trend:', progressData.improvementTrend.length, 'data points');
    console.log('   Skill Gaps:', progressData.identifiedSkillGaps.length);
    console.log('   Recommended Topics:', progressData.recommendedTopics.length);
    console.log('   Completed Topics:', progressData.completedTopics.length);
    console.log('   Performance Trend:', progressData.performanceTrend.trend, 
                '(' + (progressData.performanceTrend.comparedToPrevious > 0 ? '+' : '') + 
                progressData.performanceTrend.comparedToPrevious + ' points)', '\n');
    
    console.log('✅ All tests passed!\n');
    console.log('📊 Progressive Workflow Summary:');
    console.log('   1. Analysis starts → Stage 1 completes automatically');
    console.log('   2. User sees results → Decides to continue or stop');
    console.log('   3. User triggers Stage 2 → Intelligence Report generated');
    console.log('   4. User triggers Stage 3 → Interview Questions generated');
    console.log('   5. User starts interview → Gets real-time evaluation');
    console.log('   6. User completes session → Gets detailed summary');
    console.log('   7. Progress tracked → Improvement trends calculated\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
console.log('Starting mock backend test...');
console.log('Make sure mock backend is running on http://localhost:3001\n');

testProgressiveWorkflow();
