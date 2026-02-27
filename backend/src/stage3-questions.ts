import { Handler } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { InterviewSimulation, InterviewQuestion, ProjectContextMap } from './types';
import { GroundingChecker } from './grounding-checker';
import { SelfCorrectionLoop, ValidationResult } from './self-correction';

const bedrockClient = new BedrockRuntimeClient({ region: 'ap-southeast-1' });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3Client = new S3Client({});

const ANALYSES_TABLE = process.env.ANALYSES_TABLE!;
const CACHE_BUCKET = process.env.CACHE_BUCKET!;
// Using Amazon Nova Micro (APAC) - verified working, fast and cheap
const MODEL_ID = 'apac.amazon.nova-micro-v1:0';

interface Stage3Event {
  analysisId: string;
  projectContextMap: ProjectContextMap;
  s3Key: string;
}

interface Stage3Response {
  success: boolean;
  analysisId: string;
  interviewSimulation?: InterviewSimulation;
  error?: string;
}

export const handler: Handler<Stage3Event, Stage3Response> = async (event) => {
  const { analysisId, projectContextMap, s3Key } = event;
  
  try {
    console.log(`Starting Stage 3 (Interview Questions) for: ${analysisId}`);
    
    // Load code context
    const codeContext = await loadCodeContext(s3Key, projectContextMap);
    
    // Generate interview questions with self-correction
    const questions = await generateInterviewQuestionsWithCorrection(
      projectContextMap,
      codeContext
    );
    
    // Calculate distributions
    const interviewSimulation = calculateDistributions(questions);
    
    // Save to DynamoDB
    await saveInterviewSimulation(analysisId, interviewSimulation);
    
    console.log(`Stage 3 completed for: ${analysisId}`);
    
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
    ...contextMap.entryPoints.slice(0, 2),
    ...contextMap.coreModules.slice(0, 5)
  ].slice(0, 7);
  
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
        const truncated = content.length > 3000 ? content.substring(0, 3000) + '\n... (truncated)' : content;
        fileContents.push(`\n--- File: ${file} ---\n${truncated}`);
      }
    } catch (err: any) {
      // Log but continue - some files might not exist in S3
      if (err.Code === 'NoSuchKey') {
        console.warn(`File not found in S3: ${file}`);
      } else {
        console.error(`Error loading ${file}:`, err);
      }
    }
  }
  
  // If no files were loaded, return a minimal context
  if (fileContents.length === 0) {
    return `Project has ${contextMap.totalFiles} files. Frameworks: ${contextMap.frameworks.join(', ') || 'None'}`;
  }
  
  return fileContents.join('\n\n');
}

async function generateInterviewQuestionsWithCorrection(
  contextMap: ProjectContextMap,
  codeContext: string
): Promise<InterviewQuestion[]> {
  const groundingChecker = new GroundingChecker();
  const correctionLoop = new SelfCorrectionLoop(3, 70);

  // Generator function
  const generator = async (feedback?: string): Promise<InterviewQuestion[]> => {
    return await generateInterviewQuestions(contextMap, codeContext, feedback);
  };

  // Validator function
  const validator = async (questions: InterviewQuestion[]): Promise<ValidationResult> => {
    const validation = groundingChecker.validateInterviewQuestions(
      questions,
      contextMap.userCodeFiles
    );

    const issues: string[] = [];
    
    // Check grounding
    if (validation.overallResult.confidence === 'insufficient') {
      issues.push(`Poor grounding: ${validation.invalidQuestions.length} questions have invalid file references`);
    }
    
    if (validation.overallResult.invalidReferences.length > 0) {
      issues.push(`Invalid file references: ${validation.overallResult.invalidReferences.join(', ')}`);
    }

    // Check question count
    if (questions.length < 8) {
      issues.push(`Too few questions: ${questions.length} (expected 10)`);
    }

    // Calculate score
    const groundingScore = validation.overallResult.confidence === 'high' ? 100 :
                          validation.overallResult.confidence === 'medium' ? 75 :
                          validation.overallResult.confidence === 'low' ? 50 : 25;
    
    const countScore = Math.min(100, (questions.length / 10) * 100);
    const validQuestionRatio = validation.validQuestions.length / questions.length;
    const validityScore = validQuestionRatio * 100;

    const finalScore = Math.round((groundingScore * 0.5) + (countScore * 0.2) + (validityScore * 0.3));

    return {
      isValid: issues.length === 0,
      score: finalScore,
      feedback: issues.length === 0 
        ? 'Questions are well-grounded and complete'
        : `Issues found: ${issues.join('; ')}`,
      issues
    };
  };

  // Execute with self-correction
  const result = await correctionLoop.correctWithRetry(generator, validator);

  console.log(`Self-correction completed: ${result.totalAttempts} attempts, converged: ${result.converged}, best score: ${result.bestScore}`);

  return result.finalResult;
}

async function generateInterviewQuestions(
  contextMap: ProjectContextMap,
  codeContext: string,
  feedback?: string
): Promise<InterviewQuestion[]> {
  const userCodeFilesList = contextMap.userCodeFiles.slice(0, 20).join(', ');
  
  let prompt = `You are an experienced technical interviewer creating project-specific questions.

Project Context:
- Frameworks: ${contextMap.frameworks.join(', ') || 'None'}
- Entry Points: ${contextMap.entryPoints.join(', ') || 'None'}
- Total User Code Files: ${contextMap.userCodeFiles.length}

User-Written Code Files (ONLY reference these):
${userCodeFilesList}

Code Sample:
${codeContext}`;

  // Add feedback if this is a retry
  if (feedback) {
    prompt += `\n\n⚠️ FEEDBACK FROM PREVIOUS ATTEMPT:\n${feedback}\n\nPlease address the issues above.`;
  }

  prompt += `

Task: Generate 10 interview questions covering:
1. Architecture: System design, component interactions (3 questions)
2. Implementation: Specific code decisions (3 questions)
3. Trade-offs: Why certain approaches were chosen (2 questions)
4. Scalability: How the system would handle growth (2 questions)

Requirements:
- Reference ONLY files from the user-written code list above
- Include specific file names in questions
- Vary difficulty: 40% junior, 40% mid-level, 20% senior
- Make questions realistic for technical interviews

Respond in JSON format as an array:
[
  {
    "question": "In your main.py file, you implemented user authentication. Why did you choose this approach?",
    "category": "implementation",
    "difficulty": "mid-level",
    "fileReferences": ["main.py"],
    "expectedTopics": ["authentication", "security", "session management"]
  }
]`;

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
      max_new_tokens: 2000,
      temperature: 0.5
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
    throw new Error('Failed to parse JSON from Bedrock response');
  }
  
  const rawQuestions = JSON.parse(jsonMatch[0]);
  
  // Add UUIDs to questions
  return rawQuestions.map((q: any) => ({
    questionId: uuidv4(),
    ...q
  }));
}

function calculateDistributions(questions: InterviewQuestion[]): InterviewSimulation {
  const categoryCounts = {
    architecture: 0,
    implementation: 0,
    tradeoffs: 0,
    scalability: 0
  };
  
  const difficultyDistribution = {
    junior: 0,
    midLevel: 0,
    senior: 0
  };
  
  for (const q of questions) {
    // Normalize category names (handle variations like "trade-offs" vs "tradeoffs")
    const normalizedCategory = q.category.toLowerCase().replace(/[^a-z]/g, '');
    
    if (normalizedCategory === 'architecture') categoryCounts.architecture++;
    else if (normalizedCategory === 'implementation') categoryCounts.implementation++;
    else if (normalizedCategory === 'tradeoffs') categoryCounts.tradeoffs++;
    else if (normalizedCategory === 'scalability') categoryCounts.scalability++;
    
    if (q.difficulty === 'junior') difficultyDistribution.junior++;
    else if (q.difficulty === 'mid-level') difficultyDistribution.midLevel++;
    else if (q.difficulty === 'senior') difficultyDistribution.senior++;
  }
  
  return {
    questions,
    categoryCounts,
    difficultyDistribution
  };
}

async function saveInterviewSimulation(
  analysisId: string,
  interviewSimulation: InterviewSimulation
): Promise<void> {
  const command = new UpdateCommand({
    TableName: ANALYSES_TABLE,
    Key: { analysisId },
    UpdateExpression: 'SET interviewSimulation = :sim, completedStages = list_append(if_not_exists(completedStages, :empty), :stage), updatedAt = :now',
    ExpressionAttributeValues: {
      ':sim': interviewSimulation,
      ':stage': ['interview_simulation'],
      ':empty': [],
      ':now': new Date().toISOString()
    }
  });
  
  await dynamoClient.send(command);
}
