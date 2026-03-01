import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({ region: 'us-west-2' });
// 🏆 OPTIMAL MODEL: Meta Llama 3.3 70B Instruct (Inference Profile)
// Cost: ~$0.15 per evaluation | Context: 128K tokens | Quality: ⭐⭐⭐⭐⭐
// Why: Hiring decisions require accurate, nuanced, FAANG-calibrated scoring
//      - Matches actual hiring bars (BigTech 75+, Product 65+, Startup 60+)
//      - Provides detailed feedback with interviewer notes
//      - No fake scores - throws error if evaluation fails
// Uses AWS Credits: ✅ Yes
const MODEL_ID = 'us.meta.llama3-3-70b-instruct-v1:0';

/**
 * FAANG-Calibrated Answer Evaluation
 * 
 * This function evaluates interview answers using industry-standard rubrics
 * calibrated to actual hiring bars at BigTech, Product Companies, and Startups.
 * 
 * NO FAKE SCORES: If evaluation fails, this function throws an error.
 */
export async function evaluateAnswerComprehensive(
  question: any,
  userAnswer: string,
  timeSpent: number
): Promise<any> {
  const expectedKeyPoints = question.expectedAnswer?.keyPoints || [];
  const redFlags = question.expectedAnswer?.redFlags || [];
  const scoringRubric = question.scoringRubric || {};
  
  const prompt = `You are a Staff Engineer at Google conducting a technical interview evaluation. You must provide honest, calibrated feedback that matches industry hiring standards.

═══════════════════════════════════════════════════════════════════════════
INTERVIEW QUESTION
═══════════════════════════════════════════════════════════════════════════
Category: ${question.category}
Difficulty: ${question.difficulty}

Question:
${question.question}

Expected Key Points (candidate should cover most of these):
${expectedKeyPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

Red Flags (automatic low score if present):
${redFlags.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

${scoringRubric.description ? `\nScoring Rubric:\n${JSON.stringify(scoringRubric, null, 2)}` : ''}

═══════════════════════════════════════════════════════════════════════════
CANDIDATE'S ANSWER (Time spent: ${Math.floor(timeSpent / 60)} minutes)
═══════════════════════════════════════════════════════════════════════════
${userAnswer}

═══════════════════════════════════════════════════════════════════════════
EVALUATION FRAMEWORK - INDUSTRY STANDARD RUBRICS
═══════════════════════════════════════════════════════════════════════════

## SCORING SCALE (0-100, calibrated to FAANG hiring bars):

### 0-40: Strong Reject
- Fundamental misunderstanding of the question
- Incorrect technical information
- Mentions red flags without recognizing they're wrong
- No evidence of relevant experience
- Would not proceed in interview process at any company

### 41-60: Weak Performance
- Partial understanding but significant gaps
- Misses multiple key points
- Surface-level explanation without depth
- Could not defend answer under follow-up questions
- Maybe acceptable for junior roles with significant mentoring
- Likely reject at product companies, definitely reject at BigTech

### 61-75: Acceptable Performance
- Demonstrates solid understanding
- Covers most key points with reasonable depth
- Minor gaps or inaccuracies that could be corrected
- Could defend answer with some prompting
- Hire for mid-level at startups/product companies
- Borderline at BigTech (needs strong performance on other questions)

### 76-85: Good Performance
- Strong technical understanding
- Covers all or nearly all key points
- Good depth with concrete examples
- Could defend answer well under follow-ups
- Strong hire for mid-level, acceptable for senior at most companies
- Would likely pass this question at BigTech

### 86-95: Excellent Performance
- Deep technical understanding with nuance
- All key points covered with additional insights
- Trade-offs clearly articulated
- Could teach this topic to others
- Strong hire for senior roles
- Exceeds expectations at BigTech

### 96-100: Outstanding Performance
- Exceptional depth and breadth
- Considers edge cases and scaling implications
- Demonstrates senior/staff-level thinking
- Industry best practices evident
- Bar raiser quality, L6+ at BigTech

═══════════════════════════════════════════════════════════════════════════
EVALUATION CRITERIA (Use question-specific weights if provided)
═══════════════════════════════════════════════════════════════════════════

1. **Technical Accuracy** (${question.evaluationCriteria?.technicalAccuracy * 100 || 30}% weight)
   - Are the technical claims correct?
   - Are there factual errors or misconceptions?
   - Does the candidate use terminology correctly?
   Score: 0-100

2. **Completeness** (${question.evaluationCriteria?.completeness * 100 || 30}% weight)
   - How many of the expected key points were covered?
   - Are there critical omissions?
   - Does the answer fully address the question?
   Score: 0-100

3. **Clarity & Communication** (${question.evaluationCriteria?.clarity * 100 || 20}% weight)
   - Is the answer well-structured and easy to follow?
   - Does the candidate explain concepts clearly?
   - Could a non-expert understand the explanation?
   Score: 0-100

4. **Depth of Understanding** (${question.evaluationCriteria?.depthOfUnderstanding * 100 || 20}% weight)
   - Does the candidate demonstrate deep understanding beyond surface knowledge?
   - Can they explain WHY, not just WHAT?
   - Do they consider trade-offs and alternatives?
   Score: 0-100

═══════════════════════════════════════════════════════════════════════════
TIME ASSESSMENT
═══════════════════════════════════════════════════════════════════════════

Expected time: ${question.estimatedTime || 5} minutes
Actual time: ${Math.floor(timeSpent / 60)} minutes

Time Impact:
- Much faster (< 50% expected): May lack depth, rushed
- Appropriate (50-150% expected): Good pacing
- Much slower (> 200% expected): Struggled with concepts, overthinking

═══════════════════════════════════════════════════════════════════════════
REQUIRED OUTPUT (STRICT JSON FORMAT)
═══════════════════════════════════════════════════════════════════════════

{
  "overallScore": 72,
  "hiringRecommendation": "weak_yes",
  "levelMatch": "mid-level",
  "companyTierMatch": {
    "bigTech": "likely_reject",
    "productCompany": "borderline",
    "startup": "hire"
  },
  
  "criteriaScores": {
    "technicalAccuracy": 75,
    "completeness": 70,
    "clarity": 78,
    "depthOfUnderstanding": 65
  },
  
  "keyPointsCoverage": {
    "covered": [
      "Mentioned stateless nature of JWT",
      "Discussed scalability benefits"
    ],
    "partiallyCovered": [
      "Touched on security but didn't explain token expiration strategy"
    ],
    "missed": [
      "Token revocation challenges",
      "Refresh token patterns",
      "Storage security (localStorage vs httpOnly cookies)"
    ]
  },
  
  "strengths": [
    "Correctly explained stateless authentication concept",
    "Mentioned horizontal scalability as key benefit",
    "Used appropriate technical terminology"
  ],
  
  "weaknesses": [
    "Didn't discuss token revocation problem - critical for security discussion",
    "Missing trade-off analysis (payload size, server-side session comparison)",
    "No mention of refresh token strategy for production systems"
  ],
  
  "criticalGaps": [
    "Security implications of token storage not addressed",
    "Didn't explain how to handle compromised tokens"
  ],
  
  "redFlagsPresent": [],
  
  "comparison": {
    "categoryMapping": "acceptable",
    "weakAnswer": "JWT is good because it doesn't need a database. It's more secure and faster.",
    "acceptableAnswer": "JWT is stateless, so the server doesn't store session data. Each token contains the user ID and expiration. This helps with horizontal scaling since any server can validate the token independently. The downside is that once issued, you can't revoke a token until it expires, so we use short expiry times.",
    "strongAnswer": "I chose JWT over session-based auth for three main reasons: 1) Statelessness - no server-side session state needed. 2) Horizontal Scalability - eliminates need for sticky sessions or shared Redis. 3) Mobile/SPA Compatibility - works via Authorization headers. Key trade-offs: Token size (~200 bytes vs ~32 bytes for session IDs), Revocation challenges (mitigated with short-lived access tokens + refresh tokens), XSS risk (using httpOnly cookies). In production, I'd implement token rotation, blacklist for revoked tokens, rate limiting on refresh endpoint.",
    "yourAnswerCategory": "acceptable"
  },
  
  "detailedFeedback": "Your answer demonstrates solid understanding of JWT fundamentals - you correctly identified statelessness and scalability benefits. However, there are important gaps that would concern me in an interview: You didn't address the token revocation problem, which is THE key trade-off of JWT vs sessions. Any discussion of JWT authentication must mention that tokens can't be invalidated server-side. This omission suggests surface-level knowledge rather than production experience. To improve: 1) Always discuss trade-offs, not just benefits. 2) For security topics, mention mitigation strategies. 3) Use specific examples from your code when possible.",
  
  "interviewerNotes": {
    "candidateLevel": "mid-level",
    "technicalDepth": "moderate",
    "communicationQuality": "good",
    "confidenceLevel": "appropriate",
    "likelyPerformanceOnFollowUps": "might struggle with token security deep-dive"
  },
  
  "followUpRecommendations": [
    {
      "question": "How would you handle the token revocation problem in your system?",
      "why": "Test if they recognize the gap and can think through solutions"
    },
    {
      "question": "Walk me through what happens when a token is compromised in your implementation.",
      "why": "Security awareness and incident response thinking"
    }
  ],
  
  "improvementSuggestions": [
    "Study production JWT patterns: refresh tokens, token rotation, blacklisting strategies",
    "Research OWASP guidelines on token storage (localStorage vs cookies vs sessionStorage)",
    "Read about token security incidents (e.g., how Zoom handled JWT vulnerabilities)"
  ],
  
  "timeAnalysis": {
    "expectedMinutes": ${question.estimatedTime || 5},
    "actualMinutes": ${Math.floor(timeSpent / 60)},
    "efficiency": "${timeSpent < (question.estimatedTime || 5) * 60 * 0.8 ? 'too_fast' : timeSpent > (question.estimatedTime || 5) * 60 * 1.5 ? 'too_slow' : 'appropriate'}",
    "impact": "Time spent was appropriate for the depth provided"
  },
  
  "modelMetadata": {
    "modelId": "${MODEL_ID}",
    "evaluationVersion": "v2.0",
    "rubricApplied": "FAANG-calibrated",
    "tokensIn": 0,
    "tokensOut": 0,
    "inferenceTimeMs": 0
  },
  
  "evaluatedAt": "${new Date().toISOString()}"
}

CRITICAL INSTRUCTIONS:
1. Be HONEST and CALIBRATED. Most answers should score 60-75 (acceptable). Scores of 90+ are rare.
2. Reference specific content from the candidate's answer in your feedback.
3. Compare to the provided "acceptableAnswer" and "strongAnswer" for calibration.
4. Your evaluation determines hiring decisions - take this seriously.
5. If you see ANY red flags, score must be <60 and explain why in detailedFeedback.`;

  try {
    const command = new ConverseCommand({
      modelId: MODEL_ID,
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }]
        }
      ],
      inferenceConfig: {
        maxTokens: 2000,
        temperature: 0.2 // Low temperature for consistent, calibrated evaluation
      }
    });
    
    const startTime = Date.now();
    const response = await bedrockClient.send(command);
    const inferenceTimeMs = Date.now() - startTime;
    
    const content = response.output?.message?.content?.[0]?.text || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Bedrock evaluation response');
    }
    
    const evaluation = JSON.parse(jsonMatch[0]);
    
    // Add metadata
    evaluation.modelMetadata = {
      modelId: MODEL_ID,
      evaluationVersion: 'v2.0',
      rubricApplied: 'FAANG-calibrated',
      tokensIn: response.usage?.inputTokens || 0,
      tokensOut: response.usage?.outputTokens || 0,
      inferenceTimeMs
    };
    
    evaluation.evaluatedAt = new Date().toISOString();
    evaluation.questionId = question.questionId;
    
    return evaluation;
    
  } catch (error) {
    console.error('Bedrock evaluation failed:', error);
    
    // DO NOT return fake scores - throw error
    throw new Error(`Evaluation service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
