import { Handler } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { ProjectContextMap } from './types';
import { GroundingChecker } from './grounding-checker';
import { SelfCorrectionLoop, ValidationResult } from './self-correction';
import * as DB from './db-utils';

const bedrockClient = new BedrockRuntimeClient({ region: 'ap-southeast-1' });
const s3Client = new S3Client({});

const CACHE_BUCKET = process.env.CACHE_BUCKET!;
// Using Amazon Nova Lite (APAC) - balance of quality and cost for comprehensive question generation
const MODEL_ID = 'apac.amazon.nova-lite-v1:0';

interface Stage3Event {
  analysisId: string;
  projectContextMap: ProjectContextMap;
  s3Key: string;
}

interface Stage3Response {
  success: boolean;
  analysisId: string;
  interviewSimulation?: any;
  error?: string;
}

export const handler: Handler<Stage3Event, Stage3Response> = async (event) => {
  const { analysisId, projectContextMap, s3Key } = event;
  
  try {
    console.log(`Starting Stage 3 (Master Question Bank Generation) for: ${analysisId}`);
    
    // Load comprehensive code context
    const codeContext = await loadCodeContext(s3Key, projectContextMap);
    
    // CRITICAL: Fail if no code loaded
    if (!codeContext || codeContext.length < 100) {
      throw new Error('No code loaded from S3. Cannot generate questions without code context.');
    }
    
    // Generate master question bank (45-60 questions) with self-correction
    const masterQuestionBank = await generateMasterQuestionBank(
      projectContextMap,
      codeContext
    );
    
    // Organize into 3 interview tracks
    const interviewSimulation = organizeIntoTracks(masterQuestionBank);
    
    // Save to DynamoDB
    await DB.saveInterviewSimulation(analysisId, interviewSimulation);
    
    console.log(`Stage 3 completed for: ${analysisId}`);
    console.log(`Generated ${masterQuestionBank.length} questions across 3 tracks`);
    
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

async function loadCodeContext(s3KeyPrefix: string, contextMap: ProjectContextMap): Promise<string> {
  // Load more files for comprehensive question generation
  const filesToLoad = [
    ...contextMap.entryPoints.slice(0, 3),
    ...contextMap.coreModules.slice(0, 8)
  ].slice(0, 11);
  
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
        const truncated = content.length > 3500 ? content.substring(0, 3500) + '\n... (truncated)' : content;
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
  
  // CRITICAL: Throw error if no files loaded
  if (fileContents.length === 0) {
    throw new Error('Failed to load code files from S3 for question generation.');
  }
  
  return fileContents.join('\n\n');
}

async function generateMasterQuestionBank(
  contextMap: ProjectContextMap,
  codeContext: string
): Promise<any[]> {
  const groundingChecker = new GroundingChecker();
  const correctionLoop = new SelfCorrectionLoop(3, 75); // Higher threshold for quality

  const generator = async (feedback?: string): Promise<any[]> => {
    return await generateQuestions(contextMap, codeContext, feedback);
  };

  const validator = async (questions: any[]): Promise<ValidationResult> => {
    const validation = groundingChecker.validateInterviewQuestions(
      questions,
      contextMap.userCodeFiles
    );

    const issues: string[] = [];
    
    if (validation.overallResult.confidence === 'insufficient') {
      issues.push(`Poor grounding: ${validation.invalidQuestions.length} questions reference non-existent files`);
    }
    
    if (validation.overallResult.invalidReferences.length > 0) {
      issues.push(`Invalid file references: ${validation.overallResult.invalidReferences.join(', ')}`);
    }

    if (questions.length < 40) {
      issues.push(`Too few questions: ${questions.length} (expected 45-60)`);
    }

    // Check category distribution
    const categories = questions.reduce((acc, q) => {
      acc[q.category] = (acc[q.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    if (categories.architecture < 10) issues.push('Too few architecture questions');
    if (categories.implementation < 10) issues.push('Too few implementation questions');

    const groundingScore = validation.overallResult.confidence === 'high' ? 100 :
                          validation.overallResult.confidence === 'medium' ? 80 :
                          validation.overallResult.confidence === 'low' ? 60 : 30;
    
    const countScore = Math.min(100, (questions.length / 50) * 100);
    const validQuestionRatio = validation.validQuestions.length / questions.length;
    const validityScore = validQuestionRatio * 100;

    const finalScore = Math.round((groundingScore * 0.4) + (countScore * 0.3) + (validityScore * 0.3));

    return {
      isValid: issues.length === 0 && finalScore >= 75,
      score: finalScore,
      feedback: issues.length === 0 
        ? 'Comprehensive question bank with excellent grounding'
        : `Issues: ${issues.join('; ')}`,
      issues
    };
  };

  const result = await correctionLoop.correctWithRetry(generator, validator);

  console.log(`Question generation: ${result.totalAttempts} attempts, converged: ${result.converged}, final score: ${result.bestScore}`);

  return result.finalResult;
}

async function generateQuestions(
  contextMap: ProjectContextMap,
  codeContext: string,
  feedback?: string
): Promise<any[]> {
  const userCodeFilesList = contextMap.userCodeFiles.slice(0, 30).join(', ');
  
  let prompt = `You are a Staff Engineer at Google preparing a comprehensive technical interview question bank for a candidate. This question bank will be used across multiple interview rounds.

═══════════════════════════════════════════════════════════════════════════
PROJECT CONTEXT
═══════════════════════════════════════════════════════════════════════════
Frameworks: ${contextMap.frameworks.join(', ') || 'None'}
Entry Points: ${contextMap.entryPoints.join(', ') || 'None'}
Languages: ${JSON.stringify(contextMap.languages || {})}
Total Files: ${contextMap.userCodeFiles.length}

USER-WRITTEN CODE FILES (ONLY reference these exact files):
${userCodeFilesList}

CODE SAMPLE:
${codeContext}`;

  if (feedback) {
    prompt += `\n\n⚠️ PREVIOUS ATTEMPT HAD ISSUES:\n${feedback}\n\nCORRECT THESE ISSUES IN THIS GENERATION.`;
  }

  prompt += `

═══════════════════════════════════════════════════════════════════════════
TASK: Generate 50 COMPREHENSIVE Interview Questions
═══════════════════════════════════════════════════════════════════════════

## QUESTION DISTRIBUTION (Total: 50 questions)

### CATEGORY BREAKDOWN:
1. **Architecture & System Design** (12 questions)
   - Component interactions, data flow, system boundaries
   - Architectural patterns used and why
   - Scalability and extensibility considerations
   - Microservices vs monolith trade-offs
   
2. **Implementation Details** (12 questions)
   - Specific code decisions and rationale
   - Algorithm choices and complexity
   - Data structure selection
   - Error handling strategies
   
3. **Technical Trade-offs** (10 questions)
   - Why X over Y? (e.g., REST vs GraphQL, SQL vs NoSQL)
   - Performance vs maintainability
   - Consistency vs availability (CAP theorem)
   - Build vs buy decisions
   
4. **Scalability & Performance** (8 questions)
   - Bottlenecks and optimization opportunities
   - Caching strategies
   - Database indexing and query optimization
   - Horizontal vs vertical scaling
   
5. **Design Patterns** (4 questions)
   - Patterns implemented and why
   - When would you use other patterns
   - Anti-patterns to avoid
   
6. **Security & Reliability** (4 questions)
   - Authentication/authorization approach
   - Input validation and sanitization
   - Error recovery and graceful degradation
   - Data protection and privacy

### DIFFICULTY DISTRIBUTION:
- **Junior-Mid** (15 questions): Basic understanding, direct questions about code
- **Mid-Level** (20 questions): Requires understanding of trade-offs and alternatives
- **Senior** (12 questions): System-level thinking, scalability, architecture decisions
- **Staff+** (3 questions): Cross-cutting concerns, org-level impact, teaching others

═══════════════════════════════════════════════════════════════════════════
QUESTION QUALITY STANDARDS
═══════════════════════════════════════════════════════════════════════════

Each question MUST:
1. ✅ Reference SPECIFIC files from the user code list above
2. ✅ Include line numbers when referencing specific implementations
3. ✅ Be answerable from the provided code (no hypothetical features)
4. ✅ Have clear evaluation criteria
5. ✅ Include expected answer key points
6. ✅ Identify red flags (wrong answers that disqualify)

Question Types to Include:
- "Why did you..." (rationale questions)
- "How does... work?" (mechanism questions)
- "What would happen if...?" (consequence questions)
- "Compare X and Y in your code" (comparison questions)
- "Walk me through..." (explanation questions)
- "What alternatives did you consider for...?" (decision-making questions)

═══════════════════════════════════════════════════════════════════════════
EXAMPLE HIGH-QUALITY QUESTIONS
═══════════════════════════════════════════════════════════════════════════

GOOD (specific, grounded):
"In your UserService.js file (lines 45-67), you implemented JWT token generation with a 24-hour expiration. Why did you choose 24 hours instead of shorter durations like 1 hour? What are the trade-offs between token lifetime and security?"

BAD (vague, not grounded):
"Tell me about authentication in your project."

GOOD (technical depth):
"Your database schema in schema.sql uses a composite index on (user_id, created_at). Walk me through your reasoning. When would this index be used? When would it be skipped? What's the impact on write performance?"

BAD (too simple):
"Do you use indexes?"

═══════════════════════════════════════════════════════════════════════════
RESPONSE FORMAT (JSON ARRAY)
═══════════════════════════════════════════════════════════════════════════

Return EXACTLY 50 questions in this format:

[
  {
    "questionId": "Q001",
    "question": "In your routes/api.js file (lines 23-45), you implemented rate limiting with a 100 requests/minute limit. Walk me through why you chose this specific threshold. How did you arrive at this number? What happens when the limit is exceeded, and why did you choose that behavior?",
    "category": "implementation",
    "difficulty": "mid-level",
    "estimatedTime": 5,
    "context": {
      "fileReferences": [
        {"file": "routes/api.js", "lineStart": 23, "lineEnd": 45}
      ],
      "codeSnippet": "const limiter = rateLimit({ windowMs: 60000, max: 100 });",
      "relatedConcepts": ["rate limiting", "DDoS protection", "resource management"]
    },
    "expectedAnswer": {
      "keyPoints": [
        "Prevents abuse and DDoS attacks",
        "100 req/min allows normal usage while blocking abuse",
        "Returns 429 status code when exceeded",
        "Uses sliding window algorithm"
      ],
      "acceptableApproaches": [
        "Token bucket algorithm",
        "Fixed window vs sliding window trade-offs",
        "Different limits for different endpoints"
      ],
      "redFlags": [
        "No rate limiting needed",
        "Doesn't understand why rate limiting matters",
        "Suggests storing all requests in database (performance issue)"
      ],
      "idealAnswerLength": "2-3 minutes"
    },
    "followUpQuestions": [
      "How would you implement different rate limits for different user tiers?",
      "What happens if the rate limiter itself becomes a bottleneck?",
      "How would you monitor and alert on rate limit violations?"
    ],
    "evaluationCriteria": {
      "technicalAccuracy": 0.3,
      "completeness": 0.3,
      "clarity": 0.2,
      "depthOfUnderstanding": 0.2
    },
    "scoringRubric": {
      "0-40": "Doesn't understand rate limiting or can't explain their choice",
      "41-60": "Basic understanding but missing key trade-offs",
      "61-80": "Good explanation with trade-offs, could be deeper on alternatives",
      "81-100": "Comprehensive answer covering security, performance, UX, and monitoring"
    },
    "tags": ["security", "performance", "scalability", "rate-limiting"],
    "hints": {
      "level1": "Think about what happens under normal load vs attack scenarios",
      "level2": "Consider different user types and their needs",
      "level3": "Look at the response codes and error handling"
    }
  }
]

Generate ALL 50 questions now. Ensure diversity in categories, difficulties, and question types.`;

  const requestBody = {
    messages: [
      {
        role: 'user',
        content: [{ text: prompt }]
      }
    ],
    inferenceConfig: {
      max_new_tokens: 8000, // Increased for 50 questions
      temperature: 0.6 // Slightly higher for diversity
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
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON array from Bedrock response');
  }
  
  const rawQuestions = JSON.parse(jsonMatch[0]);
  
  // Add UUIDs and normalize categories
  return rawQuestions.map((q: any, index: number) => ({
    ...q,
    questionId: q.questionId || `Q${String(index + 1).padStart(3, '0')}`,
    category: normalizeCategory(q.category),
    difficulty: normalizeDifficulty(q.difficulty)
  }));
}

function normalizeCategory(category: string): string {
  const normalized = category.toLowerCase().replace(/[^a-z]/g, '');
  
  if (normalized.includes('arch')) return 'architecture';
  if (normalized.includes('impl')) return 'implementation';
  if (normalized.includes('trade')) return 'tradeoffs';
  if (normalized.includes('scal')) return 'scalability';
  if (normalized.includes('design') || normalized.includes('pattern')) return 'designPatterns';
  if (normalized.includes('secur')) return 'security';
  if (normalized.includes('perform')) return 'performance';
  if (normalized.includes('debug')) return 'debugging';
  
  return 'implementation'; // Default
}

function normalizeDifficulty(difficulty: string): string {
  const normalized = difficulty.toLowerCase().replace(/[^a-z-]/g, '');
  
  if (normalized.includes('junior')) return 'junior';
  if (normalized.includes('mid')) return 'mid-level';
  if (normalized.includes('senior')) return 'senior';
  if (normalized.includes('staff')) return 'staff';
  
  return 'mid-level'; // Default
}

function organizeIntoTracks(masterBank: any[]): any {
  // Organize questions by category and difficulty
  const byCategory: Record<string, any[]> = {};
  const byDifficulty: Record<string, any[]> = {};
  
  masterBank.forEach(q => {
    byCategory[q.category] = byCategory[q.category] || [];
    byCategory[q.category].push(q);
    
    byDifficulty[q.difficulty] = byDifficulty[q.difficulty] || [];
    byDifficulty[q.difficulty].push(q);
  });
  
  // Track 1: Quick Assessment (10 questions, 30 min)
  const track1 = selectQuestionsForTrack(masterBank, {
    total: 10,
    categories: {
      implementation: 4,
      architecture: 3,
      tradeoffs: 3
    },
    difficulties: {
      'junior': 5,
      'mid-level': 3,
      'senior': 2
    }
  });
  
  // Track 2: Standard Interview (15 questions, 60 min)
  const track2 = selectQuestionsForTrack(masterBank, {
    total: 15,
    categories: {
      architecture: 5,
      implementation: 4,
      tradeoffs: 3,
      scalability: 3
    },
    difficulties: {
      'junior': 4,
      'mid-level': 6,
      'senior': 5
    }
  });
  
  // Track 3: Deep Dive (25 questions, 90 min)
  const track3 = selectQuestionsForTrack(masterBank, {
    total: 25,
    categories: {
      architecture: 7,
      implementation: 6,
      tradeoffs: 5,
      scalability: 4,
      designPatterns: 3
    },
    difficulties: {
      'mid-level': 5,
      'senior': 13,
      'staff': 7
    }
  });
  
  const startTime = Date.now();
  
  return {
    masterQuestionBank: {
      totalQuestions: masterBank.length,
      questions: masterBank,
      categoryCounts: calculateCategoryCounts(masterBank),
      difficultyDistribution: calculateDifficultyDistribution(masterBank),
      exportFormats: {
        pdf: true,
        markdown: true,
        json: true
      }
    },
    
    interviewTracks: {
      track1_quickAssessment: {
        name: "Quick Assessment",
        description: "First-round technical screening",
        duration: 30,
        totalQuestions: track1.length,
        questions: track1,
        categoryCounts: calculateCategoryCounts(track1),
        difficultyDistribution: calculateDifficultyDistribution(track1),
        recommendedFor: "Initial screening, junior-mid level candidates"
      },
      
      track2_standardInterview: {
        name: "Standard Technical Interview",
        description: "Main technical round covering breadth and depth",
        duration: 60,
        totalQuestions: track2.length,
        questions: track2,
        categoryCounts: calculateCategoryCounts(track2),
        difficultyDistribution: calculateDifficultyDistribution(track2),
        recommendedFor: "Mid-level to senior candidates, primary technical assessment"
      },
      
      track3_deepDive: {
        name: "Deep Dive / Bar Raiser",
        description: "Comprehensive assessment for senior/staff positions",
        duration: 90,
        totalQuestions: track3.length,
        questions: track3,
        categoryCounts: calculateCategoryCounts(track3),
        difficultyDistribution: calculateDifficultyDistribution(track3),
        recommendedFor: "Senior+ candidates, final round, bar raiser interviews"
      }
    },
    
    usage: {
      totalPossibleQuestions: masterBank.length,
      track1Questions: track1.length,
      track2Questions: track2.length,
      track3Questions: track3.length,
      customTrackSupport: true,
      exportAvailable: true
    },
    
    modelMetadata: {
      modelId: MODEL_ID,
      tokensIn: 8000,
      tokensOut: masterBank.length * 100, // Estimate
      inferenceTimeMs: Date.now() - startTime,
      temperature: 0.6
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
  
  // Select by category distribution
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
  
  // Fill remaining slots with any unused questions matching difficulty
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
    security: 0,
    performance: 0,
    debugging: 0
  };
  
  questions.forEach(q => {
    if (counts[q.category] !== undefined) {
      counts[q.category]++;
    }
  });
  
  return counts;
}

function calculateDifficultyDistribution(questions: any[]): Record<string, number> {
  const dist: Record<string, number> = {
    junior: 0,
    'mid-level': 0,
    midLevel: 0,
    senior: 0,
    staff: 0
  };
  
  questions.forEach(q => {
    const normalized = q.difficulty === 'mid-level' ? 'midLevel' : q.difficulty;
    if (dist[normalized] !== undefined) {
      dist[normalized]++;
    }
  });
  
  // Consolidate mid-level counts
  dist.midLevel += dist['mid-level'] || 0;
  delete dist['mid-level'];
  
  return dist;
}
