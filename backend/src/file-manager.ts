import { APIGatewayProxyHandler } from 'aws-lambda';
import * as DB from './db-utils';

/**
 * File Manager API
 * Allows users to view, filter, and customize which files to analyze
 */

// CORS headers for all responses
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json'
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const path = event.path;
  const method = event.httpMethod;
  
  // Handle OPTIONS requests for CORS preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }
  
  try {
    // GET /analysis/{analysisId}/files - Get all fetched files with priorities
    if (path.match(/\/analysis\/[^/]+\/files$/) && method === 'GET') {
      return await handleGetFiles(event);
    }
    
    // PUT /analysis/{analysisId}/files/selection - Update file selection
    if (path.endsWith('/files/selection') && method === 'PUT') {
      return await handleUpdateFileSelection(event);
    }
    
    // POST /analysis/{analysisId}/files/reorder - Reorder files by drag-drop
    if (path.endsWith('/files/reorder') && method === 'POST') {
      return await handleReorderFiles(event);
    }
    
    // POST /analysis/{analysisId}/reprocess - Reprocess with new file selection
    if (path.endsWith('/reprocess') && method === 'POST') {
      return await handleReprocess(event);
    }
    
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not found' })
    };
    
  } catch (error) {
    console.error('File manager error:', error);
    
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

/**
 * GET /analysis/{analysisId}/files
 * Returns all fetched files with their priorities and selection status
 */
async function handleGetFiles(event: any) {
  const analysisId = event.pathParameters?.id;
  
  if (!analysisId) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  // Get repository metadata which contains file information
  const repoMetadata = await DB.getRepositoryMetadata(analysisId);
  
  if (!repoMetadata) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Repository metadata not found' })
    };
  }
  
  // Get file selection if exists
  const fileSelection = await DB.getFileSelection(analysisId);
  
  // Build file list with priorities
  const allFiles = buildFileListWithPriorities(repoMetadata, fileSelection);
  
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
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
      headers: CORS_HEADERS,
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
    headers: CORS_HEADERS,
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
      headers: CORS_HEADERS,
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
    headers: CORS_HEADERS,
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
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'analysisId is required' })
    };
  }
  
  // Get analysis
  const analysis = await DB.getAnalysis(analysisId);
  
  if (!analysis) {
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Analysis not found' })
    };
  }
  
  // Check if analysis is in a reprocessable state
  if (analysis.status === 'processing') {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Analysis is currently processing' })
    };
  }
  
  // Get file selection
  const fileSelection = await DB.getFileSelection(analysisId);
  
  if (!fileSelection || fileSelection.selectedFiles.length === 0) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
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
    headers: CORS_HEADERS,
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

