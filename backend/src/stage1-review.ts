import { Handler } from 'aws-lambda';
import { callBedrockConverse, extractJson, MISTRAL_LARGE_MODEL } from './bedrock-client';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { ProjectContextMap } from './types';
import { GroundingChecker } from './grounding-checker';
import * as DB from './db-utils';
import { v4 as uuidv4 } from 'uuid';

// Using Mistral Large 3 via Bedrock Converse API
const MODEL_ID = MISTRAL_LARGE_MODEL;
const s3Client = new S3Client({});

const CACHE_BUCKET = process.env.CACHE_BUCKET!;

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

interface Stage1Event {
  analysisId: string;
  projectContextMap: ProjectContextMap;
  s3Key: string;
  codeContext?: string;
}

interface Stage1Response {
  success: boolean;
  analysisId: string;
  projectReview?: any;
  error?: string;
}

export const handler: Handler<Stage1Event, Stage1Response> = async (event) => {
  const { analysisId, projectContextMap, s3Key, codeContext } = event;

  try {
    console.log(`Starting Stage 1 (Industry-Grade Analysis) for: ${analysisId}`);

    // Use pre-loaded code context if available, otherwise load from S3
    const code = codeContext || await loadCodeContext(s3Key, projectContextMap);

    // CRITICAL: Fail if no code was loaded
    if (!code || code.length < 100) {
      throw new Error('Failed to load code context from S3. Cannot generate review without code.');
    }

    console.log(`Loaded ${code.length} characters of code context`);

    // Generate project review using enhanced industry-standard prompt
    const projectReview = await generateProjectReview(projectContextMap, code);

    // Validate grounding
    const groundingChecker = new GroundingChecker();
    const groundingResult = groundingChecker.validateProjectReview(projectReview, projectContextMap);

    console.log('Grounding validation:', groundingResult);
    console.log(groundingChecker.generateReport(groundingResult));

    if (groundingResult.confidence === 'insufficient') {
      console.warn('⚠️ Insufficient grounding detected. Invalid references:', groundingResult.invalidReferences);
    }

    // Save to DynamoDB
    await DB.saveProjectReview(analysisId, projectReview);

    console.log(`Stage 1 completed for: ${analysisId}`);
    console.log(`Code Quality: ${projectReview.codeQuality.overall}/100`);
    console.log(`Employability: ${projectReview.employabilitySignal.overall}/100`);

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
  const fileContents: string[] = [];

  // Primary: load from entryPoints + coreModules (fast path for normal repos)
  const primary = [
    ...contextMap.entryPoints.slice(0, 3),
    ...contextMap.coreModules.slice(0, 7)
  ].slice(0, 10);

  for (const file of primary) {
    try {
      const response = await s3Client.send(new GetObjectCommand({ Bucket: CACHE_BUCKET, Key: `${s3KeyPrefix}${file}` }));
      const content = await response.Body?.transformToString();
      if (content) {
        const truncated = content.length > 5000 ? content.substring(0, 5000) + '\n... (truncated)' : content;
        fileContents.push(`\n--- File: ${file} ---\n${truncated}`);
      }
    } catch (err: any) {
      if (err.Code !== 'NoSuchKey') console.error(`Error loading ${file}:`, err);
    }
  }

  // Fallback: when no normal code files exist, use the raw userCodeFiles list
  if (fileContents.length === 0) {
    console.log('No files from entryPoints/coreModules — falling back to _userCodeFiles.json');
    try {
      const indexResp = await s3Client.send(new GetObjectCommand({
        Bucket: CACHE_BUCKET,
        Key: `${s3KeyPrefix}_userCodeFiles.json`
      }));
      const indexRaw = await indexResp.Body?.transformToString();
      const userFiles: any[] = indexRaw ? JSON.parse(indexRaw) : [];

      for (const entry of userFiles.slice(0, 10)) {
        const filePath: string = typeof entry === 'string' ? entry : (entry.path || entry.file || '');
        if (!filePath) continue;
        try {
          const resp = await s3Client.send(new GetObjectCommand({
            Bucket: CACHE_BUCKET,
            Key: `${s3KeyPrefix}${filePath}`
          }));
          let content = await resp.Body?.transformToString() || '';

          // Extract Python source cells from Jupyter notebooks
          if (filePath.endsWith('.ipynb') && content) {
            try {
              const nb = JSON.parse(content);
              const cells: string[] = (nb.cells || []).map((cell: any) => {
                if (cell.cell_type === 'code') {
                  const src = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source);
                  return `# [code cell]\n${src}`;
                } else if (cell.cell_type === 'markdown') {
                  const src = Array.isArray(cell.source) ? cell.source.join('') : String(cell.source);
                  return `# [markdown]\n# ${src.replace(/\n/g, '\n# ')}`;
                }
                return '';
              }).filter(Boolean);
              content = cells.join('\n\n');
            } catch (nbErr) {
              console.warn(`Could not parse .ipynb ${filePath}:`, nbErr);
            }
          }

          if (content) {
            const truncated = content.length > 8000 ? content.substring(0, 8000) + '\n... (truncated)' : content;
            fileContents.push(`\n--- File: ${filePath} ---\n${truncated}`);
          }
        } catch (err: any) {
          if (err.Code !== 'NoSuchKey') console.error(`Error loading fallback file ${filePath}:`, err);
        }
      }
    } catch (err: any) {
      console.error('Failed to load _userCodeFiles.json for fallback:', err);
    }
  }

  if (fileContents.length === 0) {
    throw new Error('No code files could be loaded from S3. Repository processing may have failed.');
  }

  return fileContents.join('\n\n');
}

async function generateProjectReview(
  contextMap: ProjectContextMap,
  codeContext: string
): Promise<any> {
  const startTime = Date.now();

  const commonHeader = `REPO CONTEXT:
- Total Files: ${contextMap.totalFiles}
- Languages: ${JSON.stringify(contextMap.languages || {})}
- Frameworks: ${contextMap.frameworks.join(', ')}

CODE SAMPLE:
${codeContext}
`;

  // 1. Define Parallel Prompts
  const techFoundationPrompt = `${commonHeader}

ROLE:
You are a Principal Software Engineer reviewing the internal code quality of a software project.

OBJECTIVE:
Evaluate the internal technical foundation of the repository.

Focus on observable evidence in the code only.

Evaluate these dimensions:

1. Readability
- clarity of variable/function names
- logical organization of code
- indentation and formatting
- ability to understand code quickly

2. Maintainability
- code duplication
- modularization
- file sizes and function sizes
- coupling between components

3. Testing
- presence of test files
- evidence of unit tests or integration tests
- coverage of edge cases if visible

4. Documentation
- README presence
- comments explaining complex logic
- API documentation if present

5. Authenticity Signals
Assess whether the code appears:
- likely written by a real developer
- copied from templates
- AI-generated with low customization

Rules:
• Only reference files that exist in the provided context
• Do not assume missing files
• Do not fabricate evidence

OUTPUT FORMAT:
Return VALID JSON with keys:

{
  "codeQuality_foundation": {
    "readability": "Score 0-100",
    "maintainability": "Score 0-100",
    "testCoverage": "Score 0-100",
    "documentation": "Score 0-100",
    "bestPractices": "Score 0-100",
    "justification": "Detailed explanation referencing real code evidence and specific files"
  },
  "authenticity": {
    "score": "Score 0-100",
    "signals": ["list of factual authenticity indicators found in code"],
    "assessment": "Short professional explanation of authenticity"
  }
}
`;

  const archPrompt = `${commonHeader}

ROLE:
You are a Software Architect conducting a structural analysis of a codebase.

OBJECTIVE:
Understand how the system is architected and identify major engineering strengths.

Analyze:

1. System Architecture
- layering
- module boundaries
- separation of concerns
- component responsibilities

2. Design Patterns
Identify patterns ONLY if supported by evidence.

Possible patterns include:
Factory, Repository, Service Layer, Strategy, Observer, Adapter.

3. Anti-Patterns
Detect issues such as:
- God objects
- Tight coupling
- Large files handling too many responsibilities
- Hardcoded configuration

4. Engineering Strengths
Highlight real engineering wins such as:
- good modularization
- clean API design
- efficient abstractions
- reusable components

Rules:
• Only reference real files
• Provide evidence
• Avoid speculation

OUTPUT FORMAT:

Return VALID JSON:

{
  "architectureClarity": {
    "score": "Score 0-100",
    "componentOrganization": "Description of how project components are organized",
    "separationOfConcerns": "Detailed assessment of separation of concerns",
    "designPatterns": [
      {
        "name": "Name of pattern",
        "implementation": "How it is implemented in this project",
        "fileReferences": [{"file": "path/to/file"}]
      }
    ],
    "antiPatterns": [
      {
        "name": "Name of anti-pattern",
        "severity": "high|medium|low",
        "description": "Details of the violation",
        "fileReferences": [{"file": "path/to/file"}]
      }
    ]
  },
  "strengths": [
    {
      "pattern": "Technical strength name",
      "description": "Why this is an engineering win",
      "impact": "high|medium|low",
      "fileReferences": [{"file": "path/to/file"}]
    }
  ]
}
`;

  const riskPrompt = `${commonHeader}

ROLE:
You are a Staff Engineer evaluating the operational and production risks of a software project.

OBJECTIVE:
Identify issues that could impact security, performance, reliability, or employability.

Evaluate:

1. Security
Look for evidence of:
- input validation
- secrets handling
- authentication logic
- unsafe data processing

2. Performance
Check for:
- inefficient algorithms
- excessive loops or queries
- blocking I/O patterns
- large in-memory operations

3. Reliability
Check for:
- error handling
- exception management
- null safety
- failure recovery

4. Production Readiness
Assess:
- logging
- configuration via environment variables
- deployability
- maintainability in a team environment

5. Employability Signal
Evaluate how this project reflects engineering maturity.

Rules:
• Only report issues visible in code
• Do not fabricate vulnerabilities

OUTPUT FORMAT:

Return VALID JSON:

{
  "criticalIssues": [
    {
      "category": "security|performance|reliability|maintainability",
      "title": "Brief title of the issue",
      "description": "Technical details of the risk",
      "severity": "critical|high|medium|low",
      "remediation": {
        "priority": "1-5 (1 is highest)",
        "effort": "low|medium|high",
        "actionableSuggestion": "Specific technical fix"
      },
      "fileReferences": [{"file": "path/to/file"}]
    }
  ],
  "employabilitySignal": {
    "overall": "Score 0-100",
    "productionReadiness": "Score 0-100",
    "professionalStandards": "Score 0-100",
    "complexity": "Trivial|Simple|Moderate|Complex|Advanced",
    "companyTierMatch": {
      "bigTech": "Score 0-100",
      "productCompanies": "Score 0-100",
      "startups": "Score 0-100",
      "serviceCompanies": "Score 0-100"
    },
    "justification": "Summary of কেন candidate fits the industry tiers"
  }
}
`;

  console.log('🚀 Launching parallel Stage 1 analysis...');

  // 2. Execute Parallel Calls
  const [techRes, archRes, riskRes] = await Promise.all([
    callBedrockConverse(techFoundationPrompt, MODEL_ID, { maxTokens: 4000, temperature: 0.4 }),
    callBedrockConverse(archPrompt, MODEL_ID, { maxTokens: 4000, temperature: 0.4 }),
    callBedrockConverse(riskPrompt, MODEL_ID, { maxTokens: 4000, temperature: 0.4 })
  ]);

  console.log('✅ Parallel analysis complete. Synthesizing Stage 1 Review...');

  // 3. Synthesis Prompt
  const synthesisPrompt = `You are a Principal Software Engineer producing a final industry-grade code review.

You have received multiple specialized analyses of the same repository.

Your task is to combine them into a single coherent engineering report.

INPUT ANALYSES:

--- TECH FOUNDATION ---
${techRes.text}

--- ARCHITECTURE ---
${archRes.text}

--- RISK & EMPLOYABILITY ---
${riskRes.text}

OBJECTIVES:

1. Merge findings across all analyses
2. Normalize scores to a consistent 0-100 scale
3. Remove duplicated insights
4. Prioritize the most important issues
5. Ensure every claim is grounded in code evidence

Important rules:

• Do not invent files
• Do not hallucinate vulnerabilities
• Prefer conservative scoring
• Most projects fall between 60-75

OUTPUT REQUIREMENTS:

Return STRICT VALID JSON.

No markdown.
No explanation outside JSON.

Ensure the JSON parses correctly.

If formatting is invalid, regenerate the JSON.

Structure:

{
  "codeQuality": {
    "overall": "Score 0-100",
    "readability": "Score 0-100",
    "maintainability": "Score 0-100",
    "testCoverage": "Score 0-100",
    "documentation": "Score 0-100",
    "errorHandling": "Score 0-100",
    "security": "Score 0-100",
    "performance": "Score 0-100",
    "bestPractices": "Score 0-100",
    "justification": "Executive summary of code quality with specific evidence"
  },
  "architectureClarity": {
    "score": "Score 0-100",
    "componentOrganization": "Synthesis of project organization",
    "separationOfConcerns": "Assessment of layered design",
    "designPatterns": [
      { "name": "Pattern Name", "implementation": "How it works here", "fileReferences": [{ "file": "path/file" }] }
    ],
    "antiPatterns": [
      { "name": "Anti-pattern Name", "severity": "Severity", "description": "Why it is bad here", "fileReferences": [{ "file": "path/file" }] }
    ]
  },
  "employabilitySignal": {
    "overall": "Score 0-100",
    "productionReadiness": "Score 0-100",
    "professionalStandards": "Score 0-100",
    "complexity": "Overall classification",
    "companyTierMatch": {
      "bigTech": "Score 0-100",
      "productCompanies": "Score 0-100",
      "startups": "Score 0-100",
      "serviceCompanies": "Score 0-100"
    },
    "justification": "Professional career readiness assessment"
  },
  "strengths": [
    { "strengthId": "id", "pattern": "Strength Name", "description": "Details", "impact": "High/Medium/Low", "fileReferences": [{ "file": "path" }] }
  ],
  "weaknesses": [
    { "weaknessId": "id", "issue": "Problem description", "severity": "High/Medium/Low", "fileReferences": [{ "file": "path" }] }
  ],
  "criticalIssues": [
    {
      "issueId": "id",
      "category": "Classification",
      "title": "Short title",
      "description": "Technical depth",
      "severity": "Critical/High/Medium/Low",
      "remediation": { "priority": 1-5, "effort": "Effort level", "actionableSuggestion": "Step-by-step fix" },
      "fileReferences": [{ "file": "path" }]
    }
  ],
  "improvementAreas": [
    { "areaId": "id", "issue": "What to improve", "priority": "Level", "actionableSuggestion": "How to fix", "category": "Category" }
  ],
  "projectAuthenticity": {
    "score": "Score 0-100",
    "confidence": "high|medium|low",
    "assessment": "Factual assessment of original work"
  }
}
`;

  const finalRes = await callBedrockConverse(synthesisPrompt, MODEL_ID, {
    maxTokens: 8000,
    temperature: 0.4
  });

  const parsed = extractJson(finalRes.text);
  if (!parsed) {
    throw new Error(`Stage 1 Synthesis failed. Snippet: ${finalRes.text.substring(0, 300)}`);
  }

  // 4. Post-processing - Ensure IDs are present and consistent
  parsed.strengths = ensureIdsInArray(parsed.strengths, 'strengthId');
  parsed.weaknesses = ensureIdsInArray(parsed.weaknesses, 'weaknessId');
  parsed.criticalIssues = ensureIdsInArray(parsed.criticalIssues, 'issueId');
  parsed.improvementAreas = ensureIdsInArray(parsed.improvementAreas, 'areaId');

  // Metadata
  parsed.modelMetadata = {
    modelId: MODEL_ID,
    tokensIn: techRes.inputTokens + archRes.inputTokens + riskRes.inputTokens + finalRes.inputTokens,
    tokensOut: techRes.outputTokens + archRes.outputTokens + riskRes.outputTokens + finalRes.outputTokens,
    inferenceTimeMs: Date.now() - startTime,
    parallelLatencyMs: Math.max(techRes.latency, archRes.latency, riskRes.latency),
    synthesisLatencyMs: finalRes.latency,
    temperature: 0.4
  };

  parsed.generatedAt = new Date().toISOString();

  return parsed;
}
