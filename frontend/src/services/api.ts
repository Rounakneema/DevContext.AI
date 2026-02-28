const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Types
export interface AnalysisStatus {
  analysisId: string;
  workflowState: 'stage1_pending' | 'stage1_complete_awaiting_approval' | 'stage2_pending' | 'stage2_complete_awaiting_approval' | 'stage3_pending' | 'complete';
  currentStage: 1 | 2 | 3;
  stageProgress: number;
  estimatedTimeRemaining: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  targetRole: string;
  preferredLanguage: 'english' | 'hinglish';
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface UserStats {
  totalAnalyses: number;
  averageCodeQuality: number;
  totalInterviewSessions: number;
  averageInterviewScore: number;
  lastAnalysisDate: string | null;
  lastInterviewDate: string | null;
}

export interface UserProgress {
  improvementTrend: Array<{
    date: string;
    metric: string;
    value: number;
  }>;
  identifiedSkillGaps: Array<{
    skill: string;
    currentLevel: number;
    targetLevel: number;
    priority: 'high' | 'medium' | 'low';
    learningResources: string[];
  }>;
  recommendedTopics: string[];
  completedTopics: string[];
  categoryPerformance: {
    architecture: { averageScore: number; trend: 'improving' | 'stable' | 'declining' };
    implementation: { averageScore: number; trend: 'improving' | 'stable' | 'declining' };
    tradeoffs: { averageScore: number; trend: 'improving' | 'stable' | 'declining' };
    scalability: { averageScore: number; trend: 'improving' | 'stable' | 'declining' };
  };
}

export interface InterviewQuestion {
  questionId: string;
  questionNumber: number;
  totalQuestions: number;
  category: string;
  type: 'technical' | 'behavioral' | 'system-design';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  groundedIn: string[];
  hints: string[];
  suggestedTimeMinutes: number;
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
    yourAnswerCategory: 'weak' | 'acceptable' | 'strong';
  };
  feedback: string;
  improvementSuggestions: string[];
}

export interface InterviewSession {
  sessionId: string;
  analysisId: string;
  status: 'in_progress' | 'completed';
  questions: InterviewQuestion[];
  currentQuestionIndex: number;
  answers: Array<{
    questionId: string;
    answer: string;
    evaluation: AnswerEvaluation;
    timeSpentSeconds: number;
  }>;
  config: {
    questionCount: number;
    questionTypes: ('technical' | 'behavioral' | 'system-design')[];
    targetRole: string;
  };
  startedAt: string;
  completedAt?: string;
  summary?: InterviewSummary;
}

export interface InterviewSummary {
  overallScore: number;
  totalTimeMinutes: number;
  questionsAnswered: number;
  categoryPerformance: {
    technical: number;
    behavioral: number;
    'system-design': number;
  };
  topStrengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  comparedToTarget: {
    role: string;
    readiness: 'not_ready' | 'needs_work' | 'almost_ready' | 'ready';
    percentile: number;
  };
}

// Helper for fetch with error handling
async function fetchWithError<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
}

// Analysis APIs
export const startAnalysis = (repositoryUrl: string) =>
  fetchWithError<{ analysisId: string; status: string }>(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repositoryUrl }),
  });

export const getAnalysisStatus = (analysisId: string) =>
  fetchWithError<AnalysisStatus>(`${API_BASE}/analysis/${analysisId}/status`);

export const getAnalysis = (analysisId: string) =>
  fetchWithError<any>(`${API_BASE}/analysis/${analysisId}`);

export const getAnalyses = () =>
  fetchWithError<Array<{ analysisId: string; repositoryUrl: string; status: string; createdAt: string }>>(`${API_BASE}/analyses`);

export const continueToStage2 = (analysisId: string) =>
  fetchWithError<AnalysisStatus>(`${API_BASE}/analysis/${analysisId}/continue-stage2`, {
    method: 'POST',
  });

export const continueToStage3 = (analysisId: string) =>
  fetchWithError<AnalysisStatus>(`${API_BASE}/analysis/${analysisId}/continue-stage3`, {
    method: 'POST',
  });

export const exportAnalysis = (analysisId: string, format: 'pdf' | 'markdown') =>
  fetchWithError<{ downloadUrl: string; expiresAt: string }>(`${API_BASE}/analysis/${analysisId}/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format }),
  });

// User APIs
export const getUserProfile = () =>
  fetchWithError<UserProfile>(`${API_BASE}/user/profile`);

export const createUserProfile = (data: {
  displayName: string;
  targetRole: string;
  preferredLanguage: 'english' | 'hinglish';
}) =>
  fetchWithError<UserProfile>(`${API_BASE}/user/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateUserPreferences = (data: Partial<{
  targetRole: string;
  preferredLanguage: 'english' | 'hinglish';
  emailNotifications: boolean;
  emailDigest: boolean;
}>) =>
  fetchWithError<UserProfile>(`${API_BASE}/user/preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const getUserStats = () =>
  fetchWithError<UserStats>(`${API_BASE}/user/stats`);

export const getUserProgress = () =>
  fetchWithError<UserProgress>(`${API_BASE}/user/progress`);

// Interview APIs
export const createInterviewSession = (data: {
  analysisId: string;
  config?: {
    questionCount?: number;
    questionTypes?: ('technical' | 'behavioral' | 'system-design')[];
    targetRole?: string;
  };
}) =>
  fetchWithError<InterviewSession>(`${API_BASE}/interview/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const getInterviewSession = (sessionId: string) =>
  fetchWithError<InterviewSession>(`${API_BASE}/interview/sessions/${sessionId}`);

export const submitAnswer = (
  sessionId: string,
  data: {
    questionId: string;
    answer: string;
    timeSpentSeconds: number;
  }
) =>
  fetchWithError<{
    evaluation: AnswerEvaluation;
    nextQuestion: InterviewQuestion | null;
  }>(`${API_BASE}/interview/sessions/${sessionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const completeInterviewSession = (sessionId: string) =>
  fetchWithError<InterviewSession>(`${API_BASE}/interview/sessions/${sessionId}/complete`, {
    method: 'POST',
  });

const api = {
  // Analysis
  startAnalysis,
  getAnalysisStatus,
  getAnalysis,
  getAnalyses,
  continueToStage2,
  continueToStage3,
  exportAnalysis,
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
