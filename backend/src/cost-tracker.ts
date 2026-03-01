/**
 * Cost Tracking & Analytics System
 * 
 * Tracks token usage, calculates costs, and stores metrics for every Bedrock API call.
 * Supports multiple models with different pricing tiers.
 * 
 * Features:
 * - Real-time cost calculation
 * - Per-analysis cost tracking
 * - Per-stage cost breakdown
 * - Model usage analytics
 * - Token usage trends
 * - Cost projections
 */

import { DynamoDBDocumentClient, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = DynamoDBDocumentClient.from(new (require('@aws-sdk/client-dynamodb').DynamoDBClient)({}));
const MAIN_TABLE = process.env.MAIN_TABLE || 'devcontext-main';

// ============================================================================
// MODEL PRICING (Updated March 2026)
// ============================================================================

export interface ModelPricing {
  modelId: string;
  modelName: string;
  inputPricePerMillion: number;  // USD per 1M input tokens
  outputPricePerMillion: number; // USD per 1M output tokens
  contextWindow: number;
  provider: 'amazon' | 'meta' | 'cohere' | 'mistral' | 'anthropic';
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Amazon Nova Models (Cheapest, AWS Credits Eligible)
  'global.amazon.nova-2-lite-v1:0': {
    modelId: 'global.amazon.nova-2-lite-v1:0',
    modelName: 'Amazon Nova 2.0 Lite',
    inputPricePerMillion: 0.41,
    outputPricePerMillion: 3.39,
    contextWindow: 32000,
    provider: 'amazon'
  },
  'apac.amazon.nova-lite-v1:0': {
    modelId: 'apac.amazon.nova-lite-v1:0',
    modelName: 'Amazon Nova Lite (APAC)',
    inputPricePerMillion: 0.41,
    outputPricePerMillion: 3.39,
    contextWindow: 32000,
    provider: 'amazon'
  },
  'apac.amazon.nova-micro-v1:0': {
    modelId: 'apac.amazon.nova-micro-v1:0',
    modelName: 'Amazon Nova Micro',
    inputPricePerMillion: 0.047,
    outputPricePerMillion: 0.188,
    contextWindow: 32000,
    provider: 'amazon'
  },
  
  // Meta Llama Models (Recommended - Best Value)
  'meta.llama3-3-70b-instruct-v1:0': {
    modelId: 'meta.llama3-3-70b-instruct-v1:0',
    modelName: 'Meta Llama 3.3 70B Instruct',
    inputPricePerMillion: 2.65,
    outputPricePerMillion: 3.50,
    contextWindow: 128000,
    provider: 'meta'
  },
  'meta.llama3-2-90b-instruct-v1:0': {
    modelId: 'meta.llama3-2-90b-instruct-v1:0',
    modelName: 'Meta Llama 3.2 90B Instruct',
    inputPricePerMillion: 2.65,
    outputPricePerMillion: 3.50,
    contextWindow: 128000,
    provider: 'meta'
  },
  
  // Cohere Models (Great for Question Generation)
  'cohere.command-r-plus-v1:0': {
    modelId: 'cohere.command-r-plus-v1:0',
    modelName: 'Cohere Command R+',
    inputPricePerMillion: 3.00,
    outputPricePerMillion: 15.00,
    contextWindow: 128000,
    provider: 'cohere'
  },
  'cohere.command-r-v1:0': {
    modelId: 'cohere.command-r-v1:0',
    modelName: 'Cohere Command R',
    inputPricePerMillion: 0.50,
    outputPricePerMillion: 1.50,
    contextWindow: 128000,
    provider: 'cohere'
  },
  
  // Mistral Models (Strong Reasoning)
  'mistral.mistral-large-2-v1:0': {
    modelId: 'mistral.mistral-large-2-v1:0',
    modelName: 'Mistral Large 2',
    inputPricePerMillion: 2.00,
    outputPricePerMillion: 6.00,
    contextWindow: 128000,
    provider: 'mistral'
  },
  
  // Anthropic Claude Models (Premium - Separate Billing)
  'anthropic.claude-3-5-sonnet-20241022-v2:0': {
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    modelName: 'Claude 3.5 Sonnet',
    inputPricePerMillion: 3.00,
    outputPricePerMillion: 15.00,
    contextWindow: 200000,
    provider: 'anthropic'
  }
};

// ============================================================================
// COST CALCULATION FUNCTIONS
// ============================================================================

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostCalculation {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
  modelId: string;
  modelName: string;
  provider: string;
  timestamp: string;
}

/**
 * Calculate cost for a Bedrock API call
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): CostCalculation {
  const pricing = MODEL_PRICING[modelId];
  
  if (!pricing) {
    console.warn(`Unknown model: ${modelId}. Using default pricing.`);
    // Default to Nova Lite pricing
    return calculateCost('global.amazon.nova-2-lite-v1:0', inputTokens, outputTokens);
  }
  
  const inputCostUsd = (inputTokens / 1_000_000) * pricing.inputPricePerMillion;
  const outputCostUsd = (outputTokens / 1_000_000) * pricing.outputPricePerMillion;
  const totalCostUsd = inputCostUsd + outputCostUsd;
  
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCostUsd: parseFloat(inputCostUsd.toFixed(6)),
    outputCostUsd: parseFloat(outputCostUsd.toFixed(6)),
    totalCostUsd: parseFloat(totalCostUsd.toFixed(6)),
    modelId: pricing.modelId,
    modelName: pricing.modelName,
    provider: pricing.provider,
    timestamp: new Date().toISOString()
  };
}

/**
 * Estimate token count from text content
 * Rule: ~4 characters per token (conservative estimate)
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

// ============================================================================
// COST TRACKING RECORDS
// ============================================================================

export interface BedrockCallRecord {
  PK: string;              // ANALYSIS#<analysisId> or COST#<date>
  SK: string;              // CALL#<timestamp>#<callId>
  
  callId: string;          // UUID
  analysisId?: string;     // Link to analysis
  sessionId?: string;      // Link to interview session
  
  // Call details
  stage: 'repo_processing' | 'project_review' | 'intelligence_report' | 'interview_questions' | 'answer_evaluation';
  modelId: string;
  modelName: string;
  provider: string;
  
  // Token usage
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  
  // Cost
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
  
  // Performance
  inferenceTimeMs: number;
  tokensPerSecond: number;
  
  // Context
  promptLength: number;
  responseLength: number;
  
  // Metadata
  timestamp: string;
  region: string;
  requestId?: string;
  
  // GSI for analytics
  GSI1PK: string;          // COST#<YYYY-MM-DD>
  GSI1SK: string;          // <timestamp>
  
  ttl?: number;            // 180 days retention
}

export interface CostSummary {
  PK: string;              // COST_SUMMARY#<period>
  SK: string;              // <YYYY-MM-DD> or <YYYY-MM> or <YYYY>
  
  period: 'daily' | 'monthly' | 'yearly';
  periodKey: string;       // "2026-03-01", "2026-03", "2026"
  
  // Aggregated metrics
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  
  // Per-stage breakdown
  byStage: Record<string, {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  }>;
  
  // Per-model breakdown
  byModel: Record<string, {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  }>;
  
  // Per-provider breakdown
  byProvider: Record<string, {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  }>;
  
  // Performance
  avgInferenceTimeMs: number;
  avgTokensPerSecond: number;
  
  updatedAt: string;
}

// ============================================================================
// TRACKING FUNCTIONS
// ============================================================================

/**
 * Track a Bedrock API call with cost calculation
 */
export async function trackBedrockCall(params: {
  analysisId?: string;
  sessionId?: string;
  stage: BedrockCallRecord['stage'];
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  inferenceTimeMs: number;
  promptLength?: number;
  responseLength?: number;
  region?: string;
  requestId?: string;
}): Promise<BedrockCallRecord> {
  const callId = uuidv4();
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0]; // YYYY-MM-DD
  
  // Calculate cost
  const cost = calculateCost(params.modelId, params.inputTokens, params.outputTokens);
  
  // Calculate performance metrics
  const tokensPerSecond = params.inferenceTimeMs > 0
    ? Math.round((params.outputTokens / params.inferenceTimeMs) * 1000)
    : 0;
  
  const record: BedrockCallRecord = {
    PK: params.analysisId ? `ANALYSIS#${params.analysisId}` : `COST#${date}`,
    SK: `CALL#${timestamp}#${callId}`,
    
    callId,
    analysisId: params.analysisId,
    sessionId: params.sessionId,
    
    stage: params.stage,
    modelId: cost.modelId,
    modelName: cost.modelName,
    provider: cost.provider,
    
    inputTokens: cost.inputTokens,
    outputTokens: cost.outputTokens,
    totalTokens: cost.totalTokens,
    
    inputCostUsd: cost.inputCostUsd,
    outputCostUsd: cost.outputCostUsd,
    totalCostUsd: cost.totalCostUsd,
    
    inferenceTimeMs: params.inferenceTimeMs,
    tokensPerSecond,
    
    promptLength: params.promptLength || 0,
    responseLength: params.responseLength || 0,
    
    timestamp,
    region: params.region || process.env.AWS_REGION || 'ap-southeast-1',
    requestId: params.requestId,
    
    GSI1PK: `COST#${date}`,
    GSI1SK: timestamp,
    
    ttl: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60) // 180 days
  };
  
  // Save to DynamoDB
  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: record
  }));
  
  // Update daily summary asynchronously (don't await to avoid blocking)
  updateCostSummary(date, record).catch(err => 
    console.error('Failed to update cost summary:', err)
  );
  
  console.log(`💰 Cost tracked: ${cost.modelName} - $${cost.totalCostUsd.toFixed(4)} (${cost.totalTokens} tokens)`);
  
  return record;
}

/**
 * Update cost summary for analytics
 */
async function updateCostSummary(date: string, call: BedrockCallRecord): Promise<void> {
  const summaryPK = `COST_SUMMARY#daily`;
  const summarySK = date;
  
  // Atomic increment using UpdateExpression
  await dynamoClient.send(new UpdateCommand({
    TableName: MAIN_TABLE,
    Key: {
      PK: summaryPK,
      SK: summarySK
    },
    UpdateExpression: `
      SET 
        #period = if_not_exists(#period, :period),
        #periodKey = if_not_exists(#periodKey, :periodKey),
        totalCalls = if_not_exists(totalCalls, :zero) + :one,
        totalInputTokens = if_not_exists(totalInputTokens, :zero) + :inputTokens,
        totalOutputTokens = if_not_exists(totalOutputTokens, :zero) + :outputTokens,
        totalTokens = if_not_exists(totalTokens, :zero) + :totalTokens,
        totalCostUsd = if_not_exists(totalCostUsd, :zeroFloat) + :cost,
        byStage.#stage.calls = if_not_exists(byStage.#stage.calls, :zero) + :one,
        byStage.#stage.inputTokens = if_not_exists(byStage.#stage.inputTokens, :zero) + :inputTokens,
        byStage.#stage.outputTokens = if_not_exists(byStage.#stage.outputTokens, :zero) + :outputTokens,
        byStage.#stage.costUsd = if_not_exists(byStage.#stage.costUsd, :zeroFloat) + :cost,
        byModel.#model.calls = if_not_exists(byModel.#model.calls, :zero) + :one,
        byModel.#model.inputTokens = if_not_exists(byModel.#model.inputTokens, :zero) + :inputTokens,
        byModel.#model.outputTokens = if_not_exists(byModel.#model.outputTokens, :zero) + :outputTokens,
        byModel.#model.costUsd = if_not_exists(byModel.#model.costUsd, :zeroFloat) + :cost,
        byProvider.#provider.calls = if_not_exists(byProvider.#provider.calls, :zero) + :one,
        byProvider.#provider.inputTokens = if_not_exists(byProvider.#provider.inputTokens, :zero) + :inputTokens,
        byProvider.#provider.outputTokens = if_not_exists(byProvider.#provider.outputTokens, :zero) + :outputTokens,
        byProvider.#provider.costUsd = if_not_exists(byProvider.#provider.costUsd, :zeroFloat) + :cost,
        updatedAt = :timestamp
    `,
    ExpressionAttributeNames: {
      '#period': 'period',
      '#periodKey': 'periodKey',
      '#stage': call.stage,
      '#model': call.modelId,
      '#provider': call.provider
    },
    ExpressionAttributeValues: {
      ':period': 'daily',
      ':periodKey': date,
      ':zero': 0,
      ':zeroFloat': 0.0,
      ':one': 1,
      ':inputTokens': call.inputTokens,
      ':outputTokens': call.outputTokens,
      ':totalTokens': call.totalTokens,
      ':cost': call.totalCostUsd,
      ':timestamp': new Date().toISOString()
    }
  }));
}

/**
 * Get cost breakdown for a specific analysis
 */
export async function getAnalysisCost(analysisId: string): Promise<{
  totalCostUsd: number;
  totalTokens: number;
  calls: BedrockCallRecord[];
  byStage: Record<string, {
    costUsd: number;
    tokens: number;
    calls: number;
  }>;
}> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: {
      ':pk': `ANALYSIS#${analysisId}`,
      ':prefix': 'CALL#'
    }
  }));
  
  const calls = result.Items as BedrockCallRecord[];
  
  let totalCostUsd = 0;
  let totalTokens = 0;
  const byStage: Record<string, any> = {};
  
  calls.forEach(call => {
    totalCostUsd += call.totalCostUsd;
    totalTokens += call.totalTokens;
    
    if (!byStage[call.stage]) {
      byStage[call.stage] = { costUsd: 0, tokens: 0, calls: 0 };
    }
    
    byStage[call.stage].costUsd += call.totalCostUsd;
    byStage[call.stage].tokens += call.totalTokens;
    byStage[call.stage].calls += 1;
  });
  
  return {
    totalCostUsd: parseFloat(totalCostUsd.toFixed(6)),
    totalTokens,
    calls,
    byStage
  };
}

/**
 * Get daily cost summary
 */
export async function getDailyCostSummary(date: string): Promise<CostSummary | null> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': 'COST_SUMMARY#daily',
      ':sk': date
    }
  }));
  
  return result.Items?.[0] as CostSummary || null;
}

/**
 * Get cost summary for date range
 */
export async function getCostSummaryRange(
  startDate: string,
  endDate: string
): Promise<CostSummary[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    KeyConditionExpression: 'PK = :pk AND SK BETWEEN :start AND :end',
    ExpressionAttributeValues: {
      ':pk': 'COST_SUMMARY#daily',
      ':start': startDate,
      ':end': endDate
    }
  }));
  
  return result.Items as CostSummary[];
}

/**
 * Get all Bedrock calls for a date
 */
export async function getCallsByDate(date: string): Promise<BedrockCallRecord[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `COST#${date}`
    }
  }));
  
  return result.Items as BedrockCallRecord[];
}

// ============================================================================
// COST PROJECTIONS
// ============================================================================

export interface CostProjection {
  currentMonthCost: number;
  projectedMonthCost: number;
  averageCostPerAnalysis: number;
  averageCostPerDay: number;
  totalAnalyses: number;
  daysElapsed: number;
  daysRemaining: number;
}

/**
 * Calculate cost projection for current month
 */
export async function getMonthlyProjection(): Promise<CostProjection> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const startDate = `${year}-${month}-01`;
  const endDate = `${year}-${month}-${String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  
  const summaries = await getCostSummaryRange(startDate, endDate);
  
  const currentMonthCost = summaries.reduce((sum, s) => sum + s.totalCostUsd, 0);
  const totalAnalyses = summaries.reduce((sum, s) => sum + (s.byStage.project_review?.calls || 0), 0);
  
  const daysElapsed = summaries.length;
  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - daysElapsed;
  
  const averageCostPerDay = daysElapsed > 0 ? currentMonthCost / daysElapsed : 0;
  const projectedMonthCost = currentMonthCost + (averageCostPerDay * daysRemaining);
  const averageCostPerAnalysis = totalAnalyses > 0 ? currentMonthCost / totalAnalyses : 0;
  
  return {
    currentMonthCost: parseFloat(currentMonthCost.toFixed(2)),
    projectedMonthCost: parseFloat(projectedMonthCost.toFixed(2)),
    averageCostPerAnalysis: parseFloat(averageCostPerAnalysis.toFixed(4)),
    averageCostPerDay: parseFloat(averageCostPerDay.toFixed(4)),
    totalAnalyses,
    daysElapsed,
    daysRemaining
  };
}
