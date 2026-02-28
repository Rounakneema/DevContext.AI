# DevContext AI - API Schema V2

> **Note**: This is the production-grade Schema V2 with normalized database design.
> For complete API documentation, see [docs/API-CONTRACT-V2-SUMMARY.md](docs/API-CONTRACT-V2-SUMMARY.md)

## Base URL
```
Production: https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod
Development: https://api.devcontext.ai/dev
Local: http://localhost:3000/v2
```

## Authentication
All endpoints require AWS Cognito authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <ID_TOKEN>
```

Get token:
```bash
node backend/get-token.js <email> <password>
```

## Quick Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Start repository analysis |
| GET | `/analyses` | List user's analyses (paginated) |
| GET | `/analysis/{id}` | Get complete analysis |
| GET | `/analysis/{id}/status` | Get analysis status |
| GET | `/analysis/{id}/events` | Get audit log |
| GET | `/analysis/{id}/cost` | Get cost breakdown |
| DELETE | `/analysis/{id}` | Delete analysis |
| POST | `/interview/sessions` | Create interview session |
| GET | `/interview/sessions/{id}` | Get session details |
| POST | `/interview/sessions/{id}/answer` | Submit answer |
| GET | `/user/profile` | Get user profile |
| GET | `/user/progress` | Get user progress |
| POST | `/analysis/{id}/export` | Export report |

## Detailed Endpoints

### 1. Start Analysis
**POST** `/analyze`

**Request:**
```json
{
  "repositoryUrl": "https://github.com/username/repository"
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

---

### 2. List Analyses (NEW in V2)
**GET** `/analyses?limit=20&cursor=<cursor>&status=completed`

**Response (200):**
```json
{
  "items": [
    {
      "analysisId": "uuid",
      "repositoryUrl": "https://github.com/user/repo",
      "status": "completed",
      "createdAt": "2026-02-28T10:00:00Z",
      "stages": {...},
      "cost": { "totalCostUsd": 0.12 }
    }
  ],
  "nextCursor": "encoded-cursor",
  "hasMore": true,
  "total": 45
}
```

---

### 3. Get Analysis Status
**GET** `/analysis/{analysisId}/status`

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
      "progress": 50
    },
    "interview_simulation": {
      "status": "pending",
      "progress": 0
    }
  },
  "estimatedTimeRemaining": 45
}
```

---

### 4. Get Full Analysis
**GET** `/analysis/{analysisId}`

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
    "stages": {
      "project_review": { "status": "completed", "durationMs": 45000 },
      "intelligence_report": { "status": "completed", "durationMs": 60000 },
      "interview_simulation": { "status": "completed", "durationMs": 45000 }
    }
  },
  "repository": {
    "totalFiles": 150,
    "totalSizeBytes": 2500000,
    "languages": { "TypeScript": 60, "JavaScript": 30, "CSS": 10 },
    "frameworks": ["React", "Express", "PostgreSQL"],
    "commits": {
      "totalCount": 245,
      "authenticityScore": 85
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
      "performance": 85
    },
    "employabilitySignal": {
      "overall": 78,
      "companyTierMatch": {
        "bigTech": 70,
        "productCompanies": 85,
        "startups": 90
      }
    },
    "strengths": [...],
    "weaknesses": [...],
    "criticalIssues": [...]
  },
  "intelligenceReport": {...},
  "interviewSimulation": {...},
  "_metadata": {
    "version": "2.0",
    "generatedAt": "2026-02-28T10:02:30Z",
    "ttl": 1779998612
  }
}
```

> **Note**: Full response structure documented in [docs/API-CONTRACT-V2-SUMMARY.md](docs/API-CONTRACT-V2-SUMMARY.md)

---

### 5. Get Analysis Events (NEW in V2)
**GET** `/analysis/{analysisId}/events`

**Response (200):**
```json
{
  "events": [
    {
      "eventId": "uuid",
      "eventType": "analysis_initiated",
      "eventData": {...},
      "timestamp": "2026-02-28T10:00:00Z",
      "lambdaFunction": "orchestrator"
    }
  ]
}
```

---

### 6. Get Cost Breakdown (NEW in V2)
**GET** `/analysis/{analysisId}/cost`

**Response (200):**
```json
{
  "bedrockTokensIn": 45000,
  "bedrockTokensOut": 12000,
  "bedrockCostUsd": 0.074,
  "lambdaCostUsd": 0.045,
  "totalCostUsd": 0.119
}
```

---

### 7. Create Interview Session (NEW in V2)
**POST** `/interview/sessions`

**Request:**
```json
{
  "analysisId": "uuid",
  "config": {
    "targetRole": "Full Stack Developer",
    "difficulty": "mixed",
    "feedbackMode": "immediate"
  }
}
```

**Response (200):**
```json
{
  "sessionId": "uuid",
  "status": "active",
  "totalQuestions": 10,
  "progress": {
    "questionsAnswered": 0,
    "averageScore": 0
  }
}
```

---

### 8. Submit Interview Answer
**POST** `/interview/sessions/{sessionId}/answer`

**Request:**
```json
{
  "questionId": "uuid",
  "answer": "User's answer text",
  "timeSpentSeconds": 120
}
```

**Response (200):**
```json
{
  "attemptId": "uuid",
  "evaluation": {
    "overallScore": 75,
    "criteriaScores": {
      "technicalAccuracy": 80,
      "completeness": 70,
      "clarity": 75,
      "depthOfUnderstanding": 75
    },
    "strengths": ["Correctly identified stateless nature"],
    "weaknesses": ["Did not discuss token expiration"],
    "missingKeyPoints": ["Token storage security"],
    "comparison": {
      "weakAnswer": "...",
      "strongAnswer": "...",
      "yourAnswerCategory": "acceptable"
    },
    "feedback": "Good understanding of JWT basics...",
    "improvementSuggestions": [...]
  },
  "improvementFromPrevious": 5
}
```

---

### 9. Get User Progress (NEW in V2)
**GET** `/user/progress`

**Response (200):**
```json
{
  "totalAnalyses": 12,
  "totalInterviewSessions": 8,
  "averageCodeQuality": 82,
  "averageEmployabilityScore": 78,
  "averageInterviewScore": 75,
  "improvementTrend": [...],
  "identifiedSkillGaps": [...],
  "recommendedTopics": [...]
}
```

---

## Schema V2 Changes

### New Features
- ✅ Paginated list endpoints
- ✅ Audit event logging
- ✅ Cost tracking per analysis
- ✅ Interview session management
- ✅ User progress tracking
- ✅ Repository metadata
- ✅ Enhanced file references (with line numbers)
- ✅ Company tier matching
- ✅ Grounding confidence scores

### Breaking Changes
1. **Response Structure**: Analysis data split into `analysis`, `repository`, `projectReview`, etc.
2. **File References**: Now objects `{file, lineStart, lineEnd, snippet}` instead of strings
3. **Pagination**: Cursor-based instead of offset-based
4. **Interview Flow**: Session-based with attempt tracking

### Migration Guide
```typescript
// V1
const { projectReview } = await getAnalysis(id);

// V2
const { analysis, repository, projectReview, _metadata } = await getAnalysis(id);
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "error": "repositoryUrl is required"
}
```

**401 Unauthorized:**
```json
{
  "message": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "error": "Analysis not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

---

## Testing

### Get Authentication Token
```bash
node backend/get-token.js user@example.com password123
```

### Test Endpoints
```bash
# Set token
export TOKEN="<your-token>"

# Start analysis
curl -X POST https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"repositoryUrl":"https://github.com/user/repo"}'

# List analyses
curl "https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod/analyses?limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Check status
curl https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod/analysis/{id}/status \
  -H "Authorization: Bearer $TOKEN"

# Get results
curl https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod/analysis/{id} \
  -H "Authorization: Bearer $TOKEN"

# Get cost breakdown
curl https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod/analysis/{id}/cost \
  -H "Authorization: Bearer $TOKEN"
```

### Test Scripts
```bash
# Test all endpoints
node backend/test-api.js

# Check DynamoDB directly
node backend/check-dynamodb.js

# View formatted results
node backend/view-results.js <analysisId>
```

---

## Complete Documentation

For complete API documentation including:
- All 17 endpoints
- Detailed request/response schemas
- Error handling
- Rate limiting
- Webhooks
- Migration guide

See: **[docs/API-CONTRACT-V2-SUMMARY.md](docs/API-CONTRACT-V2-SUMMARY.md)**

---

## Support

- **Full API Docs**: [docs/API-CONTRACT-V2-SUMMARY.md](docs/API-CONTRACT-V2-SUMMARY.md)
- **Schema Documentation**: [backend/SCHEMA-V2-README.md](backend/SCHEMA-V2-README.md)
- **Implementation Summary**: [SCHEMA-V2-IMPLEMENTATION-SUMMARY.md](SCHEMA-V2-IMPLEMENTATION-SUMMARY.md)
- **GitHub Issues**: Report bugs and request features
