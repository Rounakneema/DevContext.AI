/**
 * Integrated API Service - Real Backend Integration
 * Connects to AWS API Gateway with Cognito authentication
 */

import { fetchAuthSession } from 'aws-amplify/auth';

const API_BASE = process.env.REACT_APP_API_ENDPOINT || 'https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod';

// ============================================================================
// TYPES
// ============================================================================

export interface Analysis {
  analysisId: string;
  userId: string;
  repositoryUrl: string;
  repositoryName: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  workflowState: string;
  stages: {
    project_review: StageStatus;
    intelligence_report: StageStatus;
    interview_simulation: StageStatus;
  };
  cost: {
    totalCostUsd: number;
    breakdown: {
      repoProcessing: number;
      stage1: number;
      stage2: number;
      stage3: number;
    };
  };
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface StageStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface AnalysisStatus {
  analysisId: string;
  status: string;
  workflowState: string;
  progress: number;
  stages: {
    project_review: {
      status: string;
      progress: number;
      startedAt?: string;
      completedAt?: string;
    };
    intelligence_report: {
      status: string;
      progress: number;
      startedAt?: string;
      completedAt?: string;
    };
    interview_simulation: {
      status: string;
      progress: number;
      startedAt?: string;
      completedAt?: string;
    };
  };
  errorMessage?: string;
}

export interface ProjectReview {
  codeQuality: {
    overall: number;
    readability: number;
    maintainability: number;
    testCoverage: number;
    documentation: number;
    errorHandling: number;
    security: number;
    performance: number;
    justification: string;
  };
  architectureClarity: {
    score: number;
    componentOrganization: string;
    separationOfConcerns: string;
    designPatterns: string[];
    antiPatterns: string[];
  };
  employabilitySignal: {
    overall: number;
    productionReadiness: number;
    professionalStandards: number;
    complexity: string;
    companyTierMatch: {
      bigTech: number;
      productCompanies: number;
      startups: number;
      serviceCompanies: number;
    };
    justification: string;
  };
  strengths: Array<{
    strengthId: string;
    pattern: string;
    description: string;
    impact: string;
    fileReferences: Array<{ file: string }>;
  }>;
  weaknesses: Array<{
    weaknessId: string;
    issue: string;
    severity: string;
    impact: string;
    fileReferences: Array<{ file: string }>;
  }>;
  criticalIssues: any[];
  projectAuthenticity: {
    score: number;
    confidence: string;
    signals: {
      commitDiversity: number;
      timeSpread: number;
      messageQuality: number;
      codeEvolution: number;
    };
    warnings: string[];
  };
}

export interface IntelligenceReport {
  designDecisions: Array<{
    decisionId: string;
    decision: string;
    rationale: string;
    tradeoffs: string;
    alternatives: string;
    fileReferences: Array<{ file: string }>;
  }>;
  technicalInsights: Array<{
    insightId: string;
    insight: string;
    significance: string;
    fileReferences: Array<{ file: string }>;
  }>;
  architecturePatterns: string[];
  technologyStack: {
    languages: string[];
    frameworks: string[];
    libraries: string[];
    tools: string[];
  };
}

export interface InterviewQuestion {
  questionId: string;
  questionNumber: number;
  category: string;
  difficulty: string;
  question: string;
  expectedTopics: string[];
  groundedIn: Array<{ file: string; reason: string }>;
  hints: string[];
  followUpQuestions: string[];
}

export interface InterviewSimulation {
  questions: InterviewQuestion[];
  totalQuestions: number;
  categoryDistribution: {
    architecture: number;
    implementation: number;
    tradeoffs: number;
    scalability: number;
    debugging: number;
  };
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  targetRole: string;
  language: string;
  githubConnected: boolean;
  subscription: {
    tier: string;
    analysisQuota: number;
    analysisUsed: number;
    resetAt: string;
  };
  preferences: {
    emailNotifications: boolean;
    emailDigest: boolean;
  };
  createdAt: string;
  lastLoginAt: string;
}

export interface UserStats {
  totalAnalyses: number;
  completedAnalyses: number;
  averageCodeQuality: number;
  totalInterviewSessions: number;
  averageInterviewScore: number;
  lastAnalysisDate: string | null;
  lastInterviewDate: string | null;
}

export interface InterviewSession {
  sessionId: string;
  userId: string;
  analysisId: string;
  status: 'active' | 'completed' | 'abandoned';
  config: {
    targetRole: string;
    difficulty: string;
    timeLimit: number;
    feedbackMode: string;
  };
  progress: {
    questionsAnswered: number;
    questionsSkipped: number;
    averageScore: number;
    totalTimeSpentSeconds: number;
  };
  totalQuestions: number;
  startedAt: string;
  completedAt?: string;
}

export interface AnswerEvaluation {
  overallScore: number;
  criteriaScores: {
    technicalAccuracy: number;
    completeness: number;
    clarity: number;
    depthOfUnderstanding: number;
  };
  strengths: string[];
  weaknesses: string[];
  missingKeyPoints: string[];
  comparison: {
    weakAnswer: string;
    strongAnswer: string;
    yourAnswerCategory: string;
  };
  feedback: string;
  improvementSuggestions: string[];
}

export interface FileInfo {
  path: string;
  tier: number;
  priority: number;
  category: string;
  selected: boolean;
  rank: number;
  inTop30: boolean;
  language: string;
  size: string;
}

export interface FileSelection {
  analysisId: string;
  totalFiles: number;
  selectedFiles: number;
  top30Files: string[];
  files: FileInfo[];
  filters: {
    languages: string[];
    frameworks: string[];
    tiers: string[];
  };
}

// ============================================================================
// AUTHENTICATION HELPER
// ============================================================================

async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    return token || null;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    return null;
  }
}

// ============================================================================
// API HELPER
// ============================================================================

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  requiresAuth: boolean = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authorization header if required
  if (requiresAuth) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: `HTTP ${response.status}`,
    }));
    throw new Error(error.error || error.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// ANALYSIS APIs
// ============================================================================

export const startAnalysis = (repositoryUrl: string) =>
  apiCall<{ analysisId: string; status: string; estimatedCompletionTime: number }>('/analyze', {
    method: 'POST',
    body: JSON.stringify({ repositoryUrl }),
  });

export const getAnalysisStatus = (analysisId: string) =>
  apiCall<AnalysisStatus>(`/analysis/${analysisId}/status`);

export const getAnalysis = (analysisId: string) =>
  apiCall<{
    analysis: Analysis;
    repository: any;
    projectReview?: ProjectReview;
    intelligenceReport?: IntelligenceReport;
    interviewSimulation?: InterviewSimulation;
  }>(`/analysis/${analysisId}`);

export const getAnalyses = (limit: number = 20, cursor?: string) =>
  apiCall<{
    items: Analysis[];
    nextCursor?: string;
    hasMore: boolean;
  }>(`/analyses?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`);

export const deleteAnalysis = (analysisId: string) =>
  apiCall<void>(`/analysis/${analysisId}`, {
    method: 'DELETE',
  });

export const getAnalysisEvents = (analysisId: string) =>
  apiCall<{ events: any[] }>(`/analysis/${analysisId}/events`);

export const getAnalysisCost = (analysisId: string) =>
  apiCall<{
    totalCostUsd: number;
    breakdown: any;
  }>(`/analysis/${analysisId}/cost`);

// ============================================================================
// PROGRESSIVE WORKFLOW APIs
// ============================================================================

export const continueToStage2 = (analysisId: string) =>
  apiCall<{
    analysisId: string;
    message: string;
    status: string;
    estimatedCompletionTime: number;
  }>(`/analysis/${analysisId}/continue-stage2`, {
    method: 'POST',
  });

export const continueToStage3 = (analysisId: string) =>
  apiCall<{
    analysisId: string;
    message: string;
    status: string;
    estimatedCompletionTime: number;
  }>(`/analysis/${analysisId}/continue-stage3`, {
    method: 'POST',
  });

// ============================================================================
// FILE MANAGEMENT APIs
// ============================================================================

export const getAnalysisFiles = (analysisId: string) =>
  apiCall<FileSelection>(`/analysis/${analysisId}/files`);

export const updateFileSelection = (
  analysisId: string,
  data: {
    selectedFiles?: string[];
    deselectedFiles?: string[];
  }
) =>
  apiCall<{
    analysisId: string;
    selectedFiles: number;
    deselectedFiles: number;
    message: string;
  }>(`/analysis/${analysisId}/files/selection`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const reorderFiles = (analysisId: string, customOrder: string[]) =>
  apiCall<{
    analysisId: string;
    customOrder: number;
    message: string;
  }>(`/analysis/${analysisId}/files/reorder`, {
    method: 'POST',
    body: JSON.stringify({ customOrder }),
  });

export const reprocessAnalysis = (analysisId: string) =>
  apiCall<{
    analysisId: string;
    status: string;
    message: string;
    selectedFiles: number;
  }>(`/analysis/${analysisId}/reprocess`, {
    method: 'POST',
  });

// ============================================================================
// USER APIs
// ============================================================================

export const getUserProfile = () =>
  apiCall<UserProfile>('/user/profile');

export const createUserProfile = (data: {
  displayName: string;
  targetRole: string;
  language: string;
  githubConnected: boolean;
}) =>
  apiCall<UserProfile>('/user/profile', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateUserPreferences = (data: {
  targetRole?: string;
  language?: string;
  emailNotifications?: boolean;
  emailDigest?: boolean;
}) =>
  apiCall<UserProfile>('/user/preferences', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const getUserStats = () =>
  apiCall<UserStats>('/user/stats');

export const getUserProgress = () =>
  apiCall<any>('/user/progress');

// ============================================================================
// INTERVIEW APIs
// ============================================================================

export const createInterviewSession = (data: {
  analysisId: string;
  config?: {
    targetRole?: string;
    difficulty?: string;
    timeLimit?: number;
    feedbackMode?: string;
  };
}) =>
  apiCall<InterviewSession>('/interview/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getInterviewSession = (sessionId: string) =>
  apiCall<InterviewSession>(`/interview/sessions/${sessionId}`);

export const submitAnswer = (
  sessionId: string,
  data: {
    questionId: string;
    answer: string;
    timeSpentSeconds: number;
  }
) =>
  apiCall<{
    attemptId: string;
    questionId: string;
    evaluation: AnswerEvaluation;
    improvementFromPrevious: number;
  }>(`/interview/sessions/${sessionId}/answer`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const completeInterviewSession = (sessionId: string) =>
  apiCall<InterviewSession>(`/interview/sessions/${sessionId}/complete`, {
    method: 'POST',
  });

// ============================================================================
// POLLING UTILITIES
// ============================================================================

export async function pollAnalysisStatus(
  analysisId: string,
  onProgress?: (status: AnalysisStatus) => void,
  maxAttempts: number = 120, // 10 minutes max (5 second intervals)
  interval: number = 5000
): Promise<Analysis> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const status = await getAnalysisStatus(analysisId);

    if (onProgress) {
      onProgress(status);
    }

    if (status.status === 'completed') {
      const fullAnalysis = await getAnalysis(analysisId);
      return fullAnalysis.analysis;
    }

    if (status.status === 'failed') {
      throw new Error(status.errorMessage || 'Analysis failed');
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, interval));
    attempts++;
  }

  throw new Error('Analysis timeout - taking longer than expected');
}

// ============================================================================
// EXPORT DEFAULT API OBJECT
// ============================================================================

const api = {
  // Analysis
  startAnalysis,
  getAnalysisStatus,
  getAnalysis,
  getAnalyses,
  deleteAnalysis,
  getAnalysisEvents,
  getAnalysisCost,
  pollAnalysisStatus,

  // Progressive Workflow
  continueToStage2,
  continueToStage3,

  // File Management
  getAnalysisFiles,
  updateFileSelection,
  reorderFiles,
  reprocessAnalysis,

  // User
  getUserProfile,
  createUserProfile,
  updateUserPreferences,
  getUserStats,
  getUserProgress,

  // Interview
  createInterviewSession,
  getInterviewSession,
  submitAnswer,
  completeInterviewSession,
};

export default api;
