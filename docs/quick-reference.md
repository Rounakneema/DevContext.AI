# API Contract - Quick Reference

## Base URLs

```
REST API:      https://[API-GATEWAY-ID].execute-api.us-east-1.amazonaws.com/dev
WebSocket API: wss://[API-GATEWAY-ID].execute-api.us-east-1.amazonaws.com/dev
```

## Authentication

All requests require Cognito JWT token:
```
Authorization: Bearer <cognito-jwt-token>
```

## REST API Endpoints

### 1. Analyze Repository
```http
POST /analyze
Content-Type: application/json

{
  "repositoryUrl": "https://github.com/username/repo",
  "isPrivate": false,
  "targetRole": "Junior SDE"
}

Response: { "analysisId": "uuid", "status": "initiated", "estimatedCompletionTime": 90 }
```

### 2. Check Status
```http
GET /analysis/{analysisId}/status

Response: { "status": "processing", "progress": 60, "completedStages": ["project_review"] }
```

### 3. Get Results
```http
GET /analysis/{analysisId}

Response: { "projectReview": {...}, "intelligenceReport": {...}, "interviewSimulation": {...} }
```

### 4. Submit Answer
```http
POST /interview/{analysisId}/answer
Content-Type: application/json

{
  "questionId": "uuid",
  "answer": "Your answer here..."
}

Response: { "score": 85, "strengths": [...], "weaknesses": [...], "feedback": "..." }
```

### 5. Get History
```http
GET /analysis/history?limit=10&offset=0

Response: { "analyses": [...], "total": 5 }
```

### 6. Delete Analysis
```http
DELETE /analysis/{analysisId}

Response: 204 No Content
```

## WebSocket Messages

### Connect
```javascript
const ws = new WebSocket(`${WS_URL}?token=${cognitoToken}`);
```

### Subscribe to Analysis
```json
{ "action": "subscribe", "analysisId": "uuid" }
```

### Receive Progress
```json
{
  "type": "progress",
  "payload": { "progress": 60, "currentStage": "intelligence_report" },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Receive Stage Complete
```json
{
  "type": "stageComplete",
  "payload": { "stage": "project_review", "data": {...} },
  "timestamp": "2024-01-15T10:30:15Z"
}
```

## Error Responses

```json
{
  "error": "ValidationError",
  "message": "Invalid repository URL format",
  "statusCode": 400
}
```

## Common Status Codes

- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid token)
- `404` - Not Found
- `429` - Rate Limit Exceeded (10/day)
- `500` - Internal Server Error

## TypeScript Import

```typescript
import {
  AnalyzeRequest,
  AnalyzeResponse,
  ProjectReview,
  IntelligenceReport,
  InterviewSimulation,
  AnswerEvaluation
} from '../backend/shared/types';
```

## Mock Data Location

```
docs/mock-api-responses.json
```

## Timing Expectations

- Analysis initiation: < 5 seconds
- Stage 1 (Project Review): < 30 seconds
- Stage 2 (Intelligence Report): < 60 seconds
- Stage 3 (Interview Simulation): < 30 seconds
- Answer evaluation: < 10 seconds

## Rate Limits

- 10 analyses per user per day
- 100 WebSocket messages per minute
- Connection timeout: 10 minutes idle

## Data Retention

- Analysis results: 90 days
- Repository cache: 24 hours
- WebSocket connections: 10 minutes idle timeout
