# DevContext.AI Frontend Implementation Plan

**Created**: February 28, 2026  
**Status**: Active Development  
**Overall Progress**: ~55% complete

---

## Executive Summary

This document consolidates requirements from `FRONTEND-COMPONENTS.md`, `FRONTEND-CHANGES-REQUIRED.txt`, and `mock-backend.ts` into a single actionable implementation plan.

### What's Done ✅

- Landing Page (public marketing page)
- Profile Setup Page (onboarding)
- Loading Page (progressive workflow with decision points)
- Core authentication (Login, Signup, Protected Routes)
- Dashboard with tabs (Overview, Review, Report, Interview, History)
- File Explorer component
- Basic routing structure (`/`, `/login`, `/signup`, `/setup`, `/app/*`)

### What's Next 🔄

- Interactive Interview Session flow
- User Stats & Settings
- Export functionality
- Enhanced visualization components

---

## Architecture Overview

### Route Structure (Implemented)

```
PUBLIC ROUTES
├── /                    → LandingPage ✅
├── /login               → LoginPage ✅
├── /signup              → SignupPage ✅
└── /setup               → ProfileSetupPage ✅ (protected, no sidebar)

PROTECTED ROUTES (require auth)
├── /app                 → HomePage ✅
├── /app/loading         → LoadingPage ✅
├── /app/dashboard       → DashboardPage ✅
├── /app/settings        → SettingsPage ⬜
└── /app/account         → AccountPage ⬜
```

### Backend API Endpoints (Mock Server: localhost:3000)

| Category      | Endpoint                               | Status   |
| ------------- | -------------------------------------- | -------- |
| **Analysis**  | POST /analyze                          | ✅ Ready |
|               | GET /analyses                          | ✅ Ready |
|               | GET /analysis/{id}                     | ✅ Ready |
|               | GET /analysis/{id}/status              | ✅ Ready |
|               | POST /analysis/{id}/continue-stage2    | ✅ Ready |
|               | POST /analysis/{id}/continue-stage3    | ✅ Ready |
|               | POST /analysis/{id}/export             | ✅ Ready |
| **User**      | GET /user/profile                      | ✅ Ready |
|               | POST /user/profile                     | ✅ Ready |
|               | PATCH /user/preferences                | ✅ Ready |
|               | GET /user/stats                        | ✅ Ready |
|               | GET /user/progress                     | ✅ Ready |
| **Interview** | POST /interview/sessions               | ✅ Ready |
|               | GET /interview/sessions/{id}           | ✅ Ready |
|               | POST /interview/sessions/{id}/answer   | ✅ Ready |
|               | POST /interview/sessions/{id}/complete | ✅ Ready |

---

## Implementation Phases

### Phase 1: HIGH PRIORITY - Core UX ⚡

| #   | Component                   | File                                | Status  | Effort | Dependencies                   |
| --- | --------------------------- | ----------------------------------- | ------- | ------ | ------------------------------ |
| 1.1 | ~~LandingPage~~             | pages/LandingPage.tsx               | ✅ Done | -      | -                              |
| 1.2 | ~~ProfileSetupPage~~        | pages/ProfileSetupPage.tsx          | ✅ Done | -      | POST /user/profile             |
| 1.3 | ~~LoadingPage Progressive~~ | pages/LoadingPage.tsx               | ✅ Done | -      | GET /status, POST /continue-\* |
| 1.4 | **InterviewTab Rewrite**    | dashboard/InterviewTab.tsx          | ⬜ TODO | 4h     | POST /interview/sessions       |
| 1.5 | **AnswerEvaluationPanel**   | dashboard/AnswerEvaluationPanel.tsx | ⬜ TODO | 3h     | POST /answer response          |
| 1.6 | **InterviewSummaryPanel**   | dashboard/InterviewSummaryPanel.tsx | ⬜ TODO | 2h     | POST /complete response        |

**InterviewTab Rewrite Requirements:**

```typescript
// New workflow:
1. [Start Interview Session] button → POST /interview/sessions
2. Show questions one-by-one with timer
3. Submit answer → POST /sessions/{id}/answer → Show AnswerEvaluationPanel
4. [Next Question] → repeat until done
5. [Complete] → POST /sessions/{id}/complete → Show InterviewSummaryPanel

// State management needed:
- sessionId: string | null
- currentQuestionIndex: number
- answers: Map<questionId, { answer, evaluation }>
- sessionComplete: boolean
- timeSpent: number (per question)
```

**AnswerEvaluationPanel Props:**

```typescript
interface AnswerEvaluationProps {
  evaluation: {
    overallScore: number; // 0-100
    criteriaScores: {
      technicalAccuracy: number; // 0-100
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
      yourAnswerCategory: "weak" | "acceptable" | "strong";
    };
    feedback: string;
    improvementSuggestions: string[];
  };
  onNext: () => void;
}
```

---

### Phase 2: MEDIUM PRIORITY - User Management 👤

| #   | Component              | File                          | Status  | Effort | Dependencies                |
| --- | ---------------------- | ----------------------------- | ------- | ------ | --------------------------- |
| 2.1 | **UserStatsPanel**     | components/UserStatsPanel.tsx | ⬜ TODO | 1h     | GET /user/stats             |
| 2.2 | **HomePage + Stats**   | pages/HomePage.tsx            | ⬜ TODO | 1h     | UserStatsPanel              |
| 2.3 | **SettingsPage**       | pages/SettingsPage.tsx        | ⬜ TODO | 2h     | GET/PATCH /user/preferences |
| 2.4 | **AccountPage**        | pages/AccountPage.tsx         | ⬜ TODO | 2h     | GET /user/profile           |
| 2.5 | **Sidebar Navigation** | components/Sidebar.tsx        | ⬜ TODO | 1h     | Add Settings/Account icons  |

**UserStatsPanel Props:**

```typescript
interface UserStatsProps {
  stats: {
    totalAnalyses: number;
    averageCodeQuality: number;
    totalInterviewSessions: number;
    averageInterviewScore: number;
    lastAnalysisDate: string;
    lastInterviewDate: string;
  };
}
// Display as 4 stat cards with icons
```

**SettingsPage Fields:**

```
- Target Role (dropdown)
- Preferred Language (English / Hinglish)
- Email Notifications (toggle)
- Email Digest (toggle)
[Save Changes] button → PATCH /user/preferences
```

**AccountPage Fields:**

```
- Email (read-only)
- Display Name (read-only)
- Subscription Tier (read-only)
- Analysis Quota: {used}/{total}
- Reset Date
[Change Password] → Cognito flow
[Delete Account] → Confirmation dialog
```

---

### Phase 3: LOW PRIORITY - Enhanced Features 📊

| #   | Component                    | File                                   | Status  | Effort | Dependencies                 |
| --- | ---------------------------- | -------------------------------------- | ------- | ------ | ---------------------------- |
| 3.1 | **EmployabilitySignalPanel** | dashboard/EmployabilitySignalPanel.tsx | ⬜ TODO | 2h     | Part of OverviewTab          |
| 3.2 | **SkillProgressionPanel**    | dashboard/SkillProgressionPanel.tsx    | ⬜ TODO | 3h     | GET /user/progress           |
| 3.3 | **HistoryTab + Progress**    | dashboard/HistoryTab.tsx               | ⬜ TODO | 2h     | SkillProgressionPanel        |
| 3.4 | **ExportDropdown**           | components/ExportDropdown.tsx          | ⬜ TODO | 2h     | POST /analysis/{id}/export   |
| 3.5 | **DashboardPage Tabs**       | pages/DashboardPage.tsx                | ⬜ TODO | 1h     | Conditional tab availability |

**EmployabilitySignalPanel Props:**

```typescript
interface EmployabilityProps {
  employabilitySignal: {
    overall: number;
    productionReadiness: number;
    professionalStandards: number;
    complexity: "low" | "medium" | "high";
    companyTierMatch: {
      bigTech: number; // FAANG score
      productCompanies: number;
      startups: number;
      serviceCompanies: number;
    };
  };
}
// Display with progress bars for each tier
```

**SkillProgressionPanel Props:**

```typescript
interface SkillProgressionProps {
  progress: {
    improvementTrend: Array<{
      date: string;
      metric: string;
      value: number;
    }>;
    identifiedSkillGaps: Array<{
      skill: string;
      currentLevel: number;
      targetLevel: number;
      priority: "high" | "medium" | "low";
      learningResources: string[];
    }>;
    recommendedTopics: string[];
    completedTopics: string[];
    categoryPerformance: {
      architecture: { averageScore: number; trend: string };
      implementation: { averageScore: number; trend: string };
      tradeoffs: { averageScore: number; trend: string };
      scalability: { averageScore: number; trend: string };
    };
  };
}
// Display trend chart + skill gap cards
```

---

### Phase 4: POLISH - Auth Enhancements 🔐

| #   | Component                 | File                               | Status  | Effort |
| --- | ------------------------- | ---------------------------------- | ------- | ------ |
| 4.1 | ForgotPasswordPage        | pages/ForgotPasswordPage.tsx       | ⬜ TODO | 1h     |
| 4.2 | ResetPasswordPage         | pages/ResetPasswordPage.tsx        | ⬜ TODO | 1h     |
| 4.3 | EmailVerificationPage     | pages/EmailVerificationPage.tsx    | ⬜ TODO | 1h     |
| 4.4 | GitHubConnectButton       | components/GitHubConnectButton.tsx | ⬜ TODO | 2h     |
| 4.5 | Password Show/Hide Toggle | Shared input component             | ⬜ TODO | 0.5h   |

---

### Phase 5: POLISH - UI Enhancements 🎨

| #   | Component           | File                         | Status  | Effort |
| --- | ------------------- | ---------------------------- | ------- | ------ |
| 5.1 | Toast Notifications | components/Toast.tsx         | ⬜ TODO | 2h     |
| 5.2 | ErrorBoundary       | components/ErrorBoundary.tsx | ⬜ TODO | 1h     |
| 5.3 | ErrorPage (404/500) | pages/ErrorPage.tsx          | ⬜ TODO | 1h     |
| 5.4 | ConfirmDialog       | components/ConfirmDialog.tsx | ⬜ TODO | 1h     |
| 5.5 | Skeleton Loaders    | components/Skeleton.tsx      | ⬜ TODO | 1h     |
| 5.6 | EmptyState          | components/EmptyState.tsx    | ⬜ TODO | 1h     |

---

## API Service Layer

Create `src/services/api.ts`:

```typescript
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3000";

// Analysis
export const startAnalysis = (repositoryUrl: string) =>
  fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repositoryUrl }),
  }).then((r) => r.json());

export const getAnalysisStatus = (analysisId: string) =>
  fetch(`${API_BASE}/analysis/${analysisId}/status`).then((r) => r.json());

export const getAnalysis = (analysisId: string) =>
  fetch(`${API_BASE}/analysis/${analysisId}`).then((r) => r.json());

export const continueToStage2 = (analysisId: string) =>
  fetch(`${API_BASE}/analysis/${analysisId}/continue-stage2`, {
    method: "POST",
  }).then((r) => r.json());

export const continueToStage3 = (analysisId: string) =>
  fetch(`${API_BASE}/analysis/${analysisId}/continue-stage3`, {
    method: "POST",
  }).then((r) => r.json());

export const exportAnalysis = (
  analysisId: string,
  format: "pdf" | "markdown",
) =>
  fetch(`${API_BASE}/analysis/${analysisId}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format }),
  }).then((r) => r.json());

// User
export const getUserProfile = () =>
  fetch(`${API_BASE}/user/profile`).then((r) => r.json());

export const createUserProfile = (data: any) =>
  fetch(`${API_BASE}/user/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const updateUserPreferences = (data: any) =>
  fetch(`${API_BASE}/user/preferences`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const getUserStats = () =>
  fetch(`${API_BASE}/user/stats`).then((r) => r.json());

export const getUserProgress = () =>
  fetch(`${API_BASE}/user/progress`).then((r) => r.json());

// Interview
export const createInterviewSession = (data: {
  analysisId: string;
  config?: any;
}) =>
  fetch(`${API_BASE}/interview/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const getInterviewSession = (sessionId: string) =>
  fetch(`${API_BASE}/interview/sessions/${sessionId}`).then((r) => r.json());

export const submitAnswer = (
  sessionId: string,
  data: { questionId: string; answer: string; timeSpentSeconds: number },
) =>
  fetch(`${API_BASE}/interview/sessions/${sessionId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());

export const completeInterviewSession = (sessionId: string) =>
  fetch(`${API_BASE}/interview/sessions/${sessionId}/complete`, {
    method: "POST",
  }).then((r) => r.json());
```

---

## Testing Checklist

### Progressive Workflow ✅

- [x] Visit `/` → See landing page (not login)
- [x] Click "Get Started" → Go to signup
- [x] Complete signup → Redirected to `/setup`
- [x] Complete profile → Redirected to `/app`
- [x] Submit repo URL → LoadingPage shows Stage 1 running
- [x] Stage 1 completes → See decision buttons
- [ ] Click "Continue to Intelligence Report" → Stage 2 starts
- [ ] Stage 2 completes → See "Start Interview" button
- [ ] Click "Start Interview" → Stage 3 starts
- [ ] All complete → Redirect to dashboard

### Interview Session (TODO)

- [ ] Click "Start Interview Session" → Session created
- [ ] Answer question → Submit → See evaluation
- [ ] Evaluation shows 4 criteria scores
- [ ] Evaluation shows weak vs strong comparison
- [ ] Click "Next Question" → Next question appears
- [ ] Complete all questions → See summary
- [ ] Summary shows category performance

### User Management (TODO)

- [ ] HomePage shows user stats
- [ ] Settings page allows preference updates
- [ ] Account page shows quota info
- [ ] Sidebar has Settings/Account links

---

## File Structure (Target)

```
src/
├── components/
│   ├── Sidebar.tsx ✅
│   ├── ProtectedRoute.tsx ✅
│   ├── UserStatsPanel.tsx ⬜
│   ├── ExportDropdown.tsx ⬜
│   ├── Toast.tsx ⬜
│   ├── ErrorBoundary.tsx ⬜
│   ├── ConfirmDialog.tsx ⬜
│   ├── Skeleton.tsx ⬜
│   ├── EmptyState.tsx ⬜
│   └── dashboard/
│       ├── FileExplorer.tsx ✅
│       ├── OverviewTab.tsx ✅
│       ├── ReviewTab.tsx ✅
│       ├── ReportTab.tsx ✅
│       ├── InterviewTab.tsx ✅ (needs rewrite)
│       ├── HistoryTab.tsx ✅
│       ├── AnswerEvaluationPanel.tsx ⬜
│       ├── InterviewSummaryPanel.tsx ⬜
│       ├── EmployabilitySignalPanel.tsx ⬜
│       └── SkillProgressionPanel.tsx ⬜
├── pages/
│   ├── LandingPage.tsx ✅
│   ├── LoginPage.tsx ✅
│   ├── SignupPage.tsx ✅
│   ├── ProfileSetupPage.tsx ✅
│   ├── HomePage.tsx ✅
│   ├── LoadingPage.tsx ✅
│   ├── DashboardPage.tsx ✅
│   ├── SettingsPage.tsx ⬜
│   ├── AccountPage.tsx ⬜
│   ├── ForgotPasswordPage.tsx ⬜
│   └── ErrorPage.tsx ⬜
├── services/
│   └── api.ts ⬜
├── contexts/
│   └── AuthContext.tsx ✅
├── styles.css ✅
└── App.tsx ✅
```

---

## Estimated Timeline

| Phase     | Components                              | Effort         | Priority |
| --------- | --------------------------------------- | -------------- | -------- |
| Phase 1   | InterviewTab, AnswerEvaluation, Summary | 9 hours        | HIGH     |
| Phase 2   | UserStats, Settings, Account, Sidebar   | 7 hours        | MEDIUM   |
| Phase 3   | Employability, SkillProgression, Export | 10 hours       | LOW      |
| Phase 4   | Auth enhancements                       | 5.5 hours      | LOW      |
| Phase 5   | UI polish components                    | 7 hours        | LOW      |
| **Total** |                                         | **38.5 hours** |          |

---

## Next Steps (Recommended Order)

1. **Create `services/api.ts`** - Centralize all API calls
2. **Rewrite `InterviewTab.tsx`** - Full session workflow
3. **Create `AnswerEvaluationPanel.tsx`** - Answer feedback display
4. **Create `InterviewSummaryPanel.tsx`** - Session complete screen
5. **Create `UserStatsPanel.tsx`** - Stats display cards
6. **Update `HomePage.tsx`** - Add UserStatsPanel
7. **Create `SettingsPage.tsx`** - User preferences
8. **Create `AccountPage.tsx`** - Profile & quota display
9. **Update `Sidebar.tsx`** - Add Settings/Account navigation

---

## Design System Reference

All components must use these CSS variables from `styles.css`:

```css
--bg: #f2f2f0 /* Page background */ --surface: #ffffff /* Card background */
  --surface2: #f8f8f7 /* Secondary surface */ --border: #e8e8e6
  /* Light border */ --border2: #dedede /* Medium border */ --accent: #5b4fe9
  /* Primary accent (purple) */ --accent-light: #eef0ff
  /* Light accent background */ --accent-hover: #4a3fd4 /* Accent hover state */
  --text: #1a1a1a /* Primary text */ --text2: #6b6b6b /* Secondary text */
  --text3: #ababab /* Tertiary text */ --radius: 16px /* Large border radius */
  --radius-sm: 10px /* Small border radius */ --shadow: 0 1px 3px...
  /* Light shadow */ --shadow-lg: 0 2px 8px.. /* Large shadow */;
```

Button classes: `.btn-accent`, `.btn-secondary`, `.btn-ghost`
Chip classes: `.chip.green`, `.chip.amber`, `.chip.blue`, `.chip.neutral`
Panel class: `.panel` with `.panel-head` and `.panel-body`
