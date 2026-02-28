import { APIGatewayProxyHandler } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import * as DB from './db-utils';
import { v4 as uuidv4 } from 'uuid';

const bedrockClient = new BedrockRuntimeClient({ region: 'ap-southeast-1' });
// Using Amazon Nova 2 Lite (Global) - verified working
const MODEL_ID = 'global.amazon.nova-2-lite-v1:0';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const analysisId = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');
    const { questionId, answer } = body;
    
    if (!analysisId || !questionId || !answer) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }
    
    // Get analysis from DynamoDB using db-utils
    const fullAnalysis = await DB.getFullAnalysis(analysisId);
    
    if (!fullAnalysis || !fullAnalysis.interviewSimulation) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Analysis or questions not found' })
      };
    }
    
    // Find the question
    const question = fullAnalysis.interviewSimulation.questions.find((q: any) => q.questionId === questionId);
    
    if (!question) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Question not found' })
      };
    }
    
    // Evaluate answer
    const evaluation = await evaluateAnswer(question.question, question.expectedAnswer?.keyPoints || [], answer);
    
    // Note: This endpoint is deprecated - use POST /interview/sessions/{sessionId}/answer instead
    // For backward compatibility, we'll create a temporary session
    console.warn('Using deprecated answer evaluation endpoint. Use /interview/sessions/{sessionId}/answer instead.');
    
    // Save question attempt using db-utils (requires proper session)
    // TODO: Remove this endpoint and require clients to use session-based evaluation
    const tempSessionId = `temp-${analysisId}-${Date.now()}`;
    await DB.saveQuestionAttempt(tempSessionId, {
      attemptId: uuidv4(),
      sessionId: tempSessionId,
      questionId,
      attemptNumber: 1,
      userAnswer: answer,
      submittedAt: new Date().toISOString(),
      evaluation,
      timeSpentSeconds: 0
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(evaluation)
    };
    
  } catch (error) {
    console.error('Answer evaluation failed:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

async function evaluateAnswer(
  question: string,
  expectedTopics: string[],
  userAnswer: string
): Promise<any> {
  const prompt = `You are an expert technical interviewer evaluating a candidate's answer.

Question: ${question}
Expected Topics: ${expectedTopics.join(', ')}

Candidate Answer: ${userAnswer}

Task: Evaluate the answer and provide:
1. Overall Score (0-100): Based on technical accuracy, completeness, clarity
2. Criteria Scores: Technical accuracy, completeness, clarity, depth
3. Strengths: Specific points the candidate explained well
4. Weaknesses: Missing concepts or incorrect statements
5. Missing Points: Key topics not addressed
6. Comparison: Weak vs strong answer examples
7. Feedback: Specific suggestions for improvement

Respond in JSON format:
{
  "overallScore": 75,
  "criteriaScores": {
    "technicalAccuracy": 80,
    "completeness": 70,
    "clarity": 75,
    "depthOfUnderstanding": 70
  },
  "strengths": ["Mentioned key concept X", "Explained Y clearly"],
  "weaknesses": ["Missed important aspect Z"],
  "missingKeyPoints": ["Should have discussed A", "Didn't mention B"],
  "comparison": {
    "weakAnswer": "A weak answer would just say...",
    "strongAnswer": "A strong answer would explain...",
    "yourAnswerCategory": "acceptable"
  },
  "feedback": "Your answer shows good understanding of... However, consider...",
  "improvementSuggestions": ["Study X", "Practice Y"],
  "modelId": "${MODEL_ID}",
  "tokensIn": 0,
  "tokensOut": 0,
  "inferenceTimeMs": 0
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
      max_new_tokens: 1500,
      temperature: 0.3
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
  
  const evaluation = JSON.parse(jsonMatch[0]);
  
  // Add metadata
  evaluation.modelId = MODEL_ID;
  evaluation.tokensIn = requestBody.inferenceConfig.max_new_tokens;
  evaluation.tokensOut = content.length / 4;
  evaluation.inferenceTimeMs = inferenceTimeMs;
  
  return evaluation;
}
