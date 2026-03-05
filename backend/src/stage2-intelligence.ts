import { Handler } from 'aws-lambda';
import { callBedrockConverse, extractJson, MISTRAL_LARGE_MODEL } from './bedrock-client';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ProjectContextMap } from './types';
import { GroundingChecker } from './grounding-checker';
import * as DB from './db-utils';
import * as CostTracker from './cost-tracker';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({});

const CACHE_BUCKET = process.env.CACHE_BUCKET!;

// 🎯 USING MISTRAL LARGE 3 AS REQUESTED
const MODEL_ID = MISTRAL_LARGE_MODEL;

interface Stage2Event {
  analysisId: string;
  projectContextMap: ProjectContextMap;
  projectReview: any; // Output from Stage 1
  s3Key: string;
}

interface Stage2Response {
  success: boolean;
  analysisId: string;
  intelligenceReport?: any;
  error?: string;
}

export const handler: Handler<Stage2Event, Stage2Response> = async (event) => {
  const { analysisId, projectContextMap, projectReview, s3Key } = event;

  try {
    console.log(`Starting Stage 2 (Intelligence Report with Parallel Agents) for: ${analysisId}`);

    // Load comprehensive code context
    const codeContext = await loadCodeContext(s3Key, projectContextMap);

    if (!codeContext || codeContext.length < 100) {
      throw new Error('Insufficient code loaded from S3 for intelligence analysis');
    }

    console.log(`Loaded ${codeContext.length} characters of code for analysis`);

    // Run parallel agents for different aspects
    console.log('Launching parallel analysis agents...');
    const agentResults = await runParallelAgents(
      projectContextMap,
      projectReview,
      codeContext,
      analysisId
    );

    console.log('All agents completed. Synthesizing intelligence report...');

    // Synthesize final intelligence report from agent outputs
    const intelligenceReport = await synthesizeIntelligenceReport(
      agentResults,
      projectContextMap,
      projectReview,
      analysisId
    );

    // Save to DynamoDB
    await DB.saveIntelligenceReport(analysisId, intelligenceReport);

    console.log(`Stage 2 completed for: ${analysisId}`);
    console.log(`Agents run: ${agentResults.length}`);

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

/**
 * Load code context from S3
 */
async function loadCodeContext(s3KeyPrefix: string, contextMap: ProjectContextMap): Promise<string> {
  // Load comprehensive files for intelligence analysis
  const filesToLoad = [
    ...contextMap.entryPoints.slice(0, 4),
    ...contextMap.coreModules.slice(0, 10),
    ...contextMap.userCodeFiles.filter(f =>
      f.toLowerCase().includes('config') ||
      f.toLowerCase().includes('model') ||
      f.toLowerCase().includes('service')
    ).slice(0, 6)
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
      if (err.Code !== 'NoSuchKey') {
        console.error(`Error loading ${file}:`, err);
      }
    }
  }

  if (fileContents.length === 0) {
    throw new Error('Failed to load code files from S3');
  }

  return fileContents.join('\n\n');
}

/**
 * Run parallel agents for different aspects of intelligence gathering
 */
async function runParallelAgents(
  contextMap: ProjectContextMap,
  projectReview: any,
  codeContext: string,
  analysisId: string
): Promise<any[]> {

  // Define 5 specialized agents
  const agentPromises = [
    runArchitectureAgent(contextMap, projectReview, codeContext, analysisId),
    runDesignDecisionsAgent(contextMap, projectReview, codeContext, analysisId),
    runTradeoffsAgent(contextMap, projectReview, codeContext, analysisId),
    runScalabilityAgent(contextMap, projectReview, codeContext, analysisId),
    runResumeBulletsAgent(contextMap, projectReview, codeContext, analysisId)
  ];

  // Run all agents in parallel
  const results = await Promise.allSettled(agentPromises);

  // Extract successful results
  const successfulResults = results
    .map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Agent ${index} failed:`, result.reason);
        return null;
      }
    })
    .filter(Boolean);

  if (successfulResults.length === 0) {
    throw new Error('All agents failed to produce results');
  }

  return successfulResults;
}

/**
 * AGENT 1: Architecture Analysis
 */
async function runArchitectureAgent(
  contextMap: ProjectContextMap,
  projectReview: any,
  codeContext: string,
  analysisId: string
): Promise<any> {

  const prompt = `You are a Staff Software Architect analyzing a codebase to understand its system architecture.

REPOSITORY CONTEXT:
Languages: ${JSON.stringify(contextMap.languages || {})}
Frameworks: ${contextMap.frameworks.join(', ') || 'None'}
Entry Points: ${contextMap.entryPoints.join(', ') || 'None'}
Total Files: ${contextMap.userCodeFiles.length}

CODE SAMPLE:
${codeContext}

PROJECT REVIEW SUMMARY (from previous analysis):
Code Quality: ${projectReview.codeQuality?.overall || 'N/A'}/100
Architecture Clarity: ${projectReview.architectureClarity?.score || 'N/A'}/100
Design Patterns Found: ${projectReview.architectureClarity?.designPatterns?.map((p: any) => p.name).join(', ') || 'None'}

YOUR TASK: Deep dive into the system architecture.

Analyze and return ONLY valid JSON in this exact format:

{
  "systemArchitecture": {
    "overview": "2-3 sentence high-level description of the architecture",
    "layers": [
      {
        "name": "Layer name (e.g., Presentation, Business Logic, Data Access)",
        "components": ["Component 1", "Component 2"],
        "responsibilities": ["What this layer does", "Key responsibilities"],
        "fileReferences": [{"file": "exact/path/to/file.ext"}]
      }
    ],
    "componentDiagram": "Text description of component relationships (e.g., Client -> API -> Database)",
    "dataFlowDiagram": "Text description of data flow through the system",
    "architecturalPatterns": [
      {
        "name": "Pattern name (e.g., MVC, Microservices, Event-Driven)",
        "description": "How this pattern is implemented",
        "implementation": "Specific details of implementation",
        "fileReferences": [{"file": "path/to/file"}]
      }
    ],
    "technologyStack": {
      "languages": ${JSON.stringify(contextMap.languages || {})},
      "frameworks": ${JSON.stringify(contextMap.frameworks || [])},
      "databases": ["List databases detected"],
      "libraries": {"library-name": "version if known"},
      "devTools": ["Docker", "Make", etc.]
    }
  }
}

CRITICAL RULES:
1. Only reference files from the code provided
2. Be specific about what you see, not what you assume
3. If you see a pattern, prove it with file references
4. Return ONLY valid JSON, no markdown, no explanation
5. Keep descriptions concise but informative`;

  const response = await callBedrockConverse(prompt, MODEL_ID, { temperature: 0.4, maxTokens: 3000 });

  await CostTracker.trackAiCall({
    analysisId,
    stage: 'intelligence_report',
    modelId: MODEL_ID,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    inferenceTimeMs: response.inferenceTimeMs,
    promptLength: prompt.length,
    responseLength: response.text.length
  });

  console.log('Architecture agent completed');

  return parseAgentResponse(response.text, 'architecture');
}

/**
 * AGENT 2: Design Decisions Analysis
 */
async function runDesignDecisionsAgent(
  contextMap: ProjectContextMap,
  projectReview: any,
  codeContext: string,
  analysisId: string
): Promise<any> {

  const prompt = `You are a Principal Engineer analyzing design decisions made in this codebase.

REPOSITORY CONTEXT:
Frameworks: ${contextMap.frameworks.join(', ') || 'None'}
Languages: ${JSON.stringify(contextMap.languages || {})}

CODE SAMPLE:
${codeContext}

YOUR TASK: Identify 5-8 key design decisions made by the engineer.

For each decision, answer:
- What was the context/problem?
- What decision was made?
- Why was this approach chosen?
- What are the consequences (pros/cons)?
- What alternatives could have been considered?

Return ONLY valid JSON:

{
  "designDecisions": [
    {
      "decisionId": "dec-01",
      "title": "Short title (e.g., 'Use of Redis for Caching')",
      "context": "What problem needed solving",
      "decision": "What was chosen",
      "rationale": "Why this was chosen",
      "consequences": {
        "positive": ["Pro 1", "Pro 2"],
        "negative": ["Con 1", "Con 2"],
        "mitigations": ["How cons are addressed"]
      },
      "alternativesConsidered": ["Alternative 1", "Alternative 2"],
      "fileReferences": [{"file": "path/to/file"}],
      "confidence": "high|medium|low",
      "groundingEvidence": ["What in the code proves this decision was made"]
    }
  ]
}

CRITICAL RULES:
1. Only analyze decisions YOU CAN SEE in the code
2. Don't invent decisions that aren't evident
3. Provide file references as proof
4. Focus on architectural/technical decisions, not trivial ones
5. Return ONLY JSON, no markdown`;

  const response = await callBedrockConverse(prompt, MODEL_ID, { temperature: 0.5, maxTokens: 3000 });

  await CostTracker.trackAiCall({
    analysisId,
    stage: 'intelligence_report',
    modelId: MODEL_ID,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    inferenceTimeMs: response.inferenceTimeMs,
    promptLength: prompt.length,
    responseLength: response.text.length
  });

  console.log('Design decisions agent completed');

  return parseAgentResponse(response.text, 'designDecisions');
}

/**
 * AGENT 3: Technical Tradeoffs Analysis
 */
async function runTradeoffsAgent(
  contextMap: ProjectContextMap,
  projectReview: any,
  codeContext: string,
  analysisId: string
): Promise<any> {

  const prompt = `You are a Tech Lead analyzing technical tradeoffs in this codebase.

CODE SAMPLE:
${codeContext}

YOUR TASK: Identify 3-5 significant technical tradeoffs made in this project.

A tradeoff is where the engineer chose X over Y, gaining some benefits but accepting some costs.

Return ONLY valid JSON:

{
  "technicalTradeoffs": [
    {
      "tradeoffId": "trd-01",
      "aspect": "What aspect (e.g., 'REST vs GraphQL', 'SQL vs NoSQL')",
      "chosenApproach": "What was chosen",
      "tradeoffRationale": "Why this choice makes sense",
      "pros": ["Advantage 1", "Advantage 2"],
      "cons": ["Disadvantage 1", "Disadvantage 2"],
      "impact": {
        "performance": "positive|negative|neutral",
        "maintainability": "positive|negative|neutral",
        "scalability": "positive|negative|neutral",
        "cost": "positive|negative|neutral"
      },
      "fileReferences": [{"file": "path/to/file"}]
    }
  ]
}

CRITICAL RULES:
1. Only analyze tradeoffs you can actually see in the code
2. Be balanced - every choice has pros AND cons
3. Focus on significant tradeoffs, not trivial ones
4. Provide evidence with file references
5. Return ONLY JSON`;

  const response = await callBedrockConverse(prompt, MODEL_ID, { temperature: 0.5, maxTokens: 2500 });

  await CostTracker.trackAiCall({
    analysisId,
    stage: 'intelligence_report',
    modelId: MODEL_ID,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    inferenceTimeMs: response.inferenceTimeMs,
    promptLength: prompt.length,
    responseLength: response.text.length
  });

  console.log('Tradeoffs agent completed');

  return parseAgentResponse(response.text, 'tradeoffs');
}

/**
 * AGENT 4: Scalability Analysis
 */
async function runScalabilityAgent(
  contextMap: ProjectContextMap,
  projectReview: any,
  codeContext: string,
  analysisId: string
): Promise<any> {

  const prompt = `You are a Staff Engineer analyzing scalability characteristics of this system.

CODE SAMPLE:
${codeContext}

PROJECT REVIEW:
Performance Score: ${projectReview.codeQuality?.performance || 'N/A'}/100

YOUR TASK: Analyze scalability - bottlenecks, limitations, and improvement opportunities.

Return ONLY valid JSON:

{
  "scalabilityAnalysis": {
    "currentCapacity": {
      "estimatedUsers": "Rough estimate based on architecture",
      "estimatedRPS": "Requests per second estimate",
      "dataVolumeGB": "Data volume the system can handle"
    },
    "bottlenecks": [
      {
        "bottleneckId": "bot-01",
        "area": "Where the bottleneck is",
        "description": "Detailed description of the bottleneck",
        "severity": "critical|high|medium|low",
        "estimatedImpact": "What happens when hit",
        "fileReferences": [{"file": "path/to/file"}]
      }
    ],
    "scalabilityLimitations": ["Limitation 1", "Limitation 2"],
    "recommendedImprovements": [
      {
        "improvementId": "imp-01",
        "recommendation": "What to do",
        "impact": "high|medium|low",
        "effort": "high|medium|low",
        "priority": 1-5,
        "implementation": "How to implement",
        "estimatedGain": "Expected improvement"
      }
    ],
    "architecturalConstraints": ["Constraint 1", "Constraint 2"]
  },
  "securityPosture": {
    "overallScore": ${projectReview.codeQuality?.security || 65},
    "vulnerabilities": [],
    "bestPractices": {
      "followed": ["Practice 1", "Practice 2"],
      "missing": ["Missing 1", "Missing 2"]
    },
    "sensitiveDataHandling": "How sensitive data is handled",
    "authenticationMechanism": "What auth is used",
    "authorizationPattern": "How authorization works"
  }
}

CRITICAL RULES:
1. Be realistic about capacity estimates
2. Only flag bottlenecks you can see in the code
3. Prioritize high-impact improvements
4. Provide file references as evidence
5. Return ONLY JSON`;

  const response = await callBedrockConverse(prompt, MODEL_ID, { temperature: 0.4, maxTokens: 2500 });

  await CostTracker.trackAiCall({
    analysisId,
    stage: 'intelligence_report',
    modelId: MODEL_ID,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    inferenceTimeMs: response.inferenceTimeMs,
    promptLength: prompt.length,
    responseLength: response.text.length
  });

  console.log('Scalability agent completed');

  return parseAgentResponse(response.text, 'scalability');
}

/**
 * AGENT 5: Resume Bullets Generator
 */
async function runResumeBulletsAgent(
  contextMap: ProjectContextMap,
  projectReview: any,
  codeContext: string,
  analysisId: string
): Promise<any> {

  const prompt = `You are a career coach writing resume bullets for a software engineer.

PROJECT CONTEXT:
Languages: ${JSON.stringify(contextMap.languages || {})}
Frameworks: ${contextMap.frameworks.join(', ') || 'None'}
Code Quality: ${projectReview.codeQuality?.overall || 'N/A'}/100
Complexity: ${projectReview.employabilitySignal?.complexity || 'moderate'}

CODE SAMPLE:
${codeContext}

YOUR TASK: Generate 10-15 resume bullets based on what this engineer actually built.

Resume bullet formula:
[Action Verb] + [What You Built] + [Technologies Used] + [Quantified Impact/Scale]

Examples of GOOD bullets:
- "Architected microservices-based e-commerce platform using Node.js and PostgreSQL, handling 50K+ daily transactions"
- "Engineered real-time data pipeline processing 2M events/day with Apache Kafka and Python"

Examples of BAD bullets:
- "Built a website" (too vague)
- "Used React and Node.js" (just tech list, no achievement)
- "Implemented features" (no specifics)

Return ONLY valid JSON:

{
  "resumeBullets": [
    {
      "bulletId": "res-01",
      "text": "Complete resume bullet text",
      "category": "architecture|technical|performance|leadership",
      "keywords": ["keyword1", "keyword2"],
      "verified": true
    }
  ]
}

CRITICAL RULES:
1. Base bullets on ACTUAL code evidence
2. Include specific technologies used
3. Quantify when possible (users, RPS, data volume)
4. Use strong action verbs (Architected, Engineered, Designed, Optimized)
5. Make it sound impressive but honest
6. Return ONLY JSON`;

  const response = await callBedrockConverse(prompt, MODEL_ID, { temperature: 0.6, maxTokens: 2000 });

  await CostTracker.trackAiCall({
    analysisId,
    stage: 'intelligence_report',
    modelId: MODEL_ID,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    inferenceTimeMs: response.inferenceTimeMs,
    promptLength: prompt.length,
    responseLength: response.text.length
  });

  console.log('Resume bullets agent completed');

  return parseAgentResponse(response.text, 'resumeBullets');
}

/**
 * Synthesize final intelligence report from all agent outputs
 */
async function synthesizeIntelligenceReport(
  agentResults: any[],
  contextMap: ProjectContextMap,
  projectReview: any,
  analysisId: string
): Promise<any> {

  console.log('Synthesizing final report from agent outputs...');

  // Extract agent outputs
  const architectureResult = agentResults.find(r => r.type === 'architecture');
  const designDecisionsResult = agentResults.find(r => r.type === 'designDecisions');
  const tradeoffsResult = agentResults.find(r => r.type === 'tradeoffs');
  const scalabilityResult = agentResults.find(r => r.type === 'scalability');
  const resumeBulletsResult = agentResults.find(r => r.type === 'resumeBullets');

  // Validate grounding
  const groundingChecker = new GroundingChecker();
  const allFileReferences = extractAllFileReferences(agentResults);
  const groundingReport = groundingChecker.validateFileReferences(
    allFileReferences,
    contextMap.userCodeFiles
  );

  console.log(`Grounding validation: ${groundingReport.validReferences.length}/${allFileReferences.length} valid`);

  // Build final report
  const intelligenceReport = {
    systemArchitecture: architectureResult?.data?.systemArchitecture || {
      overview: 'Architecture analysis unavailable',
      layers: [],
      architecturalPatterns: []
    },

    designDecisions: designDecisionsResult?.data?.designDecisions || [],

    technicalTradeoffs: tradeoffsResult?.data?.technicalTradeoffs || [],

    scalabilityAnalysis: scalabilityResult?.data?.scalabilityAnalysis || {
      bottlenecks: [],
      recommendedImprovements: []
    },

    securityPosture: scalabilityResult?.data?.securityPosture || {
      overallScore: projectReview.codeQuality?.security || 65,
      bestPractices: { followed: [], missing: [] }
    },

    resumeBullets: resumeBulletsResult?.data?.resumeBullets || [],

    groundingReport: {
      totalClaims: allFileReferences.length,
      verifiedClaims: groundingReport.validReferences.length,
      inferredClaims: 0,
      ungroundedClaims: groundingReport.invalidReferences.length,
      overallConfidence: groundingReport.validReferences.length / Math.max(allFileReferences.length, 1) > 0.8 ? 'high' : 'medium',
      flaggedClaims: groundingReport.invalidReferences
    },

    modelMetadata: {
      modelId: MODEL_ID,
      agentsUsed: 5,
      successfulAgents: agentResults.length,
      temperature: 0.4
    },

    generatedAt: new Date().toISOString()
  };

  return intelligenceReport;
}

/**
 * Parse agent response and extract JSON
 */
function parseAgentResponse(content: string, agentType: string): any {
  const parsed = extractJson(content);

  if (!parsed) {
    console.error(`Failed to extra JSON from ${agentType} agent response`);
    return { type: agentType, data: null, error: 'JSON extraction failed' };
  }

  return {
    type: agentType,
    data: parsed,
    error: null
  };
}

/**
 * Extract all file references from agent results for grounding validation
 */
function extractAllFileReferences(agentResults: any[]): string[] {
  const references: string[] = [];

  for (const result of agentResults) {
    if (!result.data) continue;

    const data = result.data;

    // Extract from various structures
    const extractFromObject = (obj: any) => {
      if (Array.isArray(obj)) {
        obj.forEach(extractFromObject);
      } else if (obj && typeof obj === 'object') {
        if (obj.fileReferences && Array.isArray(obj.fileReferences)) {
          obj.fileReferences.forEach((ref: any) => {
            if (ref.file) references.push(ref.file);
          });
        }
        Object.values(obj).forEach(extractFromObject);
      }
    };

    extractFromObject(data);
  }

  return [...new Set(references)]; // Deduplicate
}
