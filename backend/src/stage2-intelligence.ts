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

  const prompt = `You are a Principal Software Architect at a FAANG company. You have 20+ years of experience and are conducting an in-depth architecture review of a candidate's codebase. Your analysis must be evidence-based, referencing specific files and code patterns you observe.

═══════════════════════════════════════════════════════════
                    REPOSITORY METADATA
═══════════════════════════════════════════════════════════
Languages: ${JSON.stringify(contextMap.languages || {})}
Frameworks: ${(contextMap.frameworks || []).join(', ') || 'None detected'}
Entry Points: ${(contextMap.entryPoints || []).join(', ') || 'None detected'}
Core Modules: ${(contextMap.coreModules || []).join(', ') || 'None detected'}
Total User Code Files: ${(contextMap.userCodeFiles || []).length}
File List: ${(contextMap.userCodeFiles || []).slice(0, 30).join(', ')}${(contextMap.userCodeFiles || []).length > 30 ? ` ... and ${(contextMap.userCodeFiles || []).length - 30} more` : ''}

═══════════════════════════════════════════════════════════
              STAGE 1 PROJECT REVIEW RESULTS
═══════════════════════════════════════════════════════════
Overall Code Quality: ${projectReview?.codeQuality?.overall ?? 'N/A'}/100
  ├─ Readability:      ${projectReview?.codeQuality?.readability ?? 'N/A'}/100
  ├─ Maintainability:  ${projectReview?.codeQuality?.maintainability ?? 'N/A'}/100
  ├─ Error Handling:   ${projectReview?.codeQuality?.errorHandling ?? 'N/A'}/100
  ├─ Security:         ${projectReview?.codeQuality?.security ?? 'N/A'}/100
  ├─ Performance:      ${projectReview?.codeQuality?.performance ?? 'N/A'}/100
  └─ Documentation:    ${projectReview?.codeQuality?.documentation ?? 'N/A'}/100
Quality Justification: ${projectReview?.codeQuality?.justification ?? 'None'}

Architecture Clarity Score: ${projectReview?.architectureClarity?.score ?? 'N/A'}/100
  ├─ Component Organization: ${projectReview?.architectureClarity?.componentOrganization ?? 'N/A'}
  ├─ Separation of Concerns: ${projectReview?.architectureClarity?.separationOfConcerns ?? 'N/A'}
  ├─ Design Patterns Found: ${projectReview?.architectureClarity?.designPatterns?.join(', ') ?? 'None'}
  └─ Anti-Patterns Detected: ${projectReview?.architectureClarity?.antiPatterns?.join(', ') ?? 'None'}

Employability Signal: ${projectReview?.employabilitySignal?.overall ?? 'N/A'}/100
  ├─ Complexity Level: ${projectReview?.employabilitySignal?.complexity ?? 'N/A'}
  ├─ Production Readiness: ${projectReview?.employabilitySignal?.productionReadiness ?? 'N/A'}/100
  └─ Company Tier Match: Big Tech=${projectReview?.employabilitySignal?.companyTierMatch?.bigTech ?? 'N/A'}% | Product=${projectReview?.employabilitySignal?.companyTierMatch?.productCompanies ?? 'N/A'}% | Startup=${projectReview?.employabilitySignal?.companyTierMatch?.startups ?? 'N/A'}%

KEY STRENGTHS IDENTIFIED:
${(projectReview?.strengths || []).slice(0, 5).map((s: any) => `  ✓ [${s.impact?.toUpperCase() || 'MEDIUM'}] ${s.pattern}: ${s.description}`).join('\n') || '  None identified'}

KEY WEAKNESSES IDENTIFIED:
${(projectReview?.weaknesses || []).slice(0, 5).map((w: any) => `  ✗ [${w.severity?.toUpperCase() || 'MEDIUM'}] ${w.issue}: ${w.impact}`).join('\n') || '  None identified'}

CRITICAL ISSUES:
${(projectReview?.criticalIssues || []).slice(0, 3).map((c: any) => `  ⚠ [${c.category}] ${c.description}`).join('\n') || '  None found'}

═══════════════════════════════════════════════════════════
                     SOURCE CODE
═══════════════════════════════════════════════════════════
${codeContext}

═══════════════════════════════════════════════════════════
                     YOUR ANALYSIS TASK
═══════════════════════════════════════════════════════════
Perform a comprehensive architecture deep-dive. You must:

1. LAYER IDENTIFICATION: Identify every architectural layer (Presentation, API, Business Logic, Data Access, Infrastructure). For each layer, identify specific components, their responsibilities, and which files implement them.

2. ARCHITECTURAL PATTERNS: Detect all architectural patterns (MVC, MVP, MVVM, Clean Architecture, Hexagonal, Event-Driven, Microservices, Monolith, Serverless, etc.). Explain exactly HOW each pattern is implemented with file-level evidence.

3. DATA FLOW: Trace the complete data flow from user input to database and back. Identify how data transforms at each layer.

4. COMPONENT DIAGRAM: Describe relationships between all major components. Which components depend on which? Are there circular dependencies?

5. TECHNOLOGY STACK: Catalog every technology used — languages, frameworks, databases, message queues, caching layers, dev tools, CI/CD tools, containerization.

Return ONLY valid JSON in this exact format:

{
  "systemArchitecture": {
    "overview": "3-5 sentence comprehensive description of the overall architecture",
    "layers": [
      {
        "name": "Layer name (e.g., Presentation, API Gateway, Business Logic, Data Access, Infrastructure)",
        "components": ["Specific component names found in code"],
        "responsibilities": ["Detailed responsibility 1", "Detailed responsibility 2"],
        "fileReferences": [{"file": "exact/path/to/file.ext"}]
      }
    ],
    "componentDiagram": "A valid Mermaid.js graph TD diagram string representing the component relationships. MUST start with 'graph TD' or 'flowchart TD'. NO plain text explanations. Do not use markdown backticks.",
    "dataFlowDiagram": "A valid Mermaid.js sequenceDiagram string representing the step-by-step data flow through the system. MUST start with 'sequenceDiagram'. NO plain text explanations. Do not use markdown backticks.",
    "architecturalPatterns": [
      {
        "name": "Pattern name",
        "description": "How this pattern is implemented in this specific codebase",
        "implementation": "Specific implementation details with file references",
        "fileReferences": [{"file": "path/to/file"}]
      }
    ],
    "technologyStack": {
      "languages": ${JSON.stringify(contextMap.languages || {})},
      "frameworks": ${JSON.stringify(contextMap.frameworks || [])},
      "databases": ["List all databases detected from code, imports, config files"],
      "libraries": {"library-name": "version if known from package.json"},
      "devTools": ["Docker", "Makefile", "ESLint", "Prettier", etc.],
      "infrastructure": ["AWS Lambda", "S3", "DynamoDB", etc.]
    }
  }
}

GROUNDING RULES (MANDATORY):
1. ONLY reference files that appear in the File List or CODE section above
2. Every claim must be backed by specific file evidence
3. If you're unsure about a pattern, mark it clearly and explain your reasoning
4. Prefer specificity over generality — "Express.js REST API with JWT middleware" beats "Backend API"
5. Return ONLY valid JSON, no markdown fences, no explanation text`;


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

  const prompt = `You are a Distinguished Engineer at a top-tier tech company analyzing the key design decisions embedded in a codebase. You specialize in reverse-engineering architectural intent from code artifacts. Your goal is to identify the WHY behind every significant technical choice.

═══════════════════════════════════════════════════════════
                    REPOSITORY METADATA
═══════════════════════════════════════════════════════════
Frameworks: ${(contextMap.frameworks || []).join(', ') || 'None detected'}
Languages: ${JSON.stringify(contextMap.languages || {})}
Entry Points: ${(contextMap.entryPoints || []).join(', ') || 'None detected'}
Core Modules: ${(contextMap.coreModules || []).join(', ') || 'None detected'}
File List: ${(contextMap.userCodeFiles || []).slice(0, 25).join(', ')}

═══════════════════════════════════════════════════════════
              STAGE 1 PROJECT REVIEW CONTEXT
═══════════════════════════════════════════════════════════
Overall Code Quality: ${projectReview?.codeQuality?.overall ?? 'N/A'}/100
Architecture Clarity: ${projectReview?.architectureClarity?.score ?? 'N/A'}/100
Design Patterns Found: ${projectReview?.architectureClarity?.designPatterns?.join(', ') ?? 'None'}
Anti-Patterns Detected: ${projectReview?.architectureClarity?.antiPatterns?.join(', ') ?? 'None'}
Complexity Level: ${projectReview?.employabilitySignal?.complexity ?? 'N/A'}
Production Readiness: ${projectReview?.employabilitySignal?.productionReadiness ?? 'N/A'}/100

KEY STRENGTHS:
${(projectReview?.strengths || []).slice(0, 5).map((s: any) => `  ✓ ${s.pattern}: ${s.description}`).join('\n') || '  None identified'}

KEY WEAKNESSES:
${(projectReview?.weaknesses || []).slice(0, 5).map((w: any) => `  ✗ [${w.severity}] ${w.issue}: ${w.impact}`).join('\n') || '  None identified'}

═══════════════════════════════════════════════════════════
                     SOURCE CODE
═══════════════════════════════════════════════════════════
${codeContext}

═══════════════════════════════════════════════════════════
                     YOUR ANALYSIS TASK
═══════════════════════════════════════════════════════════
Identify 6-10 key design decisions made by the engineer. For each decision, provide:

1. CONTEXT: What problem or requirement drove this decision?
2. DECISION: What specific approach/technology/pattern was chosen?
3. RATIONALE: Why was this the best choice given the constraints?
4. CONSEQUENCES: What are the positive AND negative implications?
5. ALTERNATIVES: What other approaches could have been taken, and why weren't they?
6. EVIDENCE: Which specific files/code prove this decision was made?

Look for decisions about:
- Database choice (SQL vs NoSQL, which specific DB)
- Authentication strategy (JWT, sessions, OAuth)
- API design (REST vs GraphQL, versioning)
- State management approach
- Error handling strategy
- Dependency injection / service patterns
- Caching strategy
- Deployment architecture

Return ONLY valid JSON:

{
  "designDecisions": [
    {
      "decisionId": "dec-01",
      "title": "Short descriptive title",
      "context": "What problem needed solving — be specific",
      "decision": "What was chosen and how it's implemented",
      "rationale": "Why this was chosen over alternatives",
      "consequences": {
        "positive": ["Specific advantage 1", "Specific advantage 2"],
        "negative": ["Specific cost/limitation 1"],
        "mitigations": ["How the negatives are addressed"]
      },
      "alternativesConsidered": [
        {
          "approach": "Alternative approach name",
          "pros": ["Why it could work"],
          "cons": ["Why it wasn't chosen"],
          "whyNotChosen": "Primary reason this was rejected"
        }
      ],
      "fileReferences": [{"file": "path/to/file"}],
      "confidence": "high|medium|low",
      "groundingEvidence": ["What in the code specifically proves this decision"]
    }
  ]
}

GROUNDING RULES:
1. Only analyze decisions YOU CAN SEE in the code — never speculate
2. Provide file references as proof for every decision
3. Focus on significant architectural/technical decisions, not trivial style choices
4. If a decision is implicit (no explicit comment), mark confidence as 'medium'
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

  const prompt = `You are a VP of Engineering at a scale-up evaluating the technical tradeoffs embedded in this codebase. A tradeoff is where the engineer chose X over Y, gaining some benefits but accepting some costs. Your job is to identify these tradeoffs, assess their merit, and evaluate their impact on the system.

═══════════════════════════════════════════════════════════
                    REPOSITORY METADATA
═══════════════════════════════════════════════════════════
Languages: ${JSON.stringify(contextMap.languages || {})}
Frameworks: ${(contextMap.frameworks || []).join(', ') || 'None'}
Core Modules: ${(contextMap.coreModules || []).join(', ') || 'None'}
File Count: ${(contextMap.userCodeFiles || []).length}

═══════════════════════════════════════════════════════════
              STAGE 1 REVIEW CONTEXT
═══════════════════════════════════════════════════════════
Code Quality: ${projectReview?.codeQuality?.overall ?? 'N/A'}/100
Performance: ${projectReview?.codeQuality?.performance ?? 'N/A'}/100
Maintainability: ${projectReview?.codeQuality?.maintainability ?? 'N/A'}/100
Security: ${projectReview?.codeQuality?.security ?? 'N/A'}/100

Strengths: ${(projectReview?.strengths || []).slice(0, 3).map((s: any) => s.pattern).join(', ') || 'None'}
Weaknesses: ${(projectReview?.weaknesses || []).slice(0, 3).map((w: any) => w.issue).join(', ') || 'None'}

═══════════════════════════════════════════════════════════
                     SOURCE CODE
═══════════════════════════════════════════════════════════
${codeContext}

═══════════════════════════════════════════════════════════
                     YOUR ANALYSIS TASK
═══════════════════════════════════════════════════════════
Identify 4-6 significant technical tradeoffs. Common tradeoff categories:

- REST vs GraphQL API design
- SQL vs NoSQL database choice
- Monolith vs Microservices
- Server-side rendering vs Client-side rendering
- Synchronous vs Asynchronous processing
- Strong typing vs Dynamic typing
- Normalization vs Denormalization
- Build-vs-Buy (custom code vs library)
- Security vs Usability
- Performance vs Readability

For each tradeoff, assess:
1. What was the specific choice point?
2. What was chosen and what was sacrificed?
3. Is this the RIGHT tradeoff for the project's context?
4. What's the impact on performance, maintainability, scalability, and cost?

Return ONLY valid JSON:

{
  "technicalTradeoffs": [
    {
      "tradeoffId": "trd-01",
      "aspect": "What aspect (e.g., 'REST vs GraphQL', 'SQL vs NoSQL')",
      "chosenApproach": "What was chosen and why",
      "tradeoffRationale": "Why this choice makes sense given project constraints",
      "pros": ["Specific advantage 1", "Specific advantage 2"],
      "cons": ["Specific disadvantage 1", "Specific disadvantage 2"],
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

GROUNDING RULES:
1. Only analyze tradeoffs you can actually see in the code
2. Be balanced — every choice has pros AND cons
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

  const prompt = `You are a Site Reliability Engineer (SRE) and Application Security Lead at a top-tier tech company. You are evaluating this codebase for production readiness, scalability bottlenecks, and security vulnerabilities.

═══════════════════════════════════════════════════════════
                    REPOSITORY METADATA
═══════════════════════════════════════════════════════════
Languages: ${JSON.stringify(contextMap.languages || {})}
Frameworks: ${(contextMap.frameworks || []).join(', ') || 'None'}
Entry Points: ${(contextMap.entryPoints || []).join(', ') || 'None'}
File Count: ${(contextMap.userCodeFiles || []).length}

═══════════════════════════════════════════════════════════
              STAGE 1 REVIEW CONTEXT
═══════════════════════════════════════════════════════════
Code Quality: ${projectReview?.codeQuality?.overall ?? 'N/A'}/100
Performance Score: ${projectReview?.codeQuality?.performance ?? 'N/A'}/100
Security Score: ${projectReview?.codeQuality?.security ?? 'N/A'}/100
Error Handling Score: ${projectReview?.codeQuality?.errorHandling ?? 'N/A'}/100
Complexity Level: ${projectReview?.employabilitySignal?.complexity ?? 'N/A'}
Production Readiness: ${projectReview?.employabilitySignal?.productionReadiness ?? 'N/A'}/100

CRITICAL ISSUES:
${(projectReview?.criticalIssues || []).map((c: any) => `  ⚠ [${c.category}] ${c.description} — Severity: ${c.severity || 'unknown'}`).join('\n') || '  None found'}

WEAKNESSES:
${(projectReview?.weaknesses || []).filter((w: any) => w.severity === 'critical' || w.severity === 'high').map((w: any) => `  ✗ ${w.issue}: ${w.impact}`).join('\n') || '  None critical'}

═══════════════════════════════════════════════════════════
                     SOURCE CODE
═══════════════════════════════════════════════════════════
${codeContext}

═══════════════════════════════════════════════════════════
                     YOUR ANALYSIS TASK
═══════════════════════════════════════════════════════════
Perform two analyses:

PART 1 — SCALABILITY ANALYSIS:
1. Estimate current capacity (users, RPS, data volume)
2. Identify ALL bottlenecks (database queries, N+1 problems, missing indexes, blocking I/O, memory leaks, connection pooling issues)
3. Identify architectural constraints that limit horizontal scaling
4. Provide actionable improvement recommendations ranked by impact/effort

PART 2 — SECURITY POSTURE:
1. Identify vulnerabilities (injection, XSS, CSRF, exposed secrets, insecure auth, missing input validation)
2. Assess authentication mechanism (JWT, sessions, OAuth)
3. Assess authorization patterns (RBAC, ABAC, middleware guards)
4. Check sensitive data handling (encryption, hashing, environment variables)
5. List security best practices followed AND missing

Return ONLY valid JSON:

{
  "scalabilityAnalysis": {
    "currentCapacity": {
      "estimatedUsers": 1000,
      "estimatedRPS": 50,
      "dataVolumeGB": 5
    },
    "bottlenecks": [
      {
        "bottleneckId": "bot-01",
        "area": "Where the bottleneck is (e.g., Database Queries, API Layer, File I/O)",
        "description": "Detailed description of the bottleneck",
        "severity": "critical|high|medium|low",
        "estimatedImpact": "What happens when this bottleneck is hit at scale",
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
        "priority": 1,
        "implementation": "Step-by-step implementation guidance",
        "estimatedGain": "Expected improvement (e.g., '10x RPS increase')"
      }
    ],
    "architecturalConstraints": ["Constraint 1", "Constraint 2"]
  },
  "securityPosture": {
    "overallScore": ${projectReview?.codeQuality?.security ?? 65},
    "vulnerabilities": [
      {
        "vulnerabilityId": "vuln-01",
        "category": "injection|authentication|exposure|configuration|cryptography",
        "severity": "critical|high|medium|low",
        "description": "What the vulnerability is",
        "remediation": "How to fix it",
        "fileReferences": [{"file": "path/to/file"}]
      }
    ],
    "bestPractices": {
      "followed": ["Practice 1", "Practice 2"],
      "missing": ["Missing 1", "Missing 2"]
    },
    "sensitiveDataHandling": "How sensitive data (passwords, tokens, PII) is handled",
    "authenticationMechanism": "What authentication is used and how it's implemented",
    "authorizationPattern": "How authorization and access control work"
  }
}

GROUNDING RULES:
1. Be realistic about capacity estimates based on the actual architecture
2. Only flag bottlenecks and vulnerabilities you can see in the code
3. Prioritize high-impact improvements
4. Provide file references as evidence
5. Return ONLY JSON`;

  const response = await callBedrockConverse(prompt, MODEL_ID, { temperature: 0.4, maxTokens: 4000 });

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

  const prompt = `You are a Senior Career Coach and Technical Recruiter at Google who specializes in crafting ATS-optimized resume bullets. You are reviewing an engineer's codebase to generate compelling, quantified resume achievements based on what they actually built.

═══════════════════════════════════════════════════════════
                    PROJECT CONTEXT
═══════════════════════════════════════════════════════════
Languages: ${JSON.stringify(contextMap.languages || {})}
Frameworks: ${(contextMap.frameworks || []).join(', ') || 'None'}
Entry Points: ${(contextMap.entryPoints || []).join(', ') || 'None'}
Core Modules: ${(contextMap.coreModules || []).join(', ') || 'None'}
Total Files: ${(contextMap.userCodeFiles || []).length}

═══════════════════════════════════════════════════════════
              STAGE 1 REVIEW CONTEXT
═══════════════════════════════════════════════════════════
Code Quality: ${projectReview?.codeQuality?.overall ?? 'N/A'}/100
Architecture Clarity: ${projectReview?.architectureClarity?.score ?? 'N/A'}/100
Complexity Level: ${projectReview?.employabilitySignal?.complexity ?? 'moderate'}
Production Readiness: ${projectReview?.employabilitySignal?.productionReadiness ?? 'N/A'}/100
Design Patterns: ${projectReview?.architectureClarity?.designPatterns?.join(', ') ?? 'None'}

Company Tier Match:
  Big Tech Readiness: ${projectReview?.employabilitySignal?.companyTierMatch?.bigTech ?? 'N/A'}%
  Product Companies: ${projectReview?.employabilitySignal?.companyTierMatch?.productCompanies ?? 'N/A'}%
  Startups: ${projectReview?.employabilitySignal?.companyTierMatch?.startups ?? 'N/A'}%

KEY STRENGTHS (base bullets on these):
${(projectReview?.strengths || []).map((s: any) => `  ✓ [${s.impact}] ${s.pattern}: ${s.description}`).join('\n') || '  None identified'}

═══════════════════════════════════════════════════════════
                     SOURCE CODE
═══════════════════════════════════════════════════════════
${codeContext}

═══════════════════════════════════════════════════════════
                     YOUR TASK
═══════════════════════════════════════════════════════════
Generate 12-18 ATS-optimized resume bullets based on what this engineer actually built.

RESUME BULLET FORMULA:
[Strong Action Verb] + [What You Built/Did] + [Technologies Used] + [Quantified Impact/Scale]

CATEGORIES TO COVER:
- architecture: System design, infrastructure, architectural decisions
- technical: Specific features, implementations, integrations
- performance: Optimizations, scaling, caching, query optimization
- leadership: Code organization, best practices, documentation

FORMAT GUIDANCE (do NOT copy these — create NEW bullets from the actual code above):
✓ GOOD format: "[Action Verb] + [specific system/feature from THIS codebase] + [actual technologies from THIS repo] + [realistic scale estimate based on architecture]"
✓ GOOD: References actual files, modules, and patterns visible in the code
✓ GOOD: Quantifies impact using realistic estimates grounded in the codebase's architecture

✗ BAD: Vague one-liners with no specifics (e.g., "Built a website")
✗ BAD: Just listing technologies without describing what was built
✗ BAD: Generic statements like "Implemented features" or "Worked on the backend"
✗ BAD: Mentioning technologies, frameworks, or metrics NOT present in this codebase

CRITICAL: Every technology, pattern, and metric you mention MUST come from the actual code above. Do NOT invent technologies or numbers that aren't supported by the codebase.

KEYWORD GUIDANCE:
- Include ATS keywords: ${(contextMap.frameworks || []).concat(Object.keys(contextMap.languages || {})).join(', ')}
- Use quantified metrics whenever possible (even reasonable estimates)
- Vary action verbs: Architected, Engineered, Designed, Implemented, Optimized, Automated, Integrated, Migrated, Refactored, Streamlined

Return ONLY valid JSON:

{
  "elevatorPitch": "A compelling 3-4 sentence professional narrative summarizing what this project is, its core technical challenge/achievement, and what it demonstrates about your engineering ability. Written in first-person ('I built...', 'I architected...').",
  "resumeBullets": [
    {
      "bulletId": "res-01",
      "text": "Complete, polished resume bullet text",
      "category": "architecture|technical|performance|leadership",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "verified": true
    }
  ]
}

GROUNDING RULES:
1. Base EVERY bullet on ACTUAL code evidence — no fabrication
2. Include specific technologies from the codebase
3. Quantify when possible (users, RPS, data volume, file count, endpoints)
4. Use strong action verbs — never start with "Helped" or "Assisted"
5. Make it impressive but HONEST — exaggeration will be caught
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

    elevatorPitch: resumeBulletsResult?.data?.elevatorPitch || "Your structured elevator pitch will appear here once analysis is fully complete.",
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
    console.error(`Failed to extract JSON from ${agentType} agent response`);
    return { type: agentType, data: null, error: 'JSON extraction failed' };
  }

  // Clean up mermaid code blocks if agent is architecture
  if (agentType === 'architecture' && parsed.systemArchitecture) {
    if (parsed.systemArchitecture.componentDiagram) {
      parsed.systemArchitecture.componentDiagram = parsed.systemArchitecture.componentDiagram.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
    }
    if (parsed.systemArchitecture.dataFlowDiagram) {
      parsed.systemArchitecture.dataFlowDiagram = parsed.systemArchitecture.dataFlowDiagram.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').trim();
    }
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
