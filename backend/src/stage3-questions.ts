// import { Handler } from 'aws-lambda';
// import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
// import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
// import { v4 as uuidv4 } from 'uuid';
// import { ProjectContextMap } from './types';
// import { GroundingChecker } from './grounding-checker';
// import { SelfCorrectionLoop, ValidationResult } from './self-correction';
// import * as DB from './db-utils';

// const bedrockClient = new BedrockRuntimeClient({ region: 'us-west-2' });
// const s3Client = new S3Client({});

// const CACHE_BUCKET = process.env.CACHE_BUCKET!;
// // 🎯 OPTIMAL MODEL: Meta Llama 3.3 70B (Inference Profile)
// // Cost: ~$0.50 per 50-question bank | Context: 128K tokens | Quality: ⭐⭐⭐⭐⭐
// // Why: Generating diverse, well-structured question sets requires strong reasoning
// //      - Excellent at maintaining file grounding
// //      - Strong at creating varied question types
// //      - Optimized for structured JSON output
// // Uses AWS Credits: ✅ Yes
// const MODEL_ID = 'us.meta.llama3-3-70b-instruct-v1:0';

// interface Stage3Event {
//   analysisId: string;
//   projectContextMap: ProjectContextMap;
//   s3Key: string;
// }

// interface Stage3Response {
//   success: boolean;
//   analysisId: string;
//   interviewSimulation?: any;
//   error?: string;
// }

// export const handler: Handler<Stage3Event, Stage3Response> = async (event) => {
//   const { analysisId, projectContextMap, s3Key } = event;

//   try {
//     console.log(`Starting Stage 3 (Master Question Bank - 50 Questions) for: ${analysisId}`);

//     // Load comprehensive code context
//     const codeContext = await loadCodeContext(s3Key, projectContextMap);

//     // CRITICAL: Fail if no code loaded
//     if (!codeContext || codeContext.length < 100) {
//       throw new Error('No code loaded from S3. Cannot generate questions without code context.');
//     }

//     console.log(`Loaded ${codeContext.length} characters of code for question generation`);

//     // Generate master question bank (45-60 questions) with self-correction
//     const masterQuestionBank = await generateMasterQuestionBank(
//       projectContextMap,
//       codeContext
//     );

//     console.log(`Generated ${masterQuestionBank.length} questions`);

//     // Organize into 3 interview tracks
//     const interviewSimulation = organizeIntoTracks(masterQuestionBank);

//     // Save to DynamoDB
//     await DB.saveInterviewSimulation(analysisId, interviewSimulation);

//     console.log(`Stage 3 completed for: ${analysisId}`);
//     console.log(`Master Bank: ${masterQuestionBank.length} questions`);
//     console.log(`Track 1: ${interviewSimulation.interviewTracks.track1_quickAssessment.totalQuestions} questions`);
//     console.log(`Track 2: ${interviewSimulation.interviewTracks.track2_standardInterview.totalQuestions} questions`);
//     console.log(`Track 3: ${interviewSimulation.interviewTracks.track3_deepDive.totalQuestions} questions`);

//     return {
//       success: true,
//       analysisId,
//       interviewSimulation
//     };

//   } catch (error) {
//     console.error('Stage 3 failed:', error);

//     return {
//       success: false,
//       analysisId,
//       error: error instanceof Error ? error.message : 'Unknown error'
//     };
//   }
// };

// async function loadCodeContext(s3KeyPrefix: string, contextMap: ProjectContextMap): Promise<string> {
//   // Load more files for comprehensive question generation
//   const filesToLoad = [
//     ...contextMap.entryPoints.slice(0, 3),
//     ...contextMap.coreModules.slice(0, 8)
//   ].slice(0, 11);

//   const fileContents: string[] = [];

//   for (const file of filesToLoad) {
//     try {
//       const command = new GetObjectCommand({
//         Bucket: CACHE_BUCKET,
//         Key: `${s3KeyPrefix}${file}`
//       });

//       const response = await s3Client.send(command);
//       const content = await response.Body?.transformToString();

//       if (content) {
//         const truncated = content.length > 3500 ? content.substring(0, 3500) + '\n... (truncated)' : content;
//         fileContents.push(`\n--- File: ${file} ---\n${truncated}`);
//       }
//     } catch (err: any) {
//       if (err.Code === 'NoSuchKey') {
//         console.warn(`File not found in S3: ${file}`);
//       } else {
//         console.error(`Error loading ${file}:`, err);
//       }
//     }
//   }

//   // CRITICAL: Throw error if no files loaded
//   if (fileContents.length === 0) {
//     throw new Error('Failed to load code files from S3 for question generation.');
//   }

//   return fileContents.join('\n\n');
// }

// async function generateMasterQuestionBank(
//   contextMap: ProjectContextMap,
//   codeContext: string
// ): Promise<any[]> {
//   const groundingChecker = new GroundingChecker();
//   const correctionLoop = new SelfCorrectionLoop(3, 75); // Higher threshold for quality

//   const generator = async (feedback?: string): Promise<any[]> => {
//     return await generateQuestions(contextMap, codeContext, feedback);
//   };

//   const validator = async (questions: any[]): Promise<ValidationResult> => {
//     const validation = groundingChecker.validateInterviewQuestions(
//       questions,
//       contextMap.userCodeFiles
//     );

//     const issues: string[] = [];

//     if (validation.overallResult.confidence === 'insufficient') {
//       issues.push(`Poor grounding: ${validation.invalidQuestions.length} questions reference non-existent files`);
//     }

//     if (validation.overallResult.invalidReferences.length > 0) {
//       issues.push(`Invalid file references: ${validation.overallResult.invalidReferences.join(', ')}`);
//     }

//     if (questions.length < 40) {
//       issues.push(`Too few questions: ${questions.length} (expected 45-60)`);
//     }

//     // Check category distribution
//     const categories = questions.reduce((acc, q) => {
//       acc[q.category] = (acc[q.category] || 0) + 1;
//       return acc;
//     }, {} as Record<string, number>);

//     if (categories.architecture < 10) issues.push('Too few architecture questions');
//     if (categories.implementation < 10) issues.push('Too few implementation questions');

//     const groundingScore = validation.overallResult.confidence === 'high' ? 100 :
//                           validation.overallResult.confidence === 'medium' ? 80 :
//                           validation.overallResult.confidence === 'low' ? 60 : 30;

//     const countScore = Math.min(100, (questions.length / 50) * 100);
//     const validQuestionRatio = validation.validQuestions.length / questions.length;
//     const validityScore = validQuestionRatio * 100;

//     const finalScore = Math.round((groundingScore * 0.4) + (countScore * 0.3) + (validityScore * 0.3));

//     return {
//       isValid: issues.length === 0 && finalScore >= 75,
//       score: finalScore,
//       feedback: issues.length === 0 
//         ? 'Comprehensive question bank with excellent grounding'
//         : `Issues: ${issues.join('; ')}`,
//       issues
//     };
//   };

//   const result = await correctionLoop.correctWithRetry(generator, validator);

//   console.log(`Question generation: ${result.totalAttempts} attempts, converged: ${result.converged}, final score: ${result.bestScore}`);

//   return result.finalResult;
// }

// async function generateQuestions(
//   contextMap: ProjectContextMap,
//   codeContext: string,
//   feedback?: string
// ): Promise<any[]> {
//   const userCodeFilesList = contextMap.userCodeFiles.slice(0, 30).join(', ');

//   let prompt = `You are a Staff Engineer at Google preparing a comprehensive technical interview question bank. This will be used across multiple interview rounds.

// ═══════════════════════════════════════════════════════════════════════════
// PROJECT CONTEXT
// ═══════════════════════════════════════════════════════════════════════════
// Frameworks: ${contextMap.frameworks.join(', ') || 'None'}
// Entry Points: ${contextMap.entryPoints.join(', ') || 'None'}
// Languages: ${JSON.stringify(contextMap.languages || {})}
// Total Files: ${contextMap.userCodeFiles.length}

// USER-WRITTEN CODE FILES (ONLY reference these exact files):
// ${userCodeFilesList}

// CODE SAMPLE:
// ${codeContext}`;

//   if (feedback) {
//     prompt += `\n\n⚠️ PREVIOUS ATTEMPT HAD ISSUES:\n${feedback}\n\nCORRECT THESE ISSUES IN THIS GENERATION.`;
//   }

//   prompt += `

// ═══════════════════════════════════════════════════════════════════════════
// TASK: Generate 50 COMPREHENSIVE Interview Questions
// ═══════════════════════════════════════════════════════════════════════════

// ## QUESTION DISTRIBUTION (Total: 50 questions)

// ### CATEGORY BREAKDOWN:
// 1. **Architecture & System Design** (12 questions)
//    - Component interactions, data flow, system boundaries
//    - Architectural patterns used and why
//    - Scalability and extensibility considerations

// 2. **Implementation Details** (12 questions)
//    - Specific code decisions and rationale
//    - Algorithm choices and complexity
//    - Data structure selection

// 3. **Technical Trade-offs** (10 questions)
//    - Why X over Y? (e.g., REST vs GraphQL)
//    - Performance vs maintainability
//    - Consistency vs availability

// 4. **Scalability & Performance** (8 questions)
//    - Bottlenecks and optimization opportunities
//    - Caching strategies
//    - Database indexing

// 5. **Design Patterns** (4 questions)
//    - Patterns implemented and why
//    - When would you use other patterns

// 6. **Security & Reliability** (4 questions)
//    - Authentication/authorization approach
//    - Input validation and sanitization
//    - Error recovery

// ### DIFFICULTY DISTRIBUTION:
// - **Junior-Mid** (15 questions): Basic understanding, direct questions
// - **Mid-Level** (20 questions): Requires understanding of trade-offs
// - **Senior** (12 questions): System-level thinking, scalability
// - **Staff+** (3 questions): Cross-cutting concerns, org-level impact

// ═══════════════════════════════════════════════════════════════════════════
// QUESTION QUALITY STANDARDS
// ═══════════════════════════════════════════════════════════════════════════

// Each question MUST:
// 1. ✅ Reference SPECIFIC files from the user code list above
// 2. ✅ Include line numbers when referencing specific implementations
// 3. ✅ Be answerable from the provided code
// 4. ✅ Have clear evaluation criteria
// 5. ✅ Include expected answer key points
// 6. ✅ Identify red flags (wrong answers that disqualify)

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE FORMAT (JSON ARRAY)
// ═══════════════════════════════════════════════════════════════════════════

// Return EXACTLY 50 questions in this format:

// [
//   {
//     "questionId": "Q001",
//     "question": "In your routes/api.js file (lines 23-45), you implemented rate limiting with a 100 requests/minute limit. Walk me through why you chose this specific threshold. How did you arrive at this number? What happens when the limit is exceeded?",
//     "category": "implementation",
//     "difficulty": "mid-level",
//     "estimatedTime": 5,
//     "context": {
//       "fileReferences": [
//         {"file": "routes/api.js", "lineStart": 23, "lineEnd": 45}
//       ],
//       "codeSnippet": "const limiter = rateLimit({ windowMs: 60000, max: 100 });",
//       "relatedConcepts": ["rate limiting", "DDoS protection"]
//     },
//     "expectedAnswer": {
//       "keyPoints": [
//         "Prevents abuse and DDoS attacks",
//         "100 req/min allows normal usage while blocking abuse",
//         "Returns 429 status code when exceeded"
//       ],
//       "acceptableApproaches": [
//         "Token bucket algorithm",
//         "Fixed window vs sliding window trade-offs"
//       ],
//       "redFlags": [
//         "No rate limiting needed",
//         "Doesn't understand why rate limiting matters"
//       ],
//       "idealAnswerLength": "2-3 minutes"
//     },
//     "followUpQuestions": [
//       "How would you implement different rate limits for different user tiers?",
//       "What happens if the rate limiter itself becomes a bottleneck?"
//     ],
//     "evaluationCriteria": {
//       "technicalAccuracy": 0.3,
//       "completeness": 0.3,
//       "clarity": 0.2,
//       "depthOfUnderstanding": 0.2
//     },
//     "scoringRubric": {
//       "0-40": "Doesn't understand rate limiting",
//       "41-60": "Basic understanding but missing key trade-offs",
//       "61-80": "Good explanation with trade-offs",
//       "81-100": "Comprehensive answer covering security, performance, UX"
//     },
//     "tags": ["security", "performance", "rate-limiting"],
//     "hints": {
//       "level1": "Think about what happens under normal load vs attack scenarios",
//       "level2": "Consider different user types and their needs",
//       "level3": "Look at the response codes and error handling"
//     }
//   }
// ]

// Generate ALL 50 questions now. Ensure diversity in categories, difficulties, and question types.`;

//   const command = new ConverseCommand({
//     modelId: MODEL_ID,
//     messages: [
//       {
//         role: 'user',
//         content: [{ text: prompt }]
//       }
//     ],
//     inferenceConfig: {
//       maxTokens: 8000,
//       temperature: 0.6
//     }
//   });

//   const response = await bedrockClient.send(command);

//   const content = response.output?.message?.content?.[0]?.text || '';

//   console.log('Raw AI response length:', content.length);

//   // Try to extract JSON array with multiple strategies
//   let rawQuestions: any[] = [];

//   // Strategy 1: Look for JSON array with regex
//   const jsonMatch = content.match(/\[[\s\S]*\]/);

//   if (jsonMatch) {
//     try {
//       rawQuestions = JSON.parse(jsonMatch[0]);
//       console.log('✅ Successfully parsed JSON array');
//     } catch (parseError) {
//       console.warn('⚠️ JSON parse failed, trying cleanup...');

//       // Strategy 2: Clean up common JSON issues
//       let cleanedJson = jsonMatch[0]
//         // Remove control characters (newlines, tabs, etc. inside strings)
//         .replace(/[\x00-\x1F\x7F]/g, ' ')
//         // Remove trailing commas before ] or }
//         .replace(/,(\s*[}\]])/g, '$1')
//         // Remove comments
//         .replace(/\/\/.*/g, '')
//         .replace(/\/\*[\s\S]*?\*\//g, '')
//         // Fix common quote issues
//         .trim();

//       try {
//         rawQuestions = JSON.parse(cleanedJson);
//         console.log('✅ Successfully parsed cleaned JSON');
//       } catch (cleanupError) {
//         console.error('❌ JSON cleanup failed:', cleanupError);

//         // Strategy 3: Try to extract individual question objects
//         const questionMatches = content.matchAll(/\{[^{}]*"questionId"[^{}]*\}/g);
//         const extractedQuestions = [];

//         for (const match of questionMatches) {
//           try {
//             const q = JSON.parse(match[0]);
//             extractedQuestions.push(q);
//           } catch (e) {
//             // Skip malformed questions
//           }
//         }

//         if (extractedQuestions.length > 0) {
//           rawQuestions = extractedQuestions;
//           console.log(`⚠️ Extracted ${extractedQuestions.length} questions from malformed JSON`);
//         } else {
//           throw new Error('Failed to parse JSON array from Bedrock response. No valid questions found.');
//         }
//       }
//     }
//   } else {
//     throw new Error('No JSON array found in Bedrock response');
//   }

//   if (rawQuestions.length === 0) {
//     throw new Error('No questions generated by AI model');
//   }

//   console.log(`Generated ${rawQuestions.length} questions`);

//   // Add UUIDs and normalize categories
//   return rawQuestions.map((q: any, index: number) => ({
//     ...q,
//     questionId: q.questionId || `Q${String(index + 1).padStart(3, '0')}`,
//     category: normalizeCategory(q.category),
//     difficulty: normalizeDifficulty(q.difficulty)
//   }));
// }

// function normalizeCategory(category: string): string {
//   const normalized = category.toLowerCase().replace(/[^a-z]/g, '');

//   if (normalized.includes('arch')) return 'architecture';
//   if (normalized.includes('impl')) return 'implementation';
//   if (normalized.includes('trade')) return 'tradeoffs';
//   if (normalized.includes('scal')) return 'scalability';
//   if (normalized.includes('design') || normalized.includes('pattern')) return 'designPatterns';
//   if (normalized.includes('secur')) return 'security';
//   if (normalized.includes('perform')) return 'performance';
//   if (normalized.includes('debug')) return 'debugging';

//   return 'implementation';
// }

// function normalizeDifficulty(difficulty: string): string {
//   const normalized = difficulty.toLowerCase().replace(/[^a-z-]/g, '');

//   if (normalized.includes('junior')) return 'junior';
//   if (normalized.includes('mid')) return 'mid-level';
//   if (normalized.includes('senior')) return 'senior';
//   if (normalized.includes('staff')) return 'staff';

//   return 'mid-level';
// }

// function organizeIntoTracks(masterBank: any[]): any {
//   // Organize questions by category and difficulty
//   const byCategory: Record<string, any[]> = {};
//   const byDifficulty: Record<string, any[]> = {};

//   masterBank.forEach(q => {
//     byCategory[q.category] = byCategory[q.category] || [];
//     byCategory[q.category].push(q);

//     byDifficulty[q.difficulty] = byDifficulty[q.difficulty] || [];
//     byDifficulty[q.difficulty].push(q);
//   });

//   // Track 1: Quick Assessment (10 questions, 30 min)
//   const track1 = selectQuestionsForTrack(masterBank, {
//     total: 10,
//     categories: {
//       implementation: 4,
//       architecture: 3,
//       tradeoffs: 3
//     },
//     difficulties: {
//       'junior': 5,
//       'mid-level': 3,
//       'senior': 2
//     }
//   });

//   // Track 2: Standard Interview (15 questions, 60 min)
//   const track2 = selectQuestionsForTrack(masterBank, {
//     total: 15,
//     categories: {
//       architecture: 5,
//       implementation: 4,
//       tradeoffs: 3,
//       scalability: 3
//     },
//     difficulties: {
//       'junior': 4,
//       'mid-level': 6,
//       'senior': 5
//     }
//   });

//   // Track 3: Deep Dive (25 questions, 90 min)
//   const track3 = selectQuestionsForTrack(masterBank, {
//     total: 25,
//     categories: {
//       architecture: 7,
//       implementation: 6,
//       tradeoffs: 5,
//       scalability: 4,
//       designPatterns: 3
//     },
//     difficulties: {
//       'mid-level': 5,
//       'senior': 13,
//       'staff': 7
//     }
//   });

//   const startTime = Date.now();

//   return {
//     masterQuestionBank: {
//       totalQuestions: masterBank.length,
//       questions: masterBank,
//       categoryCounts: calculateCategoryCounts(masterBank),
//       difficultyDistribution: calculateDifficultyDistribution(masterBank),
//       exportFormats: {
//         pdf: true,
//         markdown: true,
//         json: true
//       }
//     },

//     interviewTracks: {
//       track1_quickAssessment: {
//         name: "Quick Assessment",
//         description: "First-round technical screening",
//         duration: 30,
//         totalQuestions: track1.length,
//         questions: track1,
//         categoryCounts: calculateCategoryCounts(track1),
//         difficultyDistribution: calculateDifficultyDistribution(track1),
//         recommendedFor: "Initial screening, junior-mid level candidates"
//       },

//       track2_standardInterview: {
//         name: "Standard Technical Interview",
//         description: "Main technical round covering breadth and depth",
//         duration: 60,
//         totalQuestions: track2.length,
//         questions: track2,
//         categoryCounts: calculateCategoryCounts(track2),
//         difficultyDistribution: calculateDifficultyDistribution(track2),
//         recommendedFor: "Mid-level to senior candidates, primary technical assessment"
//       },

//       track3_deepDive: {
//         name: "Deep Dive / Bar Raiser",
//         description: "Comprehensive assessment for senior/staff positions",
//         duration: 90,
//         totalQuestions: track3.length,
//         questions: track3,
//         categoryCounts: calculateCategoryCounts(track3),
//         difficultyDistribution: calculateDifficultyDistribution(track3),
//         recommendedFor: "Senior+ candidates, final round, bar raiser interviews"
//       }
//     },

//     usage: {
//       totalPossibleQuestions: masterBank.length,
//       track1Questions: track1.length,
//       track2Questions: track2.length,
//       track3Questions: track3.length,
//       customTrackSupport: true,
//       exportAvailable: true
//     },

//     modelMetadata: {
//       modelId: MODEL_ID,
//       tokensIn: 8000,
//       tokensOut: masterBank.length * 100,
//       inferenceTimeMs: Date.now() - startTime,
//       temperature: 0.6
//     },

//     generatedAt: new Date().toISOString()
//   };
// }

// function selectQuestionsForTrack(
//   allQuestions: any[],
//   config: {
//     total: number;
//     categories: Record<string, number>;
//     difficulties: Record<string, number>;
//   }
// ): any[] {
//   const selected: any[] = [];
//   const used = new Set<string>();

//   // Select by category distribution
//   for (const [category, count] of Object.entries(config.categories)) {
//     const categoryQuestions = allQuestions.filter(q => 
//       q.category === category && !used.has(q.questionId)
//     );

//     const toSelect = categoryQuestions.slice(0, count);
//     toSelect.forEach(q => {
//       selected.push(q);
//       used.add(q.questionId);
//     });
//   }

//   // Fill remaining slots
//   while (selected.length < config.total) {
//     const remaining = allQuestions.filter(q => !used.has(q.questionId));
//     if (remaining.length === 0) break;

//     selected.push(remaining[0]);
//     used.add(remaining[0].questionId);
//   }

//   return selected.slice(0, config.total);
// }

// function calculateCategoryCounts(questions: any[]): Record<string, number> {
//   const counts: Record<string, number> = {
//     architecture: 0,
//     implementation: 0,
//     tradeoffs: 0,
//     scalability: 0,
//     designPatterns: 0,
//     security: 0,
//     performance: 0,
//     debugging: 0
//   };

//   questions.forEach(q => {
//     if (counts[q.category] !== undefined) {
//       counts[q.category]++;
//     }
//   });

//   return counts;
// }

// function calculateDifficultyDistribution(questions: any[]): Record<string, number> {
//   const dist: Record<string, number> = {
//     junior: 0,
//     'mid-level': 0,
//     midLevel: 0,
//     senior: 0,
//     staff: 0
//   };

//   questions.forEach(q => {
//     const normalized = q.difficulty === 'mid-level' ? 'midLevel' : q.difficulty;
//     if (dist[normalized] !== undefined) {
//       dist[normalized]++;
//     }
//   });

//   // Consolidate mid-level counts
//   dist.midLevel += dist['mid-level'] || 0;
//   delete dist['mid-level'];

//   return dist;
// }
import { Handler } from 'aws-lambda';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { ProjectContextMap } from './types';
import { GroundingChecker } from './grounding-checker';
import { SelfCorrectionLoop, ValidationResult } from './self-correction';
import * as DB from './db-utils';
import * as CostTracker from './cost-tracker';

const bedrockClient = new BedrockRuntimeClient({ region: 'us-west-2' });
const s3Client = new S3Client({});

const CACHE_BUCKET = process.env.CACHE_BUCKET!;
// 🎯 OPTIMAL MODEL: Meta Llama 3.3 70B (Inference Profile)
const MODEL_ID = 'us.meta.llama3-3-70b-instruct-v1:0';

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
    console.log(`Starting Stage 3 (Master Question Bank) for: ${analysisId}`);

    // Load code context
    const codeContext = await loadCodeContext(s3Key, projectContextMap);

    if (!codeContext || codeContext.length < 100) {
      throw new Error('No code loaded from S3');
    }

    console.log(`Loaded ${codeContext.length} chars of code`);

    // Generate master question bank
    const masterQuestionBank = await generateMasterQuestionBank(
      projectContextMap,
      codeContext,
      analysisId
    );

    console.log(`Generated ${masterQuestionBank.length} questions`);

    // Organize into tracks
    const interviewSimulation = organizeIntoTracks(masterQuestionBank);

    // Save to DynamoDB
    await DB.saveInterviewSimulation(analysisId, interviewSimulation);

    console.log(`Stage 3 completed: ${masterQuestionBank.length} questions total`);

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
      }
    }
  }

  if (fileContents.length === 0) {
    throw new Error('Failed to load code files from S3');
  }

  return fileContents.join('\n\n');
}

async function generateMasterQuestionBank(
  contextMap: ProjectContextMap,
  codeContext: string,
  analysisId: string
): Promise<any[]> {
  const groundingChecker = new GroundingChecker();
  const correctionLoop = new SelfCorrectionLoop(3, 75);

  const generator = async (feedback?: string): Promise<any[]> => {
    return await generateQuestions(contextMap, codeContext, feedback, analysisId);
  };

  const validator = async (questions: any[]): Promise<ValidationResult> => {
    const validation = groundingChecker.validateInterviewQuestions(
      questions,
      contextMap.userCodeFiles
    );

    const issues: string[] = [];

    if (validation.overallResult.confidence === 'insufficient') {
      issues.push(`Poor grounding: ${validation.invalidQuestions.length} invalid files`);
    }

    if (questions.length < 40) {
      issues.push(`Too few questions: ${questions.length} (expected 45-60)`);
    }

    const categories = questions.reduce((acc, q) => {
      acc[q.category] = (acc[q.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (categories.architecture < 10) issues.push('Too few architecture questions');
    if (categories.implementation < 10) issues.push('Too few implementation questions');

    const groundingScore = validation.overallResult.confidence === 'high' ? 100 :
      validation.overallResult.confidence === 'medium' ? 80 : 60;

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

  console.log(`Question generation: ${result.totalAttempts} attempts, score: ${result.bestScore}`);

  return result.finalResult;
}

async function generateQuestions(
  contextMap: ProjectContextMap,
  codeContext: string,
  feedback: string | undefined,
  analysisId: string
): Promise<any[]> {
  const userCodeFilesList = contextMap.userCodeFiles.slice(0, 30).join(', ');

  let prompt = `You are a Staff Engineer at Google preparing a technical interview question bank.

PROJECT CONTEXT:
Frameworks: ${contextMap.frameworks.join(', ') || 'None'}
Entry Points: ${contextMap.entryPoints.join(', ') || 'None'}
Languages: ${JSON.stringify(contextMap.languages || {})}

USER CODE FILES (reference these only):
${userCodeFilesList}

CODE SAMPLE:
${codeContext}`;

  if (feedback) {
    prompt += `\n\nPREVIOUS ISSUES:\n${feedback}\n\nFIX THESE ISSUES.`;
  }

  prompt += `\n\nTASK: Generate 50 interview questions.

DISTRIBUTION:
- Architecture (12): System design, component interactions
- Implementation (12): Code decisions, algorithms
- Trade-offs (10): Why X over Y
- Scalability (8): Bottlenecks, optimization
- Design Patterns (4): Patterns used
- Security (4): Auth, validation

DIFFICULTY:
- Junior-Mid (15)
- Mid-Level (20)
- Senior (12)
- Staff+ (3)

REQUIREMENTS:
1. Reference SPECIFIC files from the list above
2. Include line numbers when possible
3. Be answerable from provided code
4. Include evaluation criteria

FORMAT: Return ONLY a valid JSON array with this structure:
[
  {
    "questionId": "Q001",
    "question": "In your routes/api.js (lines 23-45), why did you choose 100 req/min for rate limiting?",
    "category": "implementation",
    "difficulty": "mid-level",
    "estimatedTime": 5,
    "context": {
      "fileReferences": [{"file": "routes/api.js", "lineStart": 23, "lineEnd": 45}],
      "codeSnippet": "const limiter = rateLimit({ windowMs: 60000, max: 100 });",
      "relatedConcepts": ["rate limiting", "security"]
    },
    "expectedAnswer": {
      "keyPoints": ["Prevents DDoS", "Allows normal usage", "Returns 429"],
      "acceptableApproaches": ["Token bucket", "Sliding window"],
      "redFlags": ["No rate limiting needed"],
      "idealAnswerLength": "2-3 minutes"
    },
    "followUpQuestions": ["How would you handle different user tiers?"],
    "evaluationCriteria": {
      "technicalAccuracy": 0.3,
      "completeness": 0.3,
      "clarity": 0.2,
      "depthOfUnderstanding": 0.2
    },
    "tags": ["security", "performance"]
  }
]

Generate ALL 50 questions. Return ONLY valid JSON, no markdown, no explanation.`;

  const startTime = Date.now();

  // Estimate input tokens
  const inputTokens = CostTracker.estimateTokenCount(prompt);

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [
      {
        role: 'user',
        content: [{ text: prompt }]
      }
    ],
    inferenceConfig: {
      maxTokens: 16000,
      temperature: 0.5
    }
  });

  const response = await bedrockClient.send(command);
  const inferenceTimeMs = Date.now() - startTime;

  const content = response.output?.message?.content?.[0]?.text || '';
  const outputTokens = CostTracker.estimateTokenCount(content);

  // Track cost
  await CostTracker.trackBedrockCall({
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

  // Log first 200 chars to debug control character issues
  const preview = content.substring(0, 200).replace(/[\x00-\x1F\x7F]/g, (char) => {
    return `[0x${char.charCodeAt(0).toString(16)}]`;
  });
  console.log('Response preview (control chars shown):', preview);

  // ROBUST JSON PARSING
  const rawQuestions = parseQuestionsFromResponse(content);

  if (rawQuestions.length === 0) {
    throw new Error('No questions generated');
  }

  console.log(`✅ Parsed ${rawQuestions.length} questions`);

  // Normalize and add UUIDs
  return rawQuestions.map((q: any, index: number) => ({
    ...q,
    questionId: q.questionId || `Q${String(index + 1).padStart(3, '0')}`,
    category: normalizeCategory(q.category || 'implementation'),
    difficulty: normalizeDifficulty(q.difficulty || 'mid-level'),
    evaluationCriteria: q.evaluationCriteria || {
      technicalAccuracy: 0.3,
      completeness: 0.3,
      clarity: 0.2,
      depthOfUnderstanding: 0.2
    },
    tags: q.tags || [],
    context: q.context || { fileReferences: [], relatedConcepts: [] },
    expectedAnswer: q.expectedAnswer || { keyPoints: [], acceptableApproaches: [], redFlags: [] }
  }));
}

/**
 * Robust JSON parsing with multiple fallback strategies
 */
function parseQuestionsFromResponse(content: string): any[] {
  // ── Strategy 1: find outermost JSON array ──────────────────────────────
  const arrayStart = content.indexOf('[');
  const arrayEnd = content.lastIndexOf(']');
  if (arrayStart === -1 || arrayEnd <= arrayStart) {
    console.error('\u274c No JSON array brackets found in response');
    return [];
  }

  let jsonText = content.slice(arrayStart, arrayEnd + 1);

  // Sanitize: replace raw (unescaped) control chars inside string literals
  jsonText = sanitizeJsonStringLiterals(jsonText);
  // Remove trailing commas
  jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');

  try {
    const parsed = JSON.parse(jsonText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      console.log(`\u2705 Strategy 1: direct parse — ${parsed.length} questions`);
      return parsed;
    }
  } catch (e) {
    console.warn(`\u26a0\ufe0f Strategy 1 failed: ${e instanceof Error ? e.message.slice(0, 120) : e}`);
  }

  // ── Strategy 2: depth-aware bracket scanner ────────────────────────────
  // Handles nested objects/arrays that flat regex cannot match
  console.log('\u26a0\ufe0f Strategy 2: depth-aware bracket scanner...');
  const extracted = extractObjectsWithBracketScanner(jsonText);
  if (extracted.length > 0) {
    console.log(`\u2705 Strategy 2: extracted ${extracted.length} question objects`);
    return extracted;
  }

  // ── Strategy 3: look for markdown code fence (model may wrap output) ───
  const mdMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) {
    console.log('\u26a0\ufe0f Strategy 3: found markdown code block...');
    try {
      const cleaned = sanitizeJsonStringLiterals(mdMatch[1].trim())
        .replace(/,(\s*[}\]])/g, '$1');
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`\u2705 Strategy 3: markdown block parsed — ${parsed.length} questions`);
        return parsed;
      }
    } catch (e) {
      console.warn(`\u26a0\ufe0f Strategy 3 failed: ${e instanceof Error ? e.message.slice(0, 80) : e}`);
    }
  }

  console.error('\u274c All strategies failed. Returning 0 questions.');
  return [];
}

/**
 * Replace raw unescaped newlines/tabs/CRs inside JSON string literals with space.
 * Correctly handles escape sequences so \n in strings is not double-processed.
 */
function sanitizeJsonStringLiterals(text: string): string {
  const out: string[] = [];
  let inString = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') {
        // Escape sequence — keep both chars as-is
        out.push(ch);
        i++;
        if (i < text.length) { out.push(text[i]); i++; }
        continue;
      }
      if (ch === '"') {
        inString = false;
        out.push(ch);
      } else if (ch === '\n' || ch === '\r' || ch === '\t') {
        // Bare control char inside a string literal — illegal in JSON
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

/**
 * Extract all top-level { } objects that contain "questionId" using a
 * character-level depth tracker. Correctly handles nested objects and arrays.
 */
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
        if (c === '\\') { j += 2; continue; }  // skip escaped char
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
                const obj = JSON.parse(
                  sanitizeJsonStringLiterals(objText).replace(/,(\s*[}\]])/g, '$1')
                );
                if (obj && obj.questionId && obj.question) {
                  results.push(obj);
                }
              } catch (_) { /* skip malformed */ }
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

function organizeIntoTracks(masterBank: any[]): any {
  const byCategory: Record<string, any[]> = {};
  const byDifficulty: Record<string, any[]> = {};

  masterBank.forEach(q => {
    byCategory[q.category] = byCategory[q.category] || [];
    byCategory[q.category].push(q);

    byDifficulty[q.difficulty] = byDifficulty[q.difficulty] || [];
    byDifficulty[q.difficulty].push(q);
  });

  const track1 = selectQuestionsForTrack(masterBank, {
    total: 10,
    categories: { implementation: 4, architecture: 3, tradeoffs: 3 },
    difficulties: { 'junior': 5, 'mid-level': 3, 'senior': 2 }
  });

  const track2 = selectQuestionsForTrack(masterBank, {
    total: 15,
    categories: { architecture: 5, implementation: 4, tradeoffs: 3, scalability: 3 },
    difficulties: { 'junior': 4, 'mid-level': 6, 'senior': 5 }
  });

  const track3 = selectQuestionsForTrack(masterBank, {
    total: 25,
    categories: { architecture: 7, implementation: 6, tradeoffs: 5, scalability: 4, designPatterns: 3 },
    difficulties: { 'mid-level': 5, 'senior': 13, 'staff': 7 }
  });

  return {
    // Top-level flat access for frontend + test compatibility
    questions: masterBank,
    totalQuestions: masterBank.length,

    masterQuestionBank: {
      totalQuestions: masterBank.length,
      questions: masterBank,
      categoryCounts: calculateCategoryCounts(masterBank),
      difficultyDistribution: calculateDifficultyDistribution(masterBank),
      exportFormats: { pdf: true, markdown: true, json: true }
    },

    interviewTracks: {
      track1_quickAssessment: {
        name: "Quick Assessment",
        description: "First-round screening",
        duration: 30,
        totalQuestions: track1.length,
        questions: track1,
        categoryCounts: calculateCategoryCounts(track1),
        difficultyDistribution: calculateDifficultyDistribution(track1),
        recommendedFor: "Initial screening, junior-mid level"
      },

      track2_standardInterview: {
        name: "Standard Technical Interview",
        description: "Main technical round",
        duration: 60,
        totalQuestions: track2.length,
        questions: track2,
        categoryCounts: calculateCategoryCounts(track2),
        difficultyDistribution: calculateDifficultyDistribution(track2),
        recommendedFor: "Mid-level to senior candidates"
      },

      track3_deepDive: {
        name: "Deep Dive / Bar Raiser",
        description: "Comprehensive senior+ assessment",
        duration: 90,
        totalQuestions: track3.length,
        questions: track3,
        categoryCounts: calculateCategoryCounts(track3),
        difficultyDistribution: calculateDifficultyDistribution(track3),
        recommendedFor: "Senior+ candidates, bar raiser"
      }
    },

    modelMetadata: {
      modelId: MODEL_ID,
      temperature: 0.5
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
    if (counts[q.category] !== undefined) {
      counts[q.category]++;
    }
  });

  return counts;
}

function calculateDifficultyDistribution(questions: any[]): Record<string, number> {
  const dist: Record<string, number> = {
    junior: 0,
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

  return dist;
}