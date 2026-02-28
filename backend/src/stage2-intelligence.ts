import { Handler } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ProjectContextMap } from './types';
import { GroundingChecker } from './grounding-checker';
import * as DB from './db-utils';
import { v4 as uuidv4 } from 'uuid';

const bedrockClient = new BedrockRuntimeClient({ region: 'ap-southeast-1' });
const s3Client = new S3Client({});

const CACHE_BUCKET = process.env.CACHE_BUCKET!;
// Using Amazon Nova 2 Lite (Global) - cost-effective for deep reasoning
const MODEL_ID = 'global.amazon.nova-2-lite-v1:0';

/**
 * Utility: Ensure all items in array have IDs
 */
function ensureIdsInArray<T extends Record<string, any>>(
  array: T[] | undefined,
  idField: keyof T
): T[] {
  if (!array) return [];
  return array.map(item => ({
    ...item,
    [idField]: item[idField] || uuidv4()
  }));
}

interface Stage2Event {
  analysisId: string;
  projectContextMap: ProjectContextMap;
  s3Key: string;
}

interface Stage2Response {
  success: boolean;
  analysisId: string;
  intelligenceReport?: any;
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
    
    // Save to DynamoDB using db-utils
    await DB.saveIntelligenceReport(analysisId, intelligenceReport);
    
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
  
  // CRITICAL: Fail if no code was loaded
  if (fileContents.length === 0) {
    throw new Error('Failed to load any code files from S3 for Stage 2. Cannot generate intelligence report without code.');
  }
  
  return fileContents.join('\n\n');
}

async function generateIntelligenceReport(
  contextMap: ProjectContextMap,
  codeContext: string
): Promise<any> {
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
  "systemArchitecture": {
    "overview": "High-level architecture description...",
    "layers": [
      {
        "name": "Frontend",
        "components": ["Component1"],
        "responsibilities": ["Handle UI"],
        "fileReferences": [{"file": "src/app.js"}]
      }
    ],
    "componentDiagram": "",
    "dataFlowDiagram": "",
    "architecturalPatterns": [
      {
        "name": "MVC",
        "description": "Model-View-Controller pattern",
        "implementation": "Separates concerns",
        "fileReferences": [{"file": "src/controllers/"}]
      }
    ],
    "technologyStack": {
      "languages": {"JavaScript": 80, "Python": 20},
      "frameworks": ["React", "Express"],
      "databases": ["PostgreSQL"],
      "libraries": {"express": "4.18.2"},
      "devTools": ["webpack"]
    }
  },
  "designDecisions": [
    {
      "decisionId": "uuid",
      "title": "Used microservices architecture",
      "context": "Need for scalability",
      "decision": "Split into microservices",
      "rationale": "To enable independent scaling",
      "consequences": {
        "positive": ["Better scalability"],
        "negative": ["Increased complexity"],
        "mitigations": ["Use service mesh"]
      },
      "alternativesConsidered": [],
      "fileReferences": [{"file": "src/services/api.ts"}],
      "confidence": "high",
      "groundingEvidence": []
    }
  ],
  "technicalTradeoffs": [
    {
      "tradeoffId": "uuid",
      "aspect": "REST API vs GraphQL",
      "chosenApproach": "REST API",
      "tradeoffRationale": "Simpler to implement",
      "pros": ["Simpler", "Better caching"],
      "cons": ["Over-fetching"],
      "impact": {
        "performance": "neutral",
        "maintainability": "positive",
        "scalability": "neutral",
        "cost": "positive"
      },
      "fileReferences": [{"file": "src/api/"}]
    }
  ],
  "scalabilityAnalysis": {
    "currentCapacity": {
      "estimatedUsers": 1000,
      "estimatedRPS": 100,
      "dataVolumeGB": 10
    },
    "bottlenecks": [
      {
        "bottleneckId": "uuid",
        "area": "Database queries",
        "description": "N+1 query problem",
        "severity": "high",
        "estimatedImpact": "50% performance degradation",
        "fileReferences": [{"file": "src/models/user.ts"}]
      }
    ],
    "scalabilityLimitations": ["Single database"],
    "recommendedImprovements": [
      {
        "improvementId": "uuid",
        "recommendation": "Add caching",
        "impact": "high",
        "effort": "medium",
        "priority": 1,
        "implementation": "Use Redis",
        "estimatedGain": "2x performance"
      }
    ],
    "architecturalConstraints": []
  },
  "securityPosture": {
    "overallScore": 70,
    "vulnerabilities": [],
    "bestPractices": {
      "followed": ["Input validation"],
      "missing": ["Rate limiting"]
    },
    "sensitiveDataHandling": "Encrypted at rest",
    "authenticationMechanism": "JWT",
    "authorizationPattern": "RBAC"
  },
  "resumeBullets": [
    {
      "bulletId": "uuid",
      "text": "Built scalable REST API handling 10K+ requests/day",
      "category": "technical",
      "keywords": ["REST", "API", "scalable"],
      "verified": true
    }
  ],
  "groundingReport": {
    "totalClaims": 10,
    "verifiedClaims": 8,
    "inferredClaims": 2,
    "ungroundedClaims": 0,
    "overallConfidence": "high",
    "flaggedClaims": []
  },
  "modelMetadata": {
    "modelId": "${MODEL_ID}",
    "tokensIn": 0,
    "tokensOut": 0,
    "inferenceTimeMs": 0,
    "temperature": 0.4
  },
  "generatedAt": "${new Date().toISOString()}"
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
  
  const startTime = Date.now();
  const response = await bedrockClient.send(command);
  const inferenceTimeMs = Date.now() - startTime;
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  const content = responseBody.output?.message?.content?.[0]?.text || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from Bedrock response');
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  // Add UUIDs where missing using utility function
  parsed.designDecisions = ensureIdsInArray(parsed.designDecisions, 'decisionId');
  parsed.technicalTradeoffs = ensureIdsInArray(parsed.technicalTradeoffs, 'tradeoffId');
  parsed.resumeBullets = ensureIdsInArray(parsed.resumeBullets, 'bulletId');
  
  if (parsed.scalabilityAnalysis?.bottlenecks) {
    parsed.scalabilityAnalysis.bottlenecks = ensureIdsInArray(
      parsed.scalabilityAnalysis.bottlenecks,
      'bottleneckId'
    );
  }
  
  if (parsed.scalabilityAnalysis?.recommendedImprovements) {
    parsed.scalabilityAnalysis.recommendedImprovements = ensureIdsInArray(
      parsed.scalabilityAnalysis.recommendedImprovements,
      'improvementId'
    );
  }
  
  // Add metadata
  parsed.modelMetadata = {
    modelId: MODEL_ID,
    tokensIn: requestBody.inferenceConfig.max_new_tokens,
    tokensOut: content.length / 4,
    inferenceTimeMs,
    temperature: requestBody.inferenceConfig.temperature
  };
  
  parsed.generatedAt = new Date().toISOString();
  
  return parsed;
}
