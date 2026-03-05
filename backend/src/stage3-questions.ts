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

    if (mode === 'sheet') {
      // MODE 1: Generate complete question sheet (50 questions upfront)
      interviewSimulation = await generateQuestionSheet(
        projectContextMap,
        projectReview,
        intelligenceReport,
        codeContext,
        analysisId
      );
    } else {
      // MODE 2: Initialize live interview (generates questions dynamically)
      interviewSimulation = await initializeLiveInterview(
        projectContextMap,
        projectReview,
        intelligenceReport,
        codeContext,
        analysisId
      );
    }

    // Save to DynamoDB
    await DB.saveInterviewSimulation(analysisId, interviewSimulation);

    console.log(`Stage 3 completed: ${mode} mode`);

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
 * MODE 2: Initialize live interview (generates core questions + follow-up strategy)
 */
async function initializeLiveInterview(
  contextMap: ProjectContextMap,
  projectReview: any,
  intelligenceReport: any,
  codeContext: string,
  analysisId: string
): Promise<any> {

  console.log('Initializing live interview mode...');

  // Generate initial question set (18 core questions)
  const coreQuestions = await generateCoreQuestions(
    contextMap,
    projectReview,
    intelligenceReport,
    codeContext,
    analysisId
  );

  return {
    mode: 'live',
    coreQuestions,
    totalCoreQuestions: coreQuestions.length,

    // Live interview state
    interviewState: {
      currentQuestionIndex: 0,
      questionsAsked: [],
      questionsAnswered: [],
      followUpsGenerated: [],
      coverageMap: buildCoverageMap(coreQuestions),
      interviewContext: {
        // Store minimal context for follow-up generation
        frameworks: contextMap.frameworks,
        languages: contextMap.languages,
        keyArchitecturalPatterns: intelligenceReport.systemArchitecture?.architecturalPatterns?.map((p: any) => p.name) || [],
        codeQualityScore: projectReview.codeQuality?.overall || 0
      }
    },

    // Strategy for follow-ups
    followUpStrategy: {
      enabled: true,
      maxFollowUpsPerQuestion: 3,
      generateFollowUpBasedOn: 'answer_quality',
      ensureCoreTopicsCovered: true,
      adaptDifficultyBasedOnPerformance: true
    },

    // Instructions for frontend
    usage: {
      type: 'live_interview',
      instructions: 'Start with core questions. Generate follow-ups dynamically based on answers.',
      coreQuestionsCount: coreQuestions.length,
      estimatedTotalQuestions: '20-40 (depends on answers)',
      estimatedDuration: '60-90 minutes'
    },

    generatedAt: new Date().toISOString()
  };
}

/**
 * Generate core questions for live interview (18 essential questions)
 */
async function generateCoreQuestions(
  contextMap: ProjectContextMap,
  projectReview: any,
  intelligenceReport: any,
  codeContext: string,
  analysisId: string
): Promise<any[]> {

  const prompt = `You are a Staff Engineer at Google conducting a live technical interview.

Your task is to generate 18 CORE QUESTIONS that MUST be asked during the interview to properly assess the candidate's understanding of their own codebase.

PROJECT CONTEXT:
Frameworks: ${contextMap.frameworks.join(', ') || 'None'}
Languages: ${JSON.stringify(contextMap.languages || {})}
Code Quality: ${projectReview.codeQuality?.overall || 0}/100

KEY ARCHITECTURAL PATTERNS:
${intelligenceReport.systemArchitecture?.architecturalPatterns?.map((p: any) => `- ${p.name}`).join('\n') || 'None detected'}

CRITICAL DESIGN DECISIONS:
${intelligenceReport.designDecisions?.slice(0, 5).map((d: any, i: number) => `${i + 1}. ${d.title}`).join('\n') || 'None'}

CODE SAMPLE:
${codeContext}

GENERATE 18 CORE QUESTIONS with category distribution: Architecture (5), Implementation (4), Trade-offs (4), Scalability (3), Security (2).

Return ONLY valid JSON array:
[
  {
    "questionId": "CORE-01",
    "question": "The actual interview question",
    "category": "architecture|implementation|tradeoffs|scalability|security",
    "difficulty": "mid-level|senior|staff",
    "estimatedTime": 5,
    "priority": "critical",
    "context": {
      "fileReferences": [{"file": "path/to/file", "lineStart": 10, "lineEnd": 50}],
      "codeSnippet": "relevant code snippet",
      "relatedConcepts": ["concept1", "concept2"]
    },
    "expectedAnswer": {
      "keyPoints": ["point1", "point2"],
      "acceptableApproaches": ["approach1"],
      "redFlags": ["red flag1"]
    },
    "followUpTopics": ["topic1", "topic2"],
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

  return `You are a Staff Software Engineer at Google creating a 50-question technical interview bank.

PROJECT CONTEXT:
Frameworks: ${contextMap.frameworks.join(', ') || 'None'}
Languages: ${JSON.stringify(contextMap.languages || {})}
Total Files: ${contextMap.userCodeFiles.length}

CODE QUALITY: ${projectReview.codeQuality?.overall || 0}/100

KEY ARCHITECTURAL PATTERNS:
${intelligenceReport.systemArchitecture?.architecturalPatterns?.map((p: any) => `- ${p.name}: ${p.description}`).join('\n') || 'None'}

CODE SAMPLE:
${codeContext}

GENERATE 50 QUESTIONS (Architecture: 12, Implementation: 12, Trade-offs: 10, Scalability: 8, Design Patterns: 4, Security: 4).

Return ONLY valid JSON array. Each question must include questionId, question (referencing specific files), category, difficulty, context, expectedAnswer, followUpQuestions, evaluationCriteria.`;
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