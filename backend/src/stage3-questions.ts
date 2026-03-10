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
  userId: string;
  projectContextMap: ProjectContextMap;
  projectReview: any;
  intelligenceReport: any;
  s3Key: string;
  mode?: 'sheet' | 'live';
  targetRole?: string;
  candidateLevel?: string;
  domainInfo?: import('./types').DomainInfo;
}

interface Stage3Response {
  success: boolean;
  analysisId: string;
  interviewSimulation?: any;
  error?: string;
}

import { DomainInfo } from './types';

export const handler: Handler<Stage3Event, Stage3Response> = async (event) => {
  const { analysisId, userId, projectContextMap, projectReview, intelligenceReport, s3Key, mode = 'sheet', domainInfo, targetRole: roleOverride, candidateLevel: levelOverride } = event;

  try {
    console.log(`🎯 Stage 3 - Mode: ${mode} for ${analysisId}`);

    // Load code context
    const codeContext = await loadCodeContext(s3Key, projectContextMap);

    if (!codeContext || codeContext.length < 100) {
      throw new Error('Insufficient code loaded from S3');
    }

    console.log(`Loaded ${codeContext.length} chars of code`);
    await DB.updateStageProgress(analysisId, 'interview_simulation', 30);

    // 🕵️ Hierarchical Domain Detection (Passed from pipeline)
    const effectiveDomainInfo = domainInfo || {
      primary_domain: 'Software Engineering',
      sub_domain: 'General Development',
      specialization: 'Full-Stack Application',
      tags: [],
      confidence: 0.5,
      evidence: { keywords: [], files: [], dependencies: [] },
      reasoning: 'Fallback due to missing domain info.'
    };

    console.log(`📡 Domain Info: ${effectiveDomainInfo.primary_domain} -> ${effectiveDomainInfo.sub_domain} -> ${effectiveDomainInfo.specialization}`);
    await DB.updateStageProgress(analysisId, 'interview_simulation', 35);

    const userProfile = userId ? await DB.getUserProfile(userId) : null;
    const targetRole = roleOverride || userProfile?.targetRole || 'Junior ML Engineer';

    console.log(`🎯 Selection - Role: ${targetRole} (Override: ${roleOverride || 'None'}), User: ${userId}`);

    // ✅ LOAD EXISTING DATA
    const existingSimulation = await DB.getInterviewSimulation(analysisId);
    const existingPlan = await DB.getInterviewPlan(analysisId);

    // ✅ CHECK: Has this mode already been generated?
    const sheetComplete = existingSimulation?.completedModes?.sheet || false;
    const liveComplete = existingSimulation?.completedModes?.live || false;

    console.log(`📊 Status: Sheet=${sheetComplete}, Live=${liveComplete}`);

    let interviewSimulation = existingSimulation;
    let interviewPlan = existingPlan;

    // ═══════════════════════════════════════════════════════════
    //                    MODE: LIVE INTERVIEW
    // ═══════════════════════════════════════════════════════════
    if (mode === 'live') {
      if (liveComplete && interviewPlan) {
        console.log('✅ Live mode already complete, skipping regeneration');
        // Just ensure simulation metadata exists
        if (!interviewSimulation) {
          interviewSimulation = {
            questions: [],
            mode: 'live',
            completedModes: { sheet: sheetComplete, live: true },
            generatedAt: new Date().toISOString()
          };
        }
      } else {
        console.log('🚀 Generating live mode (topic-driven interview)...');
        await DB.updateStageProgress(analysisId, 'interview_simulation', 40);
        const result = await initializeTopicDrivenInterview(
          projectContextMap,
          projectReview,
          intelligenceReport,
          codeContext,
          analysisId,
          userId,
          effectiveDomainInfo,
          roleOverride,
          levelOverride
        );

        interviewPlan = result.plan;
        interviewSimulation = {
          ...result.simulation,
          completedModes: {
            sheet: sheetComplete,  // Preserve sheet status
            live: true             // Mark live as complete
          }
        };
      }
    }

    // ═══════════════════════════════════════════════════════════
    //                    MODE: QUESTION SHEET
    // ═══════════════════════════════════════════════════════════
    else {  // mode === 'sheet'
      if (sheetComplete && existingSimulation?.questions?.length >= 40) {
        console.log('✅ Sheet mode already complete, skipping regeneration');
        // Use existing simulation
      } else {
        console.log('🚀 Generating sheet mode (50 questions)...');
        await DB.updateStageProgress(analysisId, 'interview_simulation', 40);

        // ✅ IMPORTANT: Pass existing topics to avoid collision
        const existingTopics = interviewPlan?.allTopics;

        const sheet = await generateQuestionSheet(
          projectContextMap,
          projectReview,
          intelligenceReport,
          codeContext,
          analysisId,
          effectiveDomainInfo,
          existingTopics
        );

        interviewSimulation = {
          ...sheet,
          completedModes: {
            sheet: true,           // Mark sheet as complete
            live: liveComplete     // Preserve live status
          }
        };
      }
    }

    // ═══════════════════════════════════════════════════════════
    //                    SAVE TO DATABASE
    // ═══════════════════════════════════════════════════════════
    if (interviewSimulation) {
      await DB.saveInterviewSimulation(analysisId, interviewSimulation);
    }
    if (interviewPlan) {
      await DB.saveInterviewPlan(analysisId, interviewPlan);
    }

    console.log(`✅ Stage 3 completed: ${mode} mode`);

    return {
      success: true,
      analysisId,
      interviewSimulation
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
  analysisId: string,
  domainInfo: DomainInfo,
  topics?: Record<string, any>
): Promise<any> {
  const startTime = Date.now();
  await DB.updateStageProgress(analysisId, 'interview_simulation', 45);

  console.log('Generating complete question sheet (50 questions)...');

  const prompt = buildQuestionSheetPrompt(contextMap, projectReview, intelligenceReport, codeContext, domainInfo, topics);

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
export async function initializeTopicDrivenInterview(
  contextMap: ProjectContextMap,
  projectReview: any,
  intelligenceReport: any,
  codeContext: string,
  analysisId: string,
  userId: string,
  domainInfo: DomainInfo,
  roleOverride?: string,
  levelOverride?: string
): Promise<{ simulation: any, plan: any }> {
  await DB.updateStageProgress(analysisId, 'interview_simulation', 45);

  console.log('Initializing topic-driven interview mode...');

  const userProfile = userId ? await DB.getUserProfile(userId) : null;
  const targetRole = roleOverride || userProfile?.targetRole || 'Senior SDE';
  const candidateLevel = levelOverride || detectCandidateLevel(userProfile, projectReview);

  console.log(`👤 Candidate: ${analysisId} | Role: ${targetRole} | Level: ${candidateLevel} | Domain: ${domainInfo.primary_domain}`);

  // 1. Extract Topics from analysis
  const topics = await extractTopics(
    contextMap,
    projectReview,
    intelligenceReport,
    codeContext,
    targetRole,
    candidateLevel,
    analysisId,
    domainInfo
  );
  await DB.updateStageProgress(analysisId, 'interview_simulation', 70);

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
    generatedAt: new Date().toISOString(),
    domainInfo
  };
  await DB.updateStageProgress(analysisId, 'interview_simulation', 95);

  const simulation = {
    questions: [],
    categoryCounts: { architecture: 0, implementation: 0, tradeoffs: 0, scalability: 0, designPatterns: 0, debugging: 0 },
    difficultyDistribution: { junior: 0, midLevel: 0, senior: 0, staff: 0 },
    mode: 'live',
    modelMetadata: { modelId: MODEL_ID, tokensIn: 0, tokensOut: 0, inferenceTimeMs: 0, temperature: 0 },
    generatedAt: new Date().toISOString(),
    completedModes: { sheet: false, live: true }
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
  analysisId: string,
  domainInfo: DomainInfo
): Promise<any[]> {
  const domainGuidelines = getDomainGuidelines(domainInfo);

  const prompt = `You are a Principal Engineer and technical interviewer preparing to interview a candidate about their project.

PROJECT DOMAIN CLASSIFICATION:
- Primary: ${domainInfo.primary_domain}
- Sub-domain: ${domainInfo.sub_domain}
- Specialization: ${domainInfo.specialization}
- Focus Tags: ${domainInfo.tags.join(', ') || 'N/A'}
TARGET ROLE: ${targetRole}
CANDIDATE LEVEL: ${candidateLevel}

PROJECT CONTEXT:
${intelligenceReport?.systemArchitecture?.overview || ''}
${projectReview?.employabilitySignal?.justification || ''}

CODE SNIPPETS:
${codeContext.substring(0, 5000)}

YOUR TASK:
Extract 8-10 DEEP-DIVE INTERVIEW TOPICS for a technical interview. (Fewer topics with higher quality/depth is PREFERRED over many generic ones).

CRITICAL RULES:

1. **FOCUS ON PRIMARY DOMAIN**:
   - Focus on concepts central to ${domainInfo.primary_domain}.
   - DO NOT ask about generic frameworks unless they are fundamental to the domain.

2. **FOLLOW PHASES**: 
   - Topics 1-2: Project Vision & Architecture (High-level)
   - Topics 3-6: Technical Implementation & Core Logic (Deep-dive)
   - Topics 7-10: Trade-offs, Edge Cases & Performance (Advanced)

3. **MANDATORY FIRST TOPICS**:
   - You MUST include a "Project Overview" topic.
   - You MUST include a "Key Decisions" topic.

4. **MATCH DIFFICULTY TO LEVEL**:
   - ${candidateLevel}: focus on ${candidateLevel === 'junior' ? 'implementation & basic clean code' : 'architecture, tradeoffs, and system design'}.

5. **DOMAIN GUIDELINES**:
${domainGuidelines}

Return ONLY valid JSON array with fields: topicId, title, description (the initial question), category, difficulty, sourceCodeContext, evaluationSignals, fulfillmentThreshold, maxFollowUps.`;

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

  // Fallback if extraction fails
  if (!rawTopics || !Array.isArray(rawTopics) || rawTopics.length === 0) {
    console.warn('⚠️ Topic extraction failed or returned empty. Using fallback topics.');

    const domainPrefix = domainInfo.primary_domain !== 'Software Engineering' ? `in the context of ${domainInfo.primary_domain}` : '';

    return [
      {
        topicId: 'T-PROJECT-OVERVIEW',
        title: 'Project Architecture & Vision',
        description: `As a ${targetRole}, can you walk me through the high-level architecture of this ${domainInfo.primary_domain} project and how you handled the core technical challenges?`,
        category: 'architecture',
        difficulty: candidateLevel,
        evaluationSignals: ['architecture_thinking', 'communication'],
        fulfillmentThreshold: 70,
        maxFollowUps: 2,
        currentFulfillment: 0,
        followUpsAsked: 0,
        isCompleted: false
      },
      {
        topicId: 'T-KEY-DECISIONS',
        title: 'Critical Engineering Trade-offs',
        description: `What was the most significant technical trade-off you made in this project's ${domainInfo.sub_domain || 'implementation'}, and how did it impact the final outcome?`,
        category: 'tradeoffs',
        difficulty: candidateLevel,
        evaluationSignals: ['tradeoffs', 'decision_making'],
        fulfillmentThreshold: 70,
        maxFollowUps: 2,
        currentFulfillment: 0,
        followUpsAsked: 0,
        isCompleted: false
      }
    ];
  }

  return rawTopics.map((t: any) => ({
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
  analysisId: string,
  domainInfo: DomainInfo
): Promise<any[]> {
  const domainContext = `
PROJECT DOMAIN CLASSIFICATION:
- Primary: ${domainInfo.primary_domain}
- Sub-domain: ${domainInfo.sub_domain}
- Specialization: ${domainInfo.specialization}
- Focus Tags: ${domainInfo.tags.join(', ') || 'N/A'}
- Context Reasoning: ${domainInfo.reasoning}
`;

  const prompt = `You are a Principal Software Engineer at a FAANG company (Google/Apple/Amazon) conducting a deep-dive technical interview. You are generating a comprehensive "Question Sheet" containing 50 diverse interview questions based on the candidate's codebase.

═══════════════════════════════════════════════════════════
                    PROJECT METADATA
═══════════════════════════════════════════════════════════
${domainContext}
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
• Architecture (5): Probe system structure, component interactions, and structural patterns. Questions must reference specific files and modules from the code.
• Implementation (4): Probe specific code logic, data structures, and functional design visible in the source.
• Trade-offs (4): Probe the technical compromises made during development.
• Scalability & Reliability (3): Probe bottlenecks and how the system handles growth or failure.
• Security & Quality (2): Probe data protection, validation, and engineering standards.

IMPORTANT: Do NOT use generic template questions. Every question must be unique and specifically reference files, patterns, or decisions from THIS codebase. Prioritize the identified domain context but DO NOT ignore other significant technical implementations in the repository.

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

  const questions = rawQuestions.map((q: any, index: number) => ({
    ...q,
    questionId: q.questionId || `SHEET-Q${String(index + 1).padStart(3, '0')}`,
    source: 'question_sheet',
    category: normalizeCategory(q.category || 'implementation'),
    difficulty: normalizeDifficulty(q.difficulty || 'mid-level'),
    priority: 'critical',
    type: 'core'
  }));

  // Organize into tracks
  return organizeIntoTracks(questions, 'sheet');
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
  codeContext: string,
  domainInfo: DomainInfo,
  topics?: Record<string, any>
): string {
  const domainGuidelines = getDomainGuidelines(domainInfo);
  const domainContext = domainInfo ? `
PROJECT DOMAIN CLASSIFICATION:
- Primary: ${domainInfo.primary_domain}
- Sub-domain: ${domainInfo.sub_domain}
- Specialization: ${domainInfo.specialization}
- Focus Tags: ${domainInfo.tags.join(', ') || 'N/A'}
` : '';

  const topicsToAvoid = topics
    ? `\n═══════════════════════════════════════════════════════════\n                 AVOID THESE TOPICS (Already in Live Interview)\n═══════════════════════════════════════════════════════════\n${Object.values(topics).map((t: any) => `• ${t.title}: ${t.description}`).join('\n')}

⚠️ CRITICAL: Your 50 questions must be DIFFERENT from the topics above. 
Focus on broader coverage across the entire codebase, prioritizing the primary domain identified while ensuring no major technical module is left unexplored.
Include questions about:
- Structural integrity and design patterns
- Mission-critical implementation logic
- Technical tradeoffs and decision rationale
- Resource management and scaling
- Failure modes and error handling
- Quality standards and documentation\n═══════════════════════════════════════════════════════════\n`
    : '';

  return `You are a Senior Technical Architect designing a multi-phase technical interview plan for a candidate. Your goal is to extract the most relevant "Interview Topics" from their codebase to test their senior-level engineering skills.

═══════════════════════════════════════════════════════════
                    PROJECT CONTEXT
═══════════════════════════════════════════════════════════
${domainContext}
Frameworks: ${(contextMap.frameworks || []).join(', ') || 'None'}
Languages: ${JSON.stringify(contextMap.languages || {})}
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
**DOMAIN CALIBRATION (CRITICAL)**:
Project Domain: ${domainInfo?.primary_domain || 'General Software Engineering'}
Guidelines:
${domainGuidelines}

Generate 50 QUESTIONS following the 5-STAGE INTERVIEW PATTERN:

1. **STAGE 1: PROJECT UNDERSTANDING** (12 questions):
   - Ask about the project's purpose, high-level architecture, and mission-critical components.
   - Include questions on specifically WHY this project exists and the problems it solves.

2. **STAGE 2: IMPLEMENTATION DETAILS** (12 questions):
   - Dive into specific logic, data structures, and function design observed in the code.
   - Trace data flow through the system.

3. **STAGE 3: DOMAIN EXPERTISE** (10 questions):
   - Technical trade-offs made within ${domainInfo.primary_domain}.
   - Evaluation of algorithm/technology choices.

4. **STAGE 4: EDGE CASES & ERRORS** (8 questions):
   - Failure modes, error handling, and defensive programming checks.

5. **STAGE 5: IMPROVEMENTS & SCALING** (8 questions):
   - How to scale the system for production-level traffic and data volume.

QUESTION QUALITY GUIDELINES:
- Every question MUST reference specific files, functions, or code patterns from the codebase.
- Questions should test UNDERSTANDING, not memorization.
- Include "Why did you...?" and "What would happen if...?" style questions.
- Mix difficulty levels: 40% mid-level, 40% senior, 20% staff-level.
- Each question must have complete expectedAnswer with keyPoints, acceptableApproaches, and redFlags.

Return ONLY valid JSON array with fields: questionId, question, category, difficulty, context, expectedAnswer, followUpQuestions, evaluationCriteria, tags.

IMPORTANT: The "question" text must be DIFFERENT from any of the pre-identified topics listed above. Provide a broader coverage of the codebase.`;
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

/**
 * Universal Domain Guidelines
 */
function getDomainGuidelines(domainInfo?: DomainInfo): string {
  if (!domainInfo) {
    return "Focus on general software engineering principles, code quality, and technical tradeoffs.";
  }
  const primary = (domainInfo.primary_domain || '').toLowerCase();
  const sub = (domainInfo.sub_domain || '').toLowerCase();
  const spec = (domainInfo.specialization || '').toLowerCase();
  const allDomains = [primary, sub, spec, ...domainInfo.tags.map(t => t.toLowerCase())];

  if (allDomains.some(d => d.includes('ml') || d.includes('machine_learning') || d.includes('deep_learning') || d.includes('ai'))) {
    return `
    - Prioritize questions on: Model architecture choice, hyperparameter tuning strategy, data leak prevention, evaluation metric alignment with business goals, and inference efficiency.
    - Ask about specific data transformations visible in the code.
    - Focus on data preprocessing and feature engineering.`;
  }

  if (allDomains.some(d => d.includes('devops') || d.includes('sre') || d.includes('infrastructure') || d.includes('cicd'))) {
    return `
    - Prioritize: Infrastructure as Code (IaC) modularity, CI/CD pipeline security/efficiency, container orchestration (K8s/Docker) choices, and monitoring/observability strategy.
    - Ask about handling of secrets, environment parity, and disaster recovery.`;
  }

  if (allDomains.some(d => d.includes('security') || d.includes('infosec') || d.includes('penetration'))) {
    return `
    - Prioritize: Identity and Access Management (IAM), data encryption at rest and in transit, vulnerability management, and secure coding practices.
    - Ask about specific threat models and how the architecture mitigates common attacks (OWASP Top 10).`;
  }

  if (allDomains.some(d => d.includes('cloud') || d.includes('aws') || d.includes('azure') || d.includes('gcp'))) {
    return `
    - Prioritize: Cloud-native service selection, cost-optimization, regional availability, and serverless vs provisioned tradeoffs.
    - Ask about cloud security configuration and networking (VPCs, Subnets).`;
  }

  if (allDomains.some(d => d.includes('data_engineering') || d.includes('pipeline') || d.includes('etl') || d.includes('big_data'))) {
    return `
    - Prioritize: Data partitioning strategies, schema evolution, processing latency (batch vs stream), and data quality validation.
    - Ask about specific tool choices (Spark, Airflow, Flink) as visible in the code context.`;
  }

  if (allDomains.some(d => d.includes('web') || d.includes('backend') || d.includes('api') || d.includes('frontend'))) {
    return `
    - Prioritize: Concurrency, API contract versioning, database atomicity, and infrastructure reliability.
    - Ask about authentication strategies and state management if applicable.
    - Focus on scalability and data consistency.`;
  }

  if (allDomains.some(d => d.includes('mobile') || d.includes('ios') || d.includes('android'))) {
    return `
    - Prioritize: App lifecycle, state management (Redux/Context), offline sync, and UI performance.
    - Ask about specific navigation patterns and local storage logic.`;
  }

  return `
  - Prioritize: Core architectural patterns, key engineering decisions, and production readiness.
  - Ask about implementation details of primary features.`;
}

/**
 * Step 5: Validate Generated Questions
 */
async function validateQuestions(
  questions: any[],
  contextMap: ProjectContextMap,
  analysisId: string
): Promise<any[]> {
  console.log(`🔍 Validating ${questions.length} questions...`);

  const validQuestions = questions.filter((q: any) => {
    // Basic structural validation
    if (!q.question || !q.category || !q.expectedAnswer) return false;

    // Check for hallucinated files
    if (q.context?.fileReferences) {
      for (const ref of q.context.fileReferences) {
        if (ref.file && !contextMap.userCodeFiles.includes(ref.file)) {
          console.warn(`⚠️ Filtering question due to hallucinated file: ${ref.file}`);
          return false;
        }
      }
    }

    return true;
  });

  console.log(`✅ Validation complete: ${validQuestions.length}/${questions.length} passed.`);
  return validQuestions;
}
