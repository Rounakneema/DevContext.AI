# DevContext AI - API Contract V2 Summary

## Overview

This document summarizes the production-grade API contract for DevContext AI Schema V2. The API follows REST principles with normalized data structures, comprehensive error handling, and enterprise-grade features.

## Base URL

```
Production: https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod
Development: https://api.devcontext.ai/dev
Local: http://localhost:3000/v2
```

## Authentication

All endpoints require AWS Cognito JWT authentication:

```http
Authorization: Bearer <ID_TOKEN>
```

Get token using:
```bash
node backend/get-token.js <email> <password>
```

## API Endpoints

### Analysis Operations

#### 1. Start Analysis
```http
POST /analyze
Content-Type: application/json

{
  "repositoryUrl": "https://github.com/username/repo"
}
```

**Response (200):**
```json
{
  "analysisId": "uuid",
  "status": "initiated",
  "estimatedCompletionTime": 90,
  "cost": {
    "estimatedCostUsd": 0.15
  }
}
```

#### 2. List Analyses (Paginated)
```http
GET /analyses?limit=20&cursor=<cursor>&status=completed
```

**Response (200):**
```json
{
  "items": [
    {
      "analysisId": "uuid",
      "repositoryUrl": "https://github.com/user/repo",
      "repositoryName": "repo",
      "status": "completed",
      "createdAt": "2026-02-28T10:00:00Z",
      "completedAt": "2026-02-28T10:02:30Z",
      "stages": {
        "project_review": { "status": "completed", "durationMs": 45000 },
        "intelligence_report": { "status": "completed", "durationMs": 60000 },
        "interview_simulation": { "status": "completed", "durationMs": 45000 }
      },
      "cost": {
        "totalCostUsd": 0.12
      }
    }
  ],
  "nextCursor": "encoded-cursor",
  "hasMore": true,
  "total": 45
}
```

#### 3. Get Full Analysis
```http
GET /analysis/{analysisId}
```

**Response (200):**
```json
{
  "analysis": {
    "analysisId": "uuid",
    "repositoryUrl": "https://github.com/user/repo",
    "repositoryName": "repo",
    "status": "completed",
    "createdAt": "2026-02-28T10:00:00Z",
    "completedAt": "2026-02-28T10:02:30Z",
    "stages": { ... }
  },
  "repository": {
    "totalFiles": 150,
    "totalSizeBytes": 2500000,
    "languages": { "TypeScript": 60, "JavaScript": 30, "CSS": 10 },
    "frameworks": ["React", "Express", "PostgreSQL"],
    "entryPoints": ["src/index.ts", "src/server.ts"],
    "commits": {
      "totalCount": 245,
      "authenticityScore": 85,
      "commitFrequency": 12.5
    },
    "tokenBudget": {
      "totalTokens": 45000,
      "filesIncluded": 30,
      "utilizationPercent": 90
    }
  },
  "projectReview": {
    "codeQuality": {
      "overall": 82,
      "readability": 85,
      "maintainability": 80,
      "testCoverage": 75,
      "documentation": 70,
      "errorHandling": 85,
      "security": 80,
      "performance": 85,
      "justification": "..."
    },
    "architectureClarity": {
      "score": 85,
      "componentOrganization": "...",
      "designPatterns": ["MVC", "Repository", "Factory"],
      "antiPatterns": []
    },
    "employabilitySignal": {
      "overall": 78,
      "productionReadiness": 80,
      "professionalStandards": 75,
      "complexity": "moderate",
      "companyTierMatch": {
        "bigTech": 70,
        "productCompanies": 85,
        "startups": 90,
        "serviceCompanies": 80
      }
    },
    "strengths": [
      {
        "strengthId": "uuid",
        "pattern": "Clean separation of concerns",
        "description": "...",
        "impact": "high",
        "fileReferences": [
          {
            "file": "src/services/api.ts",
            "lineStart": 10,
            "lineEnd": 50,
            "snippet": "...",
            "url": "https://github.com/user/repo/blob/main/src/services/api.ts#L10-L50"
          }
        ],
        "groundingConfidence": "verified"
      }
    ],
    "weaknesses": [...],
    "criticalIssues": [...],
    "projectAuthenticity": {
      "score": 85,
      "confidence": "high",
      "signals": {
        "commitDiversity": 80,
        "timeSpread": 90,
        "messageQuality": 85,
        "codeEvolution": 80
      },
      "warnings": []
    },
    "modelMetadata": {
      "modelId": "global.amazon.nova-2-lite-v1:0",
      "tokensIn": 15000,
      "tokensOut": 3000,
      "inferenceTimeMs": 12000,
      "temperature": 0.7
    }
  },
  "intelligenceReport": {
    "systemArchitecture": {
      "overview": "...",
      "layers": [
        {
          "name": "Frontend",
          "components": ["React App", "Redux Store"],
          "responsibilities": ["UI rendering", "State management"],
          "fileReferences": [...]
        }
      ],
      "componentDiagram": "graph TD\n  A[Frontend] --> B[API]\n  B --> C[Database]",
      "dataFlowDiagram": "...",
      "architecturalPatterns": [...],
      "technologyStack": {
        "languages": { "TypeScript": 60, "JavaScript": 30 },
        "frameworks": ["React", "Express"],
        "databases": ["PostgreSQL"],
        "libraries": { "express": "4.18.2", "react": "18.2.0" },
        "devTools": ["Jest", "ESLint"]
      }
    },
    "designDecisions": [...],
    "technicalTradeoffs": [...],
    "scalabilityAnalysis": {...},
    "securityPosture": {...},
    "resumeBullets": [...],
    "groundingReport": {
      "totalClaims": 45,
      "verifiedClaims": 40,
      "inferredClaims": 5,
      "ungroundedClaims": 0,
      "overallConfidence": "high",
      "flaggedClaims": []
    }
  },
  "interviewSimulation": {
    "questions": [...],
    "categoryCounts": {...},
    "difficultyDistribution": {...},
    "questionSetMetadata": {...},
    "selfCorrectionReport": {...}
  },
  "_metadata": {
    "version": "2.0",
    "generatedAt": "2026-02-28T10:02:30Z",
    "ttl": 1779998612
  }
}
```

#### 4. Get Analysis Status
```http
GET /analysis/{analysisId}/status
```

**Response (200):**
```json
{
  "analysisId": "uuid",
  "status": "processing",
  "progress": 65,
  "stages": {
    "project_review": {
      "status": "completed",
      "progress": 100,
      "startedAt": "2026-02-28T10:00:10Z",
      "completedAt": "2026-02-28T10:00:55Z"
    },
    "intelligence_report": {
      "status": "processing",
      "progress": 50,
      "startedAt": "2026-02-28T10:00:55Z"
    },
    "interview_simulation": {
      "status": "pending",
      "progress": 0
    }
  },
  "estimatedTimeRemaining": 45
}
```

#### 5. Get Analysis Events (Audit Log)
```http
GET /analysis/{analysisId}/events?limit=50
```

**Response (200):**
```json
{
  "events": [
    {
      "eventId": "uuid",
      "analysisId": "uuid",
      "eventType": "analysis_initiated",
      "eventData": {
        "repositoryUrl": "https://github.com/user/repo"
      },
      "timestamp": "2026-02-28T10:00:00Z",
      "lambdaRequestId": "abc-123",
      "lambdaFunction": "orchestrator"
    },
    {
      "eventType": "stage_started",
      "eventData": { "stage": "project_review" },
      "timestamp": "2026-02-28T10:00:10Z"
    },
    {
      "eventType": "stage_completed",
      "eventData": { "stage": "project_review", "durationMs": 45000 },
      "timestamp": "2026-02-28T10:00:55Z"
    }
  ]
}
```

#### 6. Get Cost Breakdown
```http
GET /analysis/{analysisId}/cost
```

**Response (200):**
```json
{
  "bedrockTokensIn": 45000,
  "bedrockTokensOut": 12000,
  "bedrockCostUsd": 0.074,
  "lambdaCostUsd": 0.045,
  "totalCostUsd": 0.119,
  "breakdown": {
    "project_review": {
      "tokensIn": 15000,
      "tokensOut": 3000,
      "costUsd": 0.022
    },
    "intelligence_report": {
      "tokensIn": 20000,
      "tokensOut": 6000,
      "costUsd": 0.035
    },
    "interview_simulation": {
      "tokensIn": 10000,
      "tokensOut": 3000,
      "costUsd": 0.017
    }
  }
}
```

#### 7. Delete Analysis
```http
DELETE /analysis/{analysisId}
```

**Response (204):** No content

---

### Interview Operations

#### 8. Create Interview Session
```http
POST /interview/sessions
Content-Type: application/json

{
  "analysisId": "uuid",
  "config": {
    "targetRole": "Full Stack Developer",
    "difficulty": "mixed",
    "timeLimit": 60,
    "feedbackMode": "immediate"
  }
}
```

**Response (200):**
```json
{
  "sessionId": "uuid",
  "analysisId": "uuid",
  "status": "active",
  "createdAt": "2026-02-28T11:00:00Z",
  "currentQuestionIndex": 0,
  "totalQuestions": 10,
  "progress": {
    "questionsAnswered": 0,
    "questionsSkipped": 0,
    "averageScore": 0,
    "totalTimeSpentSeconds": 0
  }
}
```

#### 9. Get Interview Session
```http
GET /interview/sessions/{sessionId}
```

**Response (200):**
```json
{
  "sessionId": "uuid",
  "analysisId": "uuid",
  "status": "active",
  "currentQuestionIndex": 3,
  "totalQuestions": 10,
  "progress": {
    "questionsAnswered": 3,
    "questionsSkipped": 0,
    "averageScore": 75,
    "totalTimeSpentSeconds": 450
  },
  "config": {...}
}
```

#### 10. Submit Answer
```http
POST /interview/sessions/{sessionId}/answer
Content-Type: application/json

{
  "questionId": "uuid",
  "answer": "I chose JWT for authentication because...",
  "timeSpentSeconds": 120
}
```

**Response (200):**
```json
{
  "attemptId": "uuid",
  "questionId": "uuid",
  "evaluation": {
    "overallScore": 75,
    "criteriaScores": {
      "technicalAccuracy": 80,
      "completeness": 70,
      "clarity": 75,
      "depthOfUnderstanding": 75
    },
    "strengths": [
      "Correctly identified stateless nature of JWT",
      "Mentioned security aspects"
    ],
    "weaknesses": [
      "Did not discuss token expiration",
      "Missing refresh token strategy"
    ],
    "missingKeyPoints": [
      "Token storage security (httpOnly cookies)",
      "CSRF protection considerations"
    ],
    "comparison": {
      "weakAnswer": "JWT is good for auth.",
      "strongAnswer": "JWT provides stateless authentication by encoding user claims in a signed token. The server validates the signature without storing session state, enabling horizontal scaling. Key considerations include secure storage (httpOnly cookies), token expiration, refresh token rotation, and CSRF protection.",
      "yourAnswerCategory": "acceptable"
    },
    "feedback": "Good understanding of JWT basics. To improve, discuss token lifecycle management and security best practices.",
    "improvementSuggestions": [
      "Research token storage security",
      "Learn about refresh token patterns",
      "Study CSRF protection mechanisms"
    ]
  },
  "improvementFromPrevious": 5
}
```

#### 11. Get Session Attempts
```http
GET /interview/sessions/{sessionId}/attempts
```

**Response (200):**
```json
{
  "attempts": [
    {
      "attemptId": "uuid",
      "questionId": "uuid",
      "attemptNumber": 1,
      "userAnswer": "...",
      "submittedAt": "2026-02-28T11:05:00Z",
      "evaluation": {...},
      "timeSpentSeconds": 120
    }
  ]
}
```

#### 12. Complete Session
```http
POST /interview/sessions/{sessionId}/complete
```

**Response (200):**
```json
{
  "sessionId": "uuid",
  "status": "completed",
  "completedAt": "2026-02-28T11:30:00Z",
  "summary": {
    "totalQuestions": 10,
    "questionsAnswered": 10,
    "questionsSkipped": 0,
    "averageScore": 78,
    "totalTimeSpentSeconds": 1200,
    "categoryPerformance": {
      "architecture": 80,
      "implementation": 75,
      "tradeoffs": 78,
      "scalability": 80
    },
    "improvementAreas": [
      "Security best practices",
      "Scalability patterns"
    ]
  }
}
```

---

### User Operations

#### 13. Get User Profile
```http
GET /user/profile
```

**Response (200):**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "displayName": "John Doe",
  "subscription": {
    "tier": "free",
    "status": "active",
    "analysisQuota": 8
  },
  "preferences": {
    "targetRole": "Full Stack Developer",
    "language": "en",
    "notifications": true
  }
}
```

#### 14. Update User Preferences
```http
PATCH /user/preferences
Content-Type: application/json

{
  "targetRole": "Senior SDE",
  "language": "hi",
  "notifications": false
}
```

**Response (200):** Updated profile

#### 15. Get User Progress
```http
GET /user/progress
```

**Response (200):**
```json
{
  "totalAnalyses": 12,
  "totalInterviewSessions": 8,
  "totalQuestionsAnswered": 80,
  "averageCodeQuality": 82,
  "averageEmployabilityScore": 78,
  "averageInterviewScore": 75,
  "improvementTrend": [
    {
      "date": "2026-02-01",
      "metric": "codeQuality",
      "value": 75
    },
    {
      "date": "2026-02-15",
      "metric": "codeQuality",
      "value": 82
    }
  ],
  "identifiedSkillGaps": [
    {
      "skill": "System Design",
      "currentLevel": 60,
      "targetLevel": 80,
      "priority": "high",
      "learningResources": [
        "https://example.com/system-design-course"
      ]
    }
  ],
  "recommendedTopics": [
    "Microservices Architecture",
    "Database Optimization",
    "Security Best Practices"
  ],
  "completedTopics": [
    "REST API Design",
    "Authentication Patterns"
  ]
}
```

---

### Export Operations

#### 16. Export Analysis Report
```http
POST /analysis/{analysisId}/export
Content-Type: application/json

{
  "format": "pdf",
  "sections": ["projectReview", "intelligenceReport", "resumeBullets"]
}
```

**Response (200):**
```json
{
  "exportId": "uuid",
  "status": "processing",
  "estimatedCompletionTime": 30
}
```

#### 17. Download Export
```http
GET /exports/{exportId}
```

**Response (200):**
- Content-Type: application/pdf or text/markdown
- Binary file download

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "ValidationError",
  "message": "Invalid repository URL format",
  "statusCode": 400,
  "details": {
    "field": "repositoryUrl",
    "constraint": "must be a valid GitHub URL"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired authentication token",
  "statusCode": 401
}
```

### 404 Not Found
```json
{
  "error": "NotFound",
  "message": "Analysis not found",
  "statusCode": 404
}
```

### 429 Rate Limit Exceeded
```json
{
  "error": "RateLimitExceeded",
  "message": "Analysis quota exceeded. Upgrade to continue.",
  "statusCode": 429,
  "details": {
    "quotaLimit": 10,
    "quotaUsed": 10,
    "resetAt": "2026-03-01T00:00:00Z"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": "InternalServerError",
  "message": "An unexpected error occurred",
  "statusCode": 500,
  "requestId": "abc-123"
}
```

---

## Pagination

All list endpoints support cursor-based pagination:

**Request:**
```http
GET /analyses?limit=20&cursor=<encoded-cursor>
```

**Response:**
```json
{
  "items": [...],
  "nextCursor": "encoded-cursor-string",
  "hasMore": true,
  "total": 45
}
```

To get next page:
```http
GET /analyses?limit=20&cursor=<nextCursor-from-previous-response>
```

---

## Rate Limiting

| Tier | Analyses/Day | Interviews/Day | API Calls/Minute |
|------|--------------|----------------|------------------|
| Free | 10 | 5 | 60 |
| Day Pass | 50 | 25 | 120 |
| Project Audit | 100 | 50 | 180 |
| Season Pack | 500 | 250 | 300 |
| College | Unlimited | Unlimited | 600 |

Rate limit headers in responses:
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1709136000
```

---

## Webhooks (Future)

Subscribe to analysis events:

```http
POST /webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["analysis.completed", "analysis.failed"],
  "secret": "your-webhook-secret"
}
```

Webhook payload:
```json
{
  "event": "analysis.completed",
  "analysisId": "uuid",
  "timestamp": "2026-02-28T10:02:30Z",
  "data": {...}
}
```

---

## Testing

### Get Authentication Token
```bash
node backend/get-token.js user@example.com password123
```

### Test API Endpoints
```bash
# Set token
export TOKEN="<your-token>"

# Start analysis
curl -X POST https://api.devcontext.ai/prod/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"repositoryUrl":"https://github.com/user/repo"}'

# Check status
curl https://api.devcontext.ai/prod/analysis/{analysisId}/status \
  -H "Authorization: Bearer $TOKEN"

# Get results
curl https://api.devcontext.ai/prod/analysis/{analysisId} \
  -H "Authorization: Bearer $TOKEN"
```

---

## Migration from V1

### Breaking Changes

1. **Response Structure**: Analysis data now split into separate entities
2. **Pagination**: Cursor-based instead of offset-based
3. **File References**: Now objects with line numbers instead of strings
4. **Cost Tracking**: New field in all analysis responses
5. **Interview Sessions**: New session-based interview flow

### Migration Guide

**V1 Response:**
```json
{
  "analysisId": "uuid",
  "projectReview": {...},
  "intelligenceReport": {...},
  "interviewSimulation": {...}
}
```

**V2 Response:**
```json
{
  "analysis": {...},
  "repository": {...},
  "projectReview": {...},
  "intelligenceReport": {...},
  "interviewSimulation": {...},
  "_metadata": {...}
}
```

**Update Frontend Code:**
```typescript
// V1
const { projectReview } = await getAnalysis(id);

// V2
const { projectReview, repository, _metadata } = await getAnalysis(id);
```

---

## Support

- **Documentation**: https://docs.devcontext.ai
- **API Status**: https://status.devcontext.ai
- **Support Email**: support@devcontext.ai
- **GitHub Issues**: https://github.com/devcontext-ai/api/issues
