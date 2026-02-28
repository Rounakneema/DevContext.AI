// Database utilities for normalized schema operations
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, BatchGetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import * as Types from './types';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const MAIN_TABLE = process.env.MAIN_TABLE || 'devcontext-main';

// ============================================================================
// KEY GENERATION UTILITIES
// ============================================================================

export function generateAnalysisKeys(analysisId: string, userId: string, repositoryUrl: string, createdAt: string) {
  const repoHash = createHash('sha256').update(repositoryUrl).digest('hex').substring(0, 16);
  
  return {
    PK: `ANALYSIS#${analysisId}`,
    SK: 'METADATA',
    GSI1PK: `USER#${userId}`,
    GSI1SK: `ANALYSIS#${createdAt}`,
    GSI2PK: `REPO#${repoHash}`,
    GSI2SK: `ANALYSIS#${createdAt}`
  };
}

export function generateUserKeys(userId: string, email: string) {
  return {
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    GSI1PK: `EMAIL#${email}`,
    GSI1SK: 'USER'
  };
}

export function generateSessionKeys(sessionId: string, userId: string, createdAt: string) {
  return {
    PK: `SESSION#${sessionId}`,
    SK: 'METADATA',
    GSI1PK: `USER#${userId}`,
    GSI1SK: `SESSION#${createdAt}`
  };
}

// ============================================================================
// ANALYSIS OPERATIONS
// ============================================================================

export async function createAnalysis(params: {
  userId: string;
  repositoryUrl: string;
  repositoryName: string;
}): Promise<Types.Analysis> {
  const analysisId = uuidv4();
  const createdAt = new Date().toISOString();
  const keys = generateAnalysisKeys(analysisId, params.userId, params.repositoryUrl, createdAt);
  
  const analysis: Types.Analysis = {
    ...keys,
    analysisId,
    userId: params.userId,
    repositoryUrl: params.repositoryUrl,
    repositoryName: params.repositoryName,
    status: 'initiated',
    workflowState: 'stage1_pending',
    createdAt,
    updatedAt: createdAt,
    version: 1,
    stages: {
      project_review: { status: 'pending' },
      intelligence_report: { status: 'pending' },
      interview_simulation: { status: 'pending' }
    },
    cost: {
      bedrockTokensIn: 0,
      bedrockTokensOut: 0,
      bedrockCostUsd: 0,
      lambdaCostUsd: 0,
      totalCostUsd: 0
    },
    retryCount: 0,
    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
  };
  
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: analysis
  }));
  
  return analysis;
}

export async function getAnalysis(analysisId: string): Promise<Types.Analysis | null> {
  const result = await dynamoClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: {
      PK: `ANALYSIS#${analysisId}`,
      SK: 'METADATA'
    }
  }));
  
  return result.Item as Types.Analysis || null;
}

export async function updateAnalysisStatus(
  analysisId: string,
  status: Types.Analysis['status'],
  errorMessage?: string
): Promise<void> {
  const updateExpression = errorMessage
    ? 'SET #status = :status, updatedAt = :time, errorMessage = :error, version = version + :inc'
    : 'SET #status = :status, updatedAt = :time, version = version + :inc';
  
  const expressionAttributeValues: any = {
    ':status': status,
    ':time': new Date().toISOString(),
    ':inc': 1
  };
  
  if (errorMessage) {
    expressionAttributeValues[':error'] = errorMessage;
  }
  
  await dynamoClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: {
      PK: `ANALYSIS#${analysisId}`,
      SK: 'METADATA'
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: expressionAttributeValues
  }));
}

export async function updateStageStatus(
  analysisId: string,
  stage: keyof Types.StageTracking,
  status: Types.StageStatus
): Promise<void> {
  await dynamoClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: {
      PK: `ANALYSIS#${analysisId}`,
      SK: 'METADATA'
    },
    UpdateExpression: 'SET stages.#stage = :status, updatedAt = :time',
    ExpressionAttributeNames: {
      '#stage': stage as string
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':time': new Date().toISOString()
    }
  }));
}

export async function updateWorkflowState(
  analysisId: string,
  workflowState: Types.Analysis['workflowState']
): Promise<void> {
  await dynamoClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: {
      PK: `ANALYSIS#${analysisId}`,
      SK: 'METADATA'
    },
    UpdateExpression: 'SET workflowState = :state, updatedAt = :time',
    ExpressionAttributeValues: {
      ':state': workflowState,
      ':time': new Date().toISOString()
    }
  }));
}

export async function getFullAnalysis(analysisId: string): Promise<Types.AnalysisResponse | null> {
  // Batch get all analysis components
  const result = await dynamoClient.send(new BatchGetCommand({
    RequestItems: {
      [MAIN_TABLE]: {
        Keys: [
          { PK: `ANALYSIS#${analysisId}`, SK: 'METADATA' },
          { PK: `ANALYSIS#${analysisId}`, SK: 'REPO_METADATA' },
          { PK: `ANALYSIS#${analysisId}`, SK: 'PROJECT_REVIEW' },
          { PK: `ANALYSIS#${analysisId}`, SK: 'INTELLIGENCE_REPORT' },
          { PK: `ANALYSIS#${analysisId}`, SK: 'INTERVIEW_SIMULATION' }
        ]
      }
    }
  }));
  
  const items = result.Responses?.[MAIN_TABLE] || [];
  
  const analysis = items.find(item => item.SK === 'METADATA') as Types.Analysis;
  if (!analysis) return null;
  
  const repository = items.find(item => item.SK === 'REPO_METADATA') as Types.RepositoryMetadata;
  const projectReview = items.find(item => item.SK === 'PROJECT_REVIEW') as Types.ProjectReview;
  const intelligenceReport = items.find(item => item.SK === 'INTELLIGENCE_REPORT') as Types.IntelligenceReport;
  const interviewSimulation = items.find(item => item.SK === 'INTERVIEW_SIMULATION') as Types.InterviewSimulation;
  
  return {
    analysis: {
      analysisId: analysis.analysisId,
      repositoryUrl: analysis.repositoryUrl,
      repositoryName: analysis.repositoryName,
      status: analysis.status,
      createdAt: analysis.createdAt,
      completedAt: analysis.completedAt,
      stages: analysis.stages
    },
    repository,
    projectReview,
    intelligenceReport,
    interviewSimulation,
    _metadata: {
      version: '2.0',
      generatedAt: new Date().toISOString(),
      ttl: analysis.ttl
    }
  };
}

export async function getUserAnalyses(
  userId: string,
  limit: number = 20,
  lastEvaluatedKey?: any
): Promise<Types.PaginatedResponse<Types.Analysis>> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :userId AND begins_with(GSI1SK, :prefix)',
    ExpressionAttributeValues: {
      ':userId': `USER#${userId}`,
      ':prefix': 'ANALYSIS#'
    },
    Limit: limit,
    ExclusiveStartKey: lastEvaluatedKey,
    ScanIndexForward: false // Most recent first
  }));
  
  return {
    items: result.Items as Types.Analysis[],
    nextCursor: result.LastEvaluatedKey ? JSON.stringify(result.LastEvaluatedKey) : undefined,
    hasMore: !!result.LastEvaluatedKey,
    total: result.Count || 0
  };
}

// ============================================================================
// REPOSITORY METADATA OPERATIONS
// ============================================================================

export async function saveRepositoryMetadata(
  analysisId: string,
  metadata: Omit<Types.RepositoryMetadata, 'PK' | 'SK'>
): Promise<void> {
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: {
      PK: `ANALYSIS#${analysisId}`,
      SK: 'REPO_METADATA',
      ...metadata
    }
  }));
}

// ============================================================================
// PROJECT REVIEW OPERATIONS
// ============================================================================

export async function saveProjectReview(
  analysisId: string,
  review: Omit<Types.ProjectReview, 'PK' | 'SK'>
): Promise<void> {
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: {
      PK: `ANALYSIS#${analysisId}`,
      SK: 'PROJECT_REVIEW',
      ...review
    }
  }));
}

// ============================================================================
// INTELLIGENCE REPORT OPERATIONS
// ============================================================================

export async function saveIntelligenceReport(
  analysisId: string,
  report: Omit<Types.IntelligenceReport, 'PK' | 'SK'>
): Promise<void> {
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: {
      PK: `ANALYSIS#${analysisId}`,
      SK: 'INTELLIGENCE_REPORT',
      ...report
    }
  }));
}

// ============================================================================
// INTERVIEW SIMULATION OPERATIONS
// ============================================================================

export async function saveInterviewSimulation(
  analysisId: string,
  simulation: Omit<Types.InterviewSimulation, 'PK' | 'SK'>
): Promise<void> {
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: {
      PK: `ANALYSIS#${analysisId}`,
      SK: 'INTERVIEW_SIMULATION',
      ...simulation
    }
  }));
}

// ============================================================================
// INTERVIEW SESSION OPERATIONS
// ============================================================================

export async function createInterviewSession(params: {
  analysisId: string;
  userId: string;
  totalQuestions: number;
  config: Types.SessionConfig;
}): Promise<Types.InterviewSession> {
  const sessionId = uuidv4();
  const createdAt = new Date().toISOString();
  const keys = generateSessionKeys(sessionId, params.userId, createdAt);
  
  const session: Types.InterviewSession = {
    ...keys,
    sessionId,
    analysisId: params.analysisId,
    userId: params.userId,
    status: 'active',
    createdAt,
    currentQuestionIndex: 0,
    totalQuestions: params.totalQuestions,
    progress: {
      questionsAnswered: 0,
      questionsSkipped: 0,
      averageScore: 0,
      totalTimeSpentSeconds: 0
    },
    config: params.config,
    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
  };
  
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: session
  }));
  
  return session;
}

export async function getInterviewSession(sessionId: string): Promise<Types.InterviewSession | null> {
  const result = await dynamoClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: {
      PK: `SESSION#${sessionId}`,
      SK: 'METADATA'
    }
  }));
  
  return result.Item as Types.InterviewSession || null;
}

// ============================================================================
// QUESTION ATTEMPT OPERATIONS
// ============================================================================

export async function saveQuestionAttempt(
  sessionId: string,
  attempt: Omit<Types.QuestionAttempt, 'PK' | 'SK'>
): Promise<void> {
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: {
      PK: `SESSION#${sessionId}`,
      SK: `ATTEMPT#${attempt.attemptNumber}#${attempt.questionId}`,
      ...attempt
    }
  }));
}

export async function getQuestionAttempts(sessionId: string): Promise<Types.QuestionAttempt[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `SESSION#${sessionId}`,
      ':prefix': 'ATTEMPT#'
    }
  }));
  
  return result.Items as Types.QuestionAttempt[];
}

// ============================================================================
// AUDIT LOG OPERATIONS
// ============================================================================

export async function logAnalysisEvent(
  analysisId: string,
  eventType: string,
  eventData: Record<string, any>,
  lambdaContext?: any
): Promise<void> {
  const eventId = uuidv4();
  const timestamp = new Date().toISOString();
  
  const event: Types.AnalysisEvent = {
    PK: `ANALYSIS#${analysisId}`,
    SK: `EVENT#${timestamp}#${eventId}`,
    eventId,
    analysisId,
    eventType,
    eventData,
    timestamp,
    lambdaRequestId: lambdaContext?.requestId,
    lambdaFunction: lambdaContext?.functionName
  };
  
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: event
  }));
}

export async function getAnalysisEvents(analysisId: string): Promise<Types.AnalysisEvent[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `ANALYSIS#${analysisId}`,
      ':prefix': 'EVENT#'
    }
  }));
  
  return result.Items as Types.AnalysisEvent[];
}

// ============================================================================
// USER PROGRESS OPERATIONS
// ============================================================================

export async function updateUserProgress(
  userId: string,
  updates: Partial<Types.UserProgress>
): Promise<void> {
  const current = await getUserProgress(userId);
  
  const progress: Types.UserProgress = {
    PK: `USER#${userId}`,
    SK: 'PROGRESS',
    userId,
    totalAnalyses: updates.totalAnalyses ?? current?.totalAnalyses ?? 0,
    totalInterviewSessions: updates.totalInterviewSessions ?? current?.totalInterviewSessions ?? 0,
    totalQuestionsAnswered: updates.totalQuestionsAnswered ?? current?.totalQuestionsAnswered ?? 0,
    averageCodeQuality: updates.averageCodeQuality ?? current?.averageCodeQuality ?? 0,
    averageEmployabilityScore: updates.averageEmployabilityScore ?? current?.averageEmployabilityScore ?? 0,
    averageInterviewScore: updates.averageInterviewScore ?? current?.averageInterviewScore ?? 0,
    improvementTrend: updates.improvementTrend ?? current?.improvementTrend ?? [],
    identifiedSkillGaps: updates.identifiedSkillGaps ?? current?.identifiedSkillGaps ?? [],
    recommendedTopics: updates.recommendedTopics ?? current?.recommendedTopics ?? [],
    completedTopics: updates.completedTopics ?? current?.completedTopics ?? [],
    updatedAt: new Date().toISOString()
  };
  
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: progress
  }));
}

export async function getUserProgress(userId: string): Promise<Types.UserProgress | null> {
  const result = await dynamoClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: {
      PK: `USER#${userId}`,
      SK: 'PROGRESS'
    }
  }));
  
  return result.Item as Types.UserProgress || null;
}

// ============================================================================
// COST TRACKING
// ============================================================================

export async function updateAnalysisCost(
  analysisId: string,
  costUpdate: Partial<Types.CostTracking>
): Promise<void> {
  const analysis = await getAnalysis(analysisId);
  if (!analysis) return;
  
  const updatedCost: Types.CostTracking = {
    bedrockTokensIn: (analysis.cost.bedrockTokensIn || 0) + (costUpdate.bedrockTokensIn || 0),
    bedrockTokensOut: (analysis.cost.bedrockTokensOut || 0) + (costUpdate.bedrockTokensOut || 0),
    bedrockCostUsd: (analysis.cost.bedrockCostUsd || 0) + (costUpdate.bedrockCostUsd || 0),
    lambdaCostUsd: (analysis.cost.lambdaCostUsd || 0) + (costUpdate.lambdaCostUsd || 0),
    totalCostUsd: 0
  };
  
  updatedCost.totalCostUsd = updatedCost.bedrockCostUsd + updatedCost.lambdaCostUsd;
  
  await dynamoClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: {
      PK: `ANALYSIS#${analysisId}`,
      SK: 'METADATA'
    },
    UpdateExpression: 'SET cost = :cost, updatedAt = :time',
    ExpressionAttributeValues: {
      ':cost': updatedCost,
      ':time': new Date().toISOString()
    }
  }));
}


// ============================================================================
// USER PROFILE FUNCTIONS
// ============================================================================

export async function getUserProfile(userId: string): Promise<any | null> {
  const result = await dynamoClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: {
      PK: `USER#${userId}`,
      SK: 'PROFILE'
    }
  }));
  
  return result.Item || null;
}

export async function createUserProfile(params: {
  userId: string;
  email: string;
  displayName: string;
  targetRole: string;
  language: string;
  githubConnected: boolean;
}): Promise<any> {
  const now = new Date().toISOString();
  
  const profile = {
    PK: `USER#${params.userId}`,
    SK: 'PROFILE',
    userId: params.userId,
    email: params.email,
    displayName: params.displayName,
    targetRole: params.targetRole,
    language: params.language,
    githubConnected: params.githubConnected,
    githubUsername: null,
    subscription: {
      tier: 'free',
      status: 'active',
      analysisQuota: 10,
      analysisUsed: 0,
      resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    preferences: {
      notifications: true,
      emailDigest: false
    },
    createdAt: now,
    updatedAt: now
  };
  
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: profile
  }));
  
  return profile;
}

export async function updateUserPreferences(userId: string, updates: any): Promise<any> {
  const profile = await getUserProfile(userId);
  
  if (!profile) {
    throw new Error('User profile not found');
  }
  
  const updated = {
    ...profile,
    ...updates,
    preferences: {
      ...profile.preferences,
      ...(updates.preferences || {})
    },
    updatedAt: new Date().toISOString()
  };
  
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: updated
  }));
  
  return updated;
}

export async function getUserStats(userId: string): Promise<any> {
  // Get all analyses for user
  const analyses = await getUserAnalyses(userId, 100);
  
  // Get all interview sessions for user
  const sessions = await getUserInterviewSessions(userId);
  
  // Calculate stats
  const completedAnalyses = analyses.items.filter((a: any) => a.status === 'completed');
  
  let totalCodeQuality = 0;
  let totalEmployability = 0;
  let codeQualityCount = 0;
  
  for (const analysis of completedAnalyses) {
    const fullAnalysis = await getFullAnalysis(analysis.analysisId);
    if (fullAnalysis?.projectReview) {
      totalCodeQuality += fullAnalysis.projectReview.codeQuality.overall;
      totalEmployability += fullAnalysis.projectReview.employabilitySignal.overall;
      codeQualityCount++;
    }
  }
  
  const completedSessions = sessions.filter((s: any) => s.status === 'completed');
  const totalInterviewScore = completedSessions.reduce((sum: number, s: any) => 
    sum + (s.summary?.averageScore || 0), 0);
  
  const totalQuestionsAnswered = completedSessions.reduce((sum: number, s: any) => 
    sum + (s.summary?.questionsAnswered || 0), 0);
  
  return {
    totalAnalyses: completedAnalyses.length,
    totalInterviewSessions: completedSessions.length,
    totalQuestionsAnswered,
    averageCodeQuality: codeQualityCount > 0 ? Math.round(totalCodeQuality / codeQualityCount) : 0,
    averageEmployabilityScore: codeQualityCount > 0 ? Math.round(totalEmployability / codeQualityCount) : 0,
    averageInterviewScore: completedSessions.length > 0 ? Math.round(totalInterviewScore / completedSessions.length) : 0,
    lastAnalysisDate: completedAnalyses[0]?.completedAt || null,
    lastInterviewDate: completedSessions[0]?.completedAt || null
  };
}

export async function getUserInterviewSessions(userId: string): Promise<any[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'SESSION#'
    },
    ScanIndexForward: false
  }));
  
  return result.Items || [];
}

// ============================================================================
// REPOSITORY METADATA FUNCTIONS
// ============================================================================

export async function getRepositoryMetadata(analysisId: string): Promise<any | null> {
  const result = await dynamoClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: {
      PK: `ANALYSIS#${analysisId}`,
      SK: 'REPO_METADATA'
    }
  }));
  
  return result.Item || null;
}

// ============================================================================
// INTERVIEW ATTEMPT FUNCTIONS
// ============================================================================

export async function saveInterviewAttempt(params: {
  sessionId: string;
  questionId: string;
  userAnswer: string;
  timeSpentSeconds: number;
  evaluation: any;
}): Promise<any> {
  const attemptId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const attempt = {
    PK: `SESSION#${params.sessionId}`,
    SK: `ATTEMPT#${attemptId}`,
    attemptId,
    sessionId: params.sessionId,
    questionId: params.questionId,
    userAnswer: params.userAnswer,
    timeSpentSeconds: params.timeSpentSeconds,
    evaluation: params.evaluation,
    submittedAt: now
  };
  
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: attempt
  }));
  
  return attempt;
}

export async function getSessionAttempts(sessionId: string): Promise<any[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `SESSION#${sessionId}`,
      ':sk': 'ATTEMPT#'
    }
  }));
  
  return result.Items || [];
}

export async function updateSessionProgress(sessionId: string, progress: any): Promise<void> {
  const session = await getInterviewSession(sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: {
      ...session,
      progress: {
        ...session.progress,
        ...progress
      },
      updatedAt: new Date().toISOString()
    }
  }));
}

export async function completeInterviewSession(sessionId: string, summary: any): Promise<any> {
  const session = await getInterviewSession(sessionId);
  
  if (!session) {
    throw new Error('Session not found');
  }
  
  const completedSession = {
    ...session,
    status: 'completed',
    completedAt: new Date().toISOString(),
    summary
  };
  
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: completedSession
  }));
  
  return completedSession;
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

export async function deleteAnalysis(analysisId: string): Promise<void> {
  // Delete all items related to this analysis
  const itemsToDelete = [
    { PK: `ANALYSIS#${analysisId}`, SK: 'METADATA' },
    { PK: `ANALYSIS#${analysisId}`, SK: 'REPO_METADATA' },
    { PK: `ANALYSIS#${analysisId}`, SK: 'PROJECT_REVIEW' },
    { PK: `ANALYSIS#${analysisId}`, SK: 'INTELLIGENCE_REPORT' },
    { PK: `ANALYSIS#${analysisId}`, SK: 'INTERVIEW_SIMULATION' }
  ];
  
  // Delete events
  const events = await getAnalysisEvents(analysisId);
  events.forEach(event => {
    itemsToDelete.push({ PK: event.PK, SK: event.SK });
  });
  
  // Delete all items (DynamoDB doesn't have batch delete, so we use individual deletes)
  const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
  
  for (const item of itemsToDelete) {
    try {
      await dynamoClient.send(new DeleteCommand({
        TableName: MAIN_TABLE,
        Key: item
      }));
    } catch (error) {
      console.error(`Failed to delete item ${item.PK}#${item.SK}:`, error);
    }
  }
  
  console.log(`Deleted analysis ${analysisId} and ${itemsToDelete.length} related items`);
}

// ============================================================================
// FILE SELECTION MANAGEMENT
// ============================================================================

export interface FileSelection {
  analysisId: string;
  selectedFiles: string[];
  deselectedFiles: string[];
  customOrder: string[];
  updatedAt: string;
}

/**
 * Get file selection for an analysis
 */
export async function getFileSelection(analysisId: string): Promise<FileSelection | null> {
  const command = new GetCommand({
    TableName: MAIN_TABLE,
    Key: {
      PK: `ANALYSIS#${analysisId}`,
      SK: 'FILE_SELECTION'
    }
  });
  
  const response = await dynamoClient.send(command);
  
  if (!response.Item) {
    return null;
  }
  
  return {
    analysisId: response.Item.analysisId,
    selectedFiles: response.Item.selectedFiles || [],
    deselectedFiles: response.Item.deselectedFiles || [],
    customOrder: response.Item.customOrder || [],
    updatedAt: response.Item.updatedAt
  };
}

/**
 * Save file selection for an analysis
 */
export async function saveFileSelection(
  analysisId: string,
  selection: FileSelection
): Promise<void> {
  const command = new PutCommand({
    TableName: MAIN_TABLE,
    Item: {
      PK: `ANALYSIS#${analysisId}`,
      SK: 'FILE_SELECTION',
      analysisId,
      selectedFiles: selection.selectedFiles,
      deselectedFiles: selection.deselectedFiles,
      customOrder: selection.customOrder,
      updatedAt: selection.updatedAt,
      GSI1PK: `USER#${analysisId.split('#')[0]}`, // For user queries
      GSI1SK: `FILE_SELECTION#${selection.updatedAt}`
    }
  });
  
  await dynamoClient.send(command);
}
