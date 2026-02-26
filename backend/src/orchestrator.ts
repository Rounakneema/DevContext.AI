import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { v4 as uuidv4 } from 'uuid';
import { AnalysisRecord } from './types';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const lambdaClient = new LambdaClient({});

const ANALYSES_TABLE = process.env.ANALYSES_TABLE!;

export const handler: APIGatewayProxyHandler = async (event) => {
  const path = event.path;
  const method = event.httpMethod;
  
  try {
    // POST /analyze - Initiate analysis
    if (path === '/analyze' && method === 'POST') {
      return await handleAnalyze(event);
    }
    
    // GET /analysis/{id} - Get analysis results
    if (path.startsWith('/analysis/') && method === 'GET' && !path.endsWith('/status')) {
      return await handleGetAnalysis(event);
    }
    
    // GET /analysis/{id}/status - Get analysis status
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
  
  // Create initial analysis record
  const analysis: AnalysisRecord = {
    analysisId,
    userId,
    repositoryUrl,
    repositoryName,
    status: 'processing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedStages: [],
    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
  };
  
  const putCommand = new PutCommand({
    TableName: ANALYSES_TABLE,
    Item: analysis
  });
  
  await dynamoClient.send(putCommand);
  
  // Invoke repository processor asynchronously
  invokeAsync(process.env.REPO_PROCESSOR_FUNCTION!, {
    analysisId,
    repositoryUrl
  }).then(async (repoResult) => {
    if (!repoResult.success) {
      console.error('Repository processing failed:', repoResult.error);
      return;
    }
    
    console.log('Token Budget Stats:', repoResult.budgetStats);
    
    // Invoke Stage 1 (Project Review) with pre-loaded code context
    const stage1Promise = invokeAsync(process.env.STAGE1_FUNCTION!, {
      analysisId,
      projectContextMap: repoResult.projectContextMap,
      s3Key: repoResult.s3Key,
      codeContext: repoResult.codeContext
    });
    
    // Invoke Stage 3 (Interview Questions) in parallel
    const stage3Promise = invokeAsync(process.env.STAGE3_FUNCTION!, {
      analysisId,
      projectContextMap: repoResult.projectContextMap,
      s3Key: repoResult.s3Key
    });
    
    // Wait for both stages
    await Promise.all([stage1Promise, stage3Promise]);
    
    // Update status to completed
    const updateCommand = new PutCommand({
      TableName: ANALYSES_TABLE,
      Item: {
        ...analysis,
        status: 'completed',
        updatedAt: new Date().toISOString()
      }
    });
    
    await dynamoClient.send(updateCommand);
    
  }).catch(error => {
    console.error('Analysis pipeline failed:', error);
  });
  
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

async function handleGetAnalysis(event: any) {
  const analysisId = event.pathParameters?.id;
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  const getCommand = new GetCommand({
    TableName: ANALYSES_TABLE,
    Key: { analysisId }
  });
  
  const result = await dynamoClient.send(getCommand);
  
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
  
  const getCommand = new GetCommand({
    TableName: ANALYSES_TABLE,
    Key: { analysisId }
  });
  
  const result = await dynamoClient.send(getCommand);
  const analysis = result.Item as AnalysisRecord;
  
  if (!analysis) {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }
  
  const progress = (analysis.completedStages.length / 2) * 100; // 2 stages total
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisId: analysis.analysisId,
      status: analysis.status,
      completedStages: analysis.completedStages,
      progress
    })
  };
}

async function invokeAsync(functionName: string, payload: any): Promise<any> {
  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload)
  });
  
  const response = await lambdaClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.Payload));
  
  return result;
}
