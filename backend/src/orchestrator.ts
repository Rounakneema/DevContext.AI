import { APIGatewayProxyHandler } from 'aws-lambda';
import { evaluateAnswerComprehensive } from './answer-eval';

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as DB from './db-utils';
import * as Types from './types';

const lambdaClient = new LambdaClient({});
const s3Client = new S3Client({});

const REPO_PROCESSOR_FUNCTION = process.env.REPO_PROCESSOR_FUNCTION;
const STAGE1_FUNCTION = process.env.STAGE1_FUNCTION;
const STAGE2_FUNCTION = process.env.STAGE2_FUNCTION;
const STAGE3_FUNCTION = process.env.STAGE3_FUNCTION;
const CACHE_BUCKET = process.env.CACHE_BUCKET;
const MAIN_TABLE = process.env.MAIN_TABLE!;

const SIGNAL_MAP: Record<string, string> = {
  'code_quality_awareness': 'code_quality',
  'trade_off_analysis': 'tradeoffs',
  'scalability_vision': 'scalability',
  'performance': 'implementation_depth'
};

function normalizeSignalId(sId: string): string {
  return SIGNAL_MAP[sId] || sId;
}

if (!REPO_PROCESSOR_FUNCTION || !STAGE1_FUNCTION || !STAGE2_FUNCTION || !STAGE3_FUNCTION || !CACHE_BUCKET) {
  throw new Error('Missing required Lambda function environment variables');
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://dev-context-ai.vercel.app',
  'https://devcontext.ai',
  'http://localhost:3000',
  'http://localhost:3001',
];

const getCorsHeaders = (requestOrigin?: string) => {
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Content-Type': 'application/json',
  };
};

// Keep legacy constant for backward compat - will be phased out
const CORS_HEADERS = getCorsHeaders();

export const handler: APIGatewayProxyHandler = async (event, context) => {
  const path = event.path;
  const method = event.httpMethod;

  // Handle OPTIONS requests for CORS preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: ''
    };
  }

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

    if (path.endsWith('/cancel') && method === 'POST') {
      return await handleCancelAnalysis(event);
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

    // Export endpoint
    if (path.endsWith('/export') && method === 'POST') {
      return await handleExportAnalysis(event);
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

    if (path.endsWith('/followup') && method === 'POST') {
      return await handleFollowUpQuestion(event, context);
    }

    return {
      statusCode: 404,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Orchestrator error:', error);

    return {
      statusCode: 500,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'User profile not found' })
    };
  }

  // Check quota
  if (userProfile.subscription.analysisUsed >= userProfile.subscription.analysisQuota) {
    return {
      statusCode: 429,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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

  // Background processing - invoke async to avoid Lambda timeout
  // Don't await - let it run in background
  processAnalysisPipeline(analysis.analysisId, repositoryUrl, context).catch(error => {
    console.error('Pipeline error (caught):', error);
    // Error is already logged in processAnalysisPipeline
  });

  return {
    statusCode: 200,
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
    console.log(`🚀 Starting pipeline for analysis: ${analysisId}`);
    console.log(`Repository: ${repositoryUrl}`);

    // Update status to processing
    await DB.updateAnalysisStatus(analysisId, 'processing');
    await DB.logAnalysisEvent(analysisId, 'pipeline_started', {}, context);

    // Step 1: Repository Processing
    console.log(`📦 Step 1: Repository Processing`);
    await DB.logAnalysisEvent(analysisId, 'repo_processing_started', {}, context);
    const repoResult = await invokeAsync(REPO_PROCESSOR_FUNCTION!, {
      analysisId,
      repositoryUrl
    });

    if (!repoResult.success) {
      throw new Error(repoResult.error || 'Repository processing failed');
    }

    console.log('✅ Repository processed. Token budget:', repoResult.budgetStats);
    await DB.logAnalysisEvent(analysisId, 'repo_processing_completed', {
      budgetStats: repoResult.budgetStats
    }, context);

    // Save userCodeFiles list to S3 (separate from repo cache)
    const userCodeFilesKey = `${repoResult.s3Key}_userCodeFiles.json`;
    await s3Client.send(new PutObjectCommand({
      Bucket: CACHE_BUCKET,
      Key: userCodeFilesKey,
      Body: JSON.stringify({
        userCodeFiles: repoResult.projectContextMap.userCodeFiles,
        totalFiles: repoResult.projectContextMap.totalFiles,
        savedAt: new Date().toISOString()
      }),
      ContentType: 'application/json'
    }));

    console.log(`✅ Saved ${repoResult.projectContextMap.userCodeFiles.length} userCodeFiles to S3: ${userCodeFilesKey}`);

    // Save repository metadata
    await DB.saveRepositoryMetadata(analysisId, {
      totalFiles: repoResult.projectContextMap.totalFiles,
      totalSizeBytes: repoResult.projectContextMap.totalSize,
      languages: repoResult.projectContextMap.languages || {},
      frameworks: repoResult.projectContextMap.frameworks,
      entryPoints: repoResult.projectContextMap.entryPoints,
      coreModules: repoResult.projectContextMap.coreModules,
      userCodeFilesS3Key: userCodeFilesKey, // Store S3 reference instead of full array
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
    console.log(`🎯 Step 2: Stage 1 - Project Review`);
    const startTime = Date.now();

    await DB.updateStageStatus(analysisId, 'project_review', {
      status: 'processing',
      startedAt: new Date().toISOString()
    });

    console.log(`Invoking Stage 1 Lambda: ${STAGE1_FUNCTION}`);
    const stage1Result = await invokeAsync(STAGE1_FUNCTION!, {
      analysisId,
      projectContextMap: repoResult.projectContextMap,
      s3Key: repoResult.s3Key,
      codeContext: repoResult.codeContext
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Stage 1 completed in ${duration}ms`);

    if (!stage1Result.success) {
      throw new Error(stage1Result.error || 'Stage 1 failed');
    }

    console.log(`💾 Saving Stage 1 results to DynamoDB`);
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

    console.log(`✅ Stage 1 complete for ${analysisId}. Awaiting user decision.`);

  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    const errMsg = error instanceof Error ? error.message : 'Unknown error';

    // Mark status AND workflow state so frontend polling can detect the failure
    await DB.updateAnalysisStatus(analysisId, 'failed', errMsg);
    await DB.updateWorkflowState(analysisId, 'failed' as any);
    await DB.logAnalysisEvent(analysisId, 'analysis_failed', {
      error: errMsg,
      errorStack: error instanceof Error ? error.stack : undefined
    }, context);

    // Re-throw to ensure Lambda marks the invocation as an error
    throw error;
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
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
    body: JSON.stringify(result)
  };
}

async function handleGetAnalysis(event: any) {
  const analysisId = event.pathParameters?.id;

  if (!analysisId) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }

  const result = await DB.getFullAnalysis(analysisId);

  if (!result) {
    return {
      statusCode: 404,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }

  return {
    statusCode: 200,
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
    body: JSON.stringify(result)
  };
}

async function handleGetStatus(event: any) {
  const analysisId = event.pathParameters?.id;

  if (!analysisId) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }

  const analysis = await DB.getAnalysis(analysisId);

  if (!analysis) {
    return {
      statusCode: 404,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }

  // Calculate progress based on stages
  const stages = analysis.stages;
  const completedStages = Object.values(stages).filter((s: any) => s.status === 'completed').length;
  const progress = Math.round((completedStages / 3) * 100);

  return {
    statusCode: 200,
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }

  const events = await DB.getAnalysisEvents(analysisId);

  return {
    statusCode: 200,
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
    body: JSON.stringify({ events })
  };
}

async function handleGetCost(event: any) {
  const analysisId = event.pathParameters?.id;

  if (!analysisId) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }

  const analysis = await DB.getAnalysis(analysisId);

  if (!analysis) {
    return {
      statusCode: 404,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }

  return {
    statusCode: 200,
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
    body: JSON.stringify(analysis.cost)
  };
}

async function handleDeleteAnalysis(event: any) {
  const analysisId = event.pathParameters?.id;

  if (!analysisId) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }

  try {
    await DB.deleteAnalysis(analysisId);

    return {
      statusCode: 204,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: ''
    };
  } catch (error) {
    console.error('Delete failed:', error);

    return {
      statusCode: 500,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({
        error: 'Failed to delete analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

// POST /analysis/{analysisId}/cancel
// Marks an in-progress analysis as cancelled so the frontend can stop polling
async function handleCancelAnalysis(event: any) {
  const analysisId = event.pathParameters?.id;
  const corsHeaders = getCorsHeaders(event.headers?.origin || event.headers?.Origin);

  if (!analysisId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'analysisId is required' }) };
  }

  try {
    await DB.updateAnalysisStatus(analysisId, 'cancelled' as any, 'Cancelled by user');
    await DB.updateWorkflowState(analysisId, 'cancelled' as any);
    await DB.logAnalysisEvent(analysisId, 'analysis_cancelled', { cancelledBy: 'user' }, null);

    console.log(`✅ Analysis ${analysisId} cancelled by user`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ success: true, message: 'Analysis cancelled' })
    };
  } catch (error) {
    console.error('Cancel failed:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to cancel analysis', message: error instanceof Error ? error.message : 'Unknown error' })
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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }

  const analysis = await DB.getAnalysis(analysisId);

  if (!analysis) {
    return {
      statusCode: 404,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }

  // Check if Stage 1 is complete
  if (analysis.stages.project_review.status !== 'completed') {
    return {
      statusCode: 400,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Stage 1 must be completed first' })
    };
  }

  // Check if Stage 2 already completed
  if (analysis.stages.intelligence_report.status === 'completed') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }

  const analysis = await DB.getAnalysis(analysisId);

  if (!analysis) {
    return {
      statusCode: 404,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }

  // Check if Stage 2 is complete
  if (analysis.stages.intelligence_report.status !== 'completed') {
    return {
      statusCode: 400,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Stage 2 must be completed first' })
    };
  }

  // Check if Stage 3 already completed
  if (analysis.stages.interview_simulation.status === 'completed') {
    return {
      statusCode: 200,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({
        message: 'Stage 3 already completed',
        status: 'completed'
      })
    };
  }

  // Start Stage 3 in background with mode if provided
  const body = JSON.parse(event.body || '{}');
  const mode = body.mode || 'sheet';
  processStage3(analysisId, mode, context);

  // Update workflow state to indicate Stage 3 is now in progress
  await DB.updateWorkflowState(analysisId, 'stage3_pending');

  return {
    statusCode: 200,
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
    body: JSON.stringify({
      analysisId,
      message: `Stage 3 (Interview Questions - ${mode} mode) started`,
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

    // Load userCodeFiles from S3 if available
    let userCodeFiles: string[] = [];
    if (repoMetadata.userCodeFilesS3Key) {
      try {
        const s3Response = await s3Client.send(new GetObjectCommand({
          Bucket: CACHE_BUCKET,
          Key: repoMetadata.userCodeFilesS3Key
        }));
        const s3Data = await s3Response.Body?.transformToString();
        if (s3Data) {
          const parsed = JSON.parse(s3Data);
          userCodeFiles = parsed.userCodeFiles || [];
          console.log(`✅ Loaded ${userCodeFiles.length} userCodeFiles from S3`);
        }
      } catch (s3Error) {
        console.warn('⚠️ Failed to load userCodeFiles from S3:', s3Error);
      }
    }

    // Load the Stage 1 project review from DynamoDB (needed by Stage 2 agents)
    const projectReview = await DB.getProjectReview(analysisId);
    if (!projectReview) {
      console.warn('⚠️ No projectReview found for Stage 2, agents will use fallback values');
    }

    const startTime = Date.now();

    const stage2Result = await invokeAsync(STAGE2_FUNCTION!, {
      analysisId,
      projectContextMap: {
        totalFiles: repoMetadata.totalFiles,
        frameworks: repoMetadata.frameworks,
        entryPoints: repoMetadata.entryPoints,
        coreModules: repoMetadata.coreModules,
        userCodeFiles: userCodeFiles,
        languages: repoMetadata.languages
      },
      projectReview: projectReview || {}, // Pass Stage 1 results to Stage 2
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

async function processStage3(analysisId: string, mode: string, context: any) {
  try {
    console.log(`Starting Stage 3 (${mode}) for analysis: ${analysisId}`);

    await DB.updateStageStatus(analysisId, 'interview_simulation', {
      status: 'processing',
      startedAt: new Date().toISOString()
    });

    await DB.logAnalysisEvent(analysisId, 'stage3_started', {}, context);

    // Get repository metadata for Stage 3
    const repoMetadata = await DB.getRepositoryMetadata(analysisId);

    // Load userCodeFiles from S3 if available
    let userCodeFiles: string[] = [];
    if (repoMetadata.userCodeFilesS3Key) {
      try {
        const s3Response = await s3Client.send(new GetObjectCommand({
          Bucket: CACHE_BUCKET,
          Key: repoMetadata.userCodeFilesS3Key
        }));
        const s3Data = await s3Response.Body?.transformToString();
        if (s3Data) {
          const parsed = JSON.parse(s3Data);
          userCodeFiles = parsed.userCodeFiles || [];
          console.log(`✅ Loaded ${userCodeFiles.length} userCodeFiles from S3`);
        }
      } catch (s3Error) {
        console.warn('⚠️ Failed to load userCodeFiles from S3:', s3Error);
      }
    }

    // Load Stage 1 project review and Stage 2 intelligence report from DynamoDB
    const projectReview = await DB.getProjectReview(analysisId);
    const intelligenceReport = await DB.getIntelligenceReport(analysisId);
    if (!projectReview) {
      console.warn('⚠️ No projectReview found for Stage 3');
    }
    if (!intelligenceReport) {
      console.warn('⚠️ No intelligenceReport found for Stage 3');
    }

    const startTime = Date.now();

    const stage3Result = await invokeAsync(STAGE3_FUNCTION!, {
      analysisId,
      projectContextMap: {
        totalFiles: repoMetadata.totalFiles,
        frameworks: repoMetadata.frameworks,
        entryPoints: repoMetadata.entryPoints,
        coreModules: repoMetadata.coreModules,
        userCodeFiles: userCodeFiles,
        languages: repoMetadata.languages
      },
      projectReview: projectReview || {},
      intelligenceReport: intelligenceReport || {},
      s3Key: repoMetadata.s3Key,
      mode // Pass mode to Stage 3
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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'User profile not found' })
    };
  }

  return {
    statusCode: 200,
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }

  const userId = event.requestContext?.authorizer?.claims?.sub || 'demo-user';

  // Get interview questions/plan from analysis
  const fullAnalysis = await DB.getFullAnalysis(analysisId);

  if (!fullAnalysis) {
    return {
      statusCode: 404,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }

  const interviewPlan = fullAnalysis.interviewPlan;

  if (!interviewPlan) {
    return {
      statusCode: 404,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Interview plan not found. Complete Stage 3 first.' })
    };
  }

  // 1. Level Calibration & Intensity Mapping
  const intensity = config?.intensity || 'normal';
  const role = config?.targetRole || interviewPlan.targetRole || 'Full Stack Developer';

  const topicsArray = Object.values(interviewPlan.allTopics as Record<string, Types.InterviewTopic>);
  const archBuckets = topicsArray.filter(t => t.category === 'architecture');
  const implBuckets = topicsArray.filter(t => t.category === 'implementation');
  const eqBuckets = topicsArray.filter(t => t.category === 'engineering_quality');

  const shuffle = (array: any[]) => array.sort(() => Math.random() - 0.5);
  shuffle(archBuckets);
  shuffle(implBuckets);
  shuffle(eqBuckets);

  const popTopic = (buckets: Types.InterviewTopic[][]): Types.InterviewTopic | undefined => {
    for (const bucket of buckets) {
      if (bucket.length > 0) return bucket.pop();
    }
    if (topicsArray.length > 0) return topicsArray.pop();
    return undefined;
  };

  // Target: 3 distinct topics representing "2 major, 1 codebase/follow-up"
  const selectedWarmup = [
    popTopic([archBuckets, implBuckets, eqBuckets]) // Major 1: heavily architecture focused
  ].filter(Boolean) as Types.InterviewTopic[];

  const selectedDeepDive = [
    popTopic([implBuckets, archBuckets, eqBuckets]) // Major 2: implementation focused
  ].filter(Boolean) as Types.InterviewTopic[];

  const selectedStretch = [
    popTopic([eqBuckets, implBuckets, archBuckets]) // Topic 3: Engineering quality / codebase specifics
  ].filter(Boolean) as Types.InterviewTopic[];

  let globalMaxFollowUps = 1;
  let fulfillmentMod = 0;

  if (intensity === 'fast') {
    globalMaxFollowUps = 0;
    fulfillmentMod = -15;
  } else if (intensity === 'deep') {
    globalMaxFollowUps = 3;
    fulfillmentMod = 10;
  }

  const finalTopics = [...selectedWarmup, ...selectedDeepDive, ...selectedStretch];
  const newAllTopics: Record<string, Types.InterviewTopic> = {};

  finalTopics.forEach((t, i) => {
    // Limit to exactly 5 questions total for normal flow (1+1 for first two topics, 1+0 for last)
    t.maxFollowUps = intensity === 'normal' ? (i < 2 ? 1 : 0) : globalMaxFollowUps;
    t.fulfillmentThreshold = Math.max(10, Math.min(100, (t.fulfillmentThreshold || 70) + fulfillmentMod));
    newAllTopics[t.topicId] = t;
  });

  const customInterviewPlan: Types.InterviewPlan = {
    ...interviewPlan,
    phases: {
      warmup: selectedWarmup.map(t => t.topicId),
      deep_dive: selectedDeepDive.map(t => t.topicId),
      stretch: selectedStretch.map(t => t.topicId)
    },
    allTopics: newAllTopics,
    requiredSignals: [
      'architecture_thinking',
      'implementation_depth',
      'code_quality',
      'tradeoffs',
      'scalability',
      'security'
    ],
    generatedAt: new Date().toISOString()
  };

  const firstTopicId = customInterviewPlan.phases.warmup[0] || finalTopics[0]?.topicId;
  const firstTopic = newAllTopics[firstTopicId];

  const sessionData = {
    userId,
    analysisId,
    config: {
      targetRole: role,
      difficulty: interviewPlan.candidateLevel || 'mixed',
      timeLimit: intensity === 'fast' ? 15 : intensity === 'deep' ? 60 : 30,
      feedbackMode: 'immediate' as const,
      intensity
    },
    totalQuestions: finalTopics.reduce((sum, t) => sum + (t.maxFollowUps + 1), 0),
    customInterviewPlan: customInterviewPlan
  };

  const dbSession = await DB.createInterviewSession(sessionData);

  const firstQuestionText = firstTopic ? `Let's discuss ${firstTopic.title}. ${firstTopic.description}` : "Let's begin the interview.";

  // Initialize first topic
  const initialProgress: Types.SessionProgress = {
    ...dbSession.progress,
    activeTopicId: firstTopicId,
    currentPhase: 'warmup',
    currentQuestionOverride: firstQuestionText,
    signals: interviewPlan.requiredSignals.reduce((acc: any, s: string) => ({
      ...acc,
      [s]: { signalId: s, name: s.replace(/_/g, ' '), score: 50, evidence: [], confidence: 0 }
    }), {})
  };

  await DB.updateSessionProgress(dbSession.sessionId, initialProgress);

  const questions = finalTopics.map(t => ({
    questionId: t.topicId,
    question: t.topicId === firstTopicId ? firstQuestionText : `Let's discuss ${t.title}`,
    category: t.category,
    difficulty: t.difficulty
  }));

  const session = {
    ...dbSession,
    progress: initialProgress,
    questions,
    interviewPlan: customInterviewPlan
  };

  await DB.logAnalysisEvent(analysisId, 'interview_session_created', {
    sessionId: session.sessionId
  }, context);

  return {
    statusCode: 200,
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'sessionId is required' })
    };
  }

  const session = await DB.getInterviewSession(sessionId);

  if (!session) {
    return {
      statusCode: 404,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Session not found' })
    };
  }

  // Get interview plan to attach topics/questions - prioritize session-specific plan
  const fullAnalysis = await DB.getFullAnalysis(session.analysisId);
  const interviewPlan = session.customInterviewPlan || fullAnalysis?.interviewPlan;

  // Map topics to questions for compatibility
  let questions: any[] = [];
  if (interviewPlan) {
    const activeTopicId = session.progress?.activeTopicId;
    const override = session.progress?.currentQuestionOverride;

    // Hydrate topicState from session progress
    if (session.progress?.topicState) {
      Object.entries(session.progress.topicState).forEach(([tId, state]) => {
        if (interviewPlan.allTopics[tId]) {
          Object.assign(interviewPlan.allTopics[tId], state);
        }
      });
    }

    questions = Object.values(interviewPlan.allTopics as Record<string, Types.InterviewTopic>).map(t => ({
      questionId: t.topicId,
      question: (t.topicId === activeTopicId && override) ? override : `Let's discuss ${t.title}`,
      category: t.category,
      difficulty: t.difficulty
    }));
  }

  return {
    statusCode: 200,
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
    body: JSON.stringify({
      ...session,
      questions,
      interviewPlan
    })
  };
}
/**
 * POST /interview/sessions/{sessionId}/answer
 */
async function handleSubmitAnswer(event: any, context: any) {
  const sessionId = event.pathParameters?.sessionId;
  const body = JSON.parse(event.body || '{}');
  const { questionId, answer, timeSpentSeconds, action } = body;

  const session = await DB.getInterviewSession(sessionId);
  if (!session || session.status !== 'active') {
    return { statusCode: 404, headers: getCorsHeaders(event.headers?.origin), body: JSON.stringify({ error: 'Session not found or inactive' }) };
  }

  const fullAnalysis = await DB.getFullAnalysis(session.analysisId);
  const plan = session.customInterviewPlan || fullAnalysis?.interviewPlan;

  if (!plan) {
    return { statusCode: 500, headers: getCorsHeaders(event.headers?.origin), body: JSON.stringify({ error: 'Interview plan missing' }) };
  }

  const progress = session.progress as any;
  const activeTopicId = progress.activeTopicId;
  const topic = { ...plan.allTopics[activeTopicId], ...(progress.topicState?.[activeTopicId] || {}) } as Types.InterviewTopic;

  if (action === 'end_early') {
    topic.isCompleted = true;
    topic.followUpsAsked = topic.maxFollowUps;
    const endTopicState = {
      currentFulfillment: topic.currentFulfillment || 0,
      isCompleted: true,
      followUpsAsked: topic.followUpsAsked
    };

    const endProgress: Types.SessionProgress = {
      ...progress,
      topicState: {
        ...(progress.topicState || {}),
        [activeTopicId]: endTopicState
      },
      currentPhase: 'completed',
      questionsAnswered: progress.questionsAnswered + 1,
      totalTimeSpentSeconds: progress.totalTimeSpentSeconds + (timeSpentSeconds || 0)
    };

    await DB.updateSessionProgress(sessionId, endProgress);
    await DB.completeInterviewSession(sessionId, { averageScore: endProgress.averageScore || 0 });

    return {
      statusCode: 200,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({
        attemptId: `${Date.now()}`,
        evaluation: {
          overallScore: 0,
          criteriaScores: { technicalAccuracy: 0, completeness: 0, clarity: 0, depthOfUnderstanding: 0 },
          strengths: [], weaknesses: [], missingKeyPoints: [], comparison: { weakAnswer: '', strongAnswer: '', yourAnswerCategory: 'weak' },
          feedback: "You chose to end the interview early.",
          improvementSuggestions: []
        },
        followUpQuestions: [],
        nextTopic: null,
        isPhaseTransition: false,
        isCompleted: true
      })
    };
  }

  let evaluation: any;

  if (action === 'skip_question') {
    topic.isCompleted = true;
    topic.followUpsAsked = topic.maxFollowUps;
    evaluation = {
      overallScore: 0,
      criteriaScores: { technicalAccuracy: 0, completeness: 0, clarity: 0, depthOfUnderstanding: 0 },
      strengths: [], weaknesses: [], missingKeyPoints: [], comparison: { weakAnswer: '', strongAnswer: '', yourAnswerCategory: 'weak' },
      feedback: "You chose to skip this question.",
      improvementSuggestions: []
    };
  } else {
    // 1. Evaluate answer with topic context
    const currentQuestion = {
      questionId,
      topicId: activeTopicId,
      question: body.questionText || `Let's discuss ${topic.title}`,
      category: topic.category,
      difficulty: topic.difficulty,
      expectedAnswer: { keyPoints: [topic.description] }
    };

    evaluation = await evaluateAnswerComprehensive(currentQuestion, answer, timeSpentSeconds || 0, topic);
  }

  // 2. Update Performance Signals
  const updatedSignals = { ...(progress.signals || {}) };
  if (evaluation.signalScores) {
    for (const [rawId, score] of Object.entries(evaluation.signalScores)) {
      const sId = normalizeSignalId(rawId);
      const sig = updatedSignals[sId] || { signalId: sId, name: sId.replace(/_/g, ' '), score: 50, evidence: [], confidence: 0 };
      sig.score = Math.round((sig.score + (score as number)) / 2); // Moving average
      sig.evidence = [...(sig.evidence || []), ...(evaluation.signalEvidence?.[rawId] || [])].slice(-5);
      sig.confidence = Math.min(1, (sig.confidence || 0) + 0.2);
      updatedSignals[sId] = sig;
    }
  }

  // 3. Update Topic Fulfillment
  topic.currentFulfillment = Math.max(topic.currentFulfillment, evaluation.topicFulfillment || 0);
  topic.isCompleted = topic.currentFulfillment >= topic.fulfillmentThreshold;

  // 4. Determine next step (Follow-up vs Next Topic)
  const nextStep = getNextInterviewStep(plan, progress, topic);

  let followUpQuestions: string[] = [];
  if (nextStep.type === 'follow_up') {
    // Generate follow-up for the same topic
    const followUpPrompt = `Generate a single deep-dive follow-up question for the topic: "${topic.title}".
    The candidate just answered: "${answer}".
    Evaluation found missed points: ${evaluation.keyPointsCoverage?.missed?.join(', ')}.
    Probe deeper into logic and tradeoffs.`;

    // Simplification: generate it now or call follow-up lambda
    // For now, we'll return a placeholder or call follow-up logic
    followUpQuestions = [evaluation.followUpRecommendations?.[0]?.question || `Can you go deeper into ${topic.title}?`].filter(Boolean);
    topic.followUpsAsked = (topic.followUpsAsked || 0) + 1;
  }

  // 5. Update Session Progress
  let nextQuestionText: string | undefined = followUpQuestions[0];
  if (!nextQuestionText && nextStep.type === 'next_topic') {
    const nextTopic = plan.allTopics[nextStep.nextTopicId];
    if (nextTopic) {
      nextQuestionText = `Let's move to ${nextTopic.title}. ${nextTopic.description}`;
    }
  }

  const newTopicState = {
    currentFulfillment: topic.currentFulfillment,
    isCompleted: topic.isCompleted,
    followUpsAsked: topic.followUpsAsked
  };

  const newProgress: Types.SessionProgress = {
    ...progress,
    signals: updatedSignals,
    topicState: {
      ...(progress.topicState || {}),
      [activeTopicId]: newTopicState
    },
    activeTopicId: nextStep.nextTopicId,
    currentPhase: nextStep.nextPhase,
    currentQuestionOverride: nextQuestionText,
    questionsAnswered: progress.questionsAnswered + 1,
    averageScore: calculateAverageScore(session, evaluation.overallScore),
    totalTimeSpentSeconds: progress.totalTimeSpentSeconds + (timeSpentSeconds || 0)
  };

  if (nextStep.type === 'complete') {
    // Only difference: pass the new progress so final metrics are updated
    await DB.updateSessionProgress(sessionId, newProgress);
    await DB.completeInterviewSession(sessionId, { averageScore: newProgress.averageScore });
  } else {
    await DB.updateSessionProgress(sessionId, newProgress);
  }

  // Save attempt
  await DB.saveInterviewAttempt({
    sessionId,
    questionId,
    userAnswer: answer,
    timeSpentSeconds: timeSpentSeconds || 0,
    evaluation
  });

  return {
    statusCode: 200,
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
    body: JSON.stringify({
      attemptId: `${Date.now()}`,
      evaluation,
      followUpQuestions,
      nextTopic: nextStep.type === 'next_topic' ? plan.allTopics[nextStep.nextTopicId] : null,
      isPhaseTransition: nextStep.isPhaseTransition,
      isCompleted: nextStep.type === 'complete'
    })
  };
}

function getNextInterviewStep(plan: Types.InterviewPlan, progress: any, currentTopic: Types.InterviewTopic): any {
  // Check if current topic needs follow-up
  if (!currentTopic.isCompleted && (currentTopic.followUpsAsked || 0) < currentTopic.maxFollowUps) {
    return { type: 'follow_up', nextTopicId: currentTopic.topicId, nextPhase: progress.currentPhase };
  }

  // Topic complete or max follow-ups reached -> Move to next topic in current phase
  const currentPhase = progress.currentPhase as 'warmup' | 'deep_dive' | 'stretch';
  const phaseTopics = plan.phases[currentPhase] || [];
  const currentIndex = phaseTopics.indexOf(currentTopic.topicId);

  if (currentIndex !== -1 && currentIndex < phaseTopics.length - 1) {
    return { type: 'next_topic', nextTopicId: phaseTopics[currentIndex + 1], nextPhase: currentPhase, isPhaseTransition: false };
  }

  // Phase complete -> Move to next phase
  if (currentPhase === 'warmup') {
    return { type: 'next_topic', nextTopicId: plan.phases.deep_dive[0], nextPhase: 'deep_dive', isPhaseTransition: true };
  }
  if (currentPhase === 'deep_dive') {
    return { type: 'next_topic', nextTopicId: plan.phases.stretch[0], nextPhase: 'stretch', isPhaseTransition: true };
  }

  // All phases complete
  return { type: 'complete' };
}

/**
 * Explicit followup endpoint
 * POST /interview/sessions/{sessionId}/followup
 */
async function handleFollowUpQuestion(event: any, context: any) {
  const sessionId = event.pathParameters?.sessionId;
  const body = JSON.parse(event.body || '{}');
  const { questionId, answer, evaluation, coverageMap, interviewContext } = body;

  const result = await invokeAsync(process.env.FOLLOWUP_FUNCTION || 'live-interview-followup', {
    analysisId: body.analysisId,
    sessionId,
    questionAsked: { questionId, question: body.questionText }, // Minimal info needed
    answerGiven: answer,
    answerEvaluation: evaluation,
    coverageMap: coverageMap || {},
    interviewContext: interviewContext || {}
  });

  return {
    statusCode: result.success ? 200 : 500,
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
    body: JSON.stringify(result)
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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'sessionId is required' })
    };
  }

  const session = await DB.getInterviewSession(sessionId);

  if (!session) {
    return {
      statusCode: 404,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
    questionsSkipped: Math.max(0, session.totalQuestions - session.progress.questionsAnswered),
    averageScore: session.progress.averageScore,
    overallScore: session.progress.averageScore, // Match frontend
    totalTimeSpentSeconds: session.progress.totalTimeSpentSeconds,
    categoryPerformance,
    weakAreas: improvementAreas, // Match frontend
    strongAreas: identifyStrengths(attempts), // Match frontend
    improvementAreas,
    strengths: identifyStrengths(attempts)
  });

  await DB.logAnalysisEvent(session.analysisId, 'interview_session_completed', {
    sessionId,
    averageScore: session.progress.averageScore
  }, context);

  return {
    statusCode: 200,
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
    body: JSON.stringify(completedSession)
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================



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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }

  // Get repository metadata which contains file information
  const repoMetadata = await DB.getRepositoryMetadata(analysisId);

  if (!repoMetadata) {
    return {
      statusCode: 404,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Repository metadata not found' })
    };
  }

  // Get file selection if exists
  const fileSelection = await DB.getFileSelection(analysisId);

  // Build file list with priorities
  const allFiles = buildFileListWithPriorities(repoMetadata, fileSelection);

  return {
    statusCode: 200,
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }

  // Get analysis
  const analysis = await DB.getAnalysis(analysisId);

  if (!analysis) {
    return {
      statusCode: 404,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }

  // Check if analysis is in a reprocessable state
  if (analysis.status === 'processing') {
    return {
      statusCode: 400,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Analysis is currently processing' })
    };
  }

  // Get file selection
  const fileSelection = await DB.getFileSelection(analysisId);

  if (!fileSelection || fileSelection.selectedFiles.length === 0) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
    headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
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
          return (orderA as number) - (orderB as number);
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

// ============================================================================
// EXPORT HANDLER
// ============================================================================

/**
 * POST /analysis/{analysisId}/export
 * Export analysis results in various formats
 */
async function handleExportAnalysis(event: any) {
  const analysisId = event.pathParameters?.id;
  const body = JSON.parse(event.body || '{}');
  const { format = 'json' } = body;

  if (!analysisId) {
    return {
      statusCode: 400,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }

  // Get full analysis
  const analysis = await DB.getFullAnalysis(analysisId);

  if (!analysis) {
    return {
      statusCode: 404,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }

  try {
    const bucketName = process.env.CACHE_BUCKET;
    if (!bucketName) {
      throw new Error('CACHE_BUCKET environment variable not set');
    }

    // Generate export data
    const exportData = {
      analysisId: analysis.analysis.analysisId,
      repositoryUrl: analysis.analysis.repositoryUrl,
      repositoryName: analysis.analysis.repositoryName,
      status: analysis.analysis.status,
      createdAt: analysis.analysis.createdAt,
      completedAt: analysis.analysis.completedAt,

      projectReview: analysis.projectReview || null,
      intelligenceReport: analysis.intelligenceReport || null,
      interviewQuestions: analysis.interviewSimulation?.questions || [],

      exportedAt: new Date().toISOString(),
      exportFormat: format
    };

    // Convert to JSON
    const fileContent = JSON.stringify(exportData, null, 2);
    const contentType = 'application/json';
    const fileExtension = 'json';

    // Upload to S3 (bucket is in ap-southeast-1, S3 client uses same region)
    const s3Key = `exports/${analysisId}-${Date.now()}.${fileExtension}`;
    const s3Client = new S3Client({ region: 'ap-southeast-1' }); // S3 bucket region

    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      Metadata: {
        analysisId,
        exportFormat: format,
        exportedAt: new Date().toISOString()
      }
    }));

    // Return the data directly for client-side download
    return {
      statusCode: 200,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({
        analysisId,
        format,
        message: 'Export generated successfully',
        data: exportData,
        fileName: `${analysis.analysis.repositoryName || 'analysis'}-${analysisId.substring(0, 8)}.${fileExtension}`
      })
    };
  } catch (error) {
    console.error('Export failed:', error);

    return {
      statusCode: 500,
      headers: getCorsHeaders(event.headers?.origin || event.headers?.Origin),
      body: JSON.stringify({
        error: 'Export failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

