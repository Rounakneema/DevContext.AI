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

import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
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
  'us.meta.llama3-3-70b-instruct-v1:0': {
    modelId: 'us.meta.llama3-3-70b-instruct-v1:0',
    modelName: 'Meta Llama 3.3 70B Instruct (US)',
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
    inputPricePerMillion: 3.00,   // $3.00 / 1M input
    outputPricePerMillion: 9.00,  // $9.00 / 1M output
    contextWindow: 128000,
    provider: 'mistral'
  },
  // PRIMARY MODEL — Mistral Large 3 (actual pricing: $0.50 input / $1.50 output per 1M tokens)
  'mistral.mistral-large-3-675b-instruct': {
    modelId: 'mistral.mistral-large-3-675b-instruct',
    modelName: 'Mistral Large 3',
    inputPricePerMillion: 0.50,   // $0.50 / 1M input tokens
    outputPricePerMillion: 1.50,  // $1.50 / 1M output tokens
    contextWindow: 128000,
    provider: 'mistral'
  },

  'eu.meta.llama3-3-70b-instruct-v1:0': {
    modelId: 'eu.meta.llama3-3-70b-instruct-v1:0',
    modelName: 'Meta Llama 3.3 70B (EU Inference Profile)',
    inputPricePerMillion: 2.65,
    outputPricePerMillion: 3.50,
    contextWindow: 128000,
    provider: 'meta'
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
    inputCostUsd: parseFloat(inputCostUsd.toFixed(8)),
    outputCostUsd: parseFloat(outputCostUsd.toFixed(8)),
    totalCostUsd: parseFloat(totalCostUsd.toFixed(8)),
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

export interface AiCallRecord {
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
 * Track an AI API call with cost calculation
 */
export async function trackAiCall(params: {
  analysisId?: string;
  sessionId?: string;
  stage: AiCallRecord['stage'];
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  inferenceTimeMs: number;
  promptLength?: number;
  responseLength?: number;
  region?: string;
  requestId?: string;
}): Promise<AiCallRecord> {
  const callId = uuidv4();
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0]; // YYYY-MM-DD

  // Calculate cost
  const cost = calculateCost(params.modelId, params.inputTokens, params.outputTokens);

  // Calculate performance metrics
  const tokensPerSecond = params.inferenceTimeMs > 0
    ? Math.round((params.outputTokens / params.inferenceTimeMs) * 1000)
    : 0;

  const record: AiCallRecord = {
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

  console.log(`💰 Cost tracked: ${cost.modelName} - $${cost.totalCostUsd.toFixed(8)} (${cost.inputTokens} in + ${cost.outputTokens} out = ${cost.totalTokens} tokens | $${cost.inputCostUsd.toFixed(8)} in + $${cost.outputCostUsd.toFixed(8)} out)`);

  return record;
}

/**
 * Update cost summary for analytics
 */
async function updateCostSummary(date: string, call: AiCallRecord): Promise<void> {
  const summaryPK = `COST_SUMMARY#daily`;
  const summarySK = date;

  // Read-modify-write: safe for async aggregations (occasional missed update is acceptable)
  const existing = await dynamoClient.send(new GetCommand({
    TableName: MAIN_TABLE,
    Key: { PK: summaryPK, SK: summarySK }
  }));

  const current: any = existing.Item || {
    PK: summaryPK,
    SK: summarySK,
    period: 'daily',
    periodKey: date,
    totalCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    byStage: {},
    byModel: {},
    byProvider: {},
    avgInferenceTimeMs: 0,
    avgTokensPerSecond: 0,
    updatedAt: new Date().toISOString()
  };

  // Update aggregates
  current.totalCalls = (current.totalCalls || 0) + 1;
  current.totalInputTokens = (current.totalInputTokens || 0) + call.inputTokens;
  current.totalOutputTokens = (current.totalOutputTokens || 0) + call.outputTokens;
  current.totalTokens = (current.totalTokens || 0) + call.totalTokens;
  current.totalCostUsd = parseFloat(((current.totalCostUsd || 0) + call.totalCostUsd).toFixed(6));
  current.updatedAt = new Date().toISOString();

  // Update byStage
  if (!current.byStage) current.byStage = {};
  const stage = current.byStage[call.stage] || { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  stage.calls++;
  stage.inputTokens += call.inputTokens;
  stage.outputTokens += call.outputTokens;
  stage.costUsd = parseFloat((stage.costUsd + call.totalCostUsd).toFixed(6));
  current.byStage[call.stage] = stage;

  // Update byModel
  if (!current.byModel) current.byModel = {};
  const modelKey = call.modelId.replace(/[^a-zA-Z0-9_\-.]/g, '_');
  const model = current.byModel[modelKey] || { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  model.calls++;
  model.inputTokens += call.inputTokens;
  model.outputTokens += call.outputTokens;
  model.costUsd = parseFloat((model.costUsd + call.totalCostUsd).toFixed(6));
  current.byModel[modelKey] = model;

  // Update byProvider
  if (!current.byProvider) current.byProvider = {};
  const provider = current.byProvider[call.provider] || { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
  provider.calls++;
  provider.inputTokens += call.inputTokens;
  provider.outputTokens += call.outputTokens;
  provider.costUsd = parseFloat((provider.costUsd + call.totalCostUsd).toFixed(6));
  current.byProvider[call.provider] = provider;

  await dynamoClient.send(new PutCommand({
    TableName: MAIN_TABLE,
    Item: current
  }));
}


/**
 * Get cost breakdown for a specific analysis
 */
export async function getAnalysisCost(analysisId: string): Promise<{
  totalCostUsd: number;
  totalTokens: number;
  calls: AiCallRecord[];
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

  const calls = result.Items as AiCallRecord[];

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
export async function getCallsByDate(date: string): Promise<AiCallRecord[]> {
  const result = await dynamoClient.send(new QueryCommand({
    TableName: MAIN_TABLE,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `COST#${date}`
    }
  }));

  return result.Items as AiCallRecord[];
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
