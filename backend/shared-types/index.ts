/**
 * Shared TypeScript Types for DevContext AI
 * 
 * This package contains all shared types between frontend and backend.
 * Import these types in both projects to ensure type safety.
 * 
 * Usage:
 * import { AnalysisResponse, ProjectReview, InterviewQuestion } from '@devcontext/shared-types';
 */

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface AnalyzeRequest {
  repositoryUrl: string;
  isPrivate?: boolean;
  githubToken?: string;
  targetRole?: 'Junior SDE' | 'Senior SDE' | 'DevOps Engineer' | 'Data Engineer' | 'Full Stack Developer';
}

export interface AnalyzeResponse {
  analysisId: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  estimatedCompletionTime: number; // seconds
}

export interface StatusResponse {
  analysisId: string;
  status: 'processing' | 'completed' | 'failed';
  completedStages: ('project_review' | 'intelligence_report' | 'interview_simulation')[];
  currentStage?: string;
  progress: number; // 0-100
  errorMessage?: string;
}

export interface AnalysisResponse {
  analysisId: string;
  repositoryUrl: string;
  repositoryName: string;
  createdAt: string;
  projectReview?: ProjectReview;
  intelligenceReport?: IntelligenceReport;
  interviewSimulation?: InterviewSimulation;
}

export interface AnswerRequest {
  questionId: string;
  answer: string;
}

export interface AnswerEvaluationResponse extends AnswerEvaluation {
  nextAction?: 'follow_up' | 'next_question' | 'complete';
}

// ============================================================================
// Core Domain Types
// ============================================================================

export interface ProjectReview {
  codeQuality: CodeQuality;
  architectureClarity?: ArchitectureClarity;
  employabilitySignal: EmployabilitySignal;
  strengths: Strength[];
  improvementAreas: ImprovementArea[];
  projectAuthenticity: ProjectAuthenticity;
}

export interface CodeQuality {
  score: number; // 0-100
  readability: number; // 0-100
  maintainability: number; // 0-100
  bestPractices: number; // 0-100
  justification: string;
}

export interface ArchitectureClarity {
  score: number; // 0-100
  componentOrganization: string;
  separationOfConcerns: string;
  examples?: FileReference[];
}

export interface EmployabilitySignal {
  score: number; // 0-100
  justification: string;
  productionReadiness: string;
}

export interface Strength {
  pattern: string;
  description: string;
  fileReferences: string[];
}

export interface ImprovementArea {
  issue: string;
  priority: 'high' | 'medium' | 'low';
  actionableSuggestion: string;
  codeExample?: string;
}

export interface ProjectAuthenticity {
  score: number; // 0-100
  commitDiversity: string;
  warning?: string | null;
}

export interface IntelligenceReport {
  systemArchitecture: SystemArchitecture;
  designDecisions: DesignDecision[];
  technicalTradeoffs?: TechnicalTradeoff[];
  scalabilityAnalysis?: ScalabilityAnalysis;
  resumeBullets: string[]; // 5-7 bullets
}

export interface SystemArchitecture {
  overview: string;
  componentDiagram: string; // Mermaid syntax
  dataFlow: string;
  architecturalPatterns?: string[];
}

export interface DesignDecision {
  decision: string;
  rationale: string;
  alternativesConsidered?: string[];
  tradeoffs?: string;
  fileReferences: FileReference[];
  groundingConfidence: 'high' | 'medium' | 'low' | 'insufficient';
}

export interface TechnicalTradeoff {
  aspect: string;
  pros: string[];
  cons: string[];
  fileReferences: FileReference[];
}

export interface ScalabilityAnalysis {
  bottlenecks: string[];
  growthLimitations: string[];
  optimizationOpportunities: string[];
}

export interface InterviewSimulation {
  questions: InterviewQuestion[];
  categoryCounts: CategoryCounts;
  difficultyDistribution: DifficultyDistribution;
}

export interface InterviewQuestion {
  questionId: string;
  question: string;
  category: 'architecture' | 'implementation' | 'tradeoffs' | 'scalability';
  difficulty: 'junior' | 'mid-level' | 'senior';
  fileReferences: string[];
  expectedTopics: string[];
}

export interface CategoryCounts {
  architecture: number;
  implementation: number;
  tradeoffs: number;
  scalability: number;
}

export interface DifficultyDistribution {
  junior: number;
  midLevel: number;
  senior: number;
}

export interface AnswerEvaluation {
  questionId: string;
  score: number; // 0-100
  criteriaBreakdown: {
    technicalAccuracy: number;
    completeness: number;
    clarity: number;
  };
  strengths: string[];
  weaknesses: string[];
  missingPoints: string[];
  exampleAnswer: string;
  keyTerms: string[];
  feedback: string;
}

export interface FileReference {
  file: string;
  lineNumbers?: string; // e.g., "45-67"
  snippet?: string;
}

// ============================================================================
// Internal Types (Backend Only - but included for completeness)
// ============================================================================

export interface AnalysisRecord {
  analysisId: string;
  userId: string;
  repositoryUrl: string;
  repositoryName: string;
  status: 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  completedStages: string[];
  projectReview?: ProjectReview;
  intelligenceReport?: IntelligenceReport;
  interviewSimulation?: InterviewSimulation;
  errorMessage?: string;
  ttl: number;
}

export interface ProjectContextMap {
  entryPoints: string[];
  coreModules: string[];
  frameworks: string[];
  userCodeFiles: string[];
  totalFiles: number;
  totalSize: number;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}

export type ApiError = 
  | 'ValidationError'
  | 'Unauthorized'
  | 'NotFound'
  | 'RateLimitExceeded'
  | 'InternalServerError';

// ============================================================================
// WebSocket Message Types
// ============================================================================

export interface WebSocketMessage {
  type: string;
  timestamp: string;
  payload: any;
  requestId?: string;
}

export interface StageCompletedMessage extends WebSocketMessage {
  type: 'stage_completed';
  payload: {
    analysisId: string;
    stage: 'project_review' | 'intelligence_report' | 'interview_simulation';
    completedStages: string[];
    progress: number;
    dataAvailable: boolean;
  };
}

export interface AnalysisFailedMessage extends WebSocketMessage {
  type: 'analysis_failed';
  payload: {
    analysisId: string;
    stage: string;
    errorMessage: string;
    errorCode: string;
    retryable: boolean;
  };
}

export interface InterviewStartedMessage extends WebSocketMessage {
  type: 'interview_started';
  payload: {
    sessionId: string;
    analysisId: string;
    firstQuestion: InterviewQuestion;
    totalQuestions: number;
  };
}

export interface AnswerEvaluatedMessage extends WebSocketMessage {
  type: 'answer_evaluated';
  payload: {
    sessionId: string;
    questionId: string;
    evaluation: AnswerEvaluation;
    nextAction: 'follow_up' | 'next_question' | 'complete';
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type AnalysisStage = 'project_review' | 'intelligence_report' | 'interview_simulation';
export type AnalysisStatus = 'initiated' | 'processing' | 'completed' | 'failed';
export type QuestionCategory = 'architecture' | 'implementation' | 'tradeoffs' | 'scalability';
export type QuestionDifficulty = 'junior' | 'mid-level' | 'senior';
export type Priority = 'high' | 'medium' | 'low';
export type GroundingConfidence = 'high' | 'medium' | 'low' | 'insufficient';

// ============================================================================
// Type Guards
// ============================================================================

export function isAnalysisResponse(obj: any): obj is AnalysisResponse {
  return (
    typeof obj === 'object' &&
    typeof obj.analysisId === 'string' &&
    typeof obj.repositoryUrl === 'string' &&
    typeof obj.createdAt === 'string'
  );
}

export function isInterviewQuestion(obj: any): obj is InterviewQuestion {
  return (
    typeof obj === 'object' &&
    typeof obj.questionId === 'string' &&
    typeof obj.question === 'string' &&
    ['architecture', 'implementation', 'tradeoffs', 'scalability'].includes(obj.category) &&
    ['junior', 'mid-level', 'senior'].includes(obj.difficulty)
  );
}

export function isErrorResponse(obj: any): obj is ErrorResponse {
  return (
    typeof obj === 'object' &&
    typeof obj.error === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.statusCode === 'number'
  );
}
