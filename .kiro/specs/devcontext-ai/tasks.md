# Implementation Plan: DevContext AI

## Overview

This implementation plan breaks down the DevContext AI system into discrete coding tasks following the AWS serverless architecture with Amazon Bedrock AI integration. The system delivers repository analysis results progressively in three stages: (1) Project Review within 30 seconds, (2) Engineering Intelligence Report, and (3) Interview Simulation with live mock interviews.

The implementation uses TypeScript for Lambda functions, React for the frontend dashboard, and follows a multi-model AI strategy (Claude 3.5 Haiku for structured tasks, Claude 3.5 Sonnet for complex reasoning).

## Tasks

- [ ] 1. Set up AWS infrastructure and core services
  - Create AWS account and configure IAM roles with least-privilege access
  - Set up DynamoDB tables: Analyses, InterviewSessions, UserProgress, Cache (with GSIs and TTL)
  - Configure S3 bucket with lifecycle policies (24-hour deletion for repositories, 7-day for exports)
  - Set up CloudWatch log groups and basic monitoring dashboards
  - _Requirements: 15.5, 15.1, 15.2_

- [ ] 2. Configure API Gateway and authentication
  - [ ] 2.1 Set up API Gateway with REST endpoints
    - Create POST /analyze, GET /analysis/{id}, GET /analysis/{id}/status endpoints
    - Create POST /interview/{id}/answer, GET /analysis/history, DELETE /analysis/{id} endpoints
    - Configure CORS for frontend access
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 2.2 Implement rate limiting
    - Configure API Gateway usage plans for 10 analyses per user per day
    - Add rate limit error responses with descriptive messages
    - _Requirements: 10.7_
  
  - [ ] 2.3 Set up AWS Cognito authentication
    - Create Cognito user pool with email verification requirement
    - Configure OAuth integration with GitHub for private repository access
    - Set session timeout to 24 hours
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ]* 2.4 Write property test for rate limit enforcement
    - **Property 10: Rate Limit Enforcement**
    - **Validates: Requirements 10.7**

- [ ] 3. Implement Repository Processor Lambda
  - [ ] 3.1 Create Repository Processor Lambda function
    - Set up Lambda with 1GB memory, 3-minute timeout, 2GB ephemeral storage
    - Implement GitHub repository cloning to /tmp directory
    - Add error handling for invalid URLs and access denied scenarios
    - _Requirements: 1.1, 1.2, 7.1, 7.4_
  
  - [ ] 3.2 Build Intelligent Exclusion Filter
    - Implement filter to exclude node_modules, dist, build, .git, __pycache__, venv, secrets directories
    - Exclude binary files: .png, .jpg, .gif, .svg, .ico, .woff, .ttf extensions
    - Exclude sensitive files: .env*, *.pem, *.key, id_rsa*, secrets.*, credentials.*
    - Exclude generated code: *.min.js, *.bundle.js, *.map, package-lock.json, yarn.lock
    - _Requirements: 7.6, 7.7_
  
  - [ ] 3.3 Implement Project Context Map generator
    - Extract file structure and identify entry points (main.py, index.js, App.tsx)
    - Identify core modules and architectural layers (frontend, backend, database, api)
    - Detect frameworks and dependencies from package.json, requirements.txt, pom.xml
    - Separate UserCodeFiles from LibraryCodeFiles
    - _Requirements: 6.2, 6.3_
  
  - [ ] 3.4 Calculate Project Authenticity Score
    - Analyze commit history for commit diversity, time spread, size variance
    - Generate score 0-100 with warning for bulk uploads (< 3 commits)
    - _Requirements: 2.7, 2.8_
  
  - [ ] 3.5 Implement S3 caching with 24-hour TTL
    - Upload filtered repository to S3 with analysis ID as key
    - Store Project Context Map in Cache DynamoDB table
    - Set S3 lifecycle policy for automatic deletion after 24 hours
    - _Requirements: 7.2, 7.3, 14.5_
  
  - [ ]* 3.6 Write property test for exclusion filter completeness
    - **Property 9: Exclusion Filter Completeness**
    - **Validates: Requirements 7.6, 7.7**

- [ ] 4. Implement Token Budget Manager
  - [ ] 4.1 Create Token Budget Manager component
    - Implement token estimation (4 characters per token)
    - Define priority tiers: Tier 1 (entry points, user code), Tier 2 (config, API routes), Tier 3 (comments, logs), Tier 4 (library code)
    - Allocate budget: 5K tokens for structure, 35K for user code, 10K for context
    - _Requirements: 14.6, 14.7_
  
  - [ ] 4.2 Implement file prioritization logic
    - Sort files by priority tier and include Tier 1 files first
    - Truncate individual files if necessary to stay within 50K token limit
    - Prioritize source files by language: .py, .js, .ts, .java, .go, .rs
    - _Requirements: 7.8, 7.9_
  
  - [ ]* 4.3 Write property test for token budget compliance
    - **Property 5: Token Budget Compliance**
    - **Validates: Requirements 14.6, 14.7**

- [ ] 5. Implement Stage 1: Project Review Generator Lambda
  - [ ] 5.1 Create Project Review Generator Lambda
    - Set up Lambda with 1GB memory, 2-minute timeout
    - Configure Amazon Bedrock client for Claude 3.5 Haiku
    - Implement Bedrock prompt for code quality analysis with scoring criteria
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 5.2 Implement Employability Signal calculation
    - Generate score 0-100 based on code quality, architecture, production readiness
    - Provide honest feedback for poor code quality (score < 40)
    - Include specific, actionable improvement suggestions with code examples
    - _Requirements: 2.4, 2.5, 2.9, 2.10_
  
  - [ ] 5.3 Add grounding checks for file references
    - Verify all file references exist in UserCodeFiles
    - Ensure no references to LibraryCodeFiles or non-existent files
    - _Requirements: 3.8, 3.10_
  
  - [ ] 5.4 Persist Project Review to DynamoDB
    - Store ProjectReview in Analyses table with analysisId
    - Update status to include 'project_review' in completedStages
    - _Requirements: 8.1, 8.2_
  
  - [ ]* 5.5 Write property test for grounding integrity
    - **Property 2: Grounding Integrity**
    - **Validates: Requirements 3.8, 3.9**

- [ ] 6. Checkpoint - Verify Stage 1 delivery timing
  - Test Stage 1 completion within 30 seconds with sample repositories
  - Ensure all tests pass, ask the user if questions arise

- [ ] 7. Implement Stage 2: Intelligence Report Generator Lambda
  - [ ] 7.1 Create Intelligence Report Generator Lambda
    - Set up Lambda with 1GB memory, 3-minute timeout
    - Configure Amazon Bedrock client for Claude 3.5 Sonnet
    - Implement Chain-of-Thought prompting for architecture reconstruction
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ] 7.2 Implement design decision inference
    - Infer at least 5 key design decisions with rationale
    - Extract technical trade-offs with pros and cons
    - Perform scalability analysis identifying bottlenecks
    - _Requirements: 3.3, 3.4, 3.5_
  
  - [ ] 7.3 Implement Grounding Checker component
    - Validate all architectural claims reference specific files and line numbers
    - Mark claims without evidence as "Insufficient Evidence"
    - Distinguish between user code decisions and framework-imposed patterns
    - _Requirements: 3.8, 3.9, 3.10, 3.11_
  
  - [ ] 7.4 Generate resume-ready bullet points
    - Create 5-7 professional bullet points suitable for job applications
    - Format in clean, professional layout for recruiter sharing
    - _Requirements: 3.6, 3.7_
  
  - [ ] 7.5 Persist Intelligence Report to DynamoDB
    - Store IntelligenceReport in Analyses table
    - Update completedStages to include 'intelligence_report'
    - _Requirements: 8.1, 8.2_

- [ ] 8. Implement Stage 3: Interview Simulation Generator Lambda
  - [ ] 8.1 Create Interview Simulation Generator Lambda
    - Set up Lambda with 1GB memory, 3-minute timeout
    - Configure Amazon Bedrock client for Claude 3.5 Haiku
    - Implement prompt for generating 10-15 project-specific questions
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 8.2 Implement Self-Correction Loop
    - Generate initial questions referencing specific files and functions
    - Validate questions to ensure file references exist in UserCodeFiles
    - Regenerate invalid questions with valid file references (max 3 iterations)
    - _Requirements: 6.4, 6.5_
  
  - [ ] 8.3 Categorize and vary question difficulty
    - Categorize into architecture, implementation, trade-offs, scalability
    - Distribute difficulty: 40% junior, 40% mid-level, 20% senior
    - Ensure questions reference specific code patterns from repository
    - _Requirements: 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 8.4 Persist Interview Simulation to DynamoDB
    - Store InterviewSimulation in Analyses table
    - Update completedStages to include 'interview_simulation'
    - _Requirements: 8.1, 8.2_
  
  - [ ]* 8.5 Write property test for user code isolation
    - **Property 3: User Code Isolation**
    - **Validates: Requirements 6.3, 6.4**
  
  - [ ]* 8.6 Write property test for self-correction convergence
    - **Property 4: Self-Correction Convergence**
    - **Validates: Requirements 6.4, 6.5**

- [ ] 9. Implement Answer Evaluation Lambda
  - [ ] 9.1 Create Answer Evaluation Lambda
    - Set up Lambda with 512MB memory, 30-second timeout
    - Configure Amazon Bedrock client for Claude 3.5 Haiku
    - Implement evaluation prompt with criteria breakdown (technical accuracy, completeness, clarity)
    - _Requirements: 5.1, 5.2_
  
  - [ ] 9.2 Implement answer scoring and feedback
    - Generate score 0-100 with strengths, weaknesses, missing points
    - Provide example answer for comparison when answer is weak
    - Highlight key technical terms user should have mentioned
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [ ] 9.3 Implement Improvement Trajectory Tracker
    - Track answer scores across multiple sessions for same project
    - Calculate trend: 'improving', 'stable', or 'declining' after 3+ sessions
    - Display score trends with visual graphs in frontend
    - _Requirements: 5.8, 5.9_
  
  - [ ] 9.4 Persist interview session data
    - Store answers and evaluations in InterviewSessions table
    - Update UserProgress table with interview scores
    - _Requirements: 8.1, 8.2_
  
  - [ ]* 9.5 Write property test for improvement trajectory monotonicity
    - **Property 8: Improvement Trajectory Monotonicity**
    - **Validates: Requirements 5.8, 5.9**

- [ ] 10. Implement Live Mock Interview Lambda
  - [ ] 10.1 Create Live Mock Interview Lambda
    - Set up Lambda with 1GB memory, 15-minute timeout
    - Configure Amazon Bedrock client for Claude 3.5 Sonnet (conversational reasoning)
    - Implement interview conductor prompt maintaining conversation context
    - _Requirements: 16.1, 16.6_
  
  - [ ] 10.2 Implement instant feedback mechanism
    - Evaluate user answers within 5 seconds
    - Provide instant feedback with strengths and improvement areas
    - _Requirements: 16.2, 16.3_
  
  - [ ] 10.3 Implement adaptive follow-up generation
    - Generate clarifying questions for weak answers (score < 50)
    - Generate deeper technical questions for strong answers (score > 80)
    - Limit follow-ups to 2 per question
    - _Requirements: 16.4, 16.5_
  
  - [ ] 10.4 Implement session management
    - Support pause and resume functionality
    - Generate session summary with overall score and key strengths/weaknesses
    - Save transcript and evaluation to user history
    - _Requirements: 16.7, 16.8, 16.9_
  
  - [ ] 10.5 Persist live interview sessions
    - Store LiveInterviewSessionRecord in DynamoDB with conversation history
    - Set 90-day TTL for automatic cleanup
    - _Requirements: 8.1, 8.6_
  
  - [ ]* 10.6 Write property test for live interview context continuity
    - **Property 11: Live Interview Context Continuity**
    - **Validates: Requirements 16.6**
  
  - [ ]* 10.7 Write property test for instant feedback latency
    - **Property 12: Instant Feedback Latency**
    - **Validates: Requirements 16.2**
  
  - [ ]* 10.8 Write property test for adaptive follow-up generation
    - **Property 13: Adaptive Follow-Up Generation**
    - **Validates: Requirements 16.4, 16.5**

- [ ] 11. Implement Analysis Orchestrator Lambda
  - [ ] 11.1 Create Analysis Orchestrator Lambda
    - Set up Lambda with 512MB memory, 5-minute timeout
    - Implement orchestration logic for multi-stage pipeline
    - Validate repository URL and check user permissions
    - _Requirements: 1.1, 1.2, 6.1_
  
  - [ ] 11.2 Implement cache checking logic
    - Query Cache DynamoDB table for recent analysis (within 24 hours)
    - Return cached results if available, otherwise proceed with new analysis
    - _Requirements: 7.2_
  
  - [ ] 11.3 Coordinate Lambda invocations
    - Invoke Repository Processor Lambda synchronously
    - Invoke Stage 1 Lambda immediately after repository processing
    - Invoke Stage 2 and Stage 3 Lambdas asynchronously in background
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [ ] 11.4 Implement status tracking
    - Update Analyses table status as stages complete
    - Track stage execution times and errors in DynamoDB
    - Log all pipeline stages with timestamps to CloudWatch
    - _Requirements: 1.3, 6.6, 6.7_
  
  - [ ]* 11.5 Write property test for progressive delivery guarantee
    - **Property 1: Progressive Delivery Guarantee**
    - **Validates: Requirements 12.1, 12.2, 12.3**
  
  - [ ]* 11.6 Write property test for cache consistency
    - **Property 6: Cache Consistency**
    - **Validates: Requirements 7.2**

- [ ] 12. Checkpoint - Verify progressive streaming
  - Test complete pipeline with Stage 1 delivery within 30 seconds
  - Verify Stages 2 and 3 complete in background
  - Ensure all tests pass, ask the user if questions arise

- [ ] 13. Implement WebSocket support for real-time updates
  - [ ] 13.1 Set up API Gateway WebSocket API
    - Create WebSocket routes: $connect, $disconnect, $default
    - Configure Lambda integrations for WebSocket handlers
    - _Requirements: 12.1, 12.4_
  
  - [ ] 13.2 Implement WebSocket connection management
    - Store connection IDs in DynamoDB for user sessions
    - Handle connection lifecycle (connect, disconnect, errors)
    - _Requirements: 12.4_
  
  - [ ] 13.3 Implement stage completion notifications
    - Send WebSocket messages when Stage 1, 2, or 3 completes
    - Include stage results in notification payload
    - Handle WebSocket message delivery failures with retry logic
    - _Requirements: 12.4, 12.5_
  
  - [ ] 13.4 Implement live interview WebSocket handlers
    - Handle start_interview, submit_answer, pause_interview, resume_interview messages
    - Send real-time evaluation and follow-up questions via WebSocket
    - _Requirements: 16.1, 16.2, 16.3_

- [ ] 14. Implement error handling and resilience
  - [ ] 14.1 Add repository cloning error handling
    - Provide specific error messages: "Repository not found", "Access denied"
    - Implement retry logic with exponential backoff (max 3 retries)
    - _Requirements: 1.2, 13.1, 13.4_
  
  - [ ] 14.2 Add AI analysis error handling
    - Retry with simplified prompts when Bedrock analysis fails
    - Return partial results when some stages succeed but others fail
    - _Requirements: 13.2, 13.3_
  
  - [ ] 14.3 Implement CloudWatch logging
    - Log all errors with sufficient context for debugging
    - Log pipeline execution stages with timestamps
    - _Requirements: 13.4, 6.7_
  
  - [ ] 14.4 Handle external service rate limits
    - Queue requests when GitHub or Bedrock rate limits are hit
    - Implement automatic retry with exponential backoff
    - _Requirements: 13.5_

- [ ] 15. Implement cost optimization features
  - [ ] 15.1 Implement prompt caching for common frameworks
    - Detect standard framework code (React components, Spring Boot boilerplate, Express middleware)
    - Cache analysis for common patterns to reduce Bedrock inference cost
    - _Requirements: 14.8, 14.9_
  
  - [ ] 15.2 Configure Lambda concurrency limits
    - Set concurrency limit to 10 to prevent cost overruns
    - Display estimated wait time when system is at capacity
    - _Requirements: 12.9, 12.10, 14.4_
  
  - [ ] 15.3 Implement DynamoDB auto-scaling
    - Configure on-demand pricing for variable workload
    - Set up auto-scaling for read/write capacity if needed
    - _Requirements: 12.11, 14.2_

- [ ] 16. Implement React frontend dashboard
  - [ ] 16.1 Set up React application with routing
    - Create React app with TypeScript
    - Set up React Router for navigation (landing, analysis, history, interview)
    - Configure responsive design for desktop and mobile
    - _Requirements: 11.1, 11.2_
  
  - [ ] 16.2 Implement Cognito authentication flow
    - Create login, signup, and email verification components
    - Implement GitHub OAuth integration for private repositories
    - Handle session management and token refresh
    - _Requirements: 9.1, 9.2, 9.3, 9.6_
  
  - [ ] 16.3 Build repository submission form
    - Create form with repository URL input and private repo checkbox
    - Add GitHub token input for private repositories
    - Display repository size warning for repos > 500MB
    - _Requirements: 1.1, 1.4, 1.5_
  
  - [ ] 16.4 Implement real-time progress indicator
    - Connect to WebSocket for real-time stage updates
    - Display progress bar showing completed stages (Stage 1, 2, 3)
    - Show current stage status and estimated completion time
    - _Requirements: 1.3, 12.5_
  
  - [ ] 16.5 Build three-tab results view
    - Create tabs for Project Review, Intelligence Report, Interview Simulation
    - Display Project Review with code quality scores and improvement suggestions
    - Display Intelligence Report with architecture diagrams and resume bullets
    - Display Interview Simulation with question list
    - _Requirements: 11.4_
  
  - [ ] 16.6 Implement interview Q&A interface
    - Display questions one at a time with text area for answers
    - Submit answers and display evaluation inline with visual indicators
    - Show strengths, weaknesses, missing points, and example answers
    - _Requirements: 11.6, 11.7_
  
  - [ ] 16.7 Implement live mock interview interface
    - Create WebSocket connection for real-time interview
    - Display questions, capture answers, show instant feedback
    - Support pause/resume functionality
    - Display session summary at completion
    - _Requirements: 16.1, 16.2, 16.8, 16.9_
  
  - [ ] 16.8 Add export functionality
    - Implement PDF export for Project Review and Intelligence Report
    - Implement Markdown export for full report
    - _Requirements: 11.5, 8.4_
  
  - [ ] 16.9 Build analysis history view
    - Display list of past analyses with repository names and dates
    - Show employability scores and quick access to reports
    - Implement delete functionality for analyses
    - _Requirements: 8.3, 8.5_
  
  - [ ]* 16.10 Write property test for authentication isolation
    - **Property 7: Authentication Isolation**
    - **Validates: Requirements 9.5**

- [ ] 17. Checkpoint - End-to-end testing
  - Test complete user flow: signup, repository submission, analysis, interview
  - Verify all stages complete and results display correctly
  - Ensure all tests pass, ask the user if questions arise

- [ ] 18. Implement security and data protection
  - [ ] 18.1 Configure encryption at rest
    - Enable AWS KMS encryption for all DynamoDB tables
    - Enable S3 bucket encryption with AWS KMS
    - _Requirements: 15.1_
  
  - [ ] 18.2 Configure encryption in transit
    - Enforce TLS 1.2+ for all API Gateway endpoints
    - Configure HTTPS for WebSocket connections
    - _Requirements: 15.2_
  
  - [ ] 18.3 Implement data retention policies
    - Set 90-day TTL on Analyses, InterviewSessions, UserProgress tables
    - Implement immediate deletion for user-requested deletions
    - Ensure repository code is deleted from S3 after 24 hours
    - _Requirements: 8.5, 8.6, 15.3_
  
  - [ ] 18.4 Implement GitHub token security
    - Use GitHub tokens only during analysis, discard immediately after
    - Never persist GitHub tokens to DynamoDB or logs
    - Request minimal OAuth scopes (repo:read only)
    - _Requirements: 9.4, 15.4_

- [ ] 19. Implement monitoring and observability
  - [ ] 19.1 Set up CloudWatch metrics
    - Track analysis duration for Stage 1, 2, 3
    - Monitor Bedrock token usage per analysis
    - Track Lambda errors and retry counts
    - Monitor API latency (p50, p95, p99)
    - Track cache hit rate
    - _Requirements: 6.7_
  
  - [ ] 19.2 Configure CloudWatch alarms
    - Alert if Stage 1 latency exceeds 30 seconds
    - Alert on Lambda error rate > 5%
    - Alert on Bedrock throttling errors
    - Alert if daily cost exceeds $5
    - _Requirements: 12.2, 12.6, 12.7_
  
  - [ ] 19.3 Create monitoring dashboards
    - Build analysis pipeline dashboard showing active analyses
    - Build cost dashboard tracking daily Bedrock and Lambda costs
    - Build performance dashboard with latency and error metrics
    - _Requirements: 6.7_

- [ ] 20. Performance testing and optimization
  - [ ] 20.1 Test Stage 1 delivery timing
    - Test with repositories under 50MB, verify completion within 30 seconds
    - Test with repositories under 200MB, verify completion within 3 minutes
    - _Requirements: 12.2, 12.6, 12.7_
  
  - [ ] 20.2 Test concurrent analysis capacity
    - Load test with 10 concurrent analyses
    - Verify no performance degradation
    - Test queueing behavior when capacity exceeded
    - _Requirements: 12.8, 12.9_
  
  - [ ] 20.3 Optimize Lambda memory allocation
    - Test different memory configurations (512MB, 1GB, 2GB)
    - Balance cost vs performance based on test results
    - _Requirements: 14.1_
  
  - [ ] 20.4 Test with diverse repository types
    - Test with Python, JavaScript, TypeScript, Java repositories
    - Test with web apps, REST APIs, CLI tools, CRUD apps
    - Verify analysis quality across different project types
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 21. Final integration and demo preparation
  - [ ] 21.1 Select demo repositories
    - Choose 3 repositories: weak (score < 40), medium (score 50-70), strong (score > 80)
    - Pre-generate analyses for demo reliability
    - _Requirements: 2.9_
  
  - [ ] 21.2 Create demo script
    - Prepare live demo flow: repository submission, progressive results, interview simulation
    - Prepare comparison slides showing weak vs strong answers
    - Test live mock interview with sample questions
    - _Requirements: 16.1, 16.2, 16.3_
  
  - [ ] 21.3 Record backup demo video
    - Record complete end-to-end flow as backup
    - Include voiceover explaining architecture and features
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 16.1_
  
  - [ ] 21.4 Final end-to-end testing
    - Test complete user journey multiple times
    - Verify all error scenarios are handled gracefully
    - Ensure all monitoring and logging is working
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at critical milestones
- Property tests validate universal correctness properties across all inputs
- The implementation follows a progressive delivery model: Stage 1 results delivered within 30 seconds, Stages 2 and 3 process in background
- Multi-model AI strategy: Claude 3.5 Haiku for structured tasks (Stage 1, 3, Answer Evaluation), Claude 3.5 Sonnet for complex reasoning (Stage 2, Live Interview)
- All Lambda functions use TypeScript, frontend uses React with TypeScript
- Security is built-in: encryption at rest/transit, least-privilege IAM, no permanent code storage
- Cost optimization through token budgeting, prompt caching, Lambda concurrency limits, and S3 lifecycle policies
