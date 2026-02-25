# DevContext AI - Team Division & Prerequisites

## Overview

This document divides the DevContext AI project into two parallel development tracks for a 2-person team, defines clear interfaces between components, and lists all prerequisites that must be completed before parallel development can begin.

## Team Structure

### Person 1: Backend & AI Engineer
**Focus**: AWS Infrastructure, Lambda Functions, AI Pipeline, Data Processing

### Person 2: Frontend & Integration Engineer
**Focus**: React Dashboard, API Integration, User Experience, WebSocket Communication

---

## Phase 0: Prerequisites (Must Complete Before Parallel Work)

### Critical Setup Tasks (Complete Together - 2-3 days)

#### 1. AWS Account & Infrastructure Setup
**Owner**: Person 1 (Backend)
**Status**: BLOCKING - Must complete first

- [ ] Create AWS account with appropriate billing alerts
- [ ] Set up IAM users for both team members with appropriate permissions
- [ ] Configure AWS CLI and credentials for both developers
- [ ] Create development and staging environments
- [ ] Set up AWS Organizations structure (if needed)
- [ ] Configure billing alerts ($5, $10, $20 thresholds)

**Deliverables**:
- AWS account credentials document
- IAM policy documents
- Environment configuration guide

#### 2. Core Infrastructure Provisioning
**Owner**: Person 1 (Backend)
**Status**: BLOCKING - Must complete first

- [ ] Create DynamoDB tables with schemas:
  - Analyses table (PK: analysisId, GSI: userId-createdAt-index)
  - InterviewSessions table (PK: sessionId, GSI: analysisId-createdAt-index)
  - UserProgress table (PK: userId, SK: analysisId)
  - Cache table (PK: repositoryUrl, TTL: 24 hours)
- [ ] Create S3 bucket with lifecycle policies
- [ ] Set up CloudWatch log groups
- [ ] Configure API Gateway (REST + WebSocket)
- [ ] Set up Cognito user pool with email verification

**Deliverables**:
- Infrastructure as Code (CloudFormation/Terraform) OR
- Manual setup documentation with screenshots
- Table schemas document
- API Gateway endpoint URLs

#### 3. API Contract Definition
**Owner**: Both (Pair Programming Session)
**Status**: BLOCKING - Must complete first

- [ ] Define complete API specification (OpenAPI/Swagger)
- [ ] Document all request/response schemas
- [ ] Define error response formats
- [ ] Document WebSocket message formats
- [ ] Create mock API responses for frontend development

**Deliverables**:
- `api-contract.yaml` (OpenAPI 3.0 specification)
- `websocket-protocol.md` (WebSocket message formats)
- Mock API server OR Postman collection with examples

#### 4. Data Models & Interfaces
**Owner**: Both (Pair Programming Session)
**Status**: BLOCKING - Must complete first

- [ ] Define TypeScript interfaces for all data models
- [ ] Create shared types package/file
- [ ] Document data transformation rules
- [ ] Define validation schemas (Zod/Joi)

**Deliverables**:
- `shared-types.ts` file with all interfaces
- `validation-schemas.ts` file
- Data model documentation

#### 5. Development Environment Setup
**Owner**: Both
**Status**: BLOCKING - Must complete first

- [ ] Set up Git repository with branching strategy
- [ ] Define folder structure for monorepo or separate repos
- [ ] Configure ESLint, Prettier, TypeScript configs
- [ ] Set up CI/CD pipeline basics (GitHub Actions/GitLab CI)
- [ ] Create `.env.example` files with all required variables
- [ ] Set up local development environment guide

**Deliverables**:
- Git repository with initial structure
- `CONTRIBUTING.md` with development guidelines
- `.env.example` files
- `README.md` with setup instructions

#### 6. Bedrock Access & Testing
**Owner**: Person 1 (Backend)
**Status**: BLOCKING - Must complete first

- [ ] Request Amazon Bedrock access (if not already enabled)
- [ ] Test Claude 3.5 Haiku access
- [ ] Test Claude 3.5 Sonnet access
- [ ] Create sample prompts and test responses
- [ ] Document token usage and costs
- [ ] Set up Bedrock SDK in Lambda environment

**Deliverables**:
- Bedrock access confirmation
- Sample prompt/response examples
- Cost estimation spreadsheet
- Bedrock integration guide

---

## Phase 1: Parallel Development Tracks

### Person 1: Backend & AI Pipeline (Weeks 1-4)

#### Week 1: Core Infrastructure & Repository Processing

**Tasks**:
1. **Repository Processor Lambda** (Task 3.1-3.5)
   - Implement GitHub repository cloning
   - Build Intelligent Exclusion Filter
   - Create Project Context Map generator
   - Calculate Project Authenticity Score
   - Implement S3 caching with 24-hour TTL

2. **Token Budget Manager** (Task 4.1-4.2)
   - Implement token estimation logic
   - Create file prioritization system
   - Implement truncation logic

**Dependencies**: AWS infrastructure, S3 bucket, DynamoDB Cache table

**Deliverables**:
- Repository Processor Lambda deployed
- Token Budget Manager module
- Unit tests for filtering logic
- Integration test with sample repositories

**API Endpoints Provided**:
- Internal: `processRepository(url, token) => ProjectContextMap`

---

#### Week 2: AI Pipeline - Stage 1 (Project Review)

**Tasks**:
1. **Stage 1: Project Review Generator** (Task 5.1-5.4)
   - Set up Bedrock client for Claude 3.5 Haiku
   - Implement code quality analysis prompts
   - Calculate Employability Signal
   - Add grounding checks
   - Persist results to DynamoDB

**Dependencies**: Repository Processor, Bedrock access, DynamoDB Analyses table

**Deliverables**:
- Stage 1 Lambda deployed
- Bedrock prompt templates
- Grounding validation logic
- Performance metrics (must be < 30 seconds)

**API Endpoints Provided**:
- Internal: `generateProjectReview(contextMap, code) => ProjectReview`

---

#### Week 3: AI Pipeline - Stages 2 & 3

**Tasks**:
1. **Stage 2: Intelligence Report Generator** (Task 7.1-7.5)
   - Set up Bedrock client for Claude 3.5 Sonnet
   - Implement Chain-of-Thought prompting
   - Create Grounding Checker component
   - Generate resume bullets
   - Persist results to DynamoDB

2. **Stage 3: Interview Simulation Generator** (Task 8.1-8.4)
   - Set up Bedrock client for Claude 3.5 Haiku
   - Implement Self-Correction Loop
   - Categorize questions by difficulty
   - Persist results to DynamoDB

**Dependencies**: Repository Processor, Stage 1 complete

**Deliverables**:
- Stage 2 Lambda deployed
- Stage 3 Lambda deployed
- Self-correction validation logic
- Background processing confirmation

**API Endpoints Provided**:
- Internal: `generateIntelligenceReport(contextMap, code) => IntelligenceReport`
- Internal: `generateInterviewQuestions(contextMap, code) => InterviewSimulation`

---

#### Week 4: Answer Evaluation & Orchestration

**Tasks**:
1. **Answer Evaluation Lambda** (Task 9.1-9.4)
   - Implement answer scoring logic
   - Create Improvement Trajectory Tracker
   - Persist interview session data

2. **Analysis Orchestrator Lambda** (Task 11.1-11.4)
   - Implement orchestration logic
   - Add cache checking
   - Coordinate Lambda invocations
   - Implement status tracking

3. **WebSocket Support** (Task 13.1-13.4)
   - Set up WebSocket API
   - Implement connection management
   - Add stage completion notifications
   - Create live interview handlers

**Dependencies**: All AI stages complete, API Gateway WebSocket configured

**Deliverables**:
- Answer Evaluation Lambda deployed
- Orchestrator Lambda deployed
- WebSocket handlers implemented
- End-to-end backend flow working

**API Endpoints Provided**:
- `POST /analyze` - Initiate analysis
- `GET /analysis/{id}/status` - Get status
- `GET /analysis/{id}` - Get results
- `POST /interview/{id}/answer` - Submit answer
- WebSocket: Stage completion notifications

---

### Person 2: Frontend & Integration (Weeks 1-4)

#### Week 1: Project Setup & Authentication

**Tasks**:
1. **React Application Setup** (Task 16.1)
   - Create React app with TypeScript
   - Set up React Router
   - Configure responsive design framework (Tailwind CSS)
   - Set up state management (Redux/Zustand/Context)

2. **Cognito Authentication Flow** (Task 16.2)
   - Implement login/signup components
   - Add email verification flow
   - Implement GitHub OAuth integration
   - Handle session management

**Dependencies**: Cognito user pool configured, API contract defined

**Deliverables**:
- React app running locally
- Authentication flow complete
- Protected routes implemented
- Session persistence working

**Components Created**:
- `LoginPage.tsx`
- `SignupPage.tsx`
- `AuthProvider.tsx`
- `ProtectedRoute.tsx`

---

#### Week 2: Repository Submission & Progress Tracking

**Tasks**:
1. **Repository Submission Form** (Task 16.3)
   - Create form with validation
   - Add GitHub token input for private repos
   - Implement repository size warning
   - Add target role selection

2. **Real-time Progress Indicator** (Task 16.4)
   - Connect to WebSocket for updates
   - Display progress bar
   - Show stage status indicators
   - Handle connection errors

**Dependencies**: API Gateway endpoints, WebSocket configured, Mock API responses

**Deliverables**:
- Repository submission form working
- Progress tracking with mock data
- WebSocket connection established
- Error handling implemented

**Components Created**:
- `RepositorySubmissionForm.tsx`
- `ProgressIndicator.tsx`
- `StageStatusCard.tsx`
- `WebSocketProvider.tsx`

---

#### Week 3: Results Display & Interview Interface

**Tasks**:
1. **Three-Tab Results View** (Task 16.5)
   - Create tab navigation
   - Display Project Review with scores
   - Display Intelligence Report with diagrams
   - Display Interview Simulation questions

2. **Interview Q&A Interface** (Task 16.6)
   - Display questions one at a time
   - Create answer input area
   - Show evaluation inline
   - Display strengths/weaknesses

**Dependencies**: API contract, Mock data for all result types

**Deliverables**:
- Results dashboard complete
- All three tabs functional
- Interview Q&A interface working
- Responsive design verified

**Components Created**:
- `ResultsDashboard.tsx`
- `ProjectReviewTab.tsx`
- `IntelligenceReportTab.tsx`
- `InterviewSimulationTab.tsx`
- `QuestionCard.tsx`
- `AnswerEvaluation.tsx`

---

#### Week 4: Live Interview & History

**Tasks**:
1. **Live Mock Interview Interface** (Task 16.7)
   - Create WebSocket connection for live interview
   - Display questions and capture answers
   - Show instant feedback
   - Implement pause/resume functionality

2. **Analysis History View** (Task 16.9)
   - Display list of past analyses
   - Show scores and quick access
   - Implement delete functionality
   - Add progress tracking charts

3. **Export Functionality** (Task 16.8)
   - Implement PDF export
   - Implement Markdown export
   - Add download buttons

**Dependencies**: Backend WebSocket handlers, API endpoints complete

**Deliverables**:
- Live interview interface complete
- History page functional
- Export features working
- Full frontend integration complete

**Components Created**:
- `LiveInterviewInterface.tsx`
- `AnalysisHistoryPage.tsx`
- `ExportButton.tsx`
- `ProgressChart.tsx`

---

## Integration Points & Handoff Requirements

### Backend → Frontend Handoffs

#### 1. API Endpoints Ready
**When**: End of Week 2 (Backend)
**What**: 
- `POST /analyze` endpoint working
- `GET /analysis/{id}/status` endpoint working
- Mock data available for testing

**Frontend Action**: 
- Replace mock API calls with real endpoints
- Test repository submission flow

---

#### 2. Results API Complete
**When**: End of Week 3 (Backend)
**What**:
- `GET /analysis/{id}` returning complete results
- All three stages data available

**Frontend Action**:
- Integrate real data into results dashboard
- Test all three tabs with real analysis

---

#### 3. WebSocket Notifications
**When**: End of Week 4 (Backend)
**What**:
- WebSocket connection established
- Stage completion messages working
- Live interview messages working

**Frontend Action**:
- Connect WebSocket to progress indicator
- Implement live interview real-time updates

---

#### 4. Answer Evaluation API
**When**: End of Week 4 (Backend)
**What**:
- `POST /interview/{id}/answer` working
- Answer evaluation returning within 10 seconds

**Frontend Action**:
- Integrate answer submission
- Display evaluation results

---

### Frontend → Backend Handoffs

#### 1. UI/UX Feedback
**When**: End of Week 1 (Frontend)
**What**:
- Wireframes implemented
- User flow validated
- Error message requirements

**Backend Action**:
- Adjust error response formats if needed
- Ensure API matches UI expectations

---

#### 2. Performance Requirements
**When**: End of Week 2 (Frontend)
**What**:
- Loading state requirements
- Timeout expectations
- Progress update frequency needs

**Backend Action**:
- Optimize Lambda performance
- Adjust WebSocket message frequency

---

## Shared Responsibilities

### Both Team Members

1. **Daily Standups** (15 minutes)
   - What did you complete yesterday?
   - What are you working on today?
   - Any blockers or dependencies?

2. **Integration Testing** (End of each week)
   - Test frontend + backend together
   - Verify API contracts are followed
   - Check error handling

3. **Code Reviews** (Ongoing)
   - Review each other's pull requests
   - Ensure code quality standards
   - Share knowledge

4. **Documentation** (Ongoing)
   - Update API documentation
   - Document component usage
   - Keep README current

---

## Critical Dependencies & Blockers

### Week 1 Blockers
- **Backend**: AWS infrastructure must be set up
- **Frontend**: Cognito configuration must be complete
- **Both**: API contract must be defined

### Week 2 Blockers
- **Backend**: Bedrock access must be approved
- **Frontend**: Mock API must be available
- **Both**: Shared types must be defined

### Week 3 Blockers
- **Backend**: Stage 1 must be complete for Stage 2/3
- **Frontend**: WebSocket protocol must be documented
- **Both**: Data models must be finalized

### Week 4 Blockers
- **Backend**: All stages must be complete for orchestration
- **Frontend**: Real API endpoints must be available
- **Both**: Integration testing environment ready

---

## Risk Mitigation Strategies

### If Backend Falls Behind
1. **Frontend**: Continue with mock data
2. **Frontend**: Build UI components independently
3. **Backend**: Prioritize API endpoints over optimization
4. **Both**: Extend timeline or reduce scope (defer Stage 3)

### If Frontend Falls Behind
1. **Backend**: Focus on API testing and documentation
2. **Backend**: Build admin/testing tools
3. **Frontend**: Use component libraries to speed up
4. **Both**: Simplify UI design if needed

### If Both Fall Behind
1. **Reduce Scope**: 
   - Defer Live Mock Interview (Requirement 16)
   - Defer Adaptive Learning Path (Requirement 17)
   - Simplify export functionality
2. **Focus on MVP**:
   - Stage 1 (Project Review) only
   - Basic interview Q&A (no live mode)
   - Simple results display

---

## Communication Protocol

### Slack/Discord Channels
- `#general` - General discussion
- `#backend` - Backend-specific issues
- `#frontend` - Frontend-specific issues
- `#integration` - Integration testing and issues
- `#blockers` - Urgent blockers that need attention

### Meeting Schedule
- **Daily Standup**: 10:00 AM (15 min)
- **Integration Sync**: Every Monday & Thursday (30 min)
- **Code Review**: Async, respond within 4 hours
- **Demo/Review**: Every Friday (1 hour)

### Decision Making
- **Technical Decisions**: Discuss in Slack, document in `decisions.md`
- **Scope Changes**: Both must agree
- **Architecture Changes**: Requires pair discussion

---

## Success Criteria

### End of Week 1
- ✅ AWS infrastructure operational
- ✅ React app running with authentication
- ✅ Repository processor working
- ✅ API contract finalized

### End of Week 2
- ✅ Stage 1 (Project Review) complete
- ✅ Repository submission form working
- ✅ Progress tracking functional
- ✅ First integration test passing

### End of Week 3
- ✅ Stages 2 & 3 complete
- ✅ Results dashboard displaying all data
- ✅ Interview Q&A interface working
- ✅ WebSocket notifications working

### End of Week 4
- ✅ Full backend pipeline operational
- ✅ Complete frontend integrated
- ✅ End-to-end user flow working
- ✅ Ready for demo/deployment

---

## Pre-Development Checklist

Before starting parallel development, ensure ALL of these are complete:

### Infrastructure
- [ ] AWS account created and configured
- [ ] IAM users created for both developers
- [ ] DynamoDB tables created with correct schemas
- [ ] S3 bucket created with lifecycle policies
- [ ] API Gateway configured (REST + WebSocket)
- [ ] Cognito user pool configured
- [ ] CloudWatch log groups created

### Documentation
- [ ] API contract defined (OpenAPI spec)
- [ ] WebSocket protocol documented
- [ ] Data models defined (TypeScript interfaces)
- [ ] Shared types file created
- [ ] Development environment guide written
- [ ] Git branching strategy defined

### Access & Permissions
- [ ] Both developers have AWS CLI configured
- [ ] Both developers have Bedrock access
- [ ] Both developers have GitHub repository access
- [ ] Both developers have necessary API keys

### Development Environment
- [ ] Git repository initialized
- [ ] Folder structure created
- [ ] ESLint/Prettier configured
- [ ] TypeScript configured
- [ ] `.env.example` files created
- [ ] Mock API server OR Postman collection ready

### Testing
- [ ] Sample repositories identified for testing
- [ ] Mock data created for frontend development
- [ ] Integration testing strategy defined
- [ ] CI/CD pipeline basics configured

---

## Estimated Timeline

**Prerequisites**: 2-3 days (both working together)
**Parallel Development**: 4 weeks
**Integration & Testing**: 1 week
**Demo Preparation**: 2-3 days

**Total**: ~6 weeks for MVP

---

## Next Steps

1. **Review this document together** - Ensure both team members understand the division
2. **Complete Prerequisites** - Work together on Phase 0 (2-3 days)
3. **Kick-off Meeting** - Align on timeline and expectations
4. **Start Parallel Development** - Begin Week 1 tasks
5. **Daily Standups** - Maintain communication and track progress

---

**Document Version**: 1.0  
**Last Updated**: [Current Date]  
**Maintained By**: Both Team Members