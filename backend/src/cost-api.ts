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

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

function createResponse(statusCode: number, body: any): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const path = event.path;
  const method = event.httpMethod;
  
  try {
    console.log(`Cost API: ${method} ${path}`, JSON.stringify(event, null, 2));
    
    // Handle OPTIONS for CORS preflight
    if (method === 'OPTIONS') {
      return createResponse(200, { message: 'OK' });
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
    
    return createResponse(404, { error: 'Endpoint not found', path, method });
    
  } catch (error) {
    console.error('Cost API error:', error);
    
    return createResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
};

/**
 * GET /cost/analysis/{analysisId}
 * Get complete cost breakdown for a specific analysis
 */
async function handleGetAnalysisCost(event: any) {
  const analysisId = event.pathParameters?.analysisId || event.path.split('/').pop();
  
  if (!analysisId) {
    return createResponse(400, { error: 'analysisId is required' });
  }
  
  // Get analysis metadata
  const analysis = await DB.getAnalysis(analysisId);
  
  if (!analysis) {
    return createResponse(404, { error: 'Analysis not found' });
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
  
  return createResponse(200, response);
}

/**
 * GET /cost/daily/{date}
 * Get daily cost summary
 */
async function handleGetDailyCost(event: any) {
  const date = event.pathParameters?.date || event.path.split('/').pop();
  
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return createResponse(400, { error: 'Invalid date format. Use YYYY-MM-DD' });
  }
  
  const summary = await CostTracker.getDailyCostSummary(date);
  
  if (!summary) {
    return createResponse(200, {
      date,
      totalCostUsd: 0,
      totalCalls: 0,
      message: 'No data for this date'
    });
  }
  
  return createResponse(200, summary);
}

/**
 * GET /cost/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Get cost summary for date range
 */
async function handleGetCostRange(event: any) {
  const startDate = event.queryStringParameters?.start;
  const endDate = event.queryStringParameters?.end;
  
  if (!startDate || !endDate) {
    return createResponse(400, { error: 'start and end dates required (YYYY-MM-DD)' });
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
  
  return createResponse(200, {
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
  const projection = await CostTracker.getMonthlyProjection();

  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return createResponse(200, {
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

  return createResponse(200, {
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
    
    return createResponse(200, response);
  } catch (error) {
    console.error('Error in handleGetRealtimeMetrics:', error);
    return createResponse(500, {
      error: 'Failed to fetch realtime metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

/**
 * GET /cost/export?format=csv
 * Export cost data
 */
async function handleExportCosts(event: any) {
  const format = event.queryStringParameters?.format || 'json';
  const days = parseInt(event.queryStringParameters?.days || '30');

  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];

  const summaries = await CostTracker.getCostSummaryRange(startDate, endDate);

  if (format === 'csv') {
    const csv = convertToCSV(summaries);

    return {
      statusCode: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="devcontext-costs-${startDate}-to-${endDate}.csv"`
      },
      body: csv
    };
  }

  return createResponse(200, {
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

  return createResponse(200, {
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
