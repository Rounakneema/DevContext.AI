# Requirements Document - DevContext.AI

## 1. Introduction

DevContext.AI is an AI-powered platform that transforms GitHub repositories into recruiter-ready project intelligence reports. The system addresses the gap between building projects and articulating technical decisions in interviews.

### Target Users
- Engineering students preparing for placements (India-focused)
- Early-career developers building portfolios
- Recruiters evaluating candidate projects

### Core Value Proposition
Automatically analyze code repositories and generate:
1. Project quality assessments with employability scores
2. Reconstructed architectural decisions and design rationale
3. Project-specific interview questions with AI evaluation

---

## 2. Functional Requirements

### FR-1: Repository Analysis
**Priority**: Critical

**Description**: Users can submit GitHub repository URLs for automated analysis.

**Acceptance Criteria**:
- System accepts public and private GitHub repositories
- Analysis initiates within 5 seconds of submission
- Repository size limit: 500MB, 500 files
- Minimum 3 commits required for authenticity scoring
- Invalid URLs return descriptive error messages within 10 seconds

**User Story**: As a developer, I want to submit my GitHub repository URL so that I can receive comprehensive project intelligence reports.

### FR-2: Three-Stage Progressive Analysis
**Priority**: Critical

**Description**: Analysis delivered in three progressive stages with background processing.

**Stage 1 - Project Review** (30 seconds):
- Code quality metrics (readability, maintainability, best practices)
- Architecture clarity assessment
- Employability signal score (0-100)
- Project authenticity score from commit history
- 3-5 actionable improvement suggestions

**Stage 2 - Intelligence Report** (Background):
- System architecture reconstruction with diagrams
- 5-7 key design decisions with rationale
- Technical trade-offs analysis
- Scalability bottleneck identification
- 5-7 resume-ready bullet points

**Stage 3 - Interview Simulation** (Background):
- 10-15 project-specific interview questions
- Questions categorized by: architecture, implementation, trade-offs, scalability
- Difficulty levels: junior, mid-level, senior
- All questions reference specific files from user's code

**Acceptance Criteria**:
- Stage 1 completes within 30 seconds
- Stages 2 & 3 process in background
- Results stream to frontend as they complete
- User can proceed to next stage only after previous stage completes

**User Story**: As a developer, I want to receive analysis results progressively so that I can start reviewing insights immediately while deeper analysis continues.

### FR-3: Grounded Analysis
**Priority**: Critical

**Description**: All architectural claims must reference specific files and line numbers from the repository.

**Acceptance Criteria**:
- Every design decision includes file references
- File references include line numbers where applicable
- System validates all file references exist in user's code
- Claims without evidence marked as "Insufficient Evidence"
- No references to library/framework code (only user-written code)

**User Story**: As a developer, I want all analysis claims to reference my actual code so that I can verify and explain them in interviews.

### FR-4: User Code Isolation
**Priority**: High

**Description**: System distinguishes between user-written code and library/framework code.

**Exclusion Filter**:
- Directories: `node_modules/`, `dist/`, `build/`, `.git/`, `venv/`, `__pycache__/`
- Files: `package-lock.json`, `yarn.lock`, `.env`, `.pem`, `id_rsa`, binary files
- Extensions: `.png`, `.jpg`, `.gif`, `.svg`, `.ico`, `.woff`, `.ttf`
- Patterns: `*.min.js`, `*.bundle.js`, `*.map`

**Acceptance Criteria**:
- Interview questions only reference user-written code
- Library code excluded from token budget
- Framework patterns identified but not analyzed as user decisions

**User Story**: As a developer, I want interview questions about my code, not about frameworks I used.

### FR-5: Self-Correction Loop
**Priority**: High

**Description**: System automatically detects and fixes invalid file references in generated content.

**Acceptance Criteria**:
- Maximum 3 correction iterations
- Invalid file references automatically regenerated
- Convergence to valid questions within 3 iterations
- Logs correction attempts for debugging

**User Story**: As a system operator, I want the AI to self-correct invalid references so that all generated questions are accurate.

### FR-6: Real-Time Answer Evaluation
**Priority**: High

**Description**: Users can answer interview questions and receive immediate AI-powered feedback.

**Acceptance Criteria**:
- Answer evaluation completes within 10 seconds
- Score provided (0-100) with criteria breakdown
- Feedback includes: strengths, weaknesses, missing points
- Example answer provided for comparison
- Key technical terms highlighted
- Improvement trajectory tracked across sessions

**User Story**: As a developer, I want instant feedback on my interview answers so that I can improve my interview performance.

### FR-7: Authentication & Authorization
**Priority**: Critical

**Description**: Secure user authentication with AWS Cognito.

**Acceptance Criteria**:
- Email verification required before first analysis
- OAuth integration with GitHub for private repositories
- Users can only access their own analyses
- Session timeout: 24 hours
- GitHub tokens used once and immediately discarded

**User Story**: As a user, I want secure authentication so that my repository analyses remain private.

### FR-8: Data Persistence
**Priority**: Critical

**Description**: All analysis results stored and retrievable.

**Acceptance Criteria**:
- Analysis results persisted to DynamoDB
- Results associated with authenticated user
- Analysis history retrievable within 2 seconds
- Export available in PDF and Markdown formats
- Data retention: 90 days with automatic deletion
- User can delete analysis immediately

**User Story**: As a user, I want my analysis reports saved so that I can review them later and share with recruiters.

### FR-9: Cost Management
**Priority**: High

**Description**: Intelligent token management to control AI costs.

**Token Budget**:
- Maximum 50,000 tokens per repository analysis
- Allocation: 5K structure, 35K user code, 10K context
- Priority tiers: Entry points > Core logic > Utilities > Comments

**Acceptance Criteria**:
- Total tokens never exceed 50,000 per analysis
- Token budget manager prioritizes important files
- Prompt caching for common framework patterns
- Multi-model strategy (Haiku for structured, Sonnet for reasoning)
- Repository cache (24 hours) to avoid redundant analysis

**User Story**: As a system operator, I want cost-effective resource usage so that the platform remains sustainable.

### FR-10: Rate Limiting
**Priority**: Medium

**Description**: Prevent abuse and manage system load.

**Acceptance Criteria**:
- 10 analyses per user per day
- Rate limit enforced at API Gateway
- Clear error message when limit exceeded
- Lambda concurrency limit: 10 (cost control)

**User Story**: As a system operator, I want rate limiting to prevent abuse and control costs.

---

## 3. Non-Functional Requirements

### NFR-1: Performance
- Stage 1 delivery: ≤ 30 seconds
- Full analysis (< 50MB repo): ≤ 90 seconds
- Full analysis (< 200MB repo): ≤ 3 minutes
- Answer evaluation: ≤ 10 seconds
- API response time (p95): < 2 seconds
- Support 10+ concurrent analyses

### NFR-2: Scalability
- Serverless architecture (auto-scaling)
- DynamoDB on-demand pricing
- Lambda concurrency limits for cost control
- S3 lifecycle policies (24-hour cache deletion)
- Horizontal scaling without code changes

### NFR-3: Security
- All data encrypted at rest (AWS KMS)
- All data encrypted in transit (TLS 1.2+)
- Repository code deleted after 24 hours
- GitHub tokens never persisted
- IAM roles with least-privilege access
- No permanent code storage

### NFR-4: Reliability
- 95%+ analysis success rate
- Automatic retry with exponential backoff
- Graceful degradation (partial results on failure)
- CloudWatch logging for all errors
- Self-correction for AI-generated content

### NFR-5: Maintainability
- TypeScript for type safety
- Infrastructure as Code (AWS SAM)
- Comprehensive error logging
- Property-based testing for correctness
- Clear separation of concerns

### NFR-6: Usability
- Progressive result delivery (no blocking)
- Real-time progress indicators
- Clear error messages
- Responsive design (desktop & mobile)
- Intuitive dashboard interface

---

## 4. Technical Constraints

### TC-1: AWS Services
- Must use AWS Bedrock for AI (Claude models)
- Must use AWS Lambda for compute
- Must use DynamoDB for storage
- Must use S3 for caching
- Must use Cognito for authentication

### TC-2: Language Support
- MVP: Python, JavaScript, TypeScript, Java
- Covers 90% of Indian student projects
- Future: Go, Rust, C++, PHP

### TC-3: Repository Limits
- Maximum size: 1GB
- Maximum files: 500
- Minimum commits: 3 (for authenticity)
- Private repos require GitHub OAuth

### TC-4: Token Limits
- Bedrock context: 50,000 tokens per analysis
- Individual file truncation if necessary
- Priority-based file selection

---

## 5. Assumptions

### Indian Student Context
1. Common project types: Web apps, REST APIs, CRUD apps, college projects
2. Common frameworks: React, Spring Boot, Django, Express.js
3. Limited commit history acceptable (learning projects)
4. English language for all reports (Indian job market)
5. Placement interview patterns (Indian IT companies)

### Edge Cases
1. Bulk upload detection (single large commit)
2. Tutorial code detection (matches popular courses)
3. Incomplete projects (missing README, no tests)
4. Academic collaboration (group projects)
5. Copy-paste code (inconsistent styles)

---

## 6. Success Metrics

### Hackathon Demo
- Complete analysis of 3 repositories in < 60 seconds each
- Live answer evaluation demonstration
- Weak vs strong answer comparison
- Grounding verification (file references)
- Progressive streaming demonstration

### Post-Launch (30 days)
- 50 sign-ups from hackathon exposure
- 10 paying users at ₹99/analysis
- 80%+ user satisfaction rating
- 95%+ analysis success rate
- < ₹30 cost per analysis

---

## 7. Out of Scope (Future Enhancements)

### Phase 2 (Post-MVP)
- PDF/Markdown export
- Voice input for interviews
- Multi-language support (Hindi, etc.)
- Team collaboration features
- Recruiter view (public shareable links)

### Phase 3 (Long-term)
- Adaptive learning paths
- Portfolio intelligence (multiple repos)
- Career trajectory mapping
- Job matching
- Certification program

---

## 8. Glossary

| Term | Definition |
|------|------------|
| **Analysis** | Complete evaluation of a repository (3 stages) |
| **Employability Signal** | Quantitative score (0-100) indicating project quality for hiring |
| **Grounding** | Verification that claims reference specific code files |
| **Intelligence Report** | Stage 2 output with architecture and design decisions |
| **Interview Simulation** | Stage 3 output with project-specific questions |
| **Project Review** | Stage 1 output with code quality and architecture assessment |
| **Self-Correction Loop** | Automatic regeneration of invalid AI-generated content |
| **Token Budget** | Maximum AI tokens (50K) allocated per analysis |
| **User Code** | Code written by repository owner (excludes libraries) |
| **Workflow State** | Current stage of analysis pipeline |

---

---

## 9. Implementation Notes

### 9.1 Recent Fixes (March 2, 2026)

**Stage 2 & 3 Data Persistence Fix**:
- **Problem**: Intelligence reports and interview questions completing but not saving to DynamoDB
- **Root Cause**: `userCodeFiles` array undefined in Stage 2/3, causing grounding checker crashes
- **Solution**: Store `userCodeFiles` separately in S3, load when needed
- **Status**: Code fixed, pending deployment

**Stage 3 JSON Parsing Fix**:
- **Problem**: AI-generated JSON contained control characters causing parse errors
- **Root Cause**: Bedrock returns unescaped newlines, tabs, control characters
- **Solution**: Multi-strategy JSON parsing with control character removal
- **Status**: Code fixed, pending deployment

**Files Modified**:
- `backend/src/orchestrator.ts` - S3 save/load logic
- `backend/src/stage2-intelligence.ts` - Conditional validation
- `backend/src/stage3-questions.ts` - Improved JSON parsing
- `backend/src/grounding-checker.ts` - Type safety checks
- `backend/src/types.ts` - Added `userCodeFilesS3Key` field

### 9.2 Deployment Status

**Production Environment**:
- Region: ap-southeast-1 (Singapore)
- API Endpoint: `https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod`
- Status: Operational with pending fixes

**Next Steps**:
1. Build TypeScript: `npm run build`
2. Deploy to AWS: `sam deploy --no-confirm-changeset`
3. Run end-to-end test: `node test-complete-flow.js`
4. Verify data persistence in DynamoDB

---

## Document Version

**Version**: 2.0  
**Date**: March 2, 2026  
**Status**: Production  
**Last Updated**: March 2, 2026  
**Previous Version**: 1.0

---

## Approval

This requirements document has been reviewed and approved for implementation.

**Approved by**: [Project Owner]  
**Date**: March 2, 2026

---

## Related Documents

- `design.md` - Complete system design and architecture
- `HANDOVER.md` - Project handover document with operational procedures
- `README.md` - Project overview and quick start guide
- `docs/api-contract.yaml` - Complete API specification
