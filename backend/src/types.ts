// Shared types across all Lambda functions

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

export interface ProjectReview {
  codeQuality: {
    score: number;
    readability: number;
    maintainability: number;
    bestPractices: number;
    justification: string;
  };
  employabilitySignal: {
    score: number;
    justification: string;
    productionReadiness: string;
  };
  strengths: Array<{
    pattern: string;
    description: string;
    fileReferences: string[];
  }>;
  improvementAreas: Array<{
    issue: string;
    priority: 'high' | 'medium' | 'low';
    actionableSuggestion: string;
    codeExample?: string;
  }>;
  projectAuthenticity: {
    score: number;
    commitDiversity: string;
    warning?: string;
  };
}

export interface InterviewSimulation {
  questions: InterviewQuestion[];
  categoryCounts: {
    architecture: number;
    implementation: number;
    tradeoffs: number;
    scalability: number;
  };
  difficultyDistribution: {
    junior: number;
    midLevel: number;
    senior: number;
  };
}

export interface InterviewQuestion {
  questionId: string;
  question: string;
  category: 'architecture' | 'implementation' | 'tradeoffs' | 'scalability';
  difficulty: 'junior' | 'mid-level' | 'senior';
  fileReferences: string[];
  expectedTopics: string[];
}

export interface AnswerEvaluation {
  questionId: string;
  score: number;
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

export interface IntelligenceReport {
  architectureOverview: {
    description: string;
    components: string[];
    dataFlow: string;
    patterns: string[];
  };
  designDecisions: DesignDecision[];
  technicalTradeoffs: TechnicalTradeoff[];
  scalabilityAnalysis: ScalabilityAnalysis;
  resumeBullets: string[];
}

export interface DesignDecision {
  decision: string;
  rationale: string;
  implications: string;
  fileReferences: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface TechnicalTradeoff {
  tradeoff: string;
  chosenApproach: string;
  pros: string[];
  cons: string[];
  impact: string;
}

export interface ScalabilityAnalysis {
  currentLimitations: string[];
  bottlenecks: Array<{
    area: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    fileReferences: string[];
  }>;
  recommendations: string[];
}
