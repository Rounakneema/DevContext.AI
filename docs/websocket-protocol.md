# WebSocket Protocol Documentation

## Overview

DevContext AI uses WebSockets for real-time communication between the frontend and backend. This enables:
- Real-time progress updates during repository analysis
- Live mock interview sessions with instant feedback
- Stage completion notifications

## Connection

### WebSocket URL
```
wss://[API-GATEWAY-ID].execute-api.[REGION].amazonaws.com/[STAGE]
```

Example:
```
wss://abc123xyz.execute-api.us-east-1.amazonaws.com/dev
```

### Authentication

Include the Cognito JWT token in the connection query string:
```javascript
const ws = new WebSocket(`${WS_URL}?token=${cognitoToken}`);
```

## Message Format

All messages follow this JSON structure:

```typescript
interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string; // ISO 8601
}
```

## Client → Server Messages

### 1. Subscribe to Analysis Updates

Subscribe to receive progress updates for a specific analysis.

```json
{
  "action": "subscribe",
  "analysisId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 2. Unsubscribe from Analysis Updates

```json
{
  "action": "unsubscribe",
  "analysisId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 3. Start Live Interview

```json
{
  "action": "startInterview",
  "analysisId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 4. Submit Interview Answer

```json
{
  "action": "submitAnswer",
  "sessionId": "s1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "questionId": "q1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "answer": "JWT tokens are stateless..."
}
```

### 5. Pause Interview

```json
{
  "action": "pauseInterview",
  "sessionId": "s1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 6. Resume Interview

```json
{
  "action": "resumeInterview",
  "sessionId": "s1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

## Server → Client Messages

### 1. Analysis Progress Update


Sent when analysis progress changes.

```json
{
  "type": "progress",
  "payload": {
    "analysisId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "processing",
    "currentStage": "intelligence_report",
    "completedStages": ["project_review"],
    "progress": 60
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 2. Stage Completion Notification

Sent when a stage completes (Project Review, Intelligence Report, Interview Simulation).

```json
{
  "type": "stageComplete",
  "payload": {
    "analysisId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "stage": "project_review",
    "data": {
      "codeQuality": { "score": 75, ... },
      "employabilitySignal": { "score": 68, ... }
    }
  },
  "timestamp": "2024-01-15T10:30:15Z"
}
```

### 3. Analysis Complete

Sent when all stages are complete.

```json
{
  "type": "analysisComplete",
  "payload": {
    "analysisId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "completedAt": "2024-01-15T10:32:00Z"
  },
  "timestamp": "2024-01-15T10:32:00Z"
}
```

### 4. Analysis Error

Sent when an error occurs during analysis.

```json
{
  "type": "error",
  "payload": {
    "analysisId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "error": "RepositoryNotFound",
    "message": "The specified repository could not be accessed",
    "stage": "repository_processing"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 5. Interview Question

Sent when starting an interview or moving to the next question.

```json
{
  "type": "interviewQuestion",
  "payload": {
    "sessionId": "s1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "question": {
      "questionId": "q1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "question": "In your UserService.java, you implemented JWT authentication. Why did you choose JWT over session-based auth?",
      "category": "tradeoffs",
      "difficulty": "mid-level",
      "fileReferences": ["src/main/java/com/example/UserService.java"]
    },
    "questionNumber": 1,
    "totalQuestions": 10
  },
  "timestamp": "2024-01-15T10:35:00Z"
}
```

### 6. Answer Evaluation

Sent after evaluating a user's answer.

```json
{
  "type": "answerEvaluation",
  "payload": {
    "sessionId": "s1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "questionId": "q1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "evaluation": {
      "score": 75,
      "strengths": ["Mentioned stateless nature", "Discussed scalability"],
      "weaknesses": ["Didn't mention security considerations"],
      "missingPoints": ["Token expiration", "Refresh token strategy"],
      "feedback": "Good understanding of JWT basics..."
    }
  },
  "timestamp": "2024-01-15T10:35:30Z"
}
```

### 7. Follow-up Question

Sent when the AI generates a follow-up question based on the user's answer.

```json
{
  "type": "followUpQuestion",
  "payload": {
    "sessionId": "s1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "question": "You mentioned scalability. How would you handle token invalidation in a distributed system?",
    "context": "Based on your previous answer about JWT"
  },
  "timestamp": "2024-01-15T10:35:35Z"
}
```

### 8. Interview Complete

Sent when the interview session ends.

```json
{
  "type": "interviewComplete",
  "payload": {
    "sessionId": "s1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "summary": {
      "overallScore": 72,
      "categoryScores": {
        "architecture": 75,
        "implementation": 70,
        "tradeoffs": 68,
        "scalability": 75
      },
      "keyStrengths": ["Good understanding of design patterns", "Clear communication"],
      "keyWeaknesses": ["Missing security considerations", "Limited scalability discussion"],
      "improvementAreas": ["Study authentication best practices", "Learn about distributed systems"]
    }
  },
  "timestamp": "2024-01-15T10:45:00Z"
}
```

### 9. Connection Acknowledgment

Sent immediately after successful connection.

```json
{
  "type": "connected",
  "payload": {
    "connectionId": "conn_abc123",
    "message": "WebSocket connection established"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Handling

### Connection Errors

```json
{
  "type": "error",
  "payload": {
    "error": "AuthenticationFailed",
    "message": "Invalid or expired token"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Rate Limiting

```json
{
  "type": "error",
  "payload": {
    "error": "RateLimitExceeded",
    "message": "Too many requests. Please wait before reconnecting.",
    "retryAfter": 60
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Frontend Implementation Example

```typescript
class DevContextWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    const wsUrl = `${process.env.REACT_APP_WEBSOCKET_URL}?token=${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(token);
    };
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'progress':
        // Update progress bar
        break;
      case 'stageComplete':
        // Show stage completion notification
        break;
      case 'interviewQuestion':
        // Display next question
        break;
      case 'answerEvaluation':
        // Show evaluation results
        break;
      // ... handle other message types
    }
  }

  subscribeToAnalysis(analysisId: string) {
    this.send({
      action: 'subscribe',
      analysisId
    });
  }

  submitAnswer(sessionId: string, questionId: string, answer: string) {
    this.send({
      action: 'submitAnswer',
      sessionId,
      questionId,
      answer
    });
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private attemptReconnect(token: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.connect(token), delay);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

## Testing

### Using wscat (CLI tool)

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c "wss://abc123xyz.execute-api.us-east-1.amazonaws.com/dev?token=YOUR_TOKEN"

# Send subscribe message
{"action":"subscribe","analysisId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890"}
```

### Mock WebSocket Server (for frontend development)

Person 1 should provide a mock WebSocket server or you can create one:

```javascript
// mock-ws-server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send connection acknowledgment
  ws.send(JSON.stringify({
    type: 'connected',
    payload: { connectionId: 'mock_conn_123' },
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('Received:', data);
    
    // Simulate responses based on action
    if (data.action === 'subscribe') {
      // Simulate progress updates
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'progress',
          payload: {
            analysisId: data.analysisId,
            status: 'processing',
            currentStage: 'project_review',
            progress: 30
          },
          timestamp: new Date().toISOString()
        }));
      }, 1000);
    }
  });
});
```

## Connection Lifecycle

1. **Connect**: Client establishes WebSocket connection with auth token
2. **Authenticate**: Server validates token and sends connection acknowledgment
3. **Subscribe**: Client subscribes to specific analysis updates
4. **Receive Updates**: Server sends real-time progress and completion messages
5. **Unsubscribe/Disconnect**: Client unsubscribes or closes connection

## Best Practices

1. **Reconnection**: Implement exponential backoff for reconnection attempts
2. **Heartbeat**: Send ping/pong messages every 30 seconds to keep connection alive
3. **Error Handling**: Always handle connection errors gracefully
4. **Token Refresh**: Refresh Cognito token before it expires
5. **Message Queuing**: Queue messages if connection is temporarily down
6. **Cleanup**: Always close WebSocket connections when component unmounts

## Security Considerations

1. **Authentication**: Always include valid Cognito JWT token
2. **Authorization**: Server validates user can access requested analysis
3. **Rate Limiting**: Maximum 100 messages per minute per connection
4. **Connection Timeout**: Idle connections closed after 10 minutes
5. **Message Size**: Maximum message size 256KB
