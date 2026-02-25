# DevContext AI - Team Division Quick Reference

## 👥 Team Roles

```
┌─────────────────────────────────────────────────────────────────┐
│                         Team Structure                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Person 1: Backend & AI Engineer                                │
│  ├─ AWS Infrastructure                                          │
│  ├─ Lambda Functions                                            │
│  ├─ AI Pipeline (Bedrock)                                       │
│  ├─ Data Processing                                             │
│  └─ API Development                                             │
│                                                                 │
│  Person 2: Frontend & Integration Engineer                      │
│  ├─ React Dashboard                                             │
│  ├─ API Integration                                             │
│  ├─ User Experience                                             │
│  ├─ WebSocket Communication                                     │
│  └─ Component Development                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites (2-3 Days - Work Together)

### Must Complete Before Parallel Work:

1. **AWS Infrastructure** ✅
   - Account, IAM, DynamoDB, S3, API Gateway, Cognito

2. **API Contract** ✅
   - OpenAPI spec, WebSocket protocol, Error formats

3. **Data Models** ✅
   - TypeScript interfaces, Validation schemas, Shared types

4. **Dev Environment** ✅
   - Git repo, Folder structure, ESLint/Prettier, CI/CD

5. **Bedrock Access** ✅
   - Claude 3.5 Haiku & Sonnet access confirmed

6. **Mock Data** ✅
   - Mock API server OR Postman collection ready

---

## 🗓️ 4-Week Parallel Development Plan

### Week 1

```
Person 1 (Backend)              Person 2 (Frontend)
├─ Repository Processor         ├─ React App Setup
├─ Exclusion Filter             ├─ Authentication Flow
├─ Token Budget Manager         ├─ Login/Signup Pages
└─ S3 Caching                   └─ Protected Routes

Deliverable: Repo processing    Deliverable: Auth working
```

### Week 2

```
Person 1 (Backend)              Person 2 (Frontend)
├─ Stage 1: Project Review      ├─ Repository Form
├─ Bedrock Integration          ├─ Progress Indicator
├─ Code Quality Analysis        ├─ WebSocket Connection
└─ DynamoDB Persistence         └─ Real-time Updates

Deliverable: Stage 1 < 30s      Deliverable: Submission flow
```

### Week 3

```
Person 1 (Backend)              Person 2 (Frontend)
├─ Stage 2: Intelligence        ├─ Results Dashboard
├─ Stage 3: Interview Qs        ├─ Three-Tab Layout
├─ Self-Correction Loop         ├─ Interview Q&A UI
└─ Background Processing        └─ Answer Display

Deliverable: All 3 stages       Deliverable: Results UI
```

### Week 4

```
Person 1 (Backend)              Person 2 (Frontend)
├─ Answer Evaluation            ├─ Live Interview UI
├─ Orchestrator Lambda          ├─ Analysis History
├─ WebSocket Handlers           ├─ Export Features
└─ End-to-End Backend           └─ Full Integration

Deliverable: Complete API       Deliverable: Complete UI
```

---

## 🔗 Integration Points

### Week 2 Integration
**Backend → Frontend**: `POST /analyze` endpoint ready
**Action**: Replace mock API with real endpoint

### Week 3 Integration
**Backend → Frontend**: `GET /analysis/{id}` with all results
**Action**: Integrate real data into dashboard

### Week 4 Integration
**Backend → Frontend**: WebSocket notifications working
**Action**: Connect live updates and interview

---

## 📊 Progress Tracking

### Week 1 Success Criteria
- ✅ AWS infrastructure operational
- ✅ React app with authentication
- ✅ Repository processor working
- ✅ API contract finalized

### Week 2 Success Criteria
- ✅ Stage 1 complete (< 30 seconds)
- ✅ Repository submission working
- ✅ Progress tracking functional
- ✅ First integration test passing

### Week 3 Success Criteria
- ✅ Stages 2 & 3 complete
- ✅ Results dashboard with all data
- ✅ Interview Q&A working
- ✅ WebSocket notifications

### Week 4 Success Criteria
- ✅ Full backend pipeline operational
- ✅ Complete frontend integrated
- ✅ End-to-end flow working
- ✅ Ready for demo

---

## 🚨 Critical Blockers

### Person 1 Cannot Start Until:
- AWS account configured
- Bedrock access approved
- DynamoDB tables created
- API contract defined

### Person 2 Cannot Start Until:
- Cognito configured
- API contract defined
- Mock API available
- Shared types defined

### Both Cannot Integrate Until:
- API endpoints deployed
- WebSocket protocol implemented
- Data models finalized
- Testing environment ready

---

## 📞 Communication

### Daily Standup (15 min @ 10:00 AM)
- What did you complete?
- What are you working on?
- Any blockers?

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

## 🎯 Scope Reduction Strategy (If Behind)

### Priority 1 (Must Have)
- Stage 1: Project Review
- Basic repository submission
- Results display
- Simple interview Q&A

### Priority 2 (Should Have)
- Stage 2: Intelligence Report
- Stage 3: Interview Questions
- Answer evaluation
- Progress tracking

### Priority 3 (Nice to Have)
- Live Mock Interview
- Export functionality
- Analysis history
- Adaptive Learning Path

**If behind schedule**: Drop Priority 3, then Priority 2 items

---

## 📁 Key Documents

1. **team-division.md** - Full detailed plan
2. **prerequisites-checklist.md** - Setup checklist
3. **api-contract.yaml** - API specification (TO CREATE)
4. **websocket-protocol.md** - WebSocket spec (TO CREATE)
5. **shared-types.ts** - Data models (TO CREATE)

---

## 🔧 Quick Commands

### Person 1 (Backend)
```bash
# Deploy Lambda
aws lambda update-function-code --function-name repo-processor

# Test Bedrock
aws bedrock-runtime invoke-model --model-id claude-3-5-haiku

# Check logs
aws logs tail /aws/lambda/repo-processor --follow
```

### Person 2 (Frontend)
```bash
# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## ⏱️ Timeline Summary

```
Day 0-3:   Prerequisites (Together)
Week 1-4:  Parallel Development
Week 5:    Integration & Testing
Week 6:    Demo Preparation

Total: ~6 weeks to MVP
```

---

## ✅ Ready to Start Checklist

Before starting parallel work, confirm:

- [ ] All prerequisites complete (see checklist)
- [ ] Both developers have access to all systems
- [ ] API contract signed off by both
- [ ] Mock data available for frontend
- [ ] Communication channels set up
- [ ] First week tasks clearly understood
- [ ] Blockers escalation path defined

**If all checked**: 🚀 START PARALLEL DEVELOPMENT!

---

## 🆘 Emergency Contacts

**AWS Issues**: [Support Contact]
**Bedrock Issues**: [Support Contact]
**Git Issues**: [Admin Contact]
**Team Blocker**: Schedule immediate sync

---

**Document Version**: 1.0  
**Last Updated**: [Date]  
**Status**: Ready for Review