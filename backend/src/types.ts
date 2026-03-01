// Production-Grade Normalized Schema for DevContext AI
// Following SOLID principles, 3NF normalization, and enterprise patterns

// ============================================================================
// TABLE 1: USERS
// ============================================================================

export interface User {
  PK: string;              // USER#<userId>
  SK: string;              // PROFILE
  userId: string;          // UUID
  email: string;
  emailVerified: boolean;
  displayName: string;
  createdAt: string;       // ISO-8601
  lastLoginAt: string;
  subscription: UserSubscription;
  preferences: UserPreferences;
  
  // GSI1: email lookup
  GSI1PK: string;          // EMAIL#<email>
  GSI1SK: string;          // USER
  
  ttl?: number;            // Optional: for trial users
}

export interface UserSubscription {
  tier: 'free' | 'day_pass' | 'project_audit' | 'season_pack' | 'college';
  status: 'active' | 'expired' | 'cancelled';
  expiresAt?: string;
  analysisQuota: number;   // Remaining analyses
}

export interface UserPreferences {
  targetRole?: 'Junior SDE' | 'Senior SDE' | 'DevOps' | 'Data Engineer' | 'Full Stack';
  language?: 'en' | 'hi';  // English or Hinglish
  notifications: boolean;
}

// ============================================================================
// TABLE 2: ANALYSES (Aggregate Root)
// ============================================================================

export interface Analysis {
  PK: string;              // ANALYSIS#<analysisId>
  SK: string;              // METADATA
  analysisId: string;      // UUID
  userId: string;
  repositoryUrl: string;
  repositoryName: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  version: number;         // Optimistic locking
  
  // User approval workflow state (separate from technical status)
  workflowState: 'stage1_pending' | 'stage1_complete_awaiting_approval' | 'stage2_pending' | 'stage2_complete_awaiting_approval' | 'stage3_pending' | 'all_complete' | 'reprocessing';
  
  // Stage tracking (denormalized for quick status checks)
  stages: StageTracking;
  
  // Cost tracking
  cost: CostTracking;
  
  errorMessage?: string;
  errorCode?: string;
  retryCount: number;
  
  // GSI1: userId + createdAt (user's analysis history)
  GSI1PK: string;          // USER#<userId>
  GSI1SK: string;          // ANALYSIS#<createdAt>
  
  // GSI2: repositoryUrl (caching identical repos)
  GSI2PK: string;          // REPO#<sha256(repositoryUrl)>
  GSI2SK: string;          // ANALYSIS#<createdAt>
  
  ttl: number;             // 90 days from creation
}

export interface StageTracking {
  project_review: StageStatus;
  intelligence_report: StageStatus;
  interview_simulation: StageStatus;
}

export interface StageStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface CostTracking {
  bedrockTokensIn: number;
  bedrockTokensOut: number;
  bedrockCostUsd: number;
  lambdaCostUsd: number;
  totalCostUsd: number;
}

// ============================================================================
// TABLE 3: REPOSITORY METADATA
// ============================================================================

export interface RepositoryMetadata {
  PK: string;              // ANALYSIS#<analysisId>
  SK: string;              // REPO_METADATA
  
  // Repository info
  totalFiles: number;
  totalSizeBytes: number;
  languages: Record<string, number>; // { "Python": 45, "JavaScript": 30 }
  frameworks: string[];
  entryPoints: string[];
  coreModules: string[];
  userCodeFilesS3Key?: string; // S3 key to JSON file containing userCodeFiles array
  
  // Commit analysis
  commits: CommitAnalysis;
  
  // File categorization
  fileTiers: FileTiers;
  
  // Token budget
  tokenBudget: TokenBudgetStats;
  
  s3Key: string;           // S3 path to cached repository
  processedAt: string;
  processingDurationMs: number;
}

export interface CommitAnalysis {
  totalCount: number;
  firstCommitDate: string;
  lastCommitDate: string;
  commitFrequency: number; // commits per week
  contributors: number;
  authenticityScore: number; // 0-100
  authenticityFlags: string[]; // ["bulk_upload", "single_commit"]
}

export interface FileTiers {
  tier1: string[]; // Entry points
  tier2: string[]; // Core business logic
  tier3: string[]; // Utilities
  tier4: string[]; // Tests, config
}

export interface TokenBudgetStats {
  totalTokens: number;
  filesIncluded: number;
  filesTruncated: number;
  filesSkipped: number;
  utilizationPercent: number;
}

// ============================================================================
// TABLE 4: PROJECT REVIEWS
// ============================================================================

export interface ProjectReview {
  PK: string;              // ANALYSIS#<analysisId>
  SK: string;              // PROJECT_REVIEW
  
  codeQuality: CodeQuality;
  architectureClarity: ArchitectureClarity;
  employabilitySignal: EmployabilitySignal;
  
  strengths: Strength[];
  weaknesses: Weakness[];
  criticalIssues: CriticalIssue[];
  
  projectAuthenticity: ProjectAuthenticity;
  
  modelMetadata: ModelMetadata;
  generatedAt: string;
}

export interface CodeQuality {
  overall: number;         // 0-100
  readability: number;
  maintainability: number;
  testCoverage: number;
  documentation: number;
  errorHandling: number;
  security: number;
  performance: number;
  justification: string;
}

export interface ArchitectureClarity {
  score: number;
  componentOrganization: string;
  separationOfConcerns: string;
  designPatterns: string[];
  antiPatterns: string[];
}

export interface EmployabilitySignal {
  overall: number;         // 0-100
  productionReadiness: number;
  professionalStandards: number;
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'advanced';
  companyTierMatch: CompanyTierMatch;
  justification: string;
}

export interface CompanyTierMatch {
  bigTech: number;         // 0-100 (FAANG readiness)
  productCompanies: number;
  startups: number;
  serviceCompanies: number;
}

export interface Strength {
  strengthId: string;      // UUID
  pattern: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  fileReferences: FileReference[];
  groundingConfidence: 'verified' | 'inferred' | 'assumed';
}

export interface Weakness {
  weaknessId: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  fileReferences: FileReference[];
}

export interface CriticalIssue {
  issueId: string;
  category: 'security' | 'performance' | 'reliability' | 'maintainability';
  description: string;
  remediation: Remediation;
  fileReferences: FileReference[];
}

export interface Remediation {
  priority: number;        // 1-5
  effort: 'low' | 'medium' | 'high';
  actionableSuggestion: string;
  codeExample?: string;
  resources?: string[];    // Links to docs/articles
}

export interface FileReference {
  file: string;
  lineStart?: number;
  lineEnd?: number;
  snippet?: string;
  url?: string;            // Direct GitHub link
}

export interface ProjectAuthenticity {
  score: number;
  confidence: 'high' | 'medium' | 'low';
  signals: AuthenticitySignals;
  warnings: string[];
}

export interface AuthenticitySignals {
  commitDiversity: number;
  timeSpread: number;
  messageQuality: number;
  codeEvolution: number;
}

export interface ModelMetadata {
  modelId: string;
  tokensIn: number;
  tokensOut: number;
  inferenceTimeMs: number;
  temperature: number;
}

// ============================================================================
// TABLE 5: INTELLIGENCE REPORTS
// ============================================================================

export interface IntelligenceReport {
  PK: string;              // ANALYSIS#<analysisId>
  SK: string;              // INTELLIGENCE_REPORT
  
  systemArchitecture: SystemArchitecture;
  designDecisions: DesignDecision[];
  technicalTradeoffs: TechnicalTradeoff[];
  scalabilityAnalysis: ScalabilityAnalysis;
  securityPosture: SecurityPosture;
  
  resumeBullets: ResumeBullet[];
  
  groundingReport: GroundingReport;
  modelMetadata: ModelMetadata;
  generatedAt: string;
}

export interface SystemArchitecture {
  overview: string;
  layers: ArchitectureLayer[];
  componentDiagram: string;      // Mermaid syntax
  dataFlowDiagram: string;       // Mermaid syntax
  architecturalPatterns: Pattern[];
  technologyStack: TechStack;
}

export interface ArchitectureLayer {
  name: string;            // "Frontend", "API", "Database"
  components: string[];
  responsibilities: string[];
  fileReferences: FileReference[];
}

export interface Pattern {
  name: string;            // "MVC", "Repository", "Factory"
  description: string;
  implementation: string;
  fileReferences: FileReference[];
}

export interface TechStack {
  languages: Record<string, number>; // Percentage
  frameworks: string[];
  databases: string[];
  libraries: Record<string, string>; // { "express": "4.18.2" }
  devTools: string[];
  infrastructure?: string[];
}

export interface DesignDecision {
  decisionId: string;
  title: string;
  context: string;
  decision: string;
  rationale: string;
  consequences: Consequences;
  alternativesConsidered: Alternative[];
  fileReferences: FileReference[];
  confidence: 'high' | 'medium' | 'low';
  groundingEvidence: string[];
}

export interface Consequences {
  positive: string[];
  negative: string[];
  mitigations: string[];
}

export interface Alternative {
  approach: string;
  pros: string[];
  cons: string[];
  whyNotChosen: string;
}

export interface TechnicalTradeoff {
  tradeoffId: string;
  aspect: string;          // "Consistency vs Availability"
  chosenApproach: string;
  tradeoffRationale: string;
  pros: string[];
  cons: string[];
  impact: TradeoffImpact;
  fileReferences: FileReference[];
}

export interface TradeoffImpact {
  performance: 'positive' | 'neutral' | 'negative';
  maintainability: 'positive' | 'neutral' | 'negative';
  scalability: 'positive' | 'neutral' | 'negative';
  cost: 'positive' | 'neutral' | 'negative';
}

export interface ScalabilityAnalysis {
  currentCapacity: CurrentCapacity;
  bottlenecks: Bottleneck[];
  scalabilityLimitations: string[];
  recommendedImprovements: Improvement[];
  architecturalConstraints: string[];
}

export interface CurrentCapacity {
  estimatedUsers: number;
  estimatedRPS: number;
  dataVolumeGB: number;
}

export interface Bottleneck {
  bottleneckId: string;
  area: string;            // "Database queries", "API rate limiting"
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  estimatedImpact: string;
  fileReferences: FileReference[];
}

export interface Improvement {
  improvementId: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  priority: number;
  implementation: string;
  estimatedGain: string;
}

export interface SecurityPosture {
  overallScore: number;    // 0-100
  vulnerabilities: SecurityVulnerability[];
  bestPractices: BestPractices;
  sensitiveDataHandling: string;
  authenticationMechanism: string;
  authorizationPattern: string;
}

export interface SecurityVulnerability {
  vulnerabilityId: string;
  category: 'injection' | 'authentication' | 'exposure' | 'configuration' | 'cryptography';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  cwe?: string;            // CWE-79, CWE-89
  remediation: string;
  fileReferences: FileReference[];
}

export interface BestPractices {
  followed: string[];
  missing: string[];
}

export interface ResumeBullet {
  bulletId: string;
  text: string;
  category: 'technical' | 'impact' | 'leadership' | 'scale';
  keywords: string[];      // For ATS optimization
  verified: boolean;       // Grounded in code
}

export interface GroundingReport {
  totalClaims: number;
  verifiedClaims: number;
  inferredClaims: number;
  ungroundedClaims: number;
  overallConfidence: 'high' | 'medium' | 'low';
  flaggedClaims: FlaggedClaim[];
}

export interface FlaggedClaim {
  claim: string;
  reason: string;
  fileReferences: string[];
}

// ============================================================================
// TABLE 6: INTERVIEW SIMULATIONS
// ============================================================================

export interface InterviewSimulation {
  PK: string;              // ANALYSIS#<analysisId>
  SK: string;              // INTERVIEW_SIMULATION
  
  questions: InterviewQuestion[];
  
  categoryCounts: CategoryCounts;
  difficultyDistribution: DifficultyDistribution;
  
  questionSetMetadata: QuestionSetMetadata;
  selfCorrectionReport: SelfCorrectionReport;
  
  modelMetadata: ModelMetadata;
  generatedAt: string;
}

export interface InterviewQuestion {
  questionId: string;      // UUID
  question: string;
  category: 'architecture' | 'implementation' | 'tradeoffs' | 'scalability' | 'designPatterns' | 'debugging';
  difficulty: 'junior' | 'mid-level' | 'senior' | 'staff';
  
  context: QuestionContext;
  expectedAnswer: ExpectedAnswer;
  followUpQuestions: string[];
  evaluationCriteria: EvaluationCriteria;
  
  tags: string[];          // ["authentication", "security", "jwt"]
  groundingValidation: GroundingValidation;
}

export interface QuestionContext {
  fileReferences: FileReference[];
  codeSnippet?: string;
  relatedConcepts: string[];
}

export interface ExpectedAnswer {
  keyPoints: string[];
  acceptableApproaches: string[];
  redFlags: string[];
}

export interface EvaluationCriteria {
  technicalAccuracy: number;  // Weight 0-1
  completeness: number;
  clarity: number;
  depthOfUnderstanding: number;
}

export interface GroundingValidation {
  allFilesExist: boolean;
  confidence: 'verified' | 'inferred';
  validationErrors: string[];
}

export interface CategoryCounts {
  architecture: number;
  implementation: number;
  tradeoffs: number;
  scalability: number;
  designPatterns: number;
  debugging: number;
}

export interface DifficultyDistribution {
  junior: number;
  midLevel: number;
  senior: number;
  staff: number;
}

export interface QuestionSetMetadata {
  totalQuestions: number;
  targetRole: string;
  companyTier: 'bigTech' | 'productCompany' | 'startup';
  estimatedInterviewDuration: number; // minutes
}

export interface SelfCorrectionReport {
  iterations: number;
  converged: boolean;
  initialScore: number;
  finalScore: number;
  correctionsFeedback: string[];
}

// ============================================================================
// TABLE 7: INTERVIEW SESSIONS
// ============================================================================

export interface InterviewSession {
  PK: string;              // SESSION#<sessionId>
  SK: string;              // METADATA
  sessionId: string;       // UUID
  analysisId: string;
  userId: string;
  status: 'active' | 'completed' | 'abandoned';
  createdAt: string;
  completedAt?: string;
  
  currentQuestionIndex: number;
  totalQuestions: number;
  
  progress: SessionProgress;
  config: SessionConfig;
  
  // GSI1: userId + createdAt (user's interview history)
  GSI1PK: string;          // USER#<userId>
  GSI1SK: string;          // SESSION#<createdAt>
  
  ttl: number;             // 90 days
}

export interface SessionProgress {
  questionsAnswered: number;
  questionsSkipped: number;
  averageScore: number;
  totalTimeSpentSeconds: number;
}

export interface SessionConfig {
  targetRole: string;
  difficulty: 'junior' | 'mid-level' | 'senior' | 'mixed';
  timeLimit?: number;      // minutes
  feedbackMode: 'immediate' | 'end_of_session';
}

// ============================================================================
// TABLE 8: QUESTION ATTEMPTS
// ============================================================================

export interface QuestionAttempt {
  PK: string;              // SESSION#<sessionId>
  SK: string;              // ATTEMPT#<attemptNumber>#<questionId>
  attemptId: string;       // UUID
  sessionId: string;
  questionId: string;
  attemptNumber: number;   // Support retries
  
  userAnswer: string;
  submittedAt: string;
  
  evaluation: AnswerEvaluation;
  
  improvementFromPrevious?: number; // Score delta
  timeSpentSeconds: number;
}

export interface AnswerEvaluation {
  overallScore: number;    // 0-100
  
  criteriaScores: CriteriaScores;
  
  strengths: string[];
  weaknesses: string[];
  missingKeyPoints: string[];
  
  comparison: AnswerComparison;
  
  feedback: string;
  improvementSuggestions: string[];
  
  // AI feedback metadata
  modelId: string;
  tokensIn: number;
  tokensOut: number;
  inferenceTimeMs: number;
}

export interface CriteriaScores {
  technicalAccuracy: number;
  completeness: number;
  clarity: number;
  depthOfUnderstanding: number;
}

export interface AnswerComparison {
  weakAnswer: string;
  strongAnswer: string;
  yourAnswerCategory: 'weak' | 'acceptable' | 'strong' | 'excellent';
}

// ============================================================================
// TABLE 9: ANALYSIS EVENTS (Audit Log)
// ============================================================================

export interface AnalysisEvent {
  PK: string;              // ANALYSIS#<analysisId>
  SK: string;              // EVENT#<timestamp>#<eventId>
  eventId: string;         // UUID
  analysisId: string;
  eventType: string;       // "analysis_initiated", "stage_started", etc.
  eventData: Record<string, any>;
  timestamp: string;
  
  // For debugging/monitoring
  lambdaRequestId?: string;
  lambdaFunction?: string;
  errorStack?: string;
}

// ============================================================================
// TABLE 10: USER PROGRESS (Aggregated Stats)
// ============================================================================

export interface UserProgress {
  PK: string;              // USER#<userId>
  SK: string;              // PROGRESS
  userId: string;
  
  // Overall stats
  totalAnalyses: number;
  totalInterviewSessions: number;
  totalQuestionsAnswered: number;
  
  // Performance metrics
  averageCodeQuality: number;
  averageEmployabilityScore: number;
  averageInterviewScore: number;
  
  // Improvement trajectory
  improvementTrend: ImprovementTrend[];
  
  // Skill gaps
  identifiedSkillGaps: SkillGap[];
  
  // Learning path
  recommendedTopics: string[];
  completedTopics: string[];
  
  updatedAt: string;
}

export interface ImprovementTrend {
  date: string;
  metric: string;
  value: number;
}

export interface SkillGap {
  skill: string;
  currentLevel: number;    // 0-100
  targetLevel: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  learningResources: string[];
}

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

export interface AnalysisResponse {
  analysis: {
    analysisId: string;
    repositoryUrl: string;
    repositoryName: string;
    status: string;
    createdAt: string;
    completedAt?: string;
    stages: StageTracking;
  };
  
  repository: RepositoryMetadata;
  projectReview: ProjectReview;
  intelligenceReport?: IntelligenceReport;
  interviewSimulation?: InterviewSimulation;
  
  _metadata: {
    version: string;
    generatedAt: string;
    ttl: number;
  };
}

export interface StatusResponse {
  analysisId: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  progress: number;        // 0-100
  
  stages: {
    project_review: StageProgress;
    intelligence_report: StageProgress;
    interview_simulation: StageProgress;
  };
  
  estimatedTimeRemaining?: number; // seconds
  errorMessage?: string;
}

export interface StageProgress {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;        // 0-100
  startedAt?: string;
  completedAt?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}

// ============================================================================
// LEGACY TYPES (for backward compatibility)
// ============================================================================

export interface ProjectContextMap {
  totalFiles: number;
  totalSize: number;
  userCodeFiles: string[];
  entryPoints: string[];
  coreModules: string[];
  frameworks: string[];
  languages?: Record<string, number>; // Language percentages
}
