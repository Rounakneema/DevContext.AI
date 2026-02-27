import { Handler } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ProjectReview, ProjectContextMap } from './types';
import { GroundingChecker } from './grounding-checker';

const bedrockClient = new BedrockRuntimeClient({ region: 'ap-southeast-1' });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});

const ANALYSES_TABLE = process.env.ANALYSES_TABLE!;
const CACHE_BUCKET = process.env.CACHE_BUCKET!;
// Using Amazon Nova 2 Lite (Global) - verified working, no payment required
const MODEL_ID = 'global.amazon.nova-2-lite-v1:0';

interface Stage1Event {
  analysisId: string;
  projectContextMap: ProjectContextMap;
  s3Key: string;
  codeContext?: string; // NEW: Pre-loaded code context from repo processor
}

interface Stage1Response {
  success: boolean;
  analysisId: string;
  projectReview?: ProjectReview;
  error?: string;
}

export const handler: Handler<Stage1Event, Stage1Response> = async (event) => {
  const { analysisId, projectContextMap, s3Key, codeContext } = event;
  
  try {
    console.log(`Starting Stage 1 analysis for: ${analysisId}`);
    
    // Use pre-loaded code context if available, otherwise load from S3
    const code = codeContext || await loadCodeContext(s3Key, projectContextMap);
    
    // Generate project review using Bedrock
    const projectReview = await generateProjectReview(projectContextMap, code);
    
    // Validate grounding
    const groundingChecker = new GroundingChecker();
    const groundingResult = groundingChecker.validateProjectReview(projectReview, projectContextMap);
    
    console.log('Grounding validation:', groundingResult);
    console.log(groundingChecker.generateReport(groundingResult));
    
    // Handle insufficient grounding
    if (groundingResult.confidence === 'insufficient') {
      console.warn('⚠️ Insufficient grounding detected. Invalid references:', groundingResult.invalidReferences);
      // Log but continue - we'll improve this in self-correction loop
    }
    
    // Save to DynamoDB
    await saveProjectReview(analysisId, projectReview);
    
    console.log(`Stage 1 completed for: ${analysisId}`);
    
    return {
      success: true,
      analysisId,
      projectReview
    };
    
  } catch (error) {
    console.error('Stage 1 failed:', error);
    
    return {
      success: false,
      analysisId,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

async function loadCodeContext(s3KeyPrefix: string, contextMap: ProjectContextMap): Promise<string> {
  // Load up to 10 key files for analysis
  const filesToLoad = [
    ...contextMap.entryPoints.slice(0, 3),
    ...contextMap.coreModules.slice(0, 7)
  ].slice(0, 10);
  
  const fileContents: string[] = [];
  
  for (const file of filesToLoad) {
    try {
      const command = new GetObjectCommand({
        Bucket: CACHE_BUCKET,
        Key: `${s3KeyPrefix}${file}`
      });
      
      const response = await s3Client.send(command);
      const content = await response.Body?.transformToString();
      
      if (content) {
        // Truncate large files
        const truncated = content.length > 5000 ? content.substring(0, 5000) + '\n... (truncated)' : content;
        fileContents.push(`\n--- File: ${file} ---\n${truncated}`);
      }
    } catch (err: any) {
      // Log but continue - some files might not exist in S3
      if (err.Code === 'NoSuchKey') {
        console.warn(`File not found in S3: ${file}`);
      } else {
        console.error(`Error loading ${file}:`, err);
      }
    }
  }
  
  // If no files were loaded, return a minimal context
  if (fileContents.length === 0) {
    return `Project has ${contextMap.totalFiles} files. Frameworks: ${contextMap.frameworks.join(', ') || 'None'}`;
  }
  
  return fileContents.join('\n\n');
}

async function generateProjectReview(
  contextMap: ProjectContextMap,
  codeContext: string
): Promise<ProjectReview> {
  const prompt = `You are an expert code reviewer evaluating a GitHub repository for hiring purposes.

Repository Context:
- Total Files: ${contextMap.totalFiles}
- User Code Files: ${contextMap.userCodeFiles.length}
- Entry Points: ${contextMap.entryPoints.join(', ') || 'None detected'}
- Frameworks: ${contextMap.frameworks.join(', ') || 'None detected'}
- Core Modules: ${contextMap.coreModules.length}

Code Sample:
${codeContext}

Task: Generate a comprehensive project review covering:
1. Code Quality (0-100): Readability, maintainability, best practices
2. Employability Signal (0-100): Production readiness, professional standards
3. Strengths: Specific positive patterns with file references
4. Improvement Areas: 3-5 actionable suggestions
5. Project Authenticity: Based on available information

Be direct and honest. If code quality is poor (below 40), explain specific issues.
Reference specific files for all claims.

Respond in JSON format:
{
  "codeQuality": {
    "score": 75,
    "readability": 80,
    "maintainability": 70,
    "bestPractices": 75,
    "justification": "Clear variable names and consistent formatting..."
  },
  "employabilitySignal": {
    "score": 70,
    "justification": "Demonstrates solid fundamentals...",
    "productionReadiness": "Needs error handling and tests..."
  },
  "strengths": [
    {
      "pattern": "Clean separation of concerns",
      "description": "Well-organized module structure",
      "fileReferences": ["src/main.py", "src/utils.py"]
    }
  ],
  "improvementAreas": [
    {
      "issue": "Missing error handling",
      "priority": "high",
      "actionableSuggestion": "Add try-catch blocks in API calls",
      "codeExample": "try { await api.call() } catch (err) { handleError(err) }"
    }
  ],
  "projectAuthenticity": {
    "score": 75,
    "commitDiversity": "Moderate - appears to be genuine development",
    "warning": null
  }
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
      max_new_tokens: 3000,
      temperature: 0.3
    }
  };
  
  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody)
  });
  
  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  // Extract JSON from response (Amazon Nova format)
  const content = responseBody.output?.message?.content?.[0]?.text || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from Bedrock response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

async function saveProjectReview(analysisId: string, projectReview: ProjectReview): Promise<void> {
  const command = new UpdateCommand({
    TableName: ANALYSES_TABLE,
    Key: { analysisId },
    UpdateExpression: 'SET projectReview = :review, completedStages = list_append(if_not_exists(completedStages, :empty), :stage), updatedAt = :now',
    ExpressionAttributeValues: {
      ':review': projectReview,
      ':stage': ['project_review'],
      ':empty': [],
      ':now': new Date().toISOString()
    }
  });
  
  await dynamoClient.send(command);
}
