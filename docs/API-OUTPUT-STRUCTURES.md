# API Output Structures - Complete Reference

**Version**: 2.0  
**Date**: February 28, 2026  
**Coverage**: All endpoints up to Requirement 16  
**Mock Server**: See `backend/mock-backend.ts`

---

## Quick Start

Run the mock backend server:
```bash
cd backend
npm install express cors uuid @types/express @types/cors @types/uuid
npx ts-node mock-backend.ts
```

Server will run on `http://localhost:3000`

---

## Table of Contents

1. [Analysis Endpoints](#1-analysis-endpoints)
2. [Interview Endpoints](#2-interview-endpoints)
3. [User Profile Endpoints](#3-user-profile-endpoints)
4. [User Progress Endpoints](#4-user-progress-endpoints)
5. [Learning Path Endpoints](#5-learning-path-endpoints)
6. [Export Endpoints](#6-export-endpoints)
7. [GitHub Integration](#7-github-integration)
8. [Error Responses](#8-error-responses)

---

## 1. Analysis Endpoints

### POST /analyze

**Purpose**: Initiate repository analysis

**Request:**
```json
{
  "repositoryUrl": "https://github.com/username/repo"
}
```

**Response (200):**
```json
{
  "analysisId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "initiated",
  "estimatedCompletionTime": 90,
  "cost": {
    "estimatedCostUsd": 0.15
  }
}
```

---

### GET /analyses

**Purpose**: List user's analyses with pagination

**Query Parameters:**
- `limit` (optional): 1-100, default 20
- `cursor` (optional): base64 encoded cursor
- `status` (optional): initiated|processing|completed|failed

**Response (200):**
```json
{
  "items": [
    {
      "analysisId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-123",
      "repositoryUrl": "https://github.com/facebook/react",
      "repositoryName": "react",
      "status": "completed",
      "createdAt": "2026-02-28T10:00:00Z",
      "completedAt": "2026-02-28T10:02:30Z",
      "stages": {
        "project_review": {
          "status": "completed",
          "startedAt": "2026-02-28T10:00:10Z",
          "completedAt": "2026-02-28T10:00:55Z",
          "durationMs": 45000
        },
        "intelligence_report": {
          "status": "completed",
          "startedAt": "2026-02-28T10:00:55Z",
          "completedAt": "2026-02-28T10:01:55Z",
          "durationMs": 60000
        },
        "interview_simulation": {
          "status": "completed",
          "startedAt": "2026-02-28T10:01:55Z",
          "completedAt": "2026-02-28T10:02:30Z",
          "durationMs": 35000
        }
      },
      "cost": {
        "totalCostUsd": 0.12,
        "bedrockCostUsd": 0.08,
        "lambdaCostUsd": 0.04
      }
    }
  ],
  "nextCursor": "eyJhbmFseXNpc0lkIjoiNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwIn0=",
  "hasMore": true,
  "total": 45
}
```

---

### 3. GET /analysis/{analysisId}

**Response (200):**
```json
{
  "items": [
    {
      "analysisId": "550e8400-e29b-41d4-a716-446655440001",
      "userId": "user-123",
      "repositoryUrl": "https://github.com/facebook/react",
      "repositoryName": "react",
      "status": "completed",
      "createdAt": "2026-02-28T10:00:00Z",
      "completedAt": "2026-02-28T10:02:30Z",
      "stages": {
        "project_review": {
          "status": "completed",
          "durationMs": 45000
        },
        "intelligence_report": {
          "status": "completed",
  