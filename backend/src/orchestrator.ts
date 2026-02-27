import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { v4 as uuidv4 } from 'uuid';
import { AnalysisRecord } from './types';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const lambdaClient = new LambdaClient({});

const ANALYSES_TABLE = process.env.ANALYSES_TABLE!;
const REPO_PROCESSOR_FUNCTION = process.env.REPO_PROCESSOR_FUNCTION!;
const STAGE1_FUNCTION = process.env.STAGE1_FUNCTION!;
const STAGE3_FUNCTION = process.env.STAGE3_FUNCTION!;

export const handler: APIGatewayProxyHandler = async (event) => {
  const path = event.path;
  const method = event.httpMethod;
  
  try {
    if (path === '/analyze' && method === 'POST') {
      return await handleAnalyze(event);
    }
    
    if (path.startsWith('/analysis/') && method === 'GET' && !path.endsWith('/status')) {
      return await handleGetAnalysis(event);
    }
    
    if (path.endsWith('/status') && method === 'GET') {
      return await handleGetStatus(event);
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

async function handleAnalyze(event: any) {
  const body = JSON.parse(event.body || '{}');
  const { repositoryUrl } = body;
  
  if (!repositoryUrl) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'repositoryUrl is required' })
    };
  }
  
  const analysisId = uuidv4();
  const userId = 'demo-user'; // TODO: Get from Cognito
  const repositoryName = repositoryUrl.split('/').pop() || 'unknown';
  
  const analysis: AnalysisRecord = {
    analysisId,
    userId,
    repositoryUrl,
    repositoryName,
    status: 'processing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedStages: [],
    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
  };
  
  await dynamoClient.send(new PutCommand({
    TableName: ANALYSES_TABLE,
    Item: analysis
  }));
  
  // Background processing
  processAnalysisPipeline(analysisId, repositoryUrl, analysis);
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisId,
      status: 'initiated',
      estimatedCompletionTime: 90
    })
  };
}

async function processAnalysisPipeline(analysisId: string, repositoryUrl: string, analysis: AnalysisRecord) {
  try {
    console.log(`Starting pipeline for analysis: ${analysisId}`);
    
    // Step 1: Repository Processing
    const repoResult = await invokeAsync(REPO_PROCESSOR_FUNCTION, {
      analysisId,
      repositoryUrl
    });
    
    if (!repoResult.success) {
      throw new Error(repoResult.error || 'Repository processing failed');
    }
    
    console.log('Repository processed. Token budget:', repoResult.budgetStats);
    
    // Step 2: Stage 1 (Project Review) and Stage 3 (Interview) in parallel
    const stage1Promise = invokeAsync(STAGE1_FUNCTION, {
      analysisId,
      projectContextMap: repoResult.projectContextMap,
      s3Key: repoResult.s3Key,
      codeContext: repoResult.codeContext
    }).then(async (stage1Result) => {
      console.log('Stage 1 completed');
      await updateStageCompletion(analysisId, 'project_review');
      return stage1Result;
    });
    
    const stage3Promise = invokeAsync(STAGE3_FUNCTION, {
      analysisId,
      projectContextMap: repoResult.projectContextMap,
      s3Key: repoResult.s3Key
    }).then(async (stage3Result) => {
      console.log('Stage 3 completed');
      await updateStageCompletion(analysisId, 'interview_simulation');
      return stage3Result;
    });
    
    await Promise.all([stage1Promise, stage3Promise]);
    
    // Update final status
    await dynamoClient.send(new PutCommand({
      TableName: ANALYSES_TABLE,
      Item: {
        ...analysis,
        status: 'completed',
        updatedAt: new Date().toISOString()
      }
    }));
    
    console.log(`Analysis ${analysisId} completed successfully`);
    
  } catch (error) {
    console.error('Pipeline failed:', error);
    
    // Mark as failed
    await dynamoClient.send(new PutCommand({
      TableName: ANALYSES_TABLE,
      Item: {
        ...analysis,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date().toISOString()
      }
    }));
  }
}

async function updateStageCompletion(analysisId: string, stage: string) {
  await dynamoClient.send(new UpdateCommand({
    TableName: ANALYSES_TABLE,
    Key: { analysisId },
    UpdateExpression: 'SET completedStages = list_append(if_not_exists(completedStages, :empty), :stage), updatedAt = :time',
    ExpressionAttributeValues: {
      ':stage': [stage],
      ':empty': [],
      ':time': new Date().toISOString()
    }
  }));
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
  
  const result = await dynamoClient.send(new GetCommand({
    TableName: ANALYSES_TABLE,
    Key: { analysisId }
  }));
  
  if (!result.Item) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.Item)
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
  
  const result = await dynamoClient.send(new GetCommand({
    TableName: ANALYSES_TABLE,
    Key: { analysisId }
  }));
  
  const analysis = result.Item as AnalysisRecord;
  
  if (!analysis) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }
  
  // Calculate progress: processing = 50%, completed = 100%, failed = 0%
  let progress = 0;
  if (analysis.status === 'completed') progress = 100;
  else if (analysis.status === 'processing') progress = 50;
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisId: analysis.analysisId,
      status: analysis.status,
      completedStages: analysis.completedStages,
      progress,
      errorMessage: (analysis as any).errorMessage
    })
  };
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
