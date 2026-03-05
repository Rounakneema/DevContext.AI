import { Handler } from 'aws-lambda';
import { callBedrockConverse, extractJson, MISTRAL_LARGE_MODEL } from './bedrock-client';
import * as CostTracker from './cost-tracker';

const MODEL_ID = MISTRAL_LARGE_MODEL;

interface FollowUpRequest {
    analysisId: string;
    sessionId: string;
    questionAsked: any;
    answerGiven: string;
    answerEvaluation: any;
    coverageMap: any;
    interviewContext: any;
}

interface FollowUpResponse {
    success: boolean;
    followUpQuestions: any[];
    shouldContinue: boolean;
    coverageStatus: any;
}

/**
 * Generate dynamic follow-up questions based on candidate's answer
 */
export const handler: Handler<FollowUpRequest, FollowUpResponse> = async (event) => {
    const {
        analysisId,
        sessionId,
        questionAsked,
        answerGiven,
        answerEvaluation,
        coverageMap,
        interviewContext
    } = event;

    try {
        console.log(`Generating follow-up for question: ${questionAsked.questionId}`);

        // Determine if follow-up is needed
        const needsFollowUp = determineFollowUpNeed(answerEvaluation, coverageMap);

        if (!needsFollowUp.required) {
            console.log('No follow-up needed, moving to next core question');
            return {
                success: true,
                followUpQuestions: [],
                shouldContinue: true,
                coverageStatus: needsFollowUp.coverageStatus
            };
        }

        // Generate follow-up questions
        const followUpQuestions = await generateFollowUpQuestions(
            questionAsked,
            answerGiven,
            answerEvaluation,
            needsFollowUp.gaps,
            interviewContext,
            analysisId
        );

        console.log(`Generated ${followUpQuestions.length} follow-up questions`);

        // Update coverage map
        const updatedCoverage = updateCoverageMap(coverageMap, questionAsked, followUpQuestions);

        return {
            success: true,
            followUpQuestions,
            shouldContinue: true,
            coverageStatus: updatedCoverage
        };

    } catch (error) {
        console.error('Follow-up generation failed:', error);

        return {
            success: false,
            followUpQuestions: [],
            shouldContinue: true,
            coverageStatus: coverageMap
        };
    }
};

/**
 * Determine if follow-up is needed based on answer quality
 */
function determineFollowUpNeed(
    evaluation: any,
    coverageMap: any
): { required: boolean; gaps: string[]; coverageStatus: any } {

    const gaps: string[] = [];

    // Check answer quality
    if (evaluation.overallScore < 60) {
        gaps.push('answer_quality_low');
    }

    // Check if key points were missed
    const missedKeyPoints = evaluation.missedKeyPoints || [];
    if (missedKeyPoints.length > 0) {
        gaps.push(`missed_key_points: ${missedKeyPoints.join(', ')}`);
    }

    // Check if answer was too shallow
    if (evaluation.depthScore < 50) {
        gaps.push('shallow_understanding');
    }

    // Check if candidate mentioned something interesting that deserves deeper exploration
    if (evaluation.interestingMentions && evaluation.interestingMentions.length > 0) {
        gaps.push(`explore_further: ${evaluation.interestingMentions.join(', ')}`);
    }

    return {
        required: gaps.length > 0,
        gaps,
        coverageStatus: coverageMap
    };
}

/**
 * Generate follow-up questions
 */
async function generateFollowUpQuestions(
    originalQuestion: any,
    answerGiven: string,
    evaluation: any,
    gaps: string[],
    interviewContext: any,
    analysisId: string
): Promise<any[]> {

    const prompt = `You are conducting a technical interview. Based on the candidate's answer, generate 1-3 targeted follow-up questions.

ORIGINAL QUESTION:
${originalQuestion.question}

CANDIDATE'S ANSWER:
${answerGiven}

ANSWER EVALUATION:
Score: ${evaluation.overallScore}/100
Strengths: ${evaluation.strengths?.join(', ') || 'None'}
Weaknesses: ${evaluation.weaknesses?.join(', ') || 'None'}
Missed Key Points: ${evaluation.missedKeyPoints?.join(', ') || 'None'}

GAPS IDENTIFIED:
${gaps.join('\n')}

INTERVIEW CONTEXT:
Category: ${originalQuestion.category}
Difficulty: ${originalQuestion.difficulty}
Related Concepts: ${originalQuestion.context?.relatedConcepts?.join(', ') || 'None'}

YOUR TASK:
Generate 1-3 follow-up questions that probe gaps or explore interesting points.

Return ONLY valid JSON array:
[
  {
    "questionId": "FOLLOW-${originalQuestion.questionId}-01",
    "question": "Follow-up question text",
    "type": "clarification|deep_dive|alternative|edge_case|tradeoff",
    "difficulty": "${originalQuestion.difficulty}",
    "category": "${originalQuestion.category}",
    "expectedDuration": 3,
    "probesGap": "which gap this addresses",
    "context": {
      "parentQuestionId": "${originalQuestion.questionId}",
      "relevantToAnswer": "what part of answer this follows up on"
    }
  }
]`;

    const { text: content, inferenceTimeMs, inputTokens, outputTokens } = await callBedrockConverse(
        prompt,
        MODEL_ID,
        { maxTokens: 2000, temperature: 0.6 }
    );

    await CostTracker.trackAiCall({
        analysisId,
        stage: 'answer_evaluation',
        modelId: MODEL_ID,
        inputTokens,
        outputTokens,
        inferenceTimeMs,
        promptLength: prompt.length,
        responseLength: content.length
    });

    // Parse follow-up questions
    const extracted = extractJson(content);

    if (!extracted || !Array.isArray(extracted)) {
        console.warn('Failed to parse follow-ups, returning empty array');
        return [];
    }

    return extracted.map((q: any) => ({
        ...q,
        isFollowUp: true,
        parentQuestionId: originalQuestion.questionId,
        generatedAt: new Date().toISOString()
    }));
}

/**
 * Update coverage map after asking question + follow-ups
 */
function updateCoverageMap(
    coverageMap: any,
    questionAsked: any,
    followUps: any[]
): any {

    const updated = { ...coverageMap };

    if (updated[questionAsked.category]) {
        updated[questionAsked.category].asked++;

        // Mark as covered if > 50% of questions in category have been asked
        const coverage = updated[questionAsked.category].asked / updated[questionAsked.category].total;
        if (coverage >= 0.5) {
            updated[questionAsked.category].covered = true;
        }
    }

    return updated;
}
