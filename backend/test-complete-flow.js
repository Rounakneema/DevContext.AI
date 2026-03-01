#!/usr/bin/env node
/**
 * DevContext AI - Complete End-to-End Test Suite
 * 
 * Tests entire user journey from authentication to interview evaluation
 * 
 * Usage:
 *   node test-complete-flow.js
 * 
 * Environment Variables Required:
 *   API_BASE_URL - Your API Gateway URL
 *   TEST_EMAIL - Test user email (must exist in Cognito)
 *   TEST_PASSWORD - Test user password
 *   TEST_REPO_URL - GitHub repository URL to analyze
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  API_BASE_URL: process.env.API_BASE_URL || 'https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod',
  COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || 'ap-southeast-1_QVTlLVXey',
  COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || 'k3nk7p3klgm40rp3qami77lot',
  COGNITO_REGION: process.env.COGNITO_REGION || 'ap-southeast-1',
  TEST_EMAIL: process.env.TEST_EMAIL || 'neemarounak9171@gmail.com',
  TEST_PASSWORD: process.env.TEST_PASSWORD || 'MyNewSecurePass123!',
  TEST_REPO_URL: process.env.TEST_REPO_URL || 'https://github.com/pg-sharding/spqr',
  
  // Timeouts
  STAGE1_TIMEOUT: 300000,  // 3 minutes
  STAGE2_TIMEOUT: 300000,  // 5 minutes
  STAGE3_TIMEOUT: 300000,  // 5 minutes
  POLL_INTERVAL: 5000,     // 5 seconds
};

// ============================================================================
// TEST STATE
// ============================================================================

const testState = {
  accessToken: null,
  userId: null,
  analysisId: null,
  sessionId: null,
  questionId: null,
  
  // Timings
  startTime: Date.now(),
  timings: {},
  
  // Results
  results: {}
};

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, level = 'INFO') {
  const elapsed = ((Date.now() - testState.startTime) / 1000).toFixed(2);
  const icons = {
    INFO: 'ℹ️',
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    PROGRESS: '🔄'
  };
  console.log(`[${elapsed}s] ${icons[level] || '•'} ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    const req = lib.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * AWS Cognito Authentication using SRP (Secure Remote Password)
 */
async function authenticateWithCognito(username, password) {
  // Step 1: Initiate Auth
  const initiateAuthResponse = await makeRequest(
    `https://cognito-idp.${CONFIG.COGNITO_REGION}.amazonaws.com/`,
    {
      method: 'POST',
      headers: {
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        'Content-Type': 'application/x-amz-json-1.1'
      },
      body: {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CONFIG.COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password
        }
      }
    }
  );
  
  if (initiateAuthResponse.statusCode !== 200) {
    throw new Error(`Cognito auth failed: ${JSON.stringify(initiateAuthResponse.body)}`);
  }
  
  const authResult = initiateAuthResponse.body.AuthenticationResult;
  
  if (!authResult || !authResult.IdToken) {
    throw new Error('No IdToken in Cognito response');
  }
  
  return {
    idToken: authResult.IdToken,
    accessToken: authResult.AccessToken,
    refreshToken: authResult.RefreshToken
  };
}

/**
 * Test 1: User Authentication with AWS Cognito
 */
async function testAuthentication() {
  log('TEST 1: User Authentication', 'PROGRESS');
  const startTime = Date.now();
  
  try {
    log(`Authenticating user: ${CONFIG.TEST_EMAIL}`);
    
    const tokens = await authenticateWithCognito(CONFIG.TEST_EMAIL, CONFIG.TEST_PASSWORD);
    
    testState.accessToken = tokens.idToken;
    testState.userId = CONFIG.TEST_EMAIL;
    
    testState.timings.auth = Date.now() - startTime;
    testState.results.auth = { success: true, userId: testState.userId };
    
    log(`Authentication successful! User: ${testState.userId}`, 'SUCCESS');
    return true;
  } catch (error) {
    log(`Authentication failed: ${error.message}`, 'ERROR');
    testState.results.auth = { success: false, error: error.message };
    return false;
  }
}

/**
 * Test 2: Submit Analysis Request
 */
async function testAnalyzeSubmit() {
  log('TEST 2: Submit Analysis Request', 'PROGRESS');
  const startTime = Date.now();
  
  try {
    log(`Submitting repository: ${CONFIG.TEST_REPO_URL}`);
    
    const response = await makeRequest(`${CONFIG.API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testState.accessToken}`
      },
      body: {
        repositoryUrl: CONFIG.TEST_REPO_URL
      }
    });
    
    if (response.statusCode !== 200 && response.statusCode !== 202) {
      throw new Error(`Unexpected status: ${response.statusCode} - ${JSON.stringify(response.body)}`);
    }
    
    testState.analysisId = response.body.analysisId || response.body.analysis?.analysisId;
    
    if (!testState.analysisId) {
      throw new Error('No analysisId in response');
    }
    
    testState.timings.analyzeSubmit = Date.now() - startTime;
    testState.results.analyze = { 
      success: true, 
      analysisId: testState.analysisId,
      status: response.body.status
    };
    
    log(`Analysis submitted! ID: ${testState.analysisId}`, 'SUCCESS');
    return true;
  } catch (error) {
    log(`Analysis submission failed: ${error.message}`, 'ERROR');
    testState.results.analyze = { success: false, error: error.message };
    return false;
  }
}

/**
 * Test 3: Wait for Stage 1 (Project Review)
 */
async function testStage1Completion() {
  log('TEST 3: Waiting for Stage 1 (Project Review)', 'PROGRESS');
  const startTime = Date.now();
  const timeout = startTime + CONFIG.STAGE1_TIMEOUT;
  
  try {
    let attempts = 0;
    
    while (Date.now() < timeout) {
      attempts++;
      log(`Checking Stage 1 status... (attempt ${attempts})`);
      
      const response = await makeRequest(
        `${CONFIG.API_BASE_URL}/analysis/${testState.analysisId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${testState.accessToken}`
          }
        }
      );
      
      if (response.statusCode !== 200) {
        log(`Status check returned ${response.statusCode}`, 'WARNING');
        await sleep(CONFIG.POLL_INTERVAL);
        continue;
      }
      
      const status = response.body;
      log(`Status: ${status.status}, Stage 1: ${status.stages?.project_review?.status || 'unknown'}`);
      
      // Check if Stage 1 is complete
      if (status.stages?.project_review?.status === 'completed') {
        testState.timings.stage1 = Date.now() - startTime;
        testState.results.stage1 = {
          success: true,
          duration: testState.timings.stage1,
          attempts
        };
        
        log(`Stage 1 completed in ${(testState.timings.stage1 / 1000).toFixed(2)}s!`, 'SUCCESS');
        return true;
      }
      
      // Check for failure
      if (status.status === 'failed' || status.stages?.project_review?.status === 'failed') {
        throw new Error(`Stage 1 failed: ${status.errorMessage || 'Unknown error'}`);
      }
      
      await sleep(CONFIG.POLL_INTERVAL);
    }
    
    throw new Error(`Stage 1 timeout after ${CONFIG.STAGE1_TIMEOUT / 1000}s`);
  } catch (error) {
    log(`Stage 1 failed: ${error.message}`, 'ERROR');
    testState.results.stage1 = { success: false, error: error.message };
    return false;
  }
}

/**
 * Test 4: Get Stage 1 Results
 */
async function testGetStage1Results() {
  log('TEST 4: Fetching Stage 1 Results', 'PROGRESS');
  
  try {
    const response = await makeRequest(
      `${CONFIG.API_BASE_URL}/analysis/${testState.analysisId}`,
      {
        headers: {
          'Authorization': `Bearer ${testState.accessToken}`
        }
      }
    );
    
    if (response.statusCode !== 200) {
      throw new Error(`Failed to get results: ${response.statusCode}`);
    }
    
    const projectReview = response.body.projectReview;
    
    if (!projectReview) {
      throw new Error('No project review in response');
    }
    
    log(`Code Quality Score: ${projectReview.codeQuality?.overall || 'N/A'}/100`);
    log(`Architecture Score: ${projectReview.architectureClarity?.score || 'N/A'}/100`);
    log(`Employability Score: ${projectReview.employabilitySignal?.overall || 'N/A'}/100`);
    log(`Strengths: ${projectReview.strengths?.length || 0}`);
    log(`Weaknesses: ${projectReview.weaknesses?.length || 0}`);
    
    log('Stage 1 results retrieved successfully!', 'SUCCESS');
    return true;
  } catch (error) {
    log(`Failed to get Stage 1 results: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Test 5: Trigger Stage 2 (Intelligence Report)
 */
async function testTriggerStage2() {
  log('TEST 5: Triggering Stage 2 (Intelligence Report)', 'PROGRESS');
  const startTime = Date.now();
  
  try {
    log('Sending approval to continue to Stage 2...');
    
    const response = await makeRequest(
      `${CONFIG.API_BASE_URL}/analysis/${testState.analysisId}/continue-stage2`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testState.accessToken}`
        }
      }
    );
    
    if (response.statusCode !== 200) {
      throw new Error(`Failed to trigger Stage 2: ${response.statusCode}`);
    }
    
    log('Stage 2 triggered, waiting for completion...');
    
    // Wait for Stage 2 completion
    const timeout = Date.now() + CONFIG.STAGE2_TIMEOUT;
    let attempts = 0;
    
    while (Date.now() < timeout) {
      attempts++;
      await sleep(CONFIG.POLL_INTERVAL);
      
      const statusResponse = await makeRequest(
        `${CONFIG.API_BASE_URL}/analysis/${testState.analysisId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${testState.accessToken}`
          }
        }
      );
      
      const status = statusResponse.body;
      log(`Stage 2 status: ${status.stages?.intelligence_report?.status || 'unknown'}`);
      
      if (status.stages?.intelligence_report?.status === 'completed') {
        testState.timings.stage2 = Date.now() - startTime;
        testState.results.stage2 = {
          success: true,
          duration: testState.timings.stage2,
          attempts
        };
        
        log(`Stage 2 completed in ${(testState.timings.stage2 / 1000).toFixed(2)}s!`, 'SUCCESS');
        return true;
      }
      
      if (status.stages?.intelligence_report?.status === 'failed') {
        throw new Error('Stage 2 failed');
      }
    }
    
    throw new Error(`Stage 2 timeout after ${CONFIG.STAGE2_TIMEOUT / 1000}s`);
  } catch (error) {
    log(`Stage 2 failed: ${error.message}`, 'ERROR');
    testState.results.stage2 = { success: false, error: error.message };
    return false;
  }
}

/**
 * Test 6: Get Stage 2 Results
 */
async function testGetStage2Results() {
  log('TEST 6: Fetching Stage 2 Results', 'PROGRESS');
  
  try {
    const response = await makeRequest(
      `${CONFIG.API_BASE_URL}/analysis/${testState.analysisId}`,
      {
        headers: {
          'Authorization': `Bearer ${testState.accessToken}`
        }
      }
    );
    
    const intelligenceReport = response.body.intelligenceReport;
    
    if (!intelligenceReport) {
      throw new Error('No intelligence report in response');
    }
    
    log(`System Architecture layers: ${intelligenceReport.systemArchitecture?.layers?.length || 0}`);
    log(`Design Decisions: ${intelligenceReport.designDecisions?.length || 0}`);
    log(`Technical Tradeoffs: ${intelligenceReport.technicalTradeoffs?.length || 0}`);
    log(`Resume Bullets: ${intelligenceReport.resumeBullets?.length || 0}`);
    log(`Scalability Bottlenecks: ${intelligenceReport.scalabilityAnalysis?.bottlenecks?.length || 0}`);
    
    log('Stage 2 results retrieved successfully!', 'SUCCESS');
    return true;
  } catch (error) {
    log(`Failed to get Stage 2 results: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Test 7: Trigger Stage 3 (Interview Questions)
 */
async function testTriggerStage3() {
  log('TEST 7: Triggering Stage 3 (Interview Questions)', 'PROGRESS');
  const startTime = Date.now();
  
  try {
    log('Sending approval to continue to Stage 3...');
    
    const response = await makeRequest(
      `${CONFIG.API_BASE_URL}/analysis/${testState.analysisId}/continue-stage3`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testState.accessToken}`
        }
      }
    );
    
    if (response.statusCode !== 200) {
      throw new Error(`Failed to trigger Stage 3: ${response.statusCode}`);
    }
    
    log('Stage 3 triggered, waiting for completion...');
    
    // Wait for Stage 3 completion
    const timeout = Date.now() + CONFIG.STAGE3_TIMEOUT;
    let attempts = 0;
    
    while (Date.now() < timeout) {
      attempts++;
      await sleep(CONFIG.POLL_INTERVAL);
      
      const statusResponse = await makeRequest(
        `${CONFIG.API_BASE_URL}/analysis/${testState.analysisId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${testState.accessToken}`
          }
        }
      );
      
      const status = statusResponse.body;
      log(`Stage 3 status: ${status.stages?.interview_simulation?.status || 'unknown'}`);
      
      if (status.stages?.interview_simulation?.status === 'completed') {
        testState.timings.stage3 = Date.now() - startTime;
        testState.results.stage3 = {
          success: true,
          duration: testState.timings.stage3,
          attempts
        };
        
        log(`Stage 3 completed in ${(testState.timings.stage3 / 1000).toFixed(2)}s!`, 'SUCCESS');
        return true;
      }
      
      if (status.stages?.interview_simulation?.status === 'failed') {
        throw new Error('Stage 3 failed');
      }
    }
    
    throw new Error(`Stage 3 timeout after ${CONFIG.STAGE3_TIMEOUT / 1000}s`);
  } catch (error) {
    log(`Stage 3 failed: ${error.message}`, 'ERROR');
    testState.results.stage3 = { success: false, error: error.message };
    return false;
  }
}

/**
 * Test 8: Get Stage 3 Results (Question Bank)
 */
async function testGetStage3Results() {
  log('TEST 8: Fetching Stage 3 Results (Question Bank)', 'PROGRESS');
  
  try {
    const response = await makeRequest(
      `${CONFIG.API_BASE_URL}/analysis/${testState.analysisId}`,
      {
        headers: {
          'Authorization': `Bearer ${testState.accessToken}`
        }
      }
    );
    
    const interviewSimulation = response.body.interviewSimulation;
    
    if (!interviewSimulation) {
      throw new Error('No interview simulation in response');
    }
    
    const questions = interviewSimulation.questions || [];
    log(`Total Questions: ${questions.length}`);
    
    // Category breakdown
    const categories = {};
    questions.forEach(q => {
      categories[q.category] = (categories[q.category] || 0) + 1;
    });
    
    log('Category Breakdown:');
    for (const [cat, count] of Object.entries(categories)) {
      log(`  ${cat}: ${count} questions`);
    }
    
    // Save first question ID for answer test
    if (questions.length > 0) {
      testState.questionId = questions[0].questionId;
      log(`Sample Question: ${questions[0].question.substring(0, 80)}...`);
    }
    
    log('Stage 3 results retrieved successfully!', 'SUCCESS');
    return true;
  } catch (error) {
    log(`Failed to get Stage 3 results: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Test 9: Start Interview Session
 */
async function testStartInterview() {
  log('TEST 9: Starting Interview Session', 'PROGRESS');
  
  try {
    log('Creating new interview session...');
    
    const response = await makeRequest(
      `${CONFIG.API_BASE_URL}/interview/sessions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testState.accessToken}`
        },
        body: {
          analysisId: testState.analysisId
        }
      }
    );
    
    if (response.statusCode !== 200) {
      throw new Error(`Failed to start session: ${response.statusCode}`);
    }
    
    testState.sessionId = response.body.sessionId;
    
    if (!testState.sessionId) {
      throw new Error('No sessionId in response');
    }
    
    testState.results.interview = {
      success: true,
      sessionId: testState.sessionId
    };
    
    log(`Interview session started! Session ID: ${testState.sessionId}`, 'SUCCESS');
    return true;
  } catch (error) {
    log(`Failed to start interview: ${error.message}`, 'ERROR');
    testState.results.interview = { success: false, error: error.message };
    return false;
  }
}

/**
 * Test 10: Submit Answer & Get Evaluation
 */
async function testAnswerEvaluation() {
  log('TEST 10: Submitting Answer & Getting Evaluation', 'PROGRESS');
  const startTime = Date.now();
  
  try {
    if (!testState.questionId) {
      throw new Error('No question ID available');
    }
    
    log('Submitting sample answer...');
    
    // Sample answer for testing
    const sampleAnswer = `I implemented this feature using a REST API architecture with JWT authentication. 
The main considerations were scalability and security. I chose to use stateless authentication to enable 
horizontal scaling across multiple server instances. The trade-off is that we can't revoke tokens 
server-side without additional infrastructure like Redis. For this project, I mitigated this by using 
short-lived tokens (15 minutes) combined with refresh tokens. The implementation follows industry best 
practices including HTTPS-only, httpOnly cookies to prevent XSS attacks, and rate limiting to prevent 
brute force attacks.`;
    
    const response = await makeRequest(
      `${CONFIG.API_BASE_URL}/interview/sessions/${testState.sessionId}/answer`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testState.accessToken}`
        },
        body: {
          questionId: testState.questionId,
          answer: sampleAnswer,
          timeSpentSeconds: 120
        }
      }
    );
    
    if (response.statusCode !== 200) {
      throw new Error(`Failed to submit answer: ${response.statusCode} - ${JSON.stringify(response.body)}`);
    }
    
    const evaluation = response.body.evaluation;
    
    if (!evaluation) {
      throw new Error('No evaluation in response');
    }
    
    testState.timings.evaluation = Date.now() - startTime;
    testState.results.evaluation = {
      success: true,
      score: evaluation.overallScore,
      duration: testState.timings.evaluation
    };
    
    log(`Answer evaluated!`, 'SUCCESS');
    log(`Overall Score: ${evaluation.overallScore}/100`);
    log(`Technical Accuracy: ${evaluation.criteriaScores?.technicalAccuracy || 'N/A'}/100`);
    log(`Completeness: ${evaluation.criteriaScores?.completeness || 'N/A'}/100`);
    log(`Clarity: ${evaluation.criteriaScores?.clarity || 'N/A'}/100`);
    log(`Hiring Recommendation: ${evaluation.hiringRecommendation || 'N/A'}`);
    
    if (evaluation.strengths?.length > 0) {
      log(`Strengths: ${evaluation.strengths[0]}`);
    }
    
    if (evaluation.weaknesses?.length > 0) {
      log(`Weaknesses: ${evaluation.weaknesses[0]}`);
    }
    
    return true;
  } catch (error) {
    log(`Answer evaluation failed: ${error.message}`, 'ERROR');
    testState.results.evaluation = { success: false, error: error.message };
    return false;
  }
}

/**
 * Test 11: Check Cost Tracking APIs
 */
async function testCostTracking() {
  log('TEST 11: Checking Cost Tracking APIs', 'PROGRESS');
  
  try {
    // Test 1: Get analysis cost
    log('Fetching analysis cost data...');
    
    const costResponse = await makeRequest(
      `${CONFIG.API_BASE_URL}/cost/analysis/${testState.analysisId}`,
      {
        headers: {
          'Authorization': `Bearer ${testState.accessToken}`
        }
      }
    );
    
    if (costResponse.statusCode !== 200) {
      throw new Error(`Failed to get cost data: ${costResponse.statusCode}`);
    }
    
    const cost = costResponse.body.cost;
    log(`Total Cost: $${cost.totalCostUsd || 0}`);
    log(`Bedrock Tokens In: ${cost.bedrockTokensIn || 0}`);
    log(`Bedrock Tokens Out: ${cost.bedrockTokensOut || 0}`);
    log(`Bedrock Cost: $${cost.bedrockCostUsd || 0}`);
    log(`Lambda Cost: $${cost.lambdaCostUsd || 0}`);
    
    // Test 2: Get realtime metrics
    log('Fetching realtime cost metrics...');
    
    const realtimeResponse = await makeRequest(
      `${CONFIG.API_BASE_URL}/cost/realtime`,
      {
        headers: {
          'Authorization': `Bearer ${testState.accessToken}`
        }
      }
    );
    
    if (realtimeResponse.statusCode === 200) {
      const realtime = realtimeResponse.body;
      log(`Today's Total: $${realtime.today?.totalCost || 0}`);
      log(`Today's Analyses: ${realtime.today?.totalAnalyses || 0}`);
      log(`This Month: $${realtime.thisMonth?.totalCost || 0}`);
      log(`This Month Analyses: ${realtime.thisMonth?.totalAnalyses || 0}`);
      log(`Projected End of Month: $${realtime.thisMonth?.projectedEndOfMonth || 0}`);
    }
    
    // Test 3: Get cost breakdown
    log('Fetching cost breakdown...');
    
    const breakdownResponse = await makeRequest(
      `${CONFIG.API_BASE_URL}/cost/breakdown`,
      {
        headers: {
          'Authorization': `Bearer ${testState.accessToken}`
        }
      }
    );
    
    if (breakdownResponse.statusCode === 200) {
      const breakdown = breakdownResponse.body;
      log(`Total Analyses: ${breakdown.totalAnalyses || 0}`);
      log(`Total Cost: $${breakdown.totalCost || 0}`);
      log(`Average Cost per Analysis: $${breakdown.averageCostPerAnalysis || 0}`);
      
      if (breakdown.byStage) {
        log('Cost by Stage:');
        for (const [stage, data] of Object.entries(breakdown.byStage)) {
          log(`  ${stage}: $${data.totalCost || 0} (${data.count || 0} runs)`);
        }
      }
    }
    
    testState.results.cost = {
      success: true,
      totalCost: cost.totalCostUsd,
      totalTokens: cost.bedrockTokensIn + cost.bedrockTokensOut
    };
    
    log('Cost tracking APIs verified!', 'SUCCESS');
    return true;
  } catch (error) {
    log(`Cost tracking check failed: ${error.message}`, 'ERROR');
    testState.results.cost = { success: false, error: error.message };
    return false;
  }
}

/**
 * Test 12: Verify Data Integrity
 */
async function testDataIntegrity() {
  log('TEST 11: Verifying Data Integrity', 'PROGRESS');
  
  try {
    log('Fetching complete analysis data...');
    
    const response = await makeRequest(
      `${CONFIG.API_BASE_URL}/analysis/${testState.analysisId}`,
      {
        headers: {
          'Authorization': `Bearer ${testState.accessToken}`
        }
      }
    );
    
    if (response.statusCode !== 200) {
      throw new Error(`Failed to get analysis: ${response.statusCode}`);
    }
    
    const analysis = response.body;
    
    // Verify all stages present
    const checks = [
      { name: 'Analysis metadata', present: !!analysis.analysis?.analysisId },
      { name: 'Repository metadata', present: !!analysis.repository },
      { name: 'Project review', present: !!analysis.projectReview },
      { name: 'Intelligence report', present: !!analysis.intelligenceReport },
      { name: 'Interview simulation', present: !!analysis.interviewSimulation },
      { name: 'Code quality scores', present: !!analysis.projectReview?.codeQuality },
      { name: 'System architecture', present: !!analysis.intelligenceReport?.systemArchitecture },
      { name: 'Question bank', present: !!analysis.interviewSimulation?.questions }
    ];
    
    let allPassed = true;
    
    for (const check of checks) {
      if (check.present) {
        log(`✓ ${check.name}`, 'SUCCESS');
      } else {
        log(`✗ ${check.name} MISSING`, 'ERROR');
        allPassed = false;
      }
    }
    
    if (allPassed) {
      log('All data integrity checks passed!', 'SUCCESS');
      return true;
    } else {
      log('Some data integrity checks failed!', 'WARNING');
      return false;
    }
  } catch (error) {
    log(`Data integrity verification failed: ${error.message}`, 'ERROR');
    return false;
  }
}

// ============================================================================
// TEST SUMMARY
// ============================================================================

function printSummary() {
  const totalTime = (Date.now() - testState.startTime) / 1000;
  
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  
  console.log(`\nTotal Test Duration: ${totalTime.toFixed(2)}s`);
  console.log(`Analysis ID: ${testState.analysisId || 'N/A'}`);
  console.log(`Session ID: ${testState.sessionId || 'N/A'}`);
  
  console.log('\n📊 Stage Timings:');
  if (testState.timings.stage1) {
    console.log(`  Stage 1 (Project Review): ${(testState.timings.stage1 / 1000).toFixed(2)}s`);
  }
  if (testState.timings.stage2) {
    console.log(`  Stage 2 (Intelligence): ${(testState.timings.stage2 / 1000).toFixed(2)}s`);
  }
  if (testState.timings.stage3) {
    console.log(`  Stage 3 (Questions): ${(testState.timings.stage3 / 1000).toFixed(2)}s`);
  }
  if (testState.timings.evaluation) {
    console.log(`  Answer Evaluation: ${(testState.timings.evaluation / 1000).toFixed(2)}s`);
  }
  
  console.log('\n✅ Test Results:');
  let passed = 0;
  let failed = 0;
  
  for (const [test, result] of Object.entries(testState.results)) {
    if (result) {
      if (result.success) {
        console.log(`  ✓ ${test}: PASSED`);
        passed++;
      } else {
        console.log(`  ✗ ${test}: FAILED - ${result.error || 'Unknown error'}`);
        failed++;
      }
    }
  }
  
  console.log(`\nTotal: ${passed} passed, ${failed} failed`);
  
  if (testState.results.evaluation?.score) {
    console.log(`\n🎯 Answer Score: ${testState.results.evaluation.score}/100`);
  }
  
  console.log('\n' + '='.repeat(80));
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! 🎉');
  } else {
    console.log(`⚠️  ${failed} TEST(S) FAILED`);
  }
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('DevContext AI - Complete End-to-End Test Suite');
  console.log('='.repeat(80) + '\n');
  
  log(`API Base URL: ${CONFIG.API_BASE_URL}`);
  log(`Test Repository: ${CONFIG.TEST_REPO_URL}`);
  log('Starting tests...\n');
  
  try {
    // Test 1: Authentication
    if (!await testAuthentication()) {
      throw new Error('Authentication failed - stopping tests');
    }
    await sleep(1000);
    
    // Test 2: Submit Analysis
    if (!await testAnalyzeSubmit()) {
      throw new Error('Analysis submission failed - stopping tests');
    }
    await sleep(2000);
    
    // Test 3: Wait for Stage 1
    if (!await testStage1Completion()) {
      throw new Error('Stage 1 failed - stopping tests');
    }
    await sleep(1000);
    
    // Test 4: Get Stage 1 Results
    await testGetStage1Results();
    await sleep(2000);
    
    // Test 5: Trigger Stage 2
    if (!await testTriggerStage2()) {
      log('Stage 2 failed - continuing with partial results', 'WARNING');
    } else {
      await sleep(1000);
      
      // Test 6: Get Stage 2 Results
      await testGetStage2Results();
      await sleep(2000);
    }
    
    // Test 7: Trigger Stage 3
    if (!await testTriggerStage3()) {
      log('Stage 3 failed - continuing with partial results', 'WARNING');
    } else {
      await sleep(1000);
      
      // Test 8: Get Stage 3 Results
      await testGetStage3Results();
      await sleep(2000);
    }
    
    // Test 9: Start Interview
    if (testState.questionId && await testStartInterview()) {
      await sleep(1000);
      
      // Test 10: Answer Evaluation
      await testAnswerEvaluation();
      await sleep(1000);
    }
    
    // Test 11: Cost Tracking
    await testCostTracking();
    await sleep(1000);
    
    // Test 12: Data Integrity
    await testDataIntegrity();
    
  } catch (error) {
    log(`Critical error: ${error.message}`, 'ERROR');
  }
  
  // Print summary
  printSummary();
  
  // Exit with appropriate code
  const allSuccess = Object.values(testState.results).every(r => r === null || r.success);
  process.exit(allSuccess ? 0 : 1);
}

// ============================================================================
// RUN TESTS
// ============================================================================

if (require.main === module) {
  runAllTests().catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = { runAllTests, testState };
