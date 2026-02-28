import { APIGatewayProxyHandler } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import * as DB from './db-utils';

const lambdaClient = new LambdaClient({});

const REPO_PROCESSOR_FUNCTION = process.env.REPO_PROCESSOR_FUNCTION;
const STAGE1_FUNCTION = process.env.STAGE1_FUNCTION;
const STAGE2_FUNCTION = process.env.STAGE2_FUNCTION;
const STAGE3_FUNCTION = process.env.STAGE3_FUNCTION;

if (!REPO_PROCESSOR_FUNCTION || !STAGE1_FUNCTION || !STAGE2_FUNCTION || !STAGE3_FUNCTION) {
  throw new Error('Missing required Lambda function environment variables');
}

export const handler: APIGatewayProxyHandler = async (event, context) => {
  const path = event.path;
  const method = event.httpMethod;
  
  try {
    // Log event for audit
    console.log(`Request: ${method} ${path}`);
    
    if (path === '/analyze' && method === 'POST') {
      return await handleAnalyze(event, context);
    }
    
    if (path === '/analyses' && method === 'GET') {
      return await handleListAnalyses(event);
    }
    
    if (path.startsWith('/analysis/') && method === 'GET' && !path.endsWith('/status')) {
      return await handleGetAnalysis(event);
    }
    
    if (path.endsWith('/status') && method === 'GET') {
      return await handleGetStatus(event);
    }
    
    if (path.endsWith('/events') && method === 'GET') {
      return await handleGetEvents(event);
    }
    
    if (path.endsWith('/cost') && method === 'GET') {
      return await handleGetCost(event);
    }
    
    if (path.startsWith('/analysis/') && method === 'DELETE') {
      return await handleDeleteAnalysis(event);
    }
    
    // Progressive workflow endpoints
    if (path.endsWith('/continue-stage2') && method === 'POST') {
      return await handleContinueStage2(event, context);
    }
    
    if (path.endsWith('/continue-stage3') && method === 'POST') {
      return await handleContinueStage3(event, context);
    }
    
    // User profile endpoints
    if (path === '/user/profile' && method === 'GET') {
      return await handleGetUserProfile(event);
    }
    
    if (path === '/user/profile' && method === 'POST') {
      return await handleCreateUserProfile(event);
    }
    
    if (path === '/user/preferences' && method === 'PATCH') {
      return await handleUpdatePreferences(event);
    }
    
    if (path === '/user/stats' && method === 'GET') {
      return await handleGetUserStats(event);
    }
    
    if (path === '/user/progress' && method === 'GET') {
      return await handleGetUserProgress(event);
    }
    
    // File management endpoints
    if (path.match(/\/analysis\/[^/]+\/files$/) && method === 'GET') {
      return await handleGetFiles(event);
    }
    
    if (path.endsWith('/files/selection') && method === 'PUT') {
      return await handleUpdateFileSelection(event);
    }
    
    if (path.endsWith('/files/reorder') && method === 'POST') {
      return await handleReorderFiles(event);
    }
    
    if (path.endsWith('/reprocess') && method === 'POST') {
      return await handleReprocess(event);
    }
    
    // Interview session endpoints
    if (path === '/interview/sessions' && method === 'POST') {
      return await handleCreateInterviewSession(event, context);
    }
    
    if (path.match(/\/interview\/sessions\/[^/]+$/) && method === 'GET') {
      return await handleGetInterviewSession(event);
    }
    
    if (path.endsWith('/answer') && method === 'POST') {
      return await handleSubmitAnswer(event, context);
    }
    
    if (path.endsWith('/complete') && method === 'POST') {
      return await handleCompleteSession(event, context);
    }
    
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found' })
    };
    
  } catch (error) {
    console.error('Orchestrator error:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

async function handleAnalyze(event: any, context: any) {
  const body = JSON.parse(event.body || '{}');
  const { repositoryUrl } = body;
  
  if (!repositoryUrl) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'repositoryUrl is required' })
    };
  }
  
  // Extract userId from Cognito JWT
  const userId = event.requestContext?.authorizer?.claims?.sub || 'demo-user';
  
  // Check user profile and quota
  const userProfile = await DB.getUserProfile(userId);
  
  if (!userProfile) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'User profile not found' })
    };
  }
  
  // Check quota
  if (userProfile.subscription.analysisUsed >= userProfile.subscription.analysisQuota) {
    return {
      statusCode: 429,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Analysis quota exceeded',
        quota: userProfile.subscription.analysisQuota,
        used: userProfile.subscription.analysisUsed,
        resetAt: userProfile.subscription.resetAt
      })
    };
  }
  
  // Check for active analyses
  const activeAnalyses = await DB.getUserAnalyses(userId, 10);
  const hasActiveAnalysis = activeAnalyses.items.some((a: any) => a.status === 'processing');
  
  if (hasActiveAnalysis) {
    return {
      statusCode: 429,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'You already have an analysis in progress. Please wait for it to complete.'
      })
    };
  }
  
  const repositoryName = repositoryUrl.split('/').pop() || 'unknown';
  
  // Create analysis using db-utils
  const analysis = await DB.createAnalysis({
    userId,
    repositoryUrl,
    repositoryName
  });
  
  // Log event
  await DB.logAnalysisEvent(analysis.analysisId, 'analysis_initiated', {
    repositoryUrl,
    repositoryName
  }, context);
  
  // Background processing
  processAnalysisPipeline(analysis.analysisId, repositoryUrl, context);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisId: analysis.analysisId,
      status: 'initiated',
      estimatedCompletionTime: 90,
      cost: {
        estimatedCostUsd: 0.15
      }
    })
  };
}

// PROGRESSIVE WORKFLOW: Only run Stage 1 automatically
async function processAnalysisPipeline(analysisId: string, repositoryUrl: string, context: any) {
  try {
    console.log(`Starting pipeline for analysis: ${analysisId}`);
    
    // Update status to processing
    await DB.updateAnalysisStatus(analysisId, 'processing');
    await DB.logAnalysisEvent(analysisId, 'pipeline_started', {}, context);
    
    // Step 1: Repository Processing
    await DB.logAnalysisEvent(analysisId, 'repo_processing_started', {}, context);
    const repoResult = await invokeAsync(REPO_PROCESSOR_FUNCTION!, {
      analysisId,
      repositoryUrl
    });
    
    if (!repoResult.success) {
      throw new Error(repoResult.error || 'Repository processing failed');
    }
    
    console.log('Repository processed. Token budget:', repoResult.budgetStats);
    await DB.logAnalysisEvent(analysisId, 'repo_processing_completed', {
      budgetStats: repoResult.budgetStats
    }, context);
    
    // Save repository metadata
    await DB.saveRepositoryMetadata(analysisId, {
      totalFiles: repoResult.projectContextMap.totalFiles,
      totalSizeBytes: repoResult.projectContextMap.totalSize,
      languages: repoResult.projectContextMap.languages || {},
      frameworks: repoResult.projectContextMap.frameworks,
      entryPoints: repoResult.projectContextMap.entryPoints,
      coreModules: repoResult.projectContextMap.coreModules,
      commits: repoResult.commitStats || {
        totalCount: 0,
        firstCommitDate: '',
        lastCommitDate: '',
        commitFrequency: 0,
        contributors: 0,
        authenticityScore: 0,
        authenticityFlags: []
      },
      fileTiers: {
        tier1: repoResult.projectContextMap.entryPoints,
        tier2: repoResult.projectContextMap.coreModules,
        tier3: [],
        tier4: []
      },
      tokenBudget: repoResult.budgetStats,
      s3Key: repoResult.s3Key,
      processedAt: new Date().toISOString(),
      processingDurationMs: 0
    });
    
    // ONLY RUN STAGE 1 - User decides if they want Stage 2/3
    const startTime = Date.now();
    
    await DB.updateStageStatus(analysisId, 'project_review', {
      status: 'processing',
      startedAt: new Date().toISOString()
    });
    
    const stage1Result = await invokeAsync(STAGE1_FUNCTION!, {
      analysisId,
      projectContextMap: repoResult.projectContextMap,
      s3Key: repoResult.s3Key,
      codeContext: repoResult.codeContext
    });
    
    const duration = Date.now() - startTime;
    console.log('Stage 1 completed');
    
    await DB.updateStageStatus(analysisId, 'project_review', {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: duration
    });
    
    await DB.logAnalysisEvent(analysisId, 'stage_completed', {
      stage: 'project_review',
      durationMs: duration
    }, context);
    
    // Update workflow state to awaiting user approval
    await DB.updateWorkflowState(analysisId, 'stage1_complete_awaiting_approval');
    await DB.logAnalysisEvent(analysisId, 'stage1_complete_awaiting_user', {}, context);
    
    console.log(`Stage 1 complete for ${analysisId}. Awaiting user decision.`);
    
  } catch (error) {
    console.error('Pipeline failed:', error);
    
    // Mark as failed
    await DB.updateAnalysisStatus(
      analysisId,
      'failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
    await DB.logAnalysisEvent(analysisId, 'analysis_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    }, context);
  }
}

async function handleListAnalyses(event: any) {
  const userId = event.requestContext?.authorizer?.claims?.sub || 'demo-user';
  const limit = parseInt(event.queryStringParameters?.limit || '20');
  const cursor = event.queryStringParameters?.cursor;
  
  const result = await DB.getUserAnalyses(
    userId,
    limit,
    cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined
  );
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  };
}

async function handleGetAnalysis(event: any) {
  const analysisId = event.pathParameters?.id;
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  const result = await DB.getFullAnalysis(analysisId);
  
  if (!result) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  };
}

async function handleGetStatus(event: any) {
  const analysisId = event.pathParameters?.id;
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  const analysis = await DB.getAnalysis(analysisId);
  
  if (!analysis) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }
  
  // Calculate progress based on stages
  const stages = analysis.stages;
  const completedStages = Object.values(stages).filter((s: any) => s.status === 'completed').length;
  const progress = Math.round((completedStages / 3) * 100);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisId: analysis.analysisId,
      status: analysis.status,
      workflowState: analysis.workflowState,
      progress,
      stages: {
        project_review: {
          status: stages.project_review.status,
          progress: stages.project_review.status === 'completed' ? 100 : 
                   stages.project_review.status === 'processing' ? 50 : 0,
          startedAt: stages.project_review.startedAt,
          completedAt: stages.project_review.completedAt
        },
        intelligence_report: {
          status: stages.intelligence_report.status,
          progress: stages.intelligence_report.status === 'completed' ? 100 :
                   stages.intelligence_report.status === 'processing' ? 50 : 0,
          startedAt: stages.intelligence_report.startedAt,
          completedAt: stages.intelligence_report.completedAt
        },
        interview_simulation: {
          status: stages.interview_simulation.status,
          progress: stages.interview_simulation.status === 'completed' ? 100 :
                   stages.interview_simulation.status === 'processing' ? 50 : 0,
          startedAt: stages.interview_simulation.startedAt,
          completedAt: stages.interview_simulation.completedAt
        }
      },
      errorMessage: analysis.errorMessage
    })
  };
}

async function handleGetEvents(event: any) {
  const analysisId = event.pathParameters?.id;
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  const events = await DB.getAnalysisEvents(analysisId);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events })
  };
}

async function handleGetCost(event: any) {
  const analysisId = event.pathParameters?.id;
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  const analysis = await DB.getAnalysis(analysisId);
  
  if (!analysis) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analysis.cost)
  };
}

async function handleDeleteAnalysis(event: any) {
  const analysisId = event.pathParameters?.id;
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  try {
    await DB.deleteAnalysis(analysisId);
    
    return {
      statusCode: 204,
      headers: { 'Content-Type': 'application/json' },
      body: ''
    };
  } catch (error) {
    console.error('Delete failed:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to delete analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

async function invokeAsync(functionName: string, payload: any): Promise<any> {
  console.log(`Invoking ${functionName} with payload:`, JSON.stringify(payload).substring(0, 200));
  
  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload)
  });
  
  const response = await lambdaClient.send(command);
  
  if (response.FunctionError) {
    throw new Error(`Lambda invocation failed: ${response.FunctionError}`);
  }
  
  const lambdaResponse = JSON.parse(new TextDecoder().decode(response.Payload));
  
  // Handle API Gateway-wrapped responses
  if (lambdaResponse.body && typeof lambdaResponse.body === 'string') {
    return JSON.parse(lambdaResponse.body);
  }
  
  return lambdaResponse;
}


// ============================================================================
// PROGRESSIVE WORKFLOW HANDLERS
// ============================================================================

/**
 * POST /analysis/{analysisId}/continue-stage2
 * User decides to continue to Stage 2 (Intelligence Report)
 */
async function handleContinueStage2(event: any, context: any) {
  const analysisId = event.pathParameters?.id;
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  const analysis = await DB.getAnalysis(analysisId);
  
  if (!analysis) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }
  
  // Check if Stage 1 is complete
  if (analysis.stages.project_review.status !== 'completed') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Stage 1 must be completed first' })
    };
  }
  
  // Check if Stage 2 already completed
  if (analysis.stages.intelligence_report.status === 'completed') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Stage 2 already completed',
        status: 'completed'
      })
    };
  }
  
  // Start Stage 2 in background
  processStage2(analysisId, context);
  
  // Update workflow state to indicate Stage 2 is now in progress
  await DB.updateWorkflowState(analysisId, 'stage2_pending');
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisId,
      message: 'Stage 2 (Intelligence Report) started',
      status: 'processing',
      estimatedCompletionTime: 120
    })
  };
}

/**
 * POST /analysis/{analysisId}/continue-stage3
 * User decides to continue to Stage 3 (Interview Questions)
 */
async function handleContinueStage3(event: any, context: any) {
  const analysisId = event.pathParameters?.id;
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  const analysis = await DB.getAnalysis(analysisId);
  
  if (!analysis) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }
  
  // Check if Stage 2 is complete
  if (analysis.stages.intelligence_report.status !== 'completed') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Stage 2 must be completed first' })
    };
  }
  
  // Check if Stage 3 already completed
  if (analysis.stages.interview_simulation.status === 'completed') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Stage 3 already completed',
        status: 'completed'
      })
    };
  }
  
  // Start Stage 3 in background
  processStage3(analysisId, context);
  
  // Update workflow state to indicate Stage 3 is now in progress
  await DB.updateWorkflowState(analysisId, 'stage3_pending');
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisId,
      message: 'Stage 3 (Interview Questions) started',
      status: 'processing',
      estimatedCompletionTime: 90
    })
  };
}

async function processStage2(analysisId: string, context: any) {
  try {
    console.log(`Starting Stage 2 for analysis: ${analysisId}`);
    
    await DB.updateStageStatus(analysisId, 'intelligence_report', {
      status: 'processing',
      startedAt: new Date().toISOString()
    });
    
    await DB.logAnalysisEvent(analysisId, 'stage2_started', {}, context);
    
    // Get repository metadata for Stage 2
    const repoMetadata = await DB.getRepositoryMetadata(analysisId);
    
    const startTime = Date.now();
    
    const stage2Result = await invokeAsync(STAGE2_FUNCTION!, {
      analysisId,
      projectContextMap: {
        totalFiles: repoMetadata.totalFiles,
        frameworks: repoMetadata.frameworks,
        entryPoints: repoMetadata.entryPoints,
        coreModules: repoMetadata.coreModules
      },
      s3Key: repoMetadata.s3Key
    });
    
    const duration = Date.now() - startTime;
    
    await DB.updateStageStatus(analysisId, 'intelligence_report', {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: duration
    });
    
    await DB.logAnalysisEvent(analysisId, 'stage_completed', {
      stage: 'intelligence_report',
      durationMs: duration
    }, context);
    
    await DB.updateWorkflowState(analysisId, 'stage2_complete_awaiting_approval');
    
    console.log(`Stage 2 complete for ${analysisId}`);
    
  } catch (error) {
    console.error('Stage 2 failed:', error);
    
    await DB.updateStageStatus(analysisId, 'intelligence_report', {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    
    await DB.logAnalysisEvent(analysisId, 'stage2_failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, context);
  }
}

async function processStage3(analysisId: string, context: any) {
  try {
    console.log(`Starting Stage 3 for analysis: ${analysisId}`);
    
    await DB.updateStageStatus(analysisId, 'interview_simulation', {
      status: 'processing',
      startedAt: new Date().toISOString()
    });
    
    await DB.logAnalysisEvent(analysisId, 'stage3_started', {}, context);
    
    // Get repository metadata for Stage 3
    const repoMetadata = await DB.getRepositoryMetadata(analysisId);
    
    const startTime = Date.now();
    
    const stage3Result = await invokeAsync(STAGE3_FUNCTION!, {
      analysisId,
      projectContextMap: {
        totalFiles: repoMetadata.totalFiles,
        frameworks: repoMetadata.frameworks,
        entryPoints: repoMetadata.entryPoints,
        coreModules: repoMetadata.coreModules
      },
      s3Key: repoMetadata.s3Key
    });
    
    const duration = Date.now() - startTime;
    
    await DB.updateStageStatus(analysisId, 'interview_simulation', {
      status: 'completed',
      completedAt: new Date().toISOString(),
      durationMs: duration
    });
    
    await DB.logAnalysisEvent(analysisId, 'stage_completed', {
      stage: 'interview_simulation',
      durationMs: duration
    }, context);
    
    await DB.updateAnalysisStatus(analysisId, 'completed');
    await DB.updateWorkflowState(analysisId, 'all_complete');
    
    console.log(`Stage 3 complete for ${analysisId}`);
    
  } catch (error) {
    console.error('Stage 3 failed:', error);
    
    await DB.updateStageStatus(analysisId, 'interview_simulation', {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });
    
    await DB.logAnalysisEvent(analysisId, 'stage3_failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    }, context);
  }
}

// ============================================================================
// USER PROFILE HANDLERS
// ============================================================================

/**
 * GET /user/profile
 */
async function handleGetUserProfile(event: any) {
  const userId = event.requestContext?.authorizer?.claims?.sub || 'demo-user';
  
  const profile = await DB.getUserProfile(userId);
  
  if (!profile) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'User profile not found' })
    };
  }
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  };
}

/**
 * POST /user/profile
 */
async function handleCreateUserProfile(event: any) {
  const userId = event.requestContext?.authorizer?.claims?.sub || 'demo-user';
  const email = event.requestContext?.authorizer?.claims?.email || 'user@example.com';
  const body = JSON.parse(event.body || '{}');
  
  const { displayName, targetRole, language, githubConnected } = body;
  
  const profile = await DB.createUserProfile({
    userId,
    email,
    displayName: displayName || 'User',
    targetRole: targetRole || 'Full Stack Developer',
    language: language || 'en',
    githubConnected: githubConnected || false
  });
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile)
  };
}

/**
 * PATCH /user/preferences
 */
async function handleUpdatePreferences(event: any) {
  const userId = event.requestContext?.authorizer?.claims?.sub || 'demo-user';
  const body = JSON.parse(event.body || '{}');
  
  const updated = await DB.updateUserPreferences(userId, body);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated)
  };
}

/**
 * GET /user/stats
 */
async function handleGetUserStats(event: any) {
  const userId = event.requestContext?.authorizer?.claims?.sub || 'demo-user';
  
  const stats = await DB.getUserStats(userId);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stats)
  };
}

/**
 * GET /user/progress
 */
async function handleGetUserProgress(event: any) {
  const userId = event.requestContext?.authorizer?.claims?.sub || 'demo-user';
  
  const progress = await DB.getUserProgress(userId);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(progress)
  };
}

// ============================================================================
// INTERVIEW SESSION HANDLERS
// ============================================================================

/**
 * POST /interview/sessions
 */
async function handleCreateInterviewSession(event: any, context: any) {
  const body = JSON.parse(event.body || '{}');
  const { analysisId, config } = body;
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  const userId = event.requestContext?.authorizer?.claims?.sub || 'demo-user';
  
  // Get interview questions from analysis
  const analysis = await DB.getFullAnalysis(analysisId);
  
  if (!analysis || !analysis.interviewSimulation) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Interview questions not found. Complete Stage 3 first.' })
    };
  }
  
  const session = await DB.createInterviewSession({
    userId,
    analysisId,
    config: config || {
      targetRole: 'Full Stack Developer',
      difficulty: 'mixed',
      timeLimit: 60,
      feedbackMode: 'immediate'
    },
    totalQuestions: analysis.interviewSimulation.questions.length
  });
  
  await DB.logAnalysisEvent(analysisId, 'interview_session_created', {
    sessionId: session.sessionId
  }, context);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session)
  };
}

/**
 * GET /interview/sessions/{sessionId}
 */
async function handleGetInterviewSession(event: any) {
  const sessionId = event.pathParameters?.sessionId;
  
  if (!sessionId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'sessionId is required' })
    };
  }
  
  const session = await DB.getInterviewSession(sessionId);
  
  if (!session) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Session not found' })
    };
  }
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session)
  };
}

/**
 * POST /interview/sessions/{sessionId}/answer
 */
async function handleSubmitAnswer(event: any, context: any) {
  const sessionId = event.pathParameters?.sessionId;
  const body = JSON.parse(event.body || '{}');
  const { questionId, answer, timeSpentSeconds } = body;
  
  if (!sessionId || !questionId || !answer) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'sessionId, questionId, and answer are required' })
    };
  }
  
  // Get session and question
  const session = await DB.getInterviewSession(sessionId);
  
  if (!session) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Session not found' })
    };
  }
  
  // Validate session is active
  if (session.status !== 'active') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Session is not active',
        status: session.status
      })
    };
  }
  
  // Get the question from analysis
  const analysis = await DB.getFullAnalysis(session.analysisId);
  
  if (!analysis || !analysis.interviewSimulation) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Interview questions not found' })
    };
  }
  
  const question = analysis.interviewSimulation.questions.find((q: any) => q.questionId === questionId);
  
  if (!question) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Question not found' })
    };
  }
  
  // Evaluate answer using AI (call answer evaluation Lambda)
  const evaluation = await evaluateAnswer(question, answer);
  
  // Get previous attempts for this question to calculate improvement
  const allAttempts = await DB.getSessionAttempts(sessionId);
  const previousAttempts = allAttempts.filter((a: any) => a.questionId === questionId);
  
  let improvementFromPrevious = 0;
  if (previousAttempts.length > 0) {
    // Sort by submission time to get the most recent previous attempt
    previousAttempts.sort((a: any, b: any) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    const lastAttempt = previousAttempts[0];
    improvementFromPrevious = evaluation.overallScore - (lastAttempt.evaluation?.overallScore || 0);
  }
  
  // Save attempt
  const attempt = await DB.saveInterviewAttempt({
    sessionId,
    questionId,
    userAnswer: answer,
    timeSpentSeconds: timeSpentSeconds || 0,
    evaluation
  });
  
  // Update session progress
  await DB.updateSessionProgress(sessionId, {
    questionsAnswered: session.progress.questionsAnswered + 1,
    averageScore: calculateAverageScore(session, evaluation.overallScore),
    totalTimeSpentSeconds: session.progress.totalTimeSpentSeconds + (timeSpentSeconds || 0)
  });
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attemptId: attempt.attemptId,
      questionId,
      evaluation,
      improvementFromPrevious
    })
  };
}

/**
 * POST /interview/sessions/{sessionId}/complete
 */
async function handleCompleteSession(event: any, context: any) {
  const sessionId = event.pathParameters?.sessionId;
  
  if (!sessionId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'sessionId is required' })
    };
  }
  
  const session = await DB.getInterviewSession(sessionId);
  
  if (!session) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Session not found' })
    };
  }
  
  // Get all attempts for this session
  const attempts = await DB.getSessionAttempts(sessionId);
  
  // Calculate category performance
  const categoryPerformance = calculateCategoryPerformance(attempts);
  
  // Generate improvement areas
  const improvementAreas = identifyImprovementAreas(attempts);
  
  // Complete session
  const completedSession = await DB.completeInterviewSession(sessionId, {
    totalQuestions: session.totalQuestions,
    questionsAnswered: session.progress.questionsAnswered,
    questionsSkipped: session.totalQuestions - session.progress.questionsAnswered,
    averageScore: session.progress.averageScore,
    totalTimeSpentSeconds: session.progress.totalTimeSpentSeconds,
    categoryPerformance,
    improvementAreas,
    strengths: identifyStrengths(attempts)
  });
  
  await DB.logAnalysisEvent(session.analysisId, 'interview_session_completed', {
    sessionId,
    averageScore: session.progress.averageScore
  }, context);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(completedSession)
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function evaluateAnswer(question: any, answer: string): Promise<any> {
  // Call Bedrock to evaluate answer
  const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');
  
  const bedrockClient = new BedrockRuntimeClient({ region: 'ap-southeast-1' });
  const MODEL_ID = 'global.amazon.nova-2-lite-v1:0';
  
  const expectedTopics = question.expectedTopics || [];
  
  const prompt = `You are an expert technical interviewer evaluating a candidate's answer.

Question: ${question.questionText}
Expected Topics: ${expectedTopics.join(', ')}

Candidate Answer: ${answer}

Task: Evaluate the answer and provide:
1. Overall Score (0-100): Based on technical accuracy, completeness, clarity
2. Criteria Scores: Technical accuracy, completeness, clarity, depth
3. Strengths: Specific points the candidate explained well
4. Weaknesses: Missing concepts or incorrect statements
5. Missing Points: Key topics not addressed
6. Comparison: Weak vs strong answer examples
7. Feedback: Specific suggestions for improvement

Respond in JSON format:
{
  "overallScore": 75,
  "criteriaScores": {
    "technicalAccuracy": 80,
    "completeness": 70,
    "clarity": 75,
    "depthOfUnderstanding": 70
  },
  "strengths": ["Mentioned key concept X", "Explained Y clearly"],
  "weaknesses": ["Missed important aspect Z"],
  "missingKeyPoints": ["Should have discussed A", "Didn't mention B"],
  "comparison": {
    "weakAnswer": "A weak answer would just say...",
    "strongAnswer": "A strong answer would explain...",
    "yourAnswerCategory": "acceptable"
  },
  "feedback": "Your answer shows good understanding of... However, consider...",
  "improvementSuggestions": ["Study X", "Practice Y"]
}`;

  const requestBody = {
    messages: [
      {
        role: 'user',
        content: [
          {
            text: prompt
          }
        ]
      }
    ],
    inferenceConfig: {
      max_new_tokens: 1500,
      temperature: 0.3
    }
  };
  
  try {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    });
    
    const startTime = Date.now();
    const response = await bedrockClient.send(command);
    const inferenceTimeMs = Date.now() - startTime;
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    const content = responseBody.output?.message?.content?.[0]?.text || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Bedrock response');
    }
    
    const evaluation = JSON.parse(jsonMatch[0]);
    
    // Add metadata
    evaluation.modelId = MODEL_ID;
    evaluation.inferenceTimeMs = inferenceTimeMs;
    
    return evaluation;
  } catch (error) {
    console.error('Bedrock evaluation failed:', error);
    
    // DO NOT return fake scores - throw error so user knows evaluation failed
    throw new Error(`Answer evaluation unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function calculateAverageScore(session: any, newScore: number): number {
  const totalAnswered = session.progress.questionsAnswered;
  const currentAvg = session.progress.averageScore;
  return Math.round((currentAvg * totalAnswered + newScore) / (totalAnswered + 1));
}

function calculateCategoryPerformance(attempts: any[]): any {
  const categories: any = {};
  
  attempts.forEach((attempt: any) => {
    const category = attempt.question?.category || 'general';
    if (!categories[category]) {
      categories[category] = { total: 0, count: 0 };
    }
    categories[category].total += attempt.evaluation.overallScore;
    categories[category].count += 1;
  });
  
  const performance: any = {};
  Object.keys(categories).forEach(cat => {
    performance[cat] = Math.round(categories[cat].total / categories[cat].count);
  });
  
  return performance;
}

function identifyImprovementAreas(attempts: any[]): string[] {
  const weakAreas: any = {};
  
  attempts.forEach((attempt: any) => {
    if (attempt.evaluation.overallScore < 70) {
      attempt.evaluation.weaknesses.forEach((weakness: string) => {
        weakAreas[weakness] = (weakAreas[weakness] || 0) + 1;
      });
    }
  });
  
  return Object.keys(weakAreas)
    .sort((a, b) => weakAreas[b] - weakAreas[a])
    .slice(0, 3);
}

function identifyStrengths(attempts: any[]): string[] {
  const strengths: any = {};
  
  attempts.forEach((attempt: any) => {
    if (attempt.evaluation.overallScore >= 80) {
      attempt.evaluation.strengths.forEach((strength: string) => {
        strengths[strength] = (strengths[strength] || 0) + 1;
      });
    }
  });
  
  return Object.keys(strengths)
    .sort((a, b) => strengths[b] - strengths[a])
    .slice(0, 3);
}


// ============================================================================
// FILE MANAGEMENT HANDLERS
// ============================================================================

/**
 * GET /analysis/{analysisId}/files
 * Returns all fetched files with their priorities and selection status
 */
async function handleGetFiles(event: any) {
  const analysisId = event.pathParameters?.id;
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  // Get repository metadata which contains file information
  const repoMetadata = await DB.getRepositoryMetadata(analysisId);
  
  if (!repoMetadata) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Repository metadata not found' })
    };
  }
  
  // Get file selection if exists
  const fileSelection = await DB.getFileSelection(analysisId);
  
  // Build file list with priorities
  const allFiles = buildFileListWithPriorities(repoMetadata, fileSelection);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisId,
      totalFiles: allFiles.length,
      selectedFiles: allFiles.filter(f => f.selected).length,
      top30Files: allFiles.slice(0, 30).map(f => f.path),
      files: allFiles,
      filters: {
        languages: Object.keys(repoMetadata.languages || {}),
        frameworks: repoMetadata.frameworks || [],
        tiers: ['tier1', 'tier2', 'tier3', 'tier4']
      }
    })
  };
}

/**
 * PUT /analysis/{analysisId}/files/selection
 * Update which files are selected for analysis
 */
async function handleUpdateFileSelection(event: any) {
  const analysisId = event.pathParameters?.id;
  const body = JSON.parse(event.body || '{}');
  const { selectedFiles, deselectedFiles } = body;
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  // Get current selection
  let fileSelection = await DB.getFileSelection(analysisId);
  
  if (!fileSelection) {
    // Create new selection
    fileSelection = {
      analysisId,
      selectedFiles: [],
      deselectedFiles: [],
      customOrder: [],
      updatedAt: new Date().toISOString()
    };
  }
  
  // Update selection
  if (selectedFiles) {
    fileSelection.selectedFiles = [
      ...new Set([...fileSelection.selectedFiles, ...selectedFiles])
    ];
    // Remove from deselected
    fileSelection.deselectedFiles = fileSelection.deselectedFiles.filter(
      f => !selectedFiles.includes(f)
    );
  }
  
  if (deselectedFiles) {
    fileSelection.deselectedFiles = [
      ...new Set([...fileSelection.deselectedFiles, ...deselectedFiles])
    ];
    // Remove from selected
    fileSelection.selectedFiles = fileSelection.selectedFiles.filter(
      f => !deselectedFiles.includes(f)
    );
  }
  
  fileSelection.updatedAt = new Date().toISOString();
  
  // Save to DynamoDB
  await DB.saveFileSelection(analysisId, fileSelection);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisId,
      selectedFiles: fileSelection.selectedFiles.length,
      deselectedFiles: fileSelection.deselectedFiles.length,
      message: 'File selection updated successfully'
    })
  };
}

/**
 * POST /analysis/{analysisId}/files/reorder
 * Reorder files via drag-and-drop
 */
async function handleReorderFiles(event: any) {
  const analysisId = event.pathParameters?.id;
  const body = JSON.parse(event.body || '{}');
  const { customOrder } = body;
  
  if (!analysisId || !customOrder || !Array.isArray(customOrder)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'analysisId and customOrder array are required' })
    };
  }
  
  // Get current selection
  let fileSelection = await DB.getFileSelection(analysisId);
  
  if (!fileSelection) {
    fileSelection = {
      analysisId,
      selectedFiles: [],
      deselectedFiles: [],
      customOrder: [],
      updatedAt: new Date().toISOString()
    };
  }
  
  // Update custom order
  fileSelection.customOrder = customOrder;
  fileSelection.updatedAt = new Date().toISOString();
  
  // Save to DynamoDB
  await DB.saveFileSelection(analysisId, fileSelection);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisId,
      customOrder: fileSelection.customOrder.length,
      message: 'File order updated successfully'
    })
  };
}

/**
 * POST /analysis/{analysisId}/reprocess
 * Reprocess analysis with new file selection
 */
async function handleReprocess(event: any) {
  const analysisId = event.pathParameters?.id;
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  // Get analysis
  const analysis = await DB.getAnalysis(analysisId);
  
  if (!analysis) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }
  
  // Check if analysis is in a reprocessable state
  if (analysis.status === 'processing') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Analysis is currently processing' })
    };
  }
  
  // Get file selection
  const fileSelection = await DB.getFileSelection(analysisId);
  
  if (!fileSelection || fileSelection.selectedFiles.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'No files selected for reprocessing' })
    };
  }
  
  // Reset analysis stages
  await DB.updateAnalysisStatus(analysisId, 'processing');
  await DB.updateWorkflowState(analysisId, 'reprocessing');
  
  // Mark for reprocessing with custom file selection
  await DB.logAnalysisEvent(analysisId, 'reprocessing_initiated', {
    selectedFiles: fileSelection.selectedFiles.length,
    customOrder: fileSelection.customOrder.length > 0
  }, event.requestContext);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisId,
      status: 'processing',
      message: 'Analysis reprocessing started with custom file selection',
      selectedFiles: fileSelection.selectedFiles.length
    })
  };
}

/**
 * Helper: Build file list with priorities and selection status
 */
function buildFileListWithPriorities(
  repoMetadata: any,
  fileSelection: any
): any[] {
  const files: any[] = [];
  
  // Combine all file tiers
  const tier1Files = (repoMetadata.fileTiers?.tier1 || []).map((path: string) => ({
    path,
    tier: 1,
    priority: 100,
    category: 'Entry Point',
    selected: true // Tier 1 always selected by default
  }));
  
  const tier2Files = (repoMetadata.fileTiers?.tier2 || []).map((path: string) => ({
    path,
    tier: 2,
    priority: 80,
    category: 'Core Module',
    selected: true // Tier 2 selected by default
  }));
  
  const tier3Files = (repoMetadata.fileTiers?.tier3 || []).map((path: string) => ({
    path,
    tier: 3,
    priority: 60,
    category: 'Supporting',
    selected: false // Tier 3 not selected by default
  }));
  
  const tier4Files = (repoMetadata.fileTiers?.tier4 || []).map((path: string) => ({
    path,
    tier: 4,
    priority: 40,
    category: 'Other',
    selected: false // Tier 4 not selected by default
  }));
  
  files.push(...tier1Files, ...tier2Files, ...tier3Files, ...tier4Files);
  
  // Apply custom selection if exists
  if (fileSelection) {
    files.forEach(file => {
      if (fileSelection.selectedFiles.includes(file.path)) {
        file.selected = true;
      }
      if (fileSelection.deselectedFiles.includes(file.path)) {
        file.selected = false;
      }
    });
    
    // Apply custom order if exists
    if (fileSelection.customOrder && fileSelection.customOrder.length > 0) {
      const orderMap = new Map(
        fileSelection.customOrder.map((path: string, index: number) => [path, index])
      );
      
      files.sort((a, b) => {
        const orderA = orderMap.get(a.path);
        const orderB = orderMap.get(b.path);
        
        if (orderA !== undefined && orderB !== undefined) {
          return orderA - orderB;
        }
        if (orderA !== undefined) return -1;
        if (orderB !== undefined) return 1;
        
        // Fall back to priority
        return b.priority - a.priority;
      });
    }
  }
  
  // Add metadata
  files.forEach((file, index) => {
    file.rank = index + 1;
    file.inTop30 = index < 30;
    file.language = detectLanguageFromPath(file.path);
    file.size = estimateFileSizeFromPath(file.path);
  });
  
  return files;
}

function detectLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'JavaScript',
    'jsx': 'JavaScript',
    'ts': 'TypeScript',
    'tsx': 'TypeScript',
    'py': 'Python',
    'java': 'Java',
    'go': 'Go',
    'rs': 'Rust',
    'cpp': 'C++',
    'c': 'C',
    'cs': 'C#',
    'rb': 'Ruby',
    'php': 'PHP'
  };
  return languageMap[ext || ''] || 'Unknown';
}

function estimateFileSizeFromPath(path: string): string {
  // Rough estimate based on file type
  if (path.includes('test') || path.includes('spec')) return 'Small';
  if (path.includes('config') || path.includes('setup')) return 'Small';
  if (path.includes('index') || path.includes('main')) return 'Medium';
  return 'Medium';
}
