import { Handler } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { IntelligenceReport, ProjectContextMap, DesignDecision, TechnicalTradeoff, ScalabilityAnalysis } from './types';
import { GroundingChecker } from './grounding-checker';

const bedrockClient = new BedrockRuntimeClient({ region: 'ap-southeast-1' });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});

const ANALYSES_TABLE = process.env.ANALYSES_TABLE!;
const CACHE_BUCKET = process.env.CACHE_BUCKET!;
// Using Amazon Nova 2 Lite for complex reasoning (best available without payment)
const MODEL_ID = 'global.amazon.nova-2-lite-v1:0';

interface Stage2Event {
  analysisId: string;
  projectContextMap: ProjectContextMap;
  s3Key: string;
}

interface Stage2Response {
  success: boolean;
  analysisId: string;
  intelligenceReport?: IntelligenceReport;
  error?: string;
}

export const handler: Handler<Stage2Event, Stage2Response> = async (event) => {
  const { analysisId, projectContextMap, s3Key } = event;
  
  try {
    console.log(`Starting Stage 2 (Intelligence Report) for: ${analysisId}`);
    
    // Load code context
    const codeContext = await loadCodeContext(s3Key, projectContextMap);
    
    // Generate intelligence report using Chain-of-Thought
    const intelligenceReport = await generateIntelligenceReport(
      projectContextMap,
      codeContext
    );
    
    // Validate grounding
    const groundingChecker = new GroundingChecker();
    const groundingResult = groundingChecker.validateIntelligenceReport(
      intelligenceReport,
      projectContextMap.userCodeFiles
    );
    
    console.log('Grounding validation:', groundingResult);
    
    if (groundingResult.confidence === 'insufficient') {
      console.warn('⚠️ Insufficient grounding detected in intelligence report');
    }
    
    // Save to DynamoDB
    await saveIntelligenceReport(analysisId, intelligenceReport);
    
    console.log(`Stage 2 completed for: ${analysisId}`);
    
    return {
      success: true,
      analysisId,
      intelligenceReport
    };
    
  } catch (error) {
    console.error('Stage 2 failed:', error);
    
    return {
      success: false,
      analysisId,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

async function loadCodeContext(s3KeyPrefix: string, contextMap: ProjectContextMap): Promise<string> {
  // Load more files for architecture analysis
  const filesToLoad = [
    ...contextMap.entryPoints.slice(0, 5),
    ...contextMap.coreModules.slice(0, 10)
  ].slice(0, 15);
  
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
        const truncated = content.length > 4000 ? content.substring(0, 4000) + '\n... (truncated)' : content;
        fileContents.push(`\n--- File: ${file} ---\n${truncated}`);
      }
    } catch (err: any) {
      if (err.Code === 'NoSuchKey') {
        console.warn(`File not found in S3: ${file}`);
      } else {
        console.error(`Error loading ${file}:`, err);
      }
    }
  }
  
  if (fileContents.length === 0) {
    return `Project has ${contextMap.totalFiles} files. Frameworks: ${contextMap.frameworks.join(', ') || 'None'}`;
  }
  
  return fileContents.join('\n\n');
}

async function generateIntelligenceReport(
  contextMap: ProjectContextMap,
  codeContext: string
): Promise<IntelligenceReport> {
  const prompt = `You are a senior software architect analyzing a codebase for an engineering intelligence report.

Repository Context:
- Total Files: ${contextMap.totalFiles}
- User Code Files: ${contextMap.userCodeFiles.length}
- Entry Points: ${contextMap.entryPoints.join(', ') || 'None'}
- Frameworks: ${contextMap.frameworks.join(', ') || 'None'}
- Core Modules: ${contextMap.coreModules.slice(0, 10).join(', ')}

Code Sample:
${codeContext}

Task: Perform a deep architectural analysis using Chain-of-Thought reasoning.

1. **Architecture Reconstruction**: Describe the overall system architecture, component interactions, and data flow patterns.

2. **Design Decisions** (at least 5): Identify key architectural and design choices made in this codebase. For each:
   - What decision was made?
   - Why was it likely chosen?
   - What are the implications?
   - Reference specific files

3. **Technical Trade-offs** (at least 3): Analyze major trade-offs in the design:
   - What was traded off?
   - Pros and cons
   - Impact on the system

4. **Scalability Analysis**: Identify potential bottlenecks and scalability concerns:
   - Current limitations
   - Scaling strategies needed
   - Performance considerations

5. **Resume Bullets** (5-7): Generate professional bullet points suitable for a resume/LinkedIn:
   - Start with action verbs
   - Quantify where possible
   - Highlight technical skills and impact
   - Keep each under 150 characters

Respond in JSON format:
{
  "architectureOverview": {
    "description": "High-level architecture description...",
    "components": ["Component1", "Component2"],
    "dataFlow": "Description of how data flows through the system...",
    "patterns": ["Pattern1", "Pattern2"]
  },
  "designDecisions": [
    {
      "decision": "Used microservices architecture",
      "rationale": "To enable independent scaling and deployment",
      "implications": "Increased complexity but better scalability",
      "fileReferences": ["src/services/api.ts", "src/services/auth.ts"],
      "confidence": "high"
    }
  ],
  "technicalTradeoffs": [
    {
      "tradeoff": "REST API vs GraphQL",
      "chosenApproach": "REST API",
      "pros": ["Simpler to implement", "Better caching"],
      "cons": ["Over-fetching data", "Multiple endpoints"],
      "impact": "Moderate - affects API design and client complexity"
    }
  ],
  "scalabilityAnalysis": {
    "currentLimitations": ["Single database instance", "Synchronous processing"],
    "bottlenecks": [
      {
        "area": "Database queries",
        "description": "N+1 query problem in user data fetching",
        "severity": "high",
        "fileReferences": ["src/models/user.ts"]
      }
    ],
    "recommendations": ["Implement caching layer", "Add database read replicas"]
  },
  "resumeBullets": [
    "Built scalable REST API handling 10K+ requests/day using Node.js and Express",
    "Implemented JWT authentication with role-based access control",
    "Designed microservices architecture enabling independent team deployment"
  ]
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
      max_new_tokens: 4000,
      temperature: 0.4
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
  
  const content = responseBody.output?.message?.content?.[0]?.text || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from Bedrock response');
  }
  
  return JSON.parse(jsonMatch[0]);
}

async function saveIntelligenceReport(
  analysisId: string,
  intelligenceReport: IntelligenceReport
): Promise<void> {
  const command = new UpdateCommand({
    TableName: ANALYSES_TABLE,
    Key: { analysisId },
    UpdateExpression: 'SET intelligenceReport = :report, completedStages = list_append(if_not_exists(completedStages, :empty), :stage), updatedAt = :now',
    ExpressionAttributeValues: {
      ':report': intelligenceReport,
      ':stage': ['intelligence_report'],
      ':empty': [],
      ':now': new Date().toISOString()
    }
  });
  
  await dynamoClient.send(command);
}
