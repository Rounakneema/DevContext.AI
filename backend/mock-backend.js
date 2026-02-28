/**
 * Mock Backend API Server
 * Provides fake responses for all DevContext.AI endpoints up to Requirement 16
 *
 * Usage:
 *   npx tsx mock-backend.ts
 *   Server runs on http://localhost:3001
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");



const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

function generateAnalysisId() {
  return uuidv4();
}

function generateTimestamp(offsetSeconds = 0) {
  const date = new Date();
  date.setSeconds(date.getSeconds() + offsetSeconds);
  return date.toISOString();
}

// ============================================================================
// ANALYSIS ENDPOINTS
// ============================================================================

/**
 * POST /analyze
 * Initiate repository analysis
 */
app.post("/analyze", (req, res) => {
  const { repositoryUrl } = req.body;

  if (!repositoryUrl) {
    return res.status(400).json({ error: "repositoryUrl is required" });
  }

  const analysisId = generateAnalysisId();

  res.json({
    analysisId,
    status: "initiated",
    estimatedCompletionTime: 90,
    cost: {
      estimatedCostUsd: 0.15,
    },
  });
});

/**
 * GET /analyses
 * List user's analyses (paginated)
 */
app.get("/analyses", (req, res) => {
  const limit = parseInt(req.query.limit ) || 20;
  const cursor = req.query.cursor ;
  const status = req.query.status ;

  const mockAnalyses = [
    {
      analysisId: "550e8400-e29b-41d4-a716-446655440001",
      userId: "user-123",
      repositoryUrl: "https://github.com/facebook/react",
      repositoryName: "react",
      status: "completed",
      createdAt: "2026-02-28T10:00:00Z",
      completedAt: "2026-02-28T10:02:30Z",
      stages: {
        project_review: { status: "completed", durationMs: 45000 },
        intelligence_report: { status: "completed", durationMs: 60000 },
        interview_simulation: { status: "completed", durationMs: 35000 },
      },
      cost: { totalCostUsd: 0.12 },
    },
    {
      analysisId: "550e8400-e29b-41d4-a716-446655440002",
      userId: "user-123",
      repositoryUrl: "https://github.com/vercel/next.js",
      repositoryName: "next.js",
      status: "completed",
      createdAt: "2026-02-27T14:30:00Z",
      completedAt: "2026-02-27T14:32:15Z",
      stages: {
        project_review: { status: "completed", durationMs: 42000 },
        intelligence_report: { status: "completed", durationMs: 55000 },
        interview_simulation: { status: "completed", durationMs: 38000 },
      },
      cost: { totalCostUsd: 0.11 },
    },
  ];

  res.json({
    items: mockAnalyses.slice(0, limit),
    nextCursor: mockAnalyses.length > limit ? "mock-cursor-123" : null,
    hasMore: mockAnalyses.length > limit,
    total: mockAnalyses.length,
  });
});

/**
 * GET /analysis/{analysisId}
 * Get complete analysis with all data
 */
app.get("/analysis/:analysisId", (req, res) => {
  const { analysisId } = req.params;

  res.json({
    analysis: {
      analysisId,
      userId: "user-123",
      repositoryUrl: "https://github.com/facebook/react",
      repositoryName: "react",
      status: "completed",
      createdAt: "2026-02-28T10:00:00Z",
      completedAt: "2026-02-28T10:02:30Z",
      stages: {
        project_review: {
          status: "completed",
          startedAt: "2026-02-28T10:00:10Z",
          completedAt: "2026-02-28T10:00:55Z",
          durationMs: 45000,
        },
        intelligence_report: {
          status: "completed",
          startedAt: "2026-02-28T10:00:55Z",
          completedAt: "2026-02-28T10:01:55Z",
          durationMs: 60000,
        },
        interview_simulation: {
          status: "completed",
          startedAt: "2026-02-28T10:01:55Z",
          completedAt: "2026-02-28T10:02:30Z",
          durationMs: 35000,
        },
      },
    },
    repository: {
      totalFiles: 450,
      totalSizeBytes: 8500000,
      totalLinesOfCode: 125000,
      languages: {
        JavaScript: 65,
        TypeScript: 25,
        CSS: 8,
        HTML: 2,
      },
      frameworks: ["React", "Jest", "Webpack", "Babel"],
      entryPoints: ["packages/react/index.js", "packages/react-dom/index.js"],
      coreModules: [
        "packages/react/src/React.js",
        "packages/scheduler/src/Scheduler.js",
      ],
      commits: {
        totalCount: 12450,
        firstCommitDate: "2013-05-24T16:15:00Z",
        lastCommitDate: "2026-02-28T09:30:00Z",
        commitFrequency: 3.2,
        contributors: 1580,
        authenticityScore: 95,
        authenticityFlags: [],
      },
      tokenBudget: {
        totalTokens: 48500,
        filesIncluded: 85,
        utilizationPercent: 97,
      },
    },
    projectReview: {
      codeQuality: {
        overall: 88,
        readability: 90,
        maintainability: 87,
        bestPractices: 92,
        testCoverage: 85,
        documentation: 82,
        errorHandling: 88,
        security: 90,
        performance: 89,
        justification:
          "Excellent code quality with strong adherence to React best practices...",
      },
      architectureClarity: {
        score: 92,
        componentOrganization:
          "Highly modular architecture with clear separation between core, renderers, and reconciler",
        designPatterns: [
          "Fiber Architecture",
          "Virtual DOM",
          "Hooks Pattern",
          "Component Composition",
        ],
        antiPatterns: [],
      },
      employabilitySignal: {
        overall: 90,
        productionReadiness: 95,
        professionalStandards: 92,
        complexity: "high",
        companyTierMatch: {
          bigTech: 95,
          productCompanies: 92,
          startups: 85,
          serviceCompanies: 88,
        },
      },
      strengths: [
        {
          strengthId: uuidv4(),
          pattern: "Exceptional test coverage",
          description:
            "Comprehensive test suite with unit, integration, and e2e tests",
          impact: "high",
          fileReferences: [
            {
              file: "packages/react/src/__tests__/React-test.js",
              lineStart: 1,
              lineEnd: 50,
              snippet: 'describe("React", () => { ... })',
              url: "https://github.com/facebook/react/blob/main/packages/react/src/__tests__/React-test.js#L1-L50",
            },
          ],
          groundingConfidence: "verified",
        },
      ],
      weaknesses: [],
      criticalIssues: [],
      projectAuthenticity: {
        score: 95,
        confidence: "high",
        signals: {
          commitDiversity: 98,
          timeSpread: 95,
          messageQuality: 92,
          codeEvolution: 94,
        },
        warnings: [],
      },
    },
    intelligenceReport: {
      systemArchitecture: {
        overview:
          "React implements a sophisticated virtual DOM reconciliation system...",
        layers: [
          {
            name: "Core",
            components: ["React API", "Hooks", "Context"],
            responsibilities: [
              "Component definition",
              "State management",
              "Lifecycle",
            ],
            fileReferences: [],
          },
        ],
        componentDiagram:
          "graph TD\n  A[React Core] --> B[Reconciler]\n  B --> C[Renderer]",
        dataFlowDiagram:
          "User Action -> State Update -> Virtual DOM Diff -> DOM Update",
        architecturalPatterns: [
          "Fiber Architecture",
          "Reconciliation",
          "Batching",
        ],
        technologyStack: {
          languages: { JavaScript: 65, TypeScript: 25 },
          frameworks: ["React"],
          databases: [],
          libraries: { scheduler: "0.23.0", "react-reconciler": "0.29.0" },
          devTools: ["Jest", "ESLint", "Prettier"],
        },
      },
      designDecisions: [],
      technicalTradeoffs: [],
      scalabilityAnalysis: {},
      securityPosture: {},
      resumeBullets: [
        "Architected high-performance virtual DOM reconciliation system handling 10,000+ components",
        "Implemented concurrent rendering with Fiber architecture for improved UX",
        "Designed modular component system used by 10M+ developers worldwide",
      ],
    },
    interviewSimulation: {
      questions: [
        {
          questionId: uuidv4(),
          questionText:
            "Explain the Virtual DOM reconciliation algorithm in React",
          category: "architecture",
          difficulty: "senior",
          fileReferences: [],
          expectedTopics: ["Diffing", "Fiber", "Reconciliation", "Performance"],
        },
      ],
      categoryCounts: {
        architecture: 3,
        implementation: 4,
        tradeoffs: 2,
        scalability: 1,
      },
      difficultyDistribution: { junior: 2, mid: 5, senior: 3 },
    },
    _metadata: {
      version: "2.0",
      generatedAt: generateTimestamp(),
      ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    },
  });
});

/**
 * GET /analysis/{analysisId}/status
 * Get analysis status and progress
 * UPDATED: Progressive workflow - Stage 1 completes, then awaits user decision
 */
app.get("/analysis/:analysisId/status", (req, res) => {
  const { analysisId } = req.params;

  // Simulate progressive workflow: Stage 1 complete, awaiting user decision
  res.json({
    analysisId,
    status: "processing", // Technical status
    workflowState: "stage1_complete_awaiting_approval", // User approval state
    progress: 33,
    stages: {
      project_review: {
        status: "completed",
        progress: 100,
        startedAt: "2026-02-28T10:00:10Z",
        completedAt: "2026-02-28T10:00:55Z",
      },
      intelligence_report: {
        status: "pending", // Awaiting user decision
        progress: 0,
      },
      interview_simulation: {
        status: "pending", // Awaiting user decision
        progress: 0,
      },
    },
    estimatedTimeRemaining: 0,
    nextAction: "User must decide: Continue to Stage 2 or Download report",
  });
});

/**
 * GET /analysis/{analysisId}/events
 * Get analysis audit log
 */
app.get("/analysis/:analysisId/events", (req, res) => {
  const { analysisId } = req.params;

  res.json({
    events: [
      {
        eventId: uuidv4(),
        analysisId,
        eventType: "analysis_initiated",
        eventData: { repositoryUrl: "https://github.com/facebook/react" },
        timestamp: "2026-02-28T10:00:00Z",
        lambdaRequestId: "req-123",
        lambdaFunction: "orchestrator",
      },
      {
        eventId: uuidv4(),
        analysisId,
        eventType: "stage_started",
        eventData: { stage: "project_review" },
        timestamp: "2026-02-28T10:00:10Z",
        lambdaRequestId: "req-124",
        lambdaFunction: "stage1-review",
      },
    ],
  });
});

/**
 * GET /analysis/{analysisId}/cost
 * Get cost breakdown
 */
app.get("/analysis/:analysisId/cost", (req, res) => {
  res.json({
    bedrockTokensIn: 48500,
    bedrockTokensOut: 12800,
    bedrockCostUsd: 0.082,
    lambdaCostUsd: 0.038,
    totalCostUsd: 0.12,
    breakdown: {
      project_review: {
        tokensIn: 16000,
        tokensOut: 4200,
        costUsd: 0.028,
      },
      intelligence_report: {
        tokensIn: 22000,
        tokensOut: 6100,
        costUsd: 0.038,
      },
      interview_simulation: {
        tokensIn: 10500,
        tokensOut: 2500,
        costUsd: 0.016,
      },
    },
  });
});

/**
 * DELETE /analysis/{analysisId}
 * Delete analysis
 */
app.delete("/analysis/:analysisId", (req, res) => {
  res.status(204).send();
});

// ============================================================================
// PROGRESSIVE WORKFLOW ENDPOINTS (NEW)
// ============================================================================

/**
 * POST /analysis/{analysisId}/continue-stage2
 * User decides to continue to Stage 2 (Intelligence Report)
 */
app.post(
  "/analysis/:analysisId/continue-stage2",
  (req, res) => {
    const { analysisId } = req.params;

    res.json({
      analysisId,
      message: "Stage 2 (Intelligence Report) started",
      status: "processing",
      estimatedCompletionTime: 120,
    });
  },
);

/**
 * POST /analysis/{analysisId}/continue-stage3
 * User decides to continue to Stage 3 (Interview Questions)
 */
app.post(
  "/analysis/:analysisId/continue-stage3",
  (req, res) => {
    const { analysisId } = req.params;

    res.json({
      analysisId,
      message: "Stage 3 (Interview Questions) started",
      status: "processing",
      estimatedCompletionTime: 90,
    });
  },
);

// ============================================================================
// INTERVIEW SESSION ENDPOINTS
// ============================================================================

/**
 * POST /interview/sessions
 * Create interview session
 */
app.post("/interview/sessions", (req, res) => {
  const { analysisId, config } = req.body;

  if (!analysisId) {
    return res.status(400).json({ error: "analysisId is required" });
  }

  const sessionId = uuidv4();

  res.json({
    sessionId,
    analysisId,
    status: "active",
    createdAt: generateTimestamp(),
    currentQuestionIndex: 0,
    totalQuestions: 10,
    progress: {
      questionsAnswered: 0,
      questionsSkipped: 0,
      averageScore: 0,
      totalTimeSpentSeconds: 0,
    },
    config: config || {
      targetRole: "Full Stack Developer",
      difficulty: "mixed",
      timeLimit: 60,
      feedbackMode: "immediate",
    },
  });
});

/**
 * GET /interview/sessions/{sessionId}
 * Get interview session details
 */
app.get("/interview/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;

  res.json({
    sessionId,
    analysisId: "550e8400-e29b-41d4-a716-446655440001",
    status: "active",
    createdAt: "2026-02-28T11:00:00Z",
    currentQuestionIndex: 3,
    totalQuestions: 10,
    progress: {
      questionsAnswered: 3,
      questionsSkipped: 0,
      averageScore: 75,
      totalTimeSpentSeconds: 450,
    },
    config: {
      targetRole: "Full Stack Developer",
      difficulty: "mixed",
      timeLimit: 60,
      feedbackMode: "immediate",
    },
  });
});

/**
 * POST /interview/sessions/{sessionId}/answer
 * Submit answer to interview question
 */
app.post(
  "/interview/sessions/:sessionId/answer",
  (req, res) => {
    const { sessionId } = req.params;
    const { questionId, answer, timeSpentSeconds } = req.body;

    if (!questionId || !answer) {
      return res
        .status(400)
        .json({ error: "questionId and answer are required" });
    }

    const attemptId = uuidv4();

    res.json({
      attemptId,
      questionId,
      evaluation: {
        overallScore: 75,
        criteriaScores: {
          technicalAccuracy: 80,
          completeness: 70,
          clarity: 75,
          depthOfUnderstanding: 75,
        },
        strengths: [
          "Correctly identified stateless nature of JWT",
          "Mentioned security aspects",
          "Discussed scalability benefits",
        ],
        weaknesses: [
          "Did not discuss token expiration strategies",
          "Missing refresh token implementation details",
        ],
        missingKeyPoints: [
          "Token storage security (httpOnly cookies)",
          "CSRF protection considerations",
          "Token rotation mechanisms",
        ],
        comparison: {
          weakAnswer: "JWT is good for authentication because it is stateless.",
          strongAnswer:
            "JWT provides stateless authentication by encoding user claims in a cryptographically signed token. The server validates the signature without storing session state, enabling horizontal scaling. Key considerations include secure storage (httpOnly cookies to prevent XSS), token expiration and refresh strategies, CSRF protection when using cookies, and proper secret key management. The trade-off is that tokens cannot be invalidated server-side without additional infrastructure.",
          yourAnswerCategory: "acceptable",
        },
        feedback:
          "Good understanding of JWT basics and stateless authentication. To improve, discuss token lifecycle management, security best practices, and trade-offs in more depth.",
        improvementSuggestions: [
          "Research token storage security patterns",
          "Learn about refresh token rotation strategies",
          "Study CSRF protection mechanisms for token-based auth",
        ],
      },
      improvementFromPrevious: 5,
    });
  },
);

/**
 * GET /interview/sessions/{sessionId}/attempts
 * Get all attempts for a session
 */
app.get(
  "/interview/sessions/:sessionId/attempts",
  (req, res) => {
    const { sessionId } = req.params;

    res.json({
      attempts: [
        {
          attemptId: uuidv4(),
          questionId: uuidv4(),
          attemptNumber: 1,
          userAnswer: "JWT provides stateless authentication...",
          submittedAt: "2026-02-28T11:05:00Z",
          evaluation: {
            overallScore: 75,
            criteriaScores: {
              technicalAccuracy: 80,
              completeness: 70,
              clarity: 75,
              depthOfUnderstanding: 75,
            },
          },
          timeSpentSeconds: 120,
        },
      ],
    });
  },
);

/**
 * POST /interview/sessions/{sessionId}/complete
 * Complete interview session
 */
app.post(
  "/interview/sessions/:sessionId/complete",
  (req, res) => {
    const { sessionId } = req.params;

    res.json({
      sessionId,
      status: "completed",
      completedAt: generateTimestamp(),
      summary: {
        duration: 24, // minutes
        totalQuestions: 10,
        questionsAnswered: 10,
        questionsSkipped: 0,
        averageScore: 78,
        totalTimeSpentSeconds: 1200,
        categoryPerformance: {
          architecture: 80,
          implementation: 75,
          tradeoffs: 78,
          scalability: 80,
        },
        improvementAreas: [
          "Security best practices",
          "Scalability patterns",
          "Error handling strategies",
        ],
        strengths: [
          "Strong understanding of system architecture",
          "Good grasp of trade-offs",
          "Clear communication",
        ],
        keyInsights: {
          strengths: [
            "Excellent architectural thinking",
            "Strong problem-solving approach",
          ],
          areasForImprovement: [
            "Deeper discussion of trade-offs needed",
            "More specific performance metrics",
          ],
        },
        recommendedNextSteps: [
          {
            action: "Study microservices communication patterns",
            resources: [
              "https://microservices.io/patterns/communication-style/messaging.html",
              "https://martinfowler.com/articles/microservices.html",
            ],
            estimatedTime: "2-3 hours",
          },
          {
            action: "Practice system design scenarios",
            resources: ["https://github.com/donnemartin/system-design-primer"],
            estimatedTime: "5-10 hours",
          },
          {
            action: "Review questions scored below 70",
            resources: [],
            estimatedTime: "1 hour",
          },
        ],
      },
    });
  },
);

// ============================================================================
// USER PROFILE ENDPOINTS
// ============================================================================

/**
 * POST /user/profile
 * Create/update user profile (onboarding)
 */
app.post("/user/profile", (req, res) => {
  const { displayName, targetRole, language, githubConnected } = req.body;

  res.json({
    userId: "user-123",
    email: "user@example.com",
    displayName: displayName || "John Doe",
    targetRole: targetRole || "Full Stack Developer",
    language: language || "en",
    githubConnected: githubConnected || false,
    subscription: {
      tier: "free",
      status: "active",
      analysisQuota: 10,
      analysisUsed: 2,
    },
    preferences: {
      notifications: true,
    },
    createdAt: generateTimestamp(-86400),
    updatedAt: generateTimestamp(),
  });
});

/**
 * GET /user/profile
 * Get user profile
 */
app.get("/user/profile", (req, res) => {
  res.json({
    userId: "user-123",
    email: "user@example.com",
    displayName: "John Doe",
    targetRole: "Full Stack Developer",
    language: "en",
    githubConnected: false,
    githubUsername: null,
    subscription: {
      tier: "free",
      status: "active",
      analysisQuota: 10,
      analysisUsed: 2,
      resetAt: "2026-03-01T00:00:00Z",
    },
    preferences: {
      notifications: true,
      emailDigest: false,
    },
    createdAt: "2026-02-20T10:00:00Z",
    updatedAt: generateTimestamp(),
  });
});

/**
 * PATCH /user/preferences
 * Update user preferences
 */
app.patch("/user/preferences", (req, res) => {
  const updates = req.body;

  res.json({
    userId: "user-123",
    email: "user@example.com",
    displayName: "John Doe",
    targetRole: updates.targetRole || "Full Stack Developer",
    language: updates.language || "en",
    preferences: {
      notifications:
        updates.notifications !== undefined ? updates.notifications : true,
      emailDigest:
        updates.emailDigest !== undefined ? updates.emailDigest : false,
    },
    updatedAt: generateTimestamp(),
  });
});

/**
 * GET /user/stats
 * Get user statistics for dashboard
 */
app.get("/user/stats", (req, res) => {
  res.json({
    totalAnalyses: 12,
    totalInterviewSessions: 8,
    totalQuestionsAnswered: 80,
    averageCodeQuality: 82,
    averageEmployabilityScore: 78,
    averageInterviewScore: 75,
    lastAnalysisDate: "2026-02-28T10:00:00Z",
    lastInterviewDate: "2026-02-27T15:30:00Z",
  });
});

// ============================================================================
// USER PROGRESS ENDPOINTS
// ============================================================================

/**
 * GET /user/progress
 * Get user progress and improvement trends
 */
app.get("/user/progress", (req, res) => {
  res.json({
    totalAnalyses: 12,
    totalInterviewSessions: 8,
    totalQuestionsAnswered: 80,
    averageCodeQuality: 82,
    averageEmployabilityScore: 78,
    averageInterviewScore: 75,
    improvementTrend: [
      {
        date: "2026-02-01",
        metric: "codeQuality",
        value: 75,
      },
      {
        date: "2026-02-08",
        metric: "codeQuality",
        value: 78,
      },
      {
        date: "2026-02-15",
        metric: "codeQuality",
        value: 80,
      },
      {
        date: "2026-02-22",
        metric: "codeQuality",
        value: 82,
      },
    ],
    identifiedSkillGaps: [
      {
        skill: "System Design",
        currentLevel: 60,
        targetLevel: 80,
        priority: "high",
        learningResources: [
          "https://example.com/system-design-course",
          "https://example.com/scalability-patterns",
        ],
      },
      {
        skill: "Security Best Practices",
        currentLevel: 70,
        targetLevel: 85,
        priority: "medium",
        learningResources: ["https://example.com/web-security-fundamentals"],
      },
    ],
    recommendedTopics: [
      "Microservices Architecture",
      "Database Optimization",
      "Security Best Practices",
      "Performance Tuning",
    ],
    completedTopics: [
      "REST API Design",
      "Authentication Patterns",
      "React Hooks",
    ],
    categoryPerformance: {
      architecture: {
        averageScore: 80,
        trend: "improving",
        sessionsCompleted: 5,
      },
      implementation: {
        averageScore: 75,
        trend: "stable",
        sessionsCompleted: 8,
      },
      tradeoffs: {
        averageScore: 78,
        trend: "improving",
        sessionsCompleted: 6,
      },
      scalability: {
        averageScore: 72,
        trend: "improving",
        sessionsCompleted: 4,
      },
    },
    performanceTrend: {
      comparedToPrevious: 3, // +3 points improvement
      trend: "improving",
      lastSessionScore: 78,
      previousSessionScore: 75,
    },
  });
});

// ============================================================================
// LEARNING PATH ENDPOINTS (Requirement 16)
// ============================================================================

/**
 * GET /user/learning-path
 * Get personalized 30-day learning path
 */
app.get("/user/learning-path", (req, res) => {
  res.json({
    userId: "user-123",
    generatedAt: generateTimestamp(),
    currentWeek: 2,
    totalWeeks: 4,
    overallProgress: 35,
    weeks: [
      {
        weekNumber: 1,
        focusTopic: "Security Fundamentals",
        status: "completed",
        skillGapAddressed: "Security Best Practices",
        learningGoals: [
          "Understand OWASP Top 10",
          "Implement authentication securely",
          "Learn about XSS and CSRF prevention",
        ],
        resources: [
          {
            resourceId: uuidv4(),
            type: "article",
            title: "OWASP Top 10 Security Risks",
            url: "https://owasp.org/www-project-top-ten/",
            estimatedMinutes: 30,
            completed: true,
          },
          {
            resourceId: uuidv4(),
            type: "video",
            title: "Web Security Fundamentals",
            url: "https://example.com/web-security",
            estimatedMinutes: 45,
            completed: true,
          },
          {
            resourceId: uuidv4(),
            type: "exercise",
            title: "Secure Authentication Implementation",
            url: "https://example.com/auth-exercise",
            estimatedMinutes: 90,
            completed: true,
          },
        ],
        completionPercentage: 100,
        completedAt: "2026-02-21T18:00:00Z",
      },
      {
        weekNumber: 2,
        focusTopic: "System Design Patterns",
        status: "in_progress",
        skillGapAddressed: "System Design",
        learningGoals: [
          "Master common design patterns",
          "Understand scalability principles",
          "Learn about distributed systems",
        ],
        resources: [
          {
            resourceId: uuidv4(),
            type: "article",
            title: "System Design Primer",
            url: "https://github.com/donnemartin/system-design-primer",
            estimatedMinutes: 60,
            completed: true,
          },
          {
            resourceId: uuidv4(),
            type: "video",
            title: "Designing Data-Intensive Applications",
            url: "https://example.com/data-intensive",
            estimatedMinutes: 120,
            completed: false,
          },
          {
            resourceId: uuidv4(),
            type: "exercise",
            title: "Design a URL Shortener",
            url: "https://example.com/url-shortener",
            estimatedMinutes: 90,
            completed: false,
          },
        ],
        completionPercentage: 33,
        completedAt: null,
      },
      {
        weekNumber: 3,
        focusTopic: "Performance Optimization",
        status: "not_started",
        skillGapAddressed: "Performance Tuning",
        learningGoals: [
          "Learn profiling techniques",
          "Understand caching strategies",
          "Master database optimization",
        ],
        resources: [
          {
            resourceId: uuidv4(),
            type: "article",
            title: "Web Performance Best Practices",
            url: "https://web.dev/performance/",
            estimatedMinutes: 45,
            completed: false,
          },
          {
            resourceId: uuidv4(),
            type: "video",
            title: "Database Query Optimization",
            url: "https://example.com/db-optimization",
            estimatedMinutes: 60,
            completed: false,
          },
        ],
        completionPercentage: 0,
        completedAt: null,
      },
      {
        weekNumber: 4,
        focusTopic: "Microservices Architecture",
        status: "not_started",
        skillGapAddressed: "Distributed Systems",
        learningGoals: [
          "Understand microservices patterns",
          "Learn about service communication",
          "Master deployment strategies",
        ],
        resources: [
          {
            resourceId: uuidv4(),
            type: "article",
            title: "Microservices Patterns",
            url: "https://microservices.io/patterns/",
            estimatedMinutes: 50,
            completed: false,
          },
          {
            resourceId: uuidv4(),
            type: "exercise",
            title: "Build a Microservice",
            url: "https://example.com/microservice-exercise",
            estimatedMinutes: 120,
            completed: false,
          },
        ],
        completionPercentage: 0,
        completedAt: null,
      },
    ],
    milestones: [
      {
        milestoneId: uuidv4(),
        title: "Security Fundamentals Mastered",
        description: "Completed all security learning resources",
        achievedAt: "2026-02-21T18:00:00Z",
        badge: "security-expert",
      },
    ],
    nextRecommendedAction: {
      action: "complete_resource",
      resourceId: "resource-id-here",
      title: "Watch: Designing Data-Intensive Applications",
      estimatedMinutes: 120,
    },
  });
});

/**
 * POST /user/learning-path/resource/{resourceId}/complete
 * Mark a learning resource as completed
 */
app.post(
  "/user/learning-path/resource/:resourceId/complete",
  (req, res) => {
    const { resourceId } = req.params;

    res.json({
      resourceId,
      completed: true,
      completedAt: generateTimestamp(),
      weekProgress: {
        weekNumber: 2,
        completionPercentage: 66,
      },
    });
  },
);

// ============================================================================
// EXPORT ENDPOINTS
// ============================================================================

/**
 * POST /analysis/{analysisId}/export
 * Request analysis export
 */
app.post("/analysis/:analysisId/export", (req, res) => {
  const { analysisId } = req.params;
  const { format, sections } = req.body;

  if (!format) {
    return res
      .status(400)
      .json({ error: "format is required (pdf or markdown)" });
  }

  const exportId = uuidv4();

  res.json({
    exportId,
    analysisId,
    format,
    sections: sections || [
      "projectReview",
      "intelligenceReport",
      "resumeBullets",
    ],
    status: "processing",
    estimatedCompletionTime: 30,
    createdAt: generateTimestamp(),
  });
});

/**
 * GET /exports/{exportId}
 * Get export status or download
 */
app.get("/exports/:exportId", (req, res) => {
  const { exportId } = req.params;
  const download = req.query.download === "true";

  if (download) {
    // Simulate file download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="analysis-report.pdf"',
    );
    res.send(Buffer.from("Mock PDF content"));
  } else {
    // Return status
    res.json({
      exportId,
      status: "completed",
      format: "pdf",
      downloadUrl: `http://localhost:${PORT}/exports/${exportId}?download=true`,
      expiresAt: generateTimestamp(3600),
      completedAt: generateTimestamp(-10),
    });
  }
});

// ============================================================================
// GITHUB INTEGRATION ENDPOINTS
// ============================================================================

/**
 * POST /user/github/connect
 * Initiate GitHub OAuth connection
 */
app.post("/user/github/connect", (req, res) => {
  res.json({
    authUrl:
      "https://github.com/login/oauth/authorize?client_id=mock&scope=repo",
    state: uuidv4(),
  });
});

/**
 * POST /user/github/disconnect
 * Disconnect GitHub account
 */
app.post("/user/github/disconnect", (req, res) => {
  res.json({
    success: true,
    message: "GitHub account disconnected",
  });
});

/**
 * GET /user/github/status
 * Check GitHub connection status
 */
app.get("/user/github/status", (req, res) => {
  res.json({
    connected: false,
    username: null,
    scopes: [],
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((req, res) => {
  res.status(404).json({
    error: "NotFound",
    message: "Endpoint not found",
    statusCode: 404,
  });
});

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "InternalServerError",
    message: err.message || "An unexpected error occurred",
    statusCode: 500,
  });
});

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n🚀 Mock Backend Server Running`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`\n📚 Available Endpoints:`);
  console.log(`   Analysis:`);
  console.log(`     POST   /analyze`);
  console.log(`     GET    /analyses`);
  console.log(`     GET    /analysis/:id`);
  console.log(`     GET    /analysis/:id/status`);
  console.log(`     GET    /analysis/:id/events`);
  console.log(`     GET    /analysis/:id/cost`);
  console.log(`     DELETE /analysis/:id`);
  console.log(`\n   Progressive Workflow (NEW):`);
  console.log(`     POST   /analysis/:id/continue-stage2`);
  console.log(`     POST   /analysis/:id/continue-stage3`);
  console.log(`\n   Interview:`);
  console.log(`     POST   /interview/sessions`);
  console.log(`     GET    /interview/sessions/:id`);
  console.log(`     POST   /interview/sessions/:id/answer`);
  console.log(`     GET    /interview/sessions/:id/attempts`);
  console.log(`     POST   /interview/sessions/:id/complete`);
  console.log(`\n   User Profile:`);
  console.log(`     POST   /user/profile`);
  console.log(`     GET    /user/profile`);
  console.log(`     PATCH  /user/preferences`);
  console.log(`     GET    /user/stats`);
  console.log(`\n   User Progress:`);
  console.log(`     GET    /user/progress`);
  console.log(`\n   Learning Path (Req 16):`);
  console.log(`     GET    /user/learning-path`);
  console.log(`     POST   /user/learning-path/resource/:id/complete`);
  console.log(`\n   Export:`);
  console.log(`     POST   /analysis/:id/export`);
  console.log(`     GET    /exports/:id`);
  console.log(`\n   GitHub:`);
  console.log(`     POST   /user/github/connect`);
  console.log(`     POST   /user/github/disconnect`);
  console.log(`     GET    /user/github/status`);
  console.log(`\n✅ Ready to accept requests!`);
  console.log(`\n🎯 PROGRESSIVE WORKFLOW:`);
  console.log(`   1. POST /analyze → Stage 1 runs automatically`);
  console.log(`   2. GET /analysis/:id/status → Returns 'stage1_complete'`);
  console.log(`   3. User decides: Continue or Download`);
  console.log(`   4. POST /analysis/:id/continue-stage2 → Stage 2 starts`);
  console.log(`   5. POST /analysis/:id/continue-stage3 → Stage 3 starts`);
  console.log(`\n`);
});
