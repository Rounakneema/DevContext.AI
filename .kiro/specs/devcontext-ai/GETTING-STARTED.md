# DevContext AI - Getting Started Guide

## 🎯 Project Overview

DevContext AI is an AWS-based serverless system that transforms GitHub repositories into recruiter-ready project intelligence reports. The system helps engineering students in India articulate their architectural thinking and engineering decisions in interviews.

### What It Does

1. **Analyzes GitHub Repositories**: Users submit a GitHub URL
2. **Generates Three Reports**:
   - **Project Review** (30 seconds): Code quality, architecture, employability score
   - **Intelligence Report** (background): Architecture reconstruction, design decisions, resume bullets
   - **Interview Simulation** (background): Project-specific interview questions
3. **Provides Interview Practice**: Real-time answer evaluation and live mock interviews

### Key Features

- Progressive streaming (results delivered as they complete)
- Multi-model AI strategy (Claude 3.5 Haiku + Sonnet)
- Grounded analysis (all claims reference specific files)
- User code focus (excludes library/framework code)
- Cost-optimized ($0.30 per analysis)

---

## 📚 Essential Documents

Before starting, both team members MUST read these documents in order:

### 1. **requirements.md** (30 minutes)
- Understand what the system must do
- Review all 17 requirements and acceptance criteria
- Pay special attention to Indian student context and edge cases

### 2. **design.md** (45 minutes)
- Understand how the system works
- Review architecture diagrams and component interfaces
- Study the multi-stage AI pipeline design
- Review correctness properties (what we're testing)

### 3. **team-division.md** (30 minutes)
- Understand your role (Backend vs Frontend)
- Review your 4-week task breakdown
- Identify integration points with your teammate

### 4. **prerequisites-checklist.md** (15 minutes)
- Understand what must be completed before parallel work
- Review the 2-3 day setup timeline
- Identify your responsibilities in Phase 0

### 5. **api-contract-template.yaml** (20 minutes)
- Review the API specification
- Understand request/response formats
- Identify endpoints you'll be working with

### 6. **wireframes.md** (Optional - 20 minutes)
- Frontend engineer: Review UI designs
- Backend engineer: Understand what data the frontend needs

**Total Reading Time**: ~2.5 hours (can be done in parallel)

---

## 🚀 Quick Start Workflow

### Step 1: Initial Meeting (1 hour)

**Agenda**:
1. Both read this document together (15 min)
2. Discuss project goals and timeline (15 min)
3. Assign roles: Person 1 (Backend) vs Person 2 (Frontend) (5 min)
4. Review prerequisites checklist together (15 min)
5. Schedule daily standups and integration syncs (10 min)

**Outcome**: Clear understanding of roles, timeline, and next steps

---

### Step 2: Document Review (2-3 hours, can be done separately)

**Person 1 (Backend Engineer)** - Focus on:
- requirements.md: Requirements 1-10, 12-15
- design.md: Components 1-10 (skip frontend components)
- team-division.md: Person 1 sections
- api-contract-template.yaml: All endpoints

**Person 2 (Frontend Engineer)** - Focus on:
- requirements.md: Requirements 1, 2, 3, 4, 5, 11
- design.md: API Gateway, data models, progressive streaming
- team-division.md: Person 2 sections
- wireframes.md: All UI designs
- api-contract-template.yaml: All endpoints

**Outcome**: Both understand their responsibilities and the system architecture

---

### Step 3: Prerequisites Setup (2-3 days, work together)

Follow **prerequisites-checklist.md** exactly. Do NOT skip any items.

**Day 1: Infrastructure** (Person 1 leads, Person 2 assists)
- AWS account setup
- DynamoDB tables
- S3 bucket
- API Gateway
- Cognito

**Day 2: Contracts & Interfaces** (Both pair program)
- Complete api-contract.yaml
- Create websocket-protocol.md
- Create shared-types.ts
- Create validation-schemas.ts
- Set up mock API

**Day 3: Development Environment** (Both)
- Git repository
- Project structure
- ESLint/Prettier/TypeScript
- CI/CD pipeline
- Bedrock access testing

**Outcome**: All prerequisites checked off, both developers can start parallel work

---

### Step 4: Parallel Development (4 weeks)

**Week 1**:
- Person 1: Repository Processor + Token Budget Manager
- Person 2: React app + Authentication

**Week 2**:
- Person 1: Stage 1 (Project Review)
- Person 2: Repository submission form + Progress tracking

**Week 3**:
- Person 1: Stages 2 & 3 (Intelligence + Interview)
- Person 2: Results dashboard + Interview Q&A

**Week 4**:
- Person 1: Answer evaluation + Orchestration + WebSocket
- Person 2: Live interview + History + Export

**Integration Points**: End of each week, test together

---

## 👥 Team Roles

### Person 1: Backend & AI Engineer

**Responsibilities**:
- AWS infrastructure setup and management
- Lambda function development
- AI pipeline implementation (Bedrock integration)
- Data processing and caching
- API endpoint development
- WebSocket handlers

**Skills Needed**:
- AWS services (Lambda, DynamoDB, S3, Bedrock)
- Python or Node.js for Lambda
- AI prompt engineering
- API design
- Git operations

**Key Deliverables**:
- Repository Processor Lambda
- Stage 1, 2, 3 AI pipeline Lambdas
- Answer Evaluation Lambda
- Orchestrator Lambda
- WebSocket support
- API endpoints working

---

### Person 2: Frontend & Integration Engineer

**Responsibilities**:
- React dashboard development
- User authentication flow
- API integration
- Real-time progress tracking
- Results visualization
- Interview Q&A interface

**Skills Needed**:
- React + TypeScript
- AWS Cognito integration
- WebSocket client
- Responsive design
- State management
- API consumption

**Key Deliverables**:
- React app with authentication
- Repository submission form
- Progress indicator
- Three-tab results view
- Interview Q&A interface
- Live interview interface
- Analysis history page

---

## 🔑 Critical Success Factors

### 1. Complete Prerequisites First
- Do NOT start parallel work until ALL prerequisites are checked off
- Both developers must sign off on prerequisites-checklist.md
- Skipping prerequisites will cause blockers later

### 2. Define API Contract Early
- Spend quality time on api-contract.yaml in Day 2
- Both must agree on request/response formats
- Changes later are expensive

### 3. Create Shared Types
- shared-types.ts must be created in Day 2
- Both backend and frontend use the same types
- Prevents integration issues

### 4. Set Up Mock API
- Frontend needs mock data to work independently
- Create mock API or Postman collection in Day 2
- Frontend can develop without waiting for backend

### 5. Daily Communication
- 15-minute standup every morning
- Slack/Discord for async questions
- Integration sync twice per week

### 6. Test Integration Weekly
- End of Week 1: Test repository submission
- End of Week 2: Test Stage 1 results display
- End of Week 3: Test all three stages
- End of Week 4: Test full end-to-end flow

---

## 🚨 Common Pitfalls to Avoid

### 1. Starting Parallel Work Too Early
**Problem**: Backend and frontend don't align, causing rework
**Solution**: Complete ALL prerequisites first (2-3 days)

### 2. Skipping API Contract Definition
**Problem**: Backend and frontend have different expectations
**Solution**: Pair program on api-contract.yaml, both sign off

### 3. Not Creating Mock Data
**Problem**: Frontend blocked waiting for backend
**Solution**: Create mock API or Postman collection on Day 2

### 4. Ignoring Shared Types
**Problem**: Type mismatches cause integration bugs
**Solution**: Create shared-types.ts, both use it

### 5. Poor Communication
**Problem**: Blockers not surfaced, duplicate work
**Solution**: Daily standups, Slack channel, integration syncs

### 6. Skipping Testing
**Problem**: Integration fails at the end
**Solution**: Test together at end of each week

### 7. Scope Creep
**Problem**: Adding features not in requirements
**Solution**: Stick to requirements.md, defer extras to post-MVP

---

## 📋 Pre-Development Checklist

Before starting parallel development, confirm:

### Infrastructure
- [ ] AWS account created and configured
- [ ] Both developers have AWS CLI access
- [ ] DynamoDB tables created
- [ ] S3 bucket created
- [ ] API Gateway configured
- [ ] Cognito user pool configured

### Documentation
- [ ] api-contract.yaml completed
- [ ] websocket-protocol.md created
- [ ] shared-types.ts created
- [ ] validation-schemas.ts created
- [ ] Mock API available

### Development Environment
- [ ] Git repository initialized
- [ ] Both developers have write access
- [ ] Project structure created
- [ ] ESLint/Prettier configured
- [ ] TypeScript configured
- [ ] .env.example files created

### Access & Permissions
- [ ] Both have AWS credentials
- [ ] Both have Bedrock access
- [ ] Both have GitHub repo access

### Communication
- [ ] Slack/Discord channels created
- [ ] Daily standup time agreed
- [ ] Integration sync schedule set
- [ ] Code review process defined

### Testing
- [ ] Sample repositories identified
- [ ] Mock data created
- [ ] Integration test plan defined

**If ALL checked**: 🚀 START PARALLEL DEVELOPMENT!

---

## 🎯 Success Metrics

### End of Week 1
- ✅ AWS infrastructure operational
- ✅ React app running with authentication
- ✅ Repository processor working
- ✅ API contract finalized

### End of Week 2
- ✅ Stage 1 (Project Review) complete (<30s)
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

## 🆘 When You're Stuck

### Backend Issues
- **AWS Access**: Check IAM permissions, AWS CLI configuration
- **Bedrock Errors**: Verify model access, check prompt format
- **Lambda Timeouts**: Increase memory, check CloudWatch logs
- **DynamoDB Errors**: Verify table schemas, check GSI configuration

### Frontend Issues
- **Cognito Auth**: Check user pool ID, client ID, redirect URLs
- **API Errors**: Check CORS configuration, verify endpoint URLs
- **WebSocket**: Check connection URL, verify message format
- **State Management**: Review React DevTools, check state updates

### Integration Issues
- **Type Mismatches**: Review shared-types.ts, ensure both use it
- **API Contract**: Compare request/response with api-contract.yaml
- **CORS Errors**: Check API Gateway CORS configuration
- **Authentication**: Verify Cognito token in Authorization header

### Communication Issues
- **Blocker**: Post in #blockers channel immediately
- **Question**: Ask in Slack, don't wait for standup
- **Disagreement**: Schedule 15-min sync to resolve
- **Behind Schedule**: Discuss scope reduction options

---

## 📞 Communication Protocol

### Daily Standup (15 min @ 10:00 AM)
- What did you complete yesterday?
- What are you working on today?
- Any blockers or dependencies?

### Integration Sync (30 min, Mon & Thu)
- Test integration points
- Resolve API mismatches
- Plan next integration

### Code Review (Async, 4-hour response)
- Review each other's PRs
- Ensure quality standards
- Share knowledge

### Demo/Review (1 hour, Every Friday)
- Show progress
- Test together
- Plan next week

---

## 🎬 Next Steps

1. **Read this document together** (15 min)
2. **Schedule initial meeting** (1 hour)
3. **Assign roles** (Person 1 vs Person 2)
4. **Read essential documents** (2-3 hours)
5. **Start prerequisites setup** (2-3 days)
6. **Begin parallel development** (4 weeks)

---

## 📁 Document Reference

| Document | Purpose | Who Reads | When |
|----------|---------|-----------|------|
| **GETTING-STARTED.md** (this file) | Quick start guide | Both | Day 0 |
| **requirements.md** | What to build | Both | Day 0 |
| **design.md** | How to build it | Both | Day 0 |
| **team-division.md** | Who does what | Both | Day 0 |
| **team-division-summary.md** | Quick reference | Both | Ongoing |
| **prerequisites-checklist.md** | Setup tasks | Both | Day 1-3 |
| **api-contract-template.yaml** | API specification | Both | Day 2 |
| **wireframes.md** | UI designs | Person 2 | Day 0 |
| **tasks.md** | Implementation tasks | Both | Week 1+ |

---

## 💡 Pro Tips

1. **Over-communicate**: When in doubt, ask. Don't assume.
2. **Document decisions**: Keep a decisions.md file for important choices
3. **Test early, test often**: Don't wait until the end to integrate
4. **Use version control**: Commit frequently, push daily
5. **Review code together**: Learn from each other
6. **Celebrate wins**: Acknowledge progress at end of each week
7. **Stay flexible**: Be ready to adjust scope if needed
8. **Focus on MVP**: Defer nice-to-haves to post-hackathon

---

## 🎉 You're Ready!

You now have everything you need to start building DevContext AI. Follow the workflow, communicate frequently, and you'll have a working MVP in 4-6 weeks.

**Good luck! 🚀**

---

**Document Version**: 1.0  
**Last Updated**: [Current Date]  
**Maintained By**: Both Team Members
