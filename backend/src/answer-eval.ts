import { APIGatewayProxyHandler } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { AnswerEvaluation, AnalysisRecord } from './types';

const bedrockClient = new BedrockRuntimeClient({ region: 'ap-southeast-1' });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const ANALYSES_TABLE = process.env.ANALYSES_TABLE!;
// Using Sonnet 4.5 for nuanced answer evaluation
const MODEL_ID = 'anthropic.claude-sonnet-4-5-20250929-v1:0';

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
    
    // Get analysis from DynamoDB
    const getCommand = new GetCommand({
      TableName: ANALYSES_TABLE,
      Key: { analysisId }
    });
    
    const result = await dynamoClient.send(getCommand);
    const analysis = result.Item as AnalysisRecord;
    
    if (!analysis || !analysis.interviewSimulation) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Analysis or questions not found' })
      };
    }
    
    // Find the question
    const question = analysis.interviewSimulation.questions.find(q => q.questionId === questionId);
    
    if (!question) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Question not found' })
      };
    }
    
    // Evaluate answer
    const evaluation = await evaluateAnswer(question.question, question.expectedTopics, answer);
    
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
): Promise<AnswerEvaluation> {
  const prompt = `You are an expert technical interviewer evaluating a candidate's answer.

Question: ${question}
Expected Topics: ${expectedTopics.join(', ')}

Candidate Answer: ${userAnswer}

Task: Evaluate the answer and provide:
1. Score (0-100): Based on technical accuracy, completeness, clarity
2. Strengths: Specific points the candidate explained well
3. Weaknesses: Missing concepts or incorrect statements
4. Missing Points: Key topics not addressed
5. Example Answer: Strong reference answer for comparison
6. Key Terms: Technical terms the candidate should have mentioned
7. Actionable Feedback: Specific suggestions for improvement

Be constructive but honest. Highlight both strengths and areas for growth.

Respond in JSON format:
{
  "score": 75,
  "criteriaBreakdown": {
    "technicalAccuracy": 80,
    "completeness": 70,
    "clarity": 75
  },
  "strengths": ["Mentioned key concept X", "Explained Y clearly"],
  "weaknesses": ["Missed important aspect Z", "Incorrect statement about W"],
  "missingPoints": ["Should have discussed A", "Didn't mention B"],
  "exampleAnswer": "A strong answer would explain...",
  "keyTerms": ["term1", "term2", "term3"],
  "feedback": "Your answer shows good understanding of... However, consider..."
}`;

  const requestBody = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3
  };
  
  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(requestBody)
  });
  
  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  const content = responseBody.content[0].text;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('Failed to parse JSON from Bedrock response');
  }
  
  const evaluation = JSON.parse(jsonMatch[0]);
  
  return {
    questionId: '', // Will be set by caller
    ...evaluation
  };
}
