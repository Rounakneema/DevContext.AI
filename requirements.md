# Requirements Document

## Introduction

DevContext AI is an AI-powered system that transforms GitHub repositories into recruiter-ready project intelligence reports. The system addresses a critical gap for engineering graduates in India who build projects but struggle to articulate their architectural thinking and engineering decisions in interviews. By analyzing repository URLs, DevContext AI generates comprehensive project reviews, engineering intelligence reports, and project-specific interview simulations that help developers showcase their work effectively.

## Glossary

- **System**: DevContext AI platform
- **Repository**: A GitHub repository provided by the user via URL
- **Project_Review**: Analysis output covering code quality, architecture, and maintainability
- **Intelligence_Report**: Comprehensive document reconstructing architecture and design decisions
- **Interview_Simulation**: AI-generated interview questions based on the analyzed repository
- **User**: Developer submitting a repository for analysis (primarily engineering students and early-career developers in India)
- **Recruiter**: Hiring professional who may view the generated reports
- **Analysis_Pipeline**: Multi-stage AI reasoning process that analyzes repositories
- **Employability_Signal**: Quantitative assessment of project quality for hiring purposes
- **Answer_Evaluation**: AI-powered assessment of user responses to interview questions
- **Bedrock**: Amazon Bedrock AI service used for reasoning (multi-model strategy: Claude 3.5 Sonnet for complex reasoning, Claude 3.5 Haiku for structured tasks)
- **Repository_Processor**: Lambda function that clones and analyzes repository code
- **Report_Generator**: Component that formats analysis into recruiter-ready documents
- **Project_Authenticity_Score**: Metric derived from commit history indicating genuine development vs bulk uploads
- **Project_Context_Map**: Intermediate JSON structure identifying key entry points and architectural components
- **User_Code**: Code written by the repository owner (excludes libraries and frameworks)
- **Library_Code**: Third-party dependencies and framework code
- **Grounding_Check**: Verification that architectural claims reference specific files or line numbers
- **Token_Budget_Manager**: Component that manages AI token usage within limits
- **Answer_Improvement_Trajectory**: Historical tracking of interview answer quality across sessions
- **Progressive_Result_Streaming**: Delivery of analysis results in stages as they complete
- **Live_Mock_Interview**: Real-time AI-powered interview session with instant feedback and follow-up questions
- **Interview_Session**: A timed mock interview with multiple questions and real-time AI evaluation

## Constraints & Assumptions

### Technical Constraints

1. **Token Limit**: Maximum **50,000 tokens** per repository analysis to manage Bedrock API costs
2. **Language Support**: MVP supports Python, JavaScript, TypeScript, and Java only (covers **90%** of Indian student projects)
3. **Repository Size**: Repositories exceeding **1GB** or **500 files** SHALL be rejected at API Gateway with clear error message
4. **Commit History**: Minimum **3 commits** required for Project_Authenticity_Score calculation
5. **Private Repository Access**: GitHub tokens used once during analysis and immediately discarded for security
6. **Code Exclusion**: Library_Code and framework code excluded from all AI reasoning to focus on User_Code

### Indian Student Context Assumptions

1. **Common Project Types**: System optimized for web applications, REST APIs, CRUD apps, and college mini-projects
2. **Framework Prevalence**: Expects common frameworks (React, Spring Boot, Django, Express.js) used in Indian curriculum
3. **Academic Projects**: Handles projects with limited commit history, basic documentation, and learning-focused code
4. **Language Barriers**: Generates reports in clear, professional English suitable for Indian job market
5. **Placement Focus**: Optimized for campus placement interview patterns at Indian IT companies and startups
6. **Resource Constraints**: Assumes students may have limited AWS credits, requiring cost-effective analysis

### Edge Cases for Student Developers

1. **Bulk Upload Detection**: Projects with single large commit flagged as low authenticity
2. **Tutorial Code**: System detects and warns when code closely matches popular tutorials or courses
3. **Incomplete Projects**: Handles repositories with missing README, no tests, or partial implementations
4. **Academic Collaboration**: Recognizes group projects and adjusts expectations accordingly
5. **First Projects**: Provides encouraging feedback for beginners while maintaining honest assessment
6. **Copy-Paste Code**: Identifies inconsistent coding styles suggesting copied code segments
7. **Overengineering**: Detects unnecessarily complex patterns in simple projects (common student mistake)
8. **Underengineering**: Identifies missing error handling, validation, and production-readiness concerns

## Requirements

### Requirement 1: Repository Analysis Initiation

**User Story:** As a developer, I want to submit my GitHub repository URL for analysis, so that I can receive comprehensive project intelligence reports.

#### Acceptance Criteria

1. WHEN a user submits a valid GitHub repository URL, THE System SHALL initiate the analysis pipeline within 5 seconds
2. WHEN a user submits an invalid or inaccessible repository URL, THE System SHALL return a descriptive error message within 10 seconds
3. WHEN a repository analysis is initiated, THE System SHALL display a progress indicator showing the current analysis stage
4. WHEN a repository exceeds 500MB in size, THE System SHALL notify the user and request confirmation before proceeding
5. THE System SHALL support both public and private GitHub repositories (with appropriate authentication)

### Requirement 2: Project Review Generation

**User Story:** As a developer, I want to receive a comprehensive project review, so that I can understand my code quality and areas for improvement.

#### Acceptance Criteria

1. WHEN the Repository_Processor completes analysis, THE System SHALL generate a Project_Review as part of Stage 1 Progressive_Result_Streaming
2. THE Project_Review SHALL include code quality metrics covering readability, maintainability, and best practices adherence
3. THE Project_Review SHALL include architecture clarity assessment with specific examples from the codebase
4. THE Project_Review SHALL generate an Employability_Signal score between 0-100 with clear justification
5. WHEN improvement areas are identified, THE System SHALL provide at least 3 specific, actionable suggestions with code examples
6. THE Project_Review SHALL identify and highlight positive patterns and strengths in the codebase
7. THE System SHALL analyze commit history to generate a Project_Authenticity_Score between 0-100
8. WHEN bulk uploads are detected (fewer than 3 commits or single large commit), THE System SHALL display warning "Low commit diversity detected - may impact recruiter perception"
9. WHEN code quality is poor (score below 40), THE System SHALL provide honest, direct feedback without false encouragement
10. WHEN code quality is poor, THE System SHALL explain specific issues preventing production readiness

### Requirement 3: Engineering Intelligence Report Generation

**User Story:** As a developer, I want an engineering intelligence report that reconstructs my architectural decisions, so that I can articulate my technical thinking to recruiters.

#### Acceptance Criteria

1. WHEN the Analysis_Pipeline completes Stage 1, THE System SHALL generate an Intelligence_Report as part of Stage 2 Progressive_Result_Streaming delivered after Stage 1 completes
2. THE Intelligence_Report SHALL reconstruct the system architecture with component diagrams and data flow descriptions
3. THE Intelligence_Report SHALL infer and document at least 5 key design decisions with rationale
4. THE Intelligence_Report SHALL extract technical trade-offs made in the implementation with pros and cons
5. THE Intelligence_Report SHALL perform scalability analysis identifying bottlenecks and growth limitations
6. THE Intelligence_Report SHALL generate 5-7 resume-ready bullet points in professional language suitable for job applications
7. THE Intelligence_Report SHALL be formatted in a clean, professional layout suitable for sharing with recruiters
8. WHEN making architectural claims, THE System SHALL reference specific filenames and line numbers (Grounding_Check)
9. WHEN AI cannot find evidence for a design pattern, THE System SHALL state "Insufficient Evidence" rather than inventing rationale
10. THE Intelligence_Report SHALL distinguish between User_Code decisions and framework-imposed patterns
11. THE System Prompt SHALL explicitly instruct the model: "If you cannot find the code responsible for a specific pattern, output 'Insufficient Evidence: [pattern name]'. Do not guess or infer without direct code evidence."

### Requirement 4: Interview Simulation Generation

**User Story:** As a developer, I want project-specific interview questions based on my actual code, so that I can practice explaining my technical decisions.

#### Acceptance Criteria

1. WHEN the Repository analysis completes, THE System SHALL generate 10-15 interview questions specific to the analyzed codebase
2. THE System SHALL categorize questions into architecture, implementation, trade-offs, and scalability topics
3. THE System SHALL generate questions at varying difficulty levels (junior, mid-level, senior)
4. WHEN generating questions, THE System SHALL reference specific files, functions, or patterns from the repository
5. THE System SHALL ensure questions are realistic and commonly asked in technical interviews

### Requirement 5: Real-Time Answer Evaluation

**User Story:** As a developer, I want to answer interview questions and receive immediate feedback, so that I can improve my interview performance.

#### Acceptance Criteria

1. WHEN a user submits an answer to an interview question, THE System SHALL evaluate the response within **10 seconds**
2. THE Answer_Evaluation SHALL provide a score between **0-100** with clear criteria breakdown
3. THE Answer_Evaluation SHALL identify strengths in the user's answer with specific examples
4. THE Answer_Evaluation SHALL identify weaknesses or missing points in the user's answer
5. WHEN an answer is weak, THE System SHALL provide a strong example answer for comparison
6. THE System SHALL highlight key technical terms and concepts the user should have mentioned
7. THE Answer_Evaluation SHALL provide actionable feedback for improving future responses
8. THE System SHALL track Answer_Improvement_Trajectory across multiple sessions for the same project
9. WHEN a user completes 3 or more interview sessions, THE System SHALL display score trends over time with visual graphs

### Requirement 6: Multi-Stage AI Reasoning Pipeline

**User Story:** As a system architect, I want a sophisticated multi-stage AI pipeline with self-correction capabilities, so that the analysis produces accurate, grounded insights focused on user-written code.

#### Acceptance Criteria

1. THE Analysis_Pipeline SHALL use Chain-of-Thought prompting where Bedrock summarizes file structure before inferring architectural intent
2. THE System SHALL generate an intermediate Project_Context_Map in JSON format identifying key entry points, main modules, and architectural layers
3. THE System SHALL strictly separate User_Code from Library_Code so interview questions only reference code the user actually wrote
4. THE System SHALL implement a Self-Correction Loop that detects when generated questions reference missing or non-existent files
5. WHEN a generated question references a missing file, THE System SHALL automatically regenerate the question with valid file references
6. THE System SHALL maintain context across pipeline stages to ensure coherent analysis
7. THE System SHALL log all pipeline execution stages with timestamps for debugging and performance monitoring

### Requirement 7: Repository Processing and Caching

**User Story:** As a system operator, I want efficient repository processing with intelligent filtering, so that only relevant code is analyzed within token limits.

#### Acceptance Criteria

1. WHEN a repository is analyzed for the first time, THE Repository_Processor SHALL clone the repository to temporary storage
2. WHEN a repository has been analyzed within 24 hours, THE System SHALL use cached analysis results
3. THE System SHALL clean up temporary repository storage within 1 hour of analysis completion
4. WHEN repository processing fails, THE System SHALL retry up to 3 times with exponential backoff
5. THE Repository_Processor SHALL extract file structure, dependencies, and code metrics during initial processing
6. THE System SHALL implement an Intelligent_Exclusion_Filter that ignores node_modules, dist, build, .env, .pem, id_rsa, secrets, .png, .jpg, .gif, package-lock.json, yarn.lock, and all binary files
7. THE Intelligent_Exclusion_Filter SHALL ignore generated code, minified files, and vendor directories
8. WHEN a repository exceeds the 50,000 token limit, THE System SHALL prioritize source files by language relevance (.py, .js, .ts, .java first)
9. WHEN prioritizing files, THE System SHALL include entry points (main.py, index.js, App.tsx) and core business logic before utility files

### Requirement 8: Data Persistence and Retrieval

**User Story:** As a user, I want my analysis reports saved and accessible, so that I can review them later and share them with recruiters.

#### Acceptance Criteria

1. WHEN analysis completes, THE System SHALL persist all reports to DynamoDB with a unique analysis ID
2. THE System SHALL associate reports with the authenticated user's account
3. WHEN a user requests their analysis history, THE System SHALL retrieve all past analyses within 2 seconds
4. THE System SHALL support exporting reports in PDF and Markdown formats
5. WHEN a user deletes an analysis, THE System SHALL remove all associated data within 24 hours
6. THE System SHALL retain analysis data for 90 days before automatic deletion

### Requirement 9: User Authentication and Authorization

**User Story:** As a user, I want secure authentication, so that my repository analyses and reports remain private.

#### Acceptance Criteria

1. THE System SHALL use AWS Cognito for user authentication and session management
2. WHEN a user signs up, THE System SHALL require email verification before allowing repository analysis
3. THE System SHALL support OAuth authentication with GitHub for accessing private repositories
4. WHEN accessing private repositories, THE System SHALL request only necessary GitHub permissions (read-only repository access)
5. THE System SHALL enforce that users can only access their own analysis reports
6. WHEN a user's session expires, THE System SHALL require re-authentication before allowing further actions

### Requirement 10: REST API Design

**User Story:** As a frontend developer, I want a clean REST API, so that I can build an intuitive user interface.

#### Acceptance Criteria

1. THE System SHALL expose API endpoints through AWS API Gateway with proper CORS configuration
2. THE System SHALL provide a POST /analyze endpoint accepting repository URL and returning analysis ID
3. THE System SHALL provide a GET /analysis/{id} endpoint returning complete analysis results
4. THE System SHALL provide a GET /analysis/{id}/status endpoint for polling analysis progress
5. THE System SHALL provide a POST /interview/{id}/answer endpoint for submitting and evaluating answers
6. WHEN API errors occur, THE System SHALL return appropriate HTTP status codes with descriptive error messages
7. THE System SHALL implement rate limiting of **10 analyses per user per day**

### Requirement 11: React Dashboard Interface

**User Story:** As a user, I want a clean, intuitive dashboard, so that I can easily navigate my analysis results and interview simulations.

#### Acceptance Criteria

1. THE System SHALL provide a React-based dashboard with responsive design for desktop and mobile
2. WHEN a user logs in, THE System SHALL display a landing page with repository URL input and analysis history
3. THE System SHALL display real-time progress updates during repository analysis
4. WHEN analysis completes, THE System SHALL organize results into three tabs: Project Review, Intelligence Report, and Interview Simulation
5. THE System SHALL provide export buttons for downloading reports in PDF and Markdown formats
6. THE System SHALL display interview questions one at a time with a text area for user answers
7. WHEN an answer is evaluated, THE System SHALL display the evaluation inline with visual indicators for strengths and weaknesses

### Requirement 12: Performance and Scalability

**User Story:** As a user, I want fast, progressive delivery of analysis results, so that I can start reviewing insights while remaining analysis completes in the background.

#### Acceptance Criteria

1. THE System SHALL implement Progressive_Result_Streaming delivering results in stages as they complete
2. THE System SHALL deliver Stage 1 (Project_Review) within **30 seconds** of analysis initiation
3. THE System SHALL process Stage 2 (Intelligence_Report) and Stage 3 (Interview_Simulation) in background after Stage 1 delivery
4. WHEN Stage 2 or Stage 3 completes, THE System SHALL stream results to the frontend immediately
5. THE System SHALL display progress indicators showing which stages are complete and which are in progress
6. THE System SHALL complete full repository analysis within **90 seconds** for repositories under **50MB**
7. THE System SHALL complete full repository analysis within **3 minutes** for repositories under **200MB**
8. THE System SHALL support at least **10 concurrent** repository analyses without performance degradation
9. WHEN system load exceeds capacity, THE System SHALL queue additional requests and notify users of estimated wait time
10. THE System SHALL use Lambda concurrency limits to prevent cost overruns
11. THE System SHALL implement DynamoDB auto-scaling to handle variable read/write loads

### Requirement 13: Error Handling and Resilience

**User Story:** As a user, I want clear error messages and graceful failure handling, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN repository cloning fails, THE System SHALL provide specific error messages (e.g., "Repository not found", "Access denied")
2. WHEN AI analysis fails, THE System SHALL retry with simplified prompts before reporting failure
3. WHEN partial analysis succeeds, THE System SHALL return available results and indicate which components failed
4. THE System SHALL log all errors to CloudWatch with sufficient context for debugging
5. WHEN the System encounters rate limits from external services, THE System SHALL queue the request and retry automatically

### Requirement 14: Cost Optimization

**User Story:** As a system operator, I want cost-effective resource usage with intelligent token management and multi-model strategy, so that the hackathon MVP remains within budget constraints.

#### Acceptance Criteria

1. THE System SHALL use Lambda functions with appropriate memory allocation (512MB-1GB) to balance cost and performance
2. THE System SHALL implement DynamoDB on-demand pricing for variable workload patterns
3. THE System SHALL cache Bedrock API responses for identical analysis requests within 24 hours
4. THE System SHALL set Lambda timeout limits to prevent runaway costs (max 5 minutes per function)
5. THE System SHALL implement S3 lifecycle policies to delete cached repositories after 24 hours
6. THE System SHALL implement a Token_Budget_Manager that truncates low-priority content before sending to Bedrock
7. THE Token_Budget_Manager SHALL prioritize User_Code over comments, logs, and configuration files when approaching token limits
8. THE System SHALL implement Prompt_Caching for common framework patterns (standard React components, Spring Boot boilerplate, Express.js middleware)
9. WHEN Prompt_Caching detects standard framework code, THE System SHALL use cached analysis to reduce Bedrock inference cost and latency
10. THE System SHALL implement a Multi-Model Strategy using Claude 3.5 Haiku for structured tasks (Stage 1 Project Review, Stage 3 Interview Questions, Answer Evaluation) and Claude 3.5 Sonnet for complex reasoning (Stage 2 Intelligence Report)
11. WHEN selecting a model, THE System SHALL prioritize Claude 3.5 Haiku for tasks with clear criteria and structured outputs to achieve 27% cost reduction
12. WHEN deep architectural reasoning is required, THE System SHALL use Claude 3.5 Sonnet to ensure high-quality inference of design decisions

### Requirement 15: Security and Privacy

**User Story:** As a user, I want my code and analysis results kept secure and private, so that my intellectual property is protected.

#### Acceptance Criteria

1. THE System SHALL encrypt all data at rest in DynamoDB and S3 using AWS KMS
2. THE System SHALL encrypt all data in transit using TLS 1.2 or higher
3. THE System SHALL not store repository code permanently after analysis completion
4. WHEN accessing private repositories, THE System SHALL use short-lived GitHub tokens that expire after analysis
5. THE System SHALL implement IAM roles with least-privilege access for all AWS services
6. THE System SHALL not expose repository contents or analysis results to unauthorized users

### Requirement 16: Live AI Mock Interview

**User Story:** As a developer preparing for interviews, I want to participate in a live AI-powered mock interview with instant feedback, so that I can practice answering questions in real-time and improve my interview performance.

#### Acceptance Criteria

1. WHEN a user initiates a live mock interview, THE System SHALL start a timed interview session with questions from the Interview_Simulation
2. WHEN a user answers a question during the live interview, THE System SHALL provide instant feedback within 5 seconds
3. THE System SHALL ask follow-up questions based on the user's previous answers to simulate realistic interview flow
4. WHEN the user provides a weak answer, THE System SHALL ask clarifying questions to help the user improve their response
5. WHEN the user provides a strong answer, THE System SHALL ask deeper technical questions to assess advanced understanding
6. THE System SHALL maintain conversation context throughout the interview session
7. THE System SHALL provide a summary evaluation at the end of the interview session with overall score and key strengths/weaknesses
8. THE System SHALL allow users to pause and resume interview sessions
9. WHEN an interview session completes, THE System SHALL save the transcript and evaluation to the user's history
10. THE System SHALL support both voice and text input for user answers (MVP: text only, voice as future enhancement)

### Requirement 17 [Future Scope]: Adaptive Learning Path

**User Story:** As a developer preparing for placements, I want a personalized improvement plan based on my project weaknesses, so that I can systematically enhance my skills for my target role.

**Note**: This requirement represents post-MVP functionality to demonstrate product vision. The hackathon MVP will focus on Requirements 1-16, with Requirement 17 serving as a roadmap for future development.

#### Acceptance Criteria

1. WHEN the Project_Review identifies skill gaps, THE System SHALL generate a prioritized 30-day improvement plan
2. THE System SHALL map identified weaknesses to specific learning resources (documentation, tutorials, courses)
3. THE System SHALL suggest 2-3 project ideas that would address the identified skill gaps
4. THE System SHALL allow users to set a target role (Junior SDE, Senior SDE, DevOps Engineer, Data Engineer, Full Stack Developer)
5. WHEN a target role is set, THE System SHALL tailor all recommendations, interview questions, and improvement suggestions to that role
6. THE System SHALL track progress across multiple analysis sessions showing improvement metrics over time
7. WHEN a user analyzes multiple projects, THE System SHALL identify skill progression and highlight consistent strengths
8. THE System SHALL provide role-specific benchmarks comparing the user's project against typical expectations for their target role
9. THE improvement plan SHALL prioritize skills most valued in the Indian IT job market for the selected role
10. THE System SHALL suggest specific code improvements that would increase the Employability_Signal score
