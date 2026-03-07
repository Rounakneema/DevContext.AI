import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import * as CostTracker from './cost-tracker';
import * as DB from './db-utils';

/**
 * Cost Analytics API Endpoints
 * 
 * GET /cost/analysis/{analysisId}     - Cost breakdown for specific analysis
 * GET /cost/daily/{date}              - Daily cost summary
 * GET /cost/range?start=X&end=Y       - Cost summary for date range
 * GET /cost/projection                - Monthly cost projection
 * GET /cost/models                    - Cost by model breakdown
 * GET /cost/realtime                  - Real-time cost metrics
 * GET /cost/export?format=csv         - Export cost data
 */

const ALLOWED_ORIGINS = [
  'https://dev-context-ai.vercel.app',
  'https://devcontext.ai',
  'http://localhost:3000',
  'http://localhost:3001',
];

function getRequestOrigin(event: any): string | undefined {
  return event?.headers?.origin || event?.headers?.Origin;
}

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

function getUserIdFromEvent(event: any): string | null {
  const claims = event?.requestContext?.authorizer?.claims;
  const userId = claims?.sub;
  if (userId) return userId;
  if (process.env.ALLOW_DEMO_USER === 'true') return 'demo-user';
  return null;
}

function getGroupsFromEvent(event: any): string[] {
  const claims = event?.requestContext?.authorizer?.claims;
  const raw = claims?.['cognito:groups'];

  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);

  // Sometimes comes as a JSON string or comma-delimited string.
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      // ignore
    }
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }

  return [];
}

function isAdmin(event: any): boolean {
  return getGroupsFromEvent(event).includes('Admins');
}

function createResponse(event: any, statusCode: number, body: any, extraHeaders?: Record<string, string>): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      ...getCorsHeaders(getRequestOrigin(event)),
      ...(extraHeaders || {})
    },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const path = event.path;
  const method = event.httpMethod;

  try {
    console.log(`Cost API: ${method} ${path} (requestId=${event?.requestContext?.requestId || 'n/a'})`);

    // Handle OPTIONS for CORS preflight
    if (method === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: getCorsHeaders(getRequestOrigin(event)),
        body: ''
      };
    }

    // GET /cost/realtime
    if (path === '/cost/realtime' && method === 'GET') {
      return await handleGetRealtimeMetrics(event);
    }

    // GET /cost/analysis/{analysisId}
    if (path.match(/\/cost\/analysis\/[^/]+$/) && method === 'GET') {
      return await handleGetAnalysisCost(event);
    }

    // GET /cost/daily/{date}
    if (path.match(/\/cost\/daily\/[^/]+$/) && method === 'GET') {
      return await handleGetDailyCost(event);
    }

    // GET /cost/range
    if (path === '/cost/range' && method === 'GET') {
      return await handleGetCostRange(event);
    }

    // GET /cost/projection
    if (path === '/cost/projection' && method === 'GET') {
      return await handleGetProjection(event);
    }

    // GET /cost/models
    if (path === '/cost/models' && method === 'GET') {
      return await handleGetModelBreakdown(event);
    }

    // GET /cost/export
    if (path === '/cost/export' && method === 'GET') {
      return await handleExportCosts(event);
    }

    // GET /cost/pricing
    if (path === '/cost/pricing' && method === 'GET') {
      return await handleGetPricing(event);
    }

    return createResponse(event, 404, { error: 'Endpoint not found', path, method });

  } catch (error) {
    console.error('Cost API error:', error);

    const includeStack = process.env.NODE_ENV !== 'production';
    return createResponse(event, 500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: includeStack && error instanceof Error ? error.stack : undefined
    });
  }
};

/**
 * GET /cost/analysis/{analysisId}
 * Get complete cost breakdown for a specific analysis
 */
async function handleGetAnalysisCost(event: any) {
  const userId = getUserIdFromEvent(event);
  const analysisId = event.pathParameters?.analysisId || event.path.split('/').pop();

  if (!analysisId) {
    return createResponse(event, 400, { error: 'analysisId is required' });
  }

  // Get analysis metadata
  const analysis = await DB.getAnalysis(analysisId);

  // Allow admins or the analysis owner.
  if (!analysis) {
    return createResponse(event, 404, { error: 'Analysis not found' });
  }
  if (!isAdmin(event)) {
    if (!userId || analysis.userId !== userId) {
      return createResponse(event, 404, { error: 'Analysis not found' });
    }
  }

  // Get cost breakdown
  const costData = await CostTracker.getAnalysisCost(analysisId);

  // Calculate repository size metrics
  const repoMetadata = await DB.getRepositoryMetadata(analysisId);

  const response = {
    analysisId,
    repositoryUrl: analysis.repositoryUrl,
    repositoryName: analysis.repositoryName,
    status: analysis.status,

    cost: {
      totalCostUsd: costData.totalCostUsd,
      totalTokens: costData.totalTokens,

      byStage: costData.byStage,

      breakdown: costData.calls.map(call => ({
        stage: call.stage,
        modelName: call.modelName,
        inputTokens: call.inputTokens,
        outputTokens: call.outputTokens,
        costUsd: call.totalCostUsd,
        inferenceTimeMs: call.inferenceTimeMs,
        tokensPerSecond: call.tokensPerSecond,
        timestamp: call.timestamp
      }))
    },

    repositoryMetrics: repoMetadata ? {
      totalFiles: repoMetadata.totalFiles,
      totalSizeBytes: repoMetadata.totalSizeBytes,
      languages: repoMetadata.languages,
      tokenBudget: repoMetadata.tokenBudget
    } : null,

    efficiency: {
      costPerFile: repoMetadata ? (costData.totalCostUsd / repoMetadata.totalFiles).toFixed(6) : null,
      costPerKB: repoMetadata ? (costData.totalCostUsd / (repoMetadata.totalSizeBytes / 1024)).toFixed(6) : null,
      tokensPerFile: repoMetadata ? Math.round(costData.totalTokens / repoMetadata.totalFiles) : null
    },

    _metadata: {
      generatedAt: new Date().toISOString()
    }
  };

  return createResponse(event, 200, response);
}

/**
 * GET /cost/daily/{date}
 * Get daily cost summary
 */
async function handleGetDailyCost(event: any) {
  if (!isAdmin(event)) return createResponse(event, 403, { error: 'Forbidden' });
  const date = event.pathParameters?.date || event.path.split('/').pop();

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return createResponse(event, 400, { error: 'Invalid date format. Use YYYY-MM-DD' });
  }

  const summary = await CostTracker.getDailyCostSummary(date);

  if (!summary) {
    return createResponse(event, 200, {
      date,
      totalCostUsd: 0,
      totalCalls: 0,
      message: 'No data for this date'
    });
  }

  return createResponse(event, 200, summary);
}

/**
 * GET /cost/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Get cost summary for date range
 */
async function handleGetCostRange(event: any) {
  if (!isAdmin(event)) return createResponse(event, 403, { error: 'Forbidden' });
  const startDate = event.queryStringParameters?.start;
  const endDate = event.queryStringParameters?.end;

  if (!startDate || !endDate) {
    return createResponse(event, 400, { error: 'start and end dates required (YYYY-MM-DD)' });
  }

  const summaries = await CostTracker.getCostSummaryRange(startDate, endDate);

  const totals = summaries.reduce((acc, s) => ({
    totalCostUsd: acc.totalCostUsd + s.totalCostUsd,
    totalCalls: acc.totalCalls + s.totalCalls,
    totalInputTokens: acc.totalInputTokens + s.totalInputTokens,
    totalOutputTokens: acc.totalOutputTokens + s.totalOutputTokens,
    totalTokens: acc.totalTokens + s.totalTokens
  }), {
    totalCostUsd: 0,
    totalCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0
  });

  return createResponse(event, 200, {
    startDate,
    endDate,
    daysInRange: summaries.length,
    totals: {
      totalCostUsd: parseFloat(totals.totalCostUsd.toFixed(4)),
      totalCalls: totals.totalCalls,
      totalInputTokens: totals.totalInputTokens,
      totalOutputTokens: totals.totalOutputTokens,
      totalTokens: totals.totalTokens,
      averageCostPerDay: summaries.length > 0 ? parseFloat((totals.totalCostUsd / summaries.length).toFixed(4)) : 0
    },
    dailySummaries: summaries
  });
}

/**
 * GET /cost/projection
 * Get monthly cost projection
 */
async function handleGetProjection(event: any) {
  if (!isAdmin(event)) return createResponse(event, 403, { error: 'Forbidden' });
  const projection = await CostTracker.getMonthlyProjection();

  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return createResponse(event, 200, {
    month: monthName,
    ...projection,

    alerts: [
      projection.projectedMonthCost > 100 ? {
        level: 'warning',
        message: `Projected monthly cost (${projection.projectedMonthCost.toFixed(2)}) exceeds $100`
      } : null,
      projection.averageCostPerAnalysis > 2 ? {
        level: 'info',
        message: `Average cost per analysis (${projection.averageCostPerAnalysis.toFixed(4)}) is higher than expected`
      } : null
    ].filter(Boolean),

    recommendations: generateCostRecommendations(projection)
  });
}

/**
 * GET /cost/models
 * Get cost breakdown by model
 */
async function handleGetModelBreakdown(event: any) {
  if (!isAdmin(event)) return createResponse(event, 403, { error: 'Forbidden' });
  const days = parseInt(event.queryStringParameters?.days || '7');

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

  const summaries = await CostTracker.getCostSummaryRange(startDate, endDate);

  const modelStats: Record<string, {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    costUsd: number;
    provider: string;
  }> = {};

  summaries.forEach(summary => {
    Object.entries(summary.byModel).forEach(([modelId, data]) => {
      if (!modelStats[modelId]) {
        const pricing = CostTracker.MODEL_PRICING[modelId];
        modelStats[modelId] = {
          calls: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          costUsd: 0,
          provider: pricing?.provider || 'unknown'
        };
      }

      modelStats[modelId].calls += data.calls;
      modelStats[modelId].inputTokens += data.inputTokens;
      modelStats[modelId].outputTokens += data.outputTokens;
      modelStats[modelId].totalTokens += data.inputTokens + data.outputTokens;
      modelStats[modelId].costUsd += data.costUsd;
    });
  });

  const modelArray = Object.entries(modelStats).map(([modelId, stats]) => {
    const pricing = CostTracker.MODEL_PRICING[modelId];
    return {
      modelId,
      modelName: pricing?.modelName || modelId,
      ...stats,
      costUsd: parseFloat(stats.costUsd.toFixed(6)),
      averageCostPerCall: stats.calls > 0 ? parseFloat((stats.costUsd / stats.calls).toFixed(6)) : 0
    };
  }).sort((a, b) => b.costUsd - a.costUsd);

  return createResponse(event, 200, {
    period: `Last ${days} days`,
    startDate,
    endDate,
    models: modelArray,
    summary: {
      totalModelsUsed: modelArray.length,
      mostExpensiveModel: modelArray[0]?.modelName || 'None',
      cheapestModel: modelArray[modelArray.length - 1]?.modelName || 'None',
      totalCost: parseFloat(modelArray.reduce((sum, m) => sum + m.costUsd, 0).toFixed(4))
    }
  });
}

/**
 * GET /cost/realtime
 * Get real-time cost metrics
 */
async function handleGetRealtimeMetrics(event: any) {
  if (!isAdmin(event)) return createResponse(event, 403, { error: 'Forbidden' });
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // YYYY-MM

    // Get today's summary
    const todaySummary = await CostTracker.getDailyCostSummary(today);

    // Get this month's data
    const monthStart = `${currentMonth}-01`;
    const monthSummaries = await CostTracker.getCostSummaryRange(monthStart, today);

    // Calculate month totals
    let monthTotalCost = 0;
    let monthTotalCalls = 0;
    let monthTotalTokens = 0;
    const modelCosts: Record<string, { cost: number; calls: number }> = {};

    for (const summary of monthSummaries) {
      monthTotalCost += summary.totalCostUsd;
      monthTotalCalls += summary.totalCalls;
      monthTotalTokens += summary.totalTokens;

      // byModel is a Record, not an array
      for (const [modelId, modelData] of Object.entries(summary.byModel)) {
        if (!modelCosts[modelId]) {
          modelCosts[modelId] = { cost: 0, calls: 0 };
        }
        modelCosts[modelId].cost += modelData.costUsd;
        modelCosts[modelId].calls += modelData.calls;
      }
    }

    // Calculate projection
    const daysInMonth = new Date(new Date(today).getFullYear(), new Date(today).getMonth() + 1, 0).getDate();
    const dayOfMonth = new Date(today).getDate();
    const projectedMonthCost = dayOfMonth > 0 ? (monthTotalCost / dayOfMonth) * daysInMonth : 0;

    // Build model breakdown
    const byModel = Object.entries(modelCosts).map(([modelId, data]) => ({
      modelId,
      totalCost: parseFloat(data.cost.toFixed(2)),
      callCount: data.calls,
      avgCostPerCall: parseFloat((data.cost / data.calls).toFixed(4))
    }));

    // Generate alerts
    const alerts: Array<{ type: 'warning' | 'info' | 'critical'; message: string }> = [];

    if (projectedMonthCost > 500) {
      alerts.push({
        type: 'warning',
        message: `Projected monthly cost ($${projectedMonthCost.toFixed(2)}) exceeds $500 budget`
      });
    }

    if (todaySummary && todaySummary.totalCostUsd > 50) {
      alerts.push({
        type: 'critical',
        message: `Today's cost ($${todaySummary.totalCostUsd.toFixed(2)}) is unusually high`
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        type: 'info',
        message: 'All systems operating within budget'
      });
    }

    const response = {
      today: {
        totalCost: todaySummary?.totalCostUsd || 0,
        totalCalls: todaySummary?.totalCalls || 0,
        totalTokens: todaySummary?.totalTokens || 0
      },
      thisMonth: {
        totalCost: parseFloat(monthTotalCost.toFixed(2)),
        totalCalls: monthTotalCalls,
        projectedEndOfMonth: parseFloat(projectedMonthCost.toFixed(2))
      },
      byModel: byModel.sort((a, b) => b.totalCost - a.totalCost),
      recentAnalyses: [], // TODO: Add recent analyses query
      alerts
    };

    return createResponse(event, 200, response);
  } catch (error) {
    console.error('Error in handleGetRealtimeMetrics:', error);
    const includeStack = process.env.NODE_ENV !== 'production';
    return createResponse(event, 500, {
      error: 'Failed to fetch realtime metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: includeStack && error instanceof Error ? error.stack : undefined
    });
  }
}

/**
 * GET /cost/export?format=csv
 * Export cost data
 */
async function handleExportCosts(event: any) {
  if (!isAdmin(event)) return createResponse(event, 403, { error: 'Forbidden' });
  const format = event.queryStringParameters?.format || 'json';
  const days = parseInt(event.queryStringParameters?.days || '30');

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

  const summaries = await CostTracker.getCostSummaryRange(startDate, endDate);

  if (format === 'csv') {
    const csv = convertToCSV(summaries);

    return createResponse(event, 200, csv, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="devcontext-costs-${startDate}-to-${endDate}.csv"`
    });
  }

  return createResponse(event, 200, {
    startDate,
    endDate,
    summaries
  });
}

/**
 * GET /cost/pricing
 * Get current model pricing
 */
async function handleGetPricing(event: any) {
  if (!isAdmin(event)) return createResponse(event, 403, { error: 'Forbidden' });
  const models = Object.values(CostTracker.MODEL_PRICING).map(p => ({
    modelId: p.modelId,
    modelName: p.modelName,
    provider: p.provider,
    inputPricePerMillion: p.inputPricePerMillion,
    outputPricePerMillion: p.outputPricePerMillion,
    contextWindow: p.contextWindow,

    // Calculate example costs
    exampleCosts: {
      '10K_tokens': {
        inputCost: (10000 / 1_000_000) * p.inputPricePerMillion,
        outputCost: (10000 / 1_000_000) * p.outputPricePerMillion,
        totalCost: ((10000 / 1_000_000) * p.inputPricePerMillion) + ((10000 / 1_000_000) * p.outputPricePerMillion)
      },
      '100K_tokens': {
        inputCost: (100000 / 1_000_000) * p.inputPricePerMillion,
        outputCost: (100000 / 1_000_000) * p.outputPricePerMillion,
        totalCost: ((100000 / 1_000_000) * p.inputPricePerMillion) + ((100000 / 1_000_000) * p.outputPricePerMillion)
      }
    }
  }));

  return createResponse(event, 200, {
    models,
    lastUpdated: '2026-03-01',
    notes: [
      'Prices in USD per 1 million tokens',
      'AWS Free Tier applies to Amazon and partner models',
      'Claude models require separate Anthropic billing'
    ]
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateCostRecommendations(projection: CostTracker.CostProjection): string[] {
  const recommendations: string[] = [];

  if (projection.averageCostPerAnalysis > 1.5) {
    recommendations.push('Consider using cheaper models for non-critical stages (e.g., Qwen Coder for Stage 3)');
  }

  if (projection.projectedMonthCost > 50) {
    recommendations.push('Enable prompt caching to reduce input token costs by up to 90%');
  }

  if (projection.totalAnalyses > 100) {
    recommendations.push('Consider batch inference for Stage 3 questions to save 50% on costs');
  }

  return recommendations;
}

function generateRealtimeAlerts(todayCost: number, projection: CostTracker.CostProjection): any[] {
  const alerts: any[] = [];

  if (todayCost > projection.averageCostPerDay * 2) {
    alerts.push({
      level: 'warning',
      message: `Today's cost ($${todayCost.toFixed(2)}) is 2x higher than daily average`
    });
  }

  if (projection.projectedMonthCost > 200) {
    alerts.push({
      level: 'critical',
      message: `Projected monthly cost ($${projection.projectedMonthCost.toFixed(2)}) exceeds $200`
    });
  }

  return alerts;
}

function convertToCSV(summaries: CostTracker.CostSummary[]): string {
  const headers = [
    'Date',
    'Total Cost (USD)',
    'Total Calls',
    'Input Tokens',
    'Output Tokens',
    'Total Tokens',
    'Avg Cost/Call'
  ];

  const rows = summaries.map(s => [
    s.periodKey,
    s.totalCostUsd.toFixed(4),
    s.totalCalls,
    s.totalInputTokens,
    s.totalOutputTokens,
    s.totalTokens,
    (s.totalCostUsd / s.totalCalls).toFixed(6)
  ]);

  return [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');
}
