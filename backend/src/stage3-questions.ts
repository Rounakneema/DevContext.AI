import { Handler } from 'aws-lambda';
import { callBedrockConverse, extractJson, MISTRAL_LARGE_MODEL } from './bedrock-client';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { ProjectContextMap } from './types';
import { GroundingChecker } from './grounding-checker';
import * as DB from './db-utils';
import * as CostTracker from './cost-tracker';

const s3Client = new S3Client({});
const CACHE_BUCKET = process.env.CACHE_BUCKET!;
const MODEL_ID = MISTRAL_LARGE_MODEL;

interface Stage3Event {
  analysisId: string;
  projectContextMap: ProjectContextMap;
  projectReview: any;
  intelligenceReport: any;
  s3Key: string;
  mode?: 'sheet' | 'live';
}

interface Stage3Response {
  success: boolean;
  analysisId: string;
  interviewSimulation?: any;
  error?: string;
}

export const handler: Handler<Stage3Event, Stage3Response> = async (event) => {
  const { analysisId, projectContextMap, projectReview, intelligenceReport, s3Key, mode = 'sheet' } = event;

  try {
    console.log(`Starting Stage 3 (${mode === 'sheet' ? 'Question Sheet' : 'Live Interview'}) for: ${analysisId}`);

    // Load code context
    const codeContext = await loadCodeContext(s3Key, projectContextMap);

    if (!codeContext || codeContext.length < 100) {
      throw new Error('Insufficient code loaded from S3');
    }

    console.log(`Loaded ${codeContext.length} chars of code`);

    let interviewSimulation;
    let interviewPlan;

    if (mode === 'sheet') {
      // MODE 1: Generate complete question sheet (legacy support)
      interviewSimulation = await generateQuestionSheet(
        projectContextMap,
        projectReview,
        intelligenceReport,
        codeContext,
        analysisId
      );
    } else {
      // MODE 2: Initialize live interview (Topic-Driven)
      const result = await initializeTopicDrivenInterview(
        projectContextMap,
        projectReview,
        intelligenceReport,
        codeContext,
        analysisId
      );
      interviewSimulation = result.simulation;
      interviewPlan = result.plan;
    }

    // Save to DynamoDB
    await DB.saveInterviewSimulation(analysisId, interviewSimulation);
    if (interviewPlan) {
      await DB.saveInterviewPlan(analysisId, interviewPlan);
    }

    console.log(`Stage 3 completed: ${mode} mode`);

    return {
      success: true,
      analysisId,
      interviewSimulation,
      interviewPlan
    };

  } catch (error) {
    console.error('Stage 3 failed:', error);

    return {
      success: false,
      analysisId,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * MODE 1: Generate complete question sheet (all 50 questions upfront)
 */
async function generateQuestionSheet(
  contextMap: ProjectContextMap,
  projectReview: any,
  intelligenceReport: any,
  codeContext: string,
  analysisId: string
): Promise<any> {

  console.log('Generating complete question sheet (50 questions)...');

  const prompt = buildQuestionSheetPrompt(contextMap, projectReview, intelligenceReport, codeContext);

  const { text: content, inferenceTimeMs, inputTokens, outputTokens } = await callBedrockConverse(
    prompt,
    MODEL_ID,
    { maxTokens: 16000, temperature: 0.6 }
  );

  await CostTracker.trackAiCall({
    analysisId,
    stage: 'interview_questions',
    modelId: MODEL_ID,
    inputTokens,
    outputTokens,
    inferenceTimeMs,
    promptLength: prompt.length,
    responseLength: content.length
  });

  console.log('Raw response length:', content.length);

  const rawQuestions = parseQuestionsFromResponse(content);

  if (rawQuestions.length === 0) {
    throw new Error('No questions generated');
  }

  console.log(`✅ Parsed ${rawQuestions.length} questions`);

  // Normalize questions
  const questions = rawQuestions.map((q: any, index: number) => ({
    ...q,
    questionId: q.questionId || `Q${String(index + 1).padStart(3, '0')}`,
    category: normalizeCategory(q.category || 'implementation'),
    difficulty: normalizeDifficulty(q.difficulty || 'mid-level'),
    context: q.context || { fileReferences: [], relatedConcepts: [] },
    expectedAnswer: q.expectedAnswer || { keyPoints: [], acceptableApproaches: [], redFlags: [] },
    evaluationCriteria: q.evaluationCriteria || {
      technicalAccuracy: 0.3,
      completeness: 0.3,
      clarity: 0.2,
      depthOfUnderstanding: 0.2
    },
    tags: q.tags || []
  }));

  // Organize into tracks
  return organizeIntoTracks(questions, 'sheet');
}

/**
 * MODE 2: Initialize topic-driven live interview
 */
async function initializeTopicDrivenInterview(
  contextMap: ProjectContextMap,
  projectReview: any,
  intelligenceReport: any,
  codeContext: string,
  analysisId: string
): Promise<{ simulation: any, plan: any }> {

  console.log('Initializing topic-driven interview mode...');

  const userId = 'demo-user'; // Default for system-level calls
  const userProfile = await DB.getUserProfile(userId);
  const targetRole = userProfile?.targetRole || 'Senior SDE';
  const candidateLevel = detectCandidateLevel(userProfile, projectReview);

  // 1. Extract Topics from analysis
  const topics = await extractTopics(
    contextMap,
    projectReview,
    intelligenceReport,
    codeContext,
    targetRole,
    candidateLevel,
    analysisId
  );

  // 2. Build Interview Plan (Phases)
  const plan = {
    analysisId,
    candidateLevel,
    targetRole,
    phases: categorizeTopicsIntoPhases(topics),
    allTopics: topics.reduce((acc: any, t: any) => ({ ...acc, [t.topicId]: t }), {}),
    requiredSignals: [
      'architecture_thinking',
      'code_quality',
      'implementation_depth',
      'tradeoff_analysis',
      'scalability_vision',
      'debugging_communication'
    ],
    generatedAt: new Date().toISOString()
  };

  const simulation = {
    questions: [],
    categoryCounts: { architecture: 0, implementation: 0, tradeoffs: 0, scalability: 0, designPatterns: 0, debugging: 0 },
    difficultyDistribution: { junior: 0, midLevel: 0, senior: 0, staff: 0 },
    mode: 'live',
    modelMetadata: { modelId: MODEL_ID, tokensIn: 0, tokensOut: 0, inferenceTimeMs: 0, temperature: 0 },
    generatedAt: new Date().toISOString(),
    usage: {
      type: 'topic_driven_interview',
      instructions: 'Live interview: topics are prepared upfront; each question is asked dynamically and saved as you answer.',
      topicCount: topics.length,
      estimatedDuration: '30-60 minutes'
    }
  };

  return { simulation, plan };
}

function detectCandidateLevel(profile: any, review: any): 'junior' | 'mid-level' | 'senior' | 'staff' {
  const role = (profile?.targetRole || '').toLowerCase();
  if (role.includes('staff') || role.includes('principal') || role.includes('lead')) return 'staff';
  if (role.includes('senior')) return 'senior';
  if (role.includes('junior') || role.includes('entry')) return 'junior';

  // Fallback to complexity assessment from Stage 1
  const complexity = review?.employabilitySignal?.complexity || 'moderate';
  if (complexity === 'advanced' || complexity === 'complex') return 'senior';
  if (complexity === 'trivial' || complexity === 'simple') return 'junior';

  return 'mid-level';
}

async function extractTopics(
  contextMap: ProjectContextMap,
  projectReview: any,
  intelligenceReport: any,
  codeContext: string,
  targetRole: string,
  candidateLevel: string,
  analysisId: string
): Promise<any[]> {
  const prompt = `You are a Principal Engineer at Google. Analyze this candidate's codebase and extract 12-15 specific INTERVIEW TOPICS for a ${candidateLevel} ${targetRole} interview.

Topics must be grounded in their code and categorized:
1. Architecture: High-level structure, data flow, component boundaries.
  2. Implementation: Specific logic, algorithms, state management, API design.
  3. Engineering Quality: Testing, error handling, reliability, performance.

For each topic, define:
- fulfillmentThreshold: (Junior: 50, Mid: 70, Senior: 85, Staff: 95)
  - evaluationSignals: (Choose 2-3: architecture_thinking, implementation_depth, code_quality, tradeoff_analysis, scalability_vision, debugging_communication)

═══════════════════════════════════════════════════════════
                    PROJECT CONTEXT
═══════════════════════════════════════════════════════════
${codeContext}

REVIEWS:
Code Quality: ${projectReview?.codeQuality?.overall}/100
Design Patterns: ${projectReview?.architectureClarity?.designPatterns?.join(', ')}
Patterns Found: ${intelligenceReport?.systemArchitecture?.architecturalPatterns?.map((p: any) => p.name).join(', ')}

═══════════════════════════════════════════════════════════
          EXTRACTION RULES
═══════════════════════════════════════════════════════════
- Topics must reference specific files/functions.
- MUST be appropriate for a ${candidateLevel} candidate. 
- Junior: Focus on implementation & basic clean code.
- Senior/Staff: Focus on architecture, tradeoffs, and system design.
- The 'description' field will serve as the initial question asked to the candidate. It should be designed so that it takes the candidate approximately 3 minutes to answer (not too short, not overly complex).

Return ONLY valid JSON array:
[
  {
    "topicId": "T-ARCH-01",
    "title": "Short title",
    "category": "architecture|implementation|engineering_quality",
    "description": "The actual question text to ask the candidate based on this topic. (Scope this to take ~3 minutes to answer)",
    "sourceCodeContext": {
      "files": ["path/to/file.ts"],
      "lineRanges": {"path/to/file.ts": {"start": 10, "end": 50}}
    },
    "evaluationSignals": ["architecture_thinking", "tradeoff_analysis"],
    "fulfillmentThreshold": 85,
    "maxFollowUps": 2,
    "difficulty": "${candidateLevel}"
  }
]`;

  const { text: content, inferenceTimeMs, inputTokens, outputTokens } = await callBedrockConverse(
    prompt,
    MODEL_ID,
    { maxTokens: 8000, temperature: 0.4 }
  );

  await CostTracker.trackAiCall({
    analysisId,
    stage: 'topic_extraction',
    modelId: MODEL_ID,
    inputTokens,
    outputTokens,
    inferenceTimeMs,
    promptLength: prompt.length,
    responseLength: content.length
  });

  const rawTopics = extractJson(content);
  return (rawTopics || []).map((t: any) => ({
    ...t,
    currentFulfillment: 0,
    followUpsAsked: 0,
    isCompleted: false
  }));
}

function categorizeTopicsIntoPhases(topics: any[]) {
  const sorted = [...topics].sort((a, b) => {
    // Basic implementation first, then architecture
    const catPriority: any = { implementation: 1, engineering_quality: 2, architecture: 3 };
    return (catPriority[a.category] || 0) - (catPriority[b.category] || 0);
  });

  return {
    warmup: sorted.slice(0, 3).map(t => t.topicId),
    deep_dive: sorted.slice(3, 8).map(t => t.topicId),
    stretch: sorted.slice(8, 11).map(t => t.topicId)
  };
}

/**
 * MODE 1: Generate complete question sheet (legacy support)
 */
async function generateCoreQuestions(
  contextMap: ProjectContextMap,
  projectReview: any,
  intelligenceReport: any,
  codeContext: string,
  analysisId: string
): Promise<any[]> {

  const prompt = `You are a Staff Engineer at Google conducting a live technical interview. You have the candidate's codebase in front of you and must generate 18 CORE QUESTIONS that will be asked one-by-one during the interview. These questions must deeply test the candidate's understanding of THEIR OWN code.

═══════════════════════════════════════════════════════════
                    REPOSITORY METADATA
═══════════════════════════════════════════════════════════
Frameworks: ${(contextMap.frameworks || []).join(', ') || 'None'}
Languages: ${JSON.stringify(contextMap.languages || {})}
Entry Points: ${(contextMap.entryPoints || []).join(', ') || 'None'}
Core Modules: ${(contextMap.coreModules || []).join(', ') || 'None'}
File Count: ${(contextMap.userCodeFiles || []).length}

═══════════════════════════════════════════════════════════
              STAGE 1: PROJECT REVIEW RESULTS
═══════════════════════════════════════════════════════════
Code Quality: ${projectReview?.codeQuality?.overall ?? 0}/100
  ├─ Readability: ${projectReview?.codeQuality?.readability ?? 'N/A'}/100
  ├─ Security: ${projectReview?.codeQuality?.security ?? 'N/A'}/100
  ├─ Performance: ${projectReview?.codeQuality?.performance ?? 'N/A'}/100
  └─ Error Handling: ${projectReview?.codeQuality?.errorHandling ?? 'N/A'}/100

Architecture Clarity: ${projectReview?.architectureClarity?.score ?? 'N/A'}/100
Design Patterns: ${projectReview?.architectureClarity?.designPatterns?.join(', ') ?? 'None'}
Anti-Patterns: ${projectReview?.architectureClarity?.antiPatterns?.join(', ') ?? 'None'}

Strengths: ${(projectReview?.strengths || []).slice(0, 4).map((s: any) => s.pattern).join(', ') || 'None'}
Weaknesses: ${(projectReview?.weaknesses || []).slice(0, 4).map((w: any) => w.issue).join(', ') || 'None'}

═══════════════════════════════════════════════════════════
          STAGE 2: INTELLIGENCE REPORT HIGHLIGHTS
═══════════════════════════════════════════════════════════
Architectural Patterns:
${intelligenceReport?.systemArchitecture?.architecturalPatterns?.map((p: any) => `  • ${p.name}: ${p.description || ''}`).join('\n') || '  None detected'}

Critical Design Decisions:
${(intelligenceReport?.designDecisions || []).slice(0, 5).map((d: any, i: number) => `  ${i + 1}. ${d.title}: ${d.decision || ''}`).join('\n') || '  None'}

Key Tradeoffs:
${(intelligenceReport?.technicalTradeoffs || []).slice(0, 3).map((t: any) => `  • ${t.aspect}: ${t.chosenApproach || ''}`).join('\n') || '  None'}

Bottlenecks:
${(intelligenceReport?.scalabilityAnalysis?.bottlenecks || []).slice(0, 3).map((b: any) => `  • [${b.severity}] ${b.area}`).join('\n') || '  None'}

═══════════════════════════════════════════════════════════
                     SOURCE CODE
═══════════════════════════════════════════════════════════
${codeContext}

═══════════════════════════════════════════════════════════
                LIVE INTERVIEW QUESTION GENERATION
═══════════════════════════════════════════════════════════
Generate 18 CORE QUESTIONS with this distribution:
• Architecture (5): Probe system structure, layer interactions, data flow paths, component dependencies. Questions must reference specific files and modules from the code.
• Implementation (4): Probe specific code choices, algorithms, data structures, function design. Reference actual functions and logic visible in the source.
• Trade-offs (4): Probe why specific approaches were chosen over alternatives, and what the engineer would change. Reference actual design decisions from the code.
• Scalability (3): Probe bottlenecks, capacity limits, and scaling strategies. Ground questions in the actual architecture observed.
• Security (2): Probe authentication, authorization, input validation, and data protection. Reference actual security mechanisms (or lack thereof) in the code.

IMPORTANT: Do NOT use generic template questions. Every question must be unique and specifically reference files, patterns, or decisions from THIS codebase.

QUESTION QUALITY RULES:
1. EVERY question must reference specific files, functions, or patterns from the code
2. Questions should be open-ended and test UNDERSTANDING, not yes/no
3. Include "Why" and "What if" questions that probe deeper thinking
4. Mix difficulty: 30% mid-level, 50% senior, 20% staff-level
5. Each question needs complete expectedAnswer with keyPoints and redFlags
6. Include followUpTopics for dynamic probing during the live interview

Return ONLY valid JSON array:
[
  {
    "questionId": "CORE-01",
    "question": "The actual interview question (referencing specific code)",
    "category": "architecture|implementation|tradeoffs|scalability|security",
    "difficulty": "mid-level|senior|staff",
    "estimatedTime": 5,
    "priority": "critical",
    "context": {
      "fileReferences": [{"file": "path/to/file", "lineStart": 10, "lineEnd": 50}],
      "codeSnippet": "relevant code snippet if applicable",
      "relatedConcepts": ["concept1", "concept2"]
    },
    "expectedAnswer": {
      "keyPoints": ["point1", "point2", "point3"],
      "acceptableApproaches": ["approach1"],
      "redFlags": ["red flag that suggests the candidate didn't build this"]
    },
    "followUpTopics": ["deeper topic 1", "edge case to explore"],
    "tags": ["tag1", "tag2"]
  }
]`;

  const { text: content, inferenceTimeMs, inputTokens, outputTokens } = await callBedrockConverse(
    prompt,
    MODEL_ID,
    { maxTokens: 12000, temperature: 0.5 }
  );

  await CostTracker.trackAiCall({
    analysisId,
    stage: 'interview_questions',
    modelId: MODEL_ID,
    inputTokens,
    outputTokens,
    inferenceTimeMs,
    promptLength: prompt.length,
    responseLength: content.length
  });

  const rawQuestions = parseQuestionsFromResponse(content);

  return rawQuestions.map((q: any, index: number) => ({
    ...q,
    questionId: q.questionId || `CORE-${String(index + 1).padStart(2, '0')}`,
    category: normalizeCategory(q.category || 'implementation'),
    difficulty: normalizeDifficulty(q.difficulty || 'mid-level'),
    priority: 'critical',
    type: 'core'
  }));
}

/**
 * Build coverage map to track which topics have been covered
 */
function buildCoverageMap(coreQuestions: any[]): any {
  const coverageMap: Record<string, any> = {
    architecture: { total: 0, asked: 0, covered: false },
    implementation: { total: 0, asked: 0, covered: false },
    tradeoffs: { total: 0, asked: 0, covered: false },
    scalability: { total: 0, asked: 0, covered: false },
    security: { total: 0, asked: 0, covered: false },
    designPatterns: { total: 0, asked: 0, covered: false }
  };

  coreQuestions.forEach(q => {
    if (coverageMap[q.category]) {
      coverageMap[q.category].total++;
    }
  });

  return coverageMap;
}

/**
 * Build prompt for question sheet mode
 */
function buildQuestionSheetPrompt(
  contextMap: ProjectContextMap,
  projectReview: any,
  intelligenceReport: any,
  codeContext: string
): string {

  return `You are a Staff Software Engineer at Google creating a comprehensive 50-question technical interview bank based on a candidate's actual codebase. Your questions must be deeply grounded in the code — never generic. A great interviewer asks questions that reveal whether the candidate truly understands what they built and WHY.

═══════════════════════════════════════════════════════════
                    REPOSITORY METADATA
═══════════════════════════════════════════════════════════
Languages: ${JSON.stringify(contextMap.languages || {})}
Frameworks: ${(contextMap.frameworks || []).join(', ') || 'None'}
Entry Points: ${(contextMap.entryPoints || []).join(', ') || 'None'}
Core Modules: ${(contextMap.coreModules || []).join(', ') || 'None'}
Total Files: ${(contextMap.userCodeFiles || []).length}
File List: ${(contextMap.userCodeFiles || []).slice(0, 30).join(', ')}

═══════════════════════════════════════════════════════════
              STAGE 1: PROJECT REVIEW RESULTS
═══════════════════════════════════════════════════════════
Overall Code Quality: ${projectReview?.codeQuality?.overall ?? 'N/A'}/100
  ├─ Readability:      ${projectReview?.codeQuality?.readability ?? 'N/A'}/100
  ├─ Maintainability:  ${projectReview?.codeQuality?.maintainability ?? 'N/A'}/100
  ├─ Error Handling:   ${projectReview?.codeQuality?.errorHandling ?? 'N/A'}/100
  ├─ Security:         ${projectReview?.codeQuality?.security ?? 'N/A'}/100
  ├─ Performance:      ${projectReview?.codeQuality?.performance ?? 'N/A'}/100
  └─ Documentation:    ${projectReview?.codeQuality?.documentation ?? 'N/A'}/100

Architecture Clarity: ${projectReview?.architectureClarity?.score ?? 'N/A'}/100
Design Patterns: ${projectReview?.architectureClarity?.designPatterns?.join(', ') ?? 'None'}
Anti-Patterns: ${projectReview?.architectureClarity?.antiPatterns?.join(', ') ?? 'None'}

Employability: ${projectReview?.employabilitySignal?.overall ?? 'N/A'}/100
  ├─ Complexity: ${projectReview?.employabilitySignal?.complexity ?? 'N/A'}
  ├─ Production Readiness: ${projectReview?.employabilitySignal?.productionReadiness ?? 'N/A'}/100
  └─ Big Tech Match: ${projectReview?.employabilitySignal?.companyTierMatch?.bigTech ?? 'N/A'}%

STRENGTHS:
${(projectReview?.strengths || []).slice(0, 5).map((s: any) => `  ✓ ${s.pattern}: ${s.description}`).join('\n') || '  None'}

WEAKNESSES:
${(projectReview?.weaknesses || []).slice(0, 5).map((w: any) => `  ✗ [${w.severity}] ${w.issue}`).join('\n') || '  None'}

CRITICAL ISSUES:
${(projectReview?.criticalIssues || []).slice(0, 3).map((c: any) => `  ⚠ [${c.category}] ${c.description}`).join('\n') || '  None'}

═══════════════════════════════════════════════════════════
          STAGE 2: INTELLIGENCE REPORT HIGHLIGHTS
═══════════════════════════════════════════════════════════
Architectural Patterns:
${intelligenceReport?.systemArchitecture?.architecturalPatterns?.map((p: any) => `  • ${p.name}: ${p.description || ''}`).join('\n') || '  None detected'}

Key Design Decisions:
${(intelligenceReport?.designDecisions || []).slice(0, 5).map((d: any, i: number) => `  ${i + 1}. ${d.title}: ${d.decision || ''}`).join('\n') || '  None'}

Technical Tradeoffs:
${(intelligenceReport?.technicalTradeoffs || []).slice(0, 4).map((t: any) => `  • ${t.aspect}: Chose ${t.chosenApproach || 'N/A'}`).join('\n') || '  None'}

Scalability Bottlenecks:
${(intelligenceReport?.scalabilityAnalysis?.bottlenecks || []).slice(0, 3).map((b: any) => `  • [${b.severity}] ${b.area}: ${b.description || ''}`).join('\n') || '  None'}

Security Issues:
${(intelligenceReport?.securityPosture?.vulnerabilities || []).slice(0, 3).map((v: any) => `  • [${v.severity}] ${v.description || v.category || ''}`).join('\n') || '  None'}

═══════════════════════════════════════════════════════════
                     SOURCE CODE
═══════════════════════════════════════════════════════════
${codeContext}

═══════════════════════════════════════════════════════════
                     QUESTION GENERATION TASK
═══════════════════════════════════════════════════════════
Generate 50 QUESTIONS with this distribution:
• Architecture (12): System design, layer interactions, component relationships, data flow
• Implementation (12): Specific code choices, algorithms, data structures, logic
• Trade-offs (10): Why X over Y, consequences of decisions, alternative approaches
• Scalability (8): Performance bottlenecks, horizontal scaling, caching, database optimization
• Design Patterns (4): Design patterns used/missing, SOLID principles, DRY/KISS
• Security (4): Auth, input validation, data protection, vulnerability awareness

QUESTION QUALITY GUIDELINES:
- Every question MUST reference specific files, functions, or code patterns from the codebase
- Questions should test UNDERSTANDING, not memorization
- Include "Why did you...?" and "What would happen if...?" style questions
- Mix difficulty levels: 40% mid-level, 40% senior, 20% staff-level
- Each question must have complete expectedAnswer with keyPoints, acceptableApproaches, and redFlags

Return ONLY valid JSON array. Each question must include:
questionId, question (referencing specific files/code), category, difficulty, context (with fileReferences and relatedConcepts), expectedAnswer (with keyPoints, acceptableApproaches, redFlags), followUpQuestions (2-3 per question), evaluationCriteria (weights summing to 1.0), tags.`;
}

/**
 * Robust JSON parsing
 */
function parseQuestionsFromResponse(content: string): any[] {
  const parsed = extractJson(content);
  if (Array.isArray(parsed)) return parsed;

  // Fallback: Bracket scanner if extractJson failed for multi-object array
  const extracted = extractObjectsWithBracketScanner(content);
  return extracted;
}

function sanitizeJsonStringLiterals(text: string): string {
  const out: string[] = [];
  let inString = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inString) {
      if (ch === '\\') {
        out.push(ch);
        i++;
        if (i < text.length) { out.push(text[i]); i++; }
        continue;
      }
      if (ch === '"') {
        inString = false;
        out.push(ch);
      } else if (ch === '\n' || ch === '\r' || ch === '\t') {
        out.push(' ');
      } else {
        out.push(ch);
      }
    } else {
      if (ch === '"') inString = true;
      out.push(ch);
    }
    i++;
  }

  return out.join('');
}

function extractObjectsWithBracketScanner(text: string): any[] {
  const results: any[] = [];
  let i = 0;

  while (i < text.length) {
    if (text[i] !== '{') { i++; continue; }

    let depth = 0;
    let inStr = false;
    let j = i;

    while (j < text.length) {
      const c = text[j];

      if (inStr) {
        if (c === '\\') { j += 2; continue; }
        if (c === '"') inStr = false;
      } else {
        if (c === '"') { inStr = true; }
        else if (c === '{' || c === '[') depth++;
        else if (c === '}' || c === ']') {
          depth--;
          if (depth === 0) {
            const objText = text.slice(i, j + 1);
            if (objText.includes('"questionId"') && objText.includes('"question"')) {
              try {
                const cleaned = sanitizeJsonStringLiterals(objText).replace(/,(\s*[}\]])/g, '$1');
                const obj = JSON.parse(cleaned);
                if (obj && obj.questionId && obj.question) {
                  results.push(obj);
                }
              } catch (_) { /* skip */ }
            }
            break;
          }
        }
      }
      j++;
    }
    i = j + 1;
  }

  return results;
}

function normalizeCategory(category: string): string {
  const normalized = (category || '').toLowerCase().replace(/[^a-z]/g, '');
  if (normalized.includes('arch')) return 'architecture';
  if (normalized.includes('impl')) return 'implementation';
  if (normalized.includes('trade')) return 'tradeoffs';
  if (normalized.includes('scal')) return 'scalability';
  if (normalized.includes('design') || normalized.includes('pattern')) return 'designPatterns';
  if (normalized.includes('secur')) return 'security';
  return 'implementation';
}

function normalizeDifficulty(difficulty: string): string {
  const normalized = (difficulty || '').toLowerCase().replace(/[^a-z-]/g, '');
  if (normalized.includes('junior')) return 'junior';
  if (normalized.includes('mid')) return 'mid-level';
  if (normalized.includes('senior')) return 'senior';
  if (normalized.includes('staff')) return 'staff';
  return 'mid-level';
}

function organizeIntoTracks(questions: any[], mode: string): any {
  const track1 = selectQuestionsForTrack(questions, {
    total: 10,
    categories: { implementation: 4, architecture: 3, tradeoffs: 3 },
    difficulties: { 'junior': 5, 'mid-level': 3, 'senior': 2 }
  });

  const track2 = selectQuestionsForTrack(questions, {
    total: 15,
    categories: { architecture: 5, implementation: 4, tradeoffs: 3, scalability: 3 },
    difficulties: { 'junior': 4, 'mid-level': 6, 'senior': 5 }
  });

  const track3 = selectQuestionsForTrack(questions, {
    total: 25,
    categories: { architecture: 7, implementation: 6, tradeoffs: 5, scalability: 4, designPatterns: 3 },
    difficulties: { 'mid-level': 5, 'senior': 13, 'staff': 7 }
  });

  return {
    mode,
    questions,
    totalQuestions: questions.length,

    masterQuestionBank: {
      totalQuestions: questions.length,
      questions,
      categoryCounts: calculateCategoryCounts(questions),
      difficultyDistribution: calculateDifficultyDistribution(questions),
      exportFormats: { pdf: true, markdown: true, json: true }
    },

    interviewTracks: {
      track1_quickAssessment: {
        name: "Quick Assessment",
        description: "First-round screening",
        duration: 30,
        questions: track1,
        totalQuestions: track1.length
      },
      track2_standardInterview: {
        name: "Standard Interview",
        description: "Main technical round",
        duration: 60,
        questions: track2,
        totalQuestions: track2.length
      },
      track3_deepDive: {
        name: "Deep Dive",
        description: "Senior+ assessment",
        duration: 90,
        questions: track3,
        totalQuestions: track3.length
      }
    },
    generatedAt: new Date().toISOString()
  };
}

function selectQuestionsForTrack(
  allQuestions: any[],
  config: {
    total: number;
    categories: Record<string, number>;
    difficulties: Record<string, number>;
  }
): any[] {
  const selected: any[] = [];
  const used = new Set<string>();

  for (const [category, count] of Object.entries(config.categories)) {
    const categoryQuestions = allQuestions.filter(q =>
      q.category === category && !used.has(q.questionId)
    );
    const toSelect = categoryQuestions.slice(0, count);
    toSelect.forEach(q => {
      selected.push(q);
      used.add(q.questionId);
    });
  }

  while (selected.length < config.total) {
    const remaining = allQuestions.filter(q => !used.has(q.questionId));
    if (remaining.length === 0) break;
    selected.push(remaining[0]);
    used.add(remaining[0].questionId);
  }

  return selected.slice(0, config.total);
}

function calculateCategoryCounts(questions: any[]): Record<string, number> {
  const counts: Record<string, number> = {
    architecture: 0,
    implementation: 0,
    tradeoffs: 0,
    scalability: 0,
    designPatterns: 0,
    security: 0
  };
  questions.forEach(q => {
    if (counts[q.category] !== undefined) counts[q.category]++;
  });
  return counts;
}

function calculateDifficultyDistribution(questions: any[]): Record<string, number> {
  const dist: Record<string, number> = { junior: 0, midLevel: 0, senior: 0, staff: 0 };
  questions.forEach(q => {
    const normalized = q.difficulty === 'mid-level' ? 'midLevel' : q.difficulty;
    if (dist[normalized] !== undefined) dist[normalized]++;
  });
  return dist;
}

async function loadCodeContext(s3KeyPrefix: string, contextMap: ProjectContextMap): Promise<string> {
  const fileContents: string[] = [];
  const primary = [
    ...contextMap.entryPoints.slice(0, 3),
    ...contextMap.coreModules.slice(0, 8)
  ].slice(0, 11);

  for (const file of primary) {
    try {
      const response = await s3Client.send(new GetObjectCommand({
        Bucket: CACHE_BUCKET,
        Key: `${s3KeyPrefix}${file}`
      }));
      const content = await response.Body?.transformToString();
      if (content) {
        const truncated = content.length > 3500 ? content.substring(0, 3500) + '\n...' : content;
        fileContents.push(`\n--- File: ${file} ---\n${truncated}`);
      }
    } catch (err: any) {
      if (err.Code !== 'NoSuchKey') console.error(`Error loading ${file}:`, err);
    }
  }

  if (fileContents.length === 0) throw new Error('Failed to load code files');
  return fileContents.join('\n\n');
}
