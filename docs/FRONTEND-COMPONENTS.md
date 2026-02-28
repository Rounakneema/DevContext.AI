# Frontend UI Components Specification

## Overview

This document lists all frontend UI components required for DevContext.AI, mapped to backend API endpoints and features defined in `design.md` and `requirements.md`.

### Implementation Status Legend

- ✅ Implemented
- ⬜ Not Implemented
- 🔄 Partial

### Implementation Summary

| Category           | Implemented | Partial | Not Started | Total  |
| ------------------ | ----------- | ------- | ----------- | ------ |
| Landing Page (NEW) | 0           | 0       | 6           | 6      |
| Core Layout        | 2           | 1       | 1           | 4      |
| Authentication     | 3           | 0       | 4           | 7      |
| Home Page          | 3           | 0       | 1           | 4      |
| Loading/Progress   | 2           | 2       | 0           | 4      |
| Dashboard          | 3           | 0       | 0           | 3      |
| Overview Tab       | 5           | 0       | 0           | 5      |
| Review Tab         | 5           | 0       | 1           | 6      |
| Report Tab         | 6           | 1       | 0           | 7      |
| Interview Tab      | 2           | 0       | 6           | 8      |
| History Tab        | 1           | 0       | 2           | 3      |
| Export             | 0           | 0       | 2           | 2      |
| Settings/Account   | 0           | 0       | 3           | 3      |
| Error/Feedback     | 0           | 0       | 5           | 5      |
| Shared UI          | 4           | 3       | 6           | 13     |
| Data Viz           | 1           | 0       | 4           | 5      |
| **TOTAL**          | **37**      | **7**   | **41**      | **85** |

**Overall Progress: ~52% complete**

---

## 0. Landing Page (Public)

### 0.1 LandingPage ⬜

**Purpose**: Public marketing/introduction page shown to unauthenticated visitors
**Route**: `/` (root)
**Backend Dependency**: None
**Features**:

- Hero section with tagline and CTA
- Product description / value proposition
- Feature highlights (3-4 cards)
- How it works section (steps)
- "Try It Now" / "Get Started" button → navigates to `/login`
- "Login" link in header for returning users
- Footer with links

### 0.2 LandingHeader ⬜

**Purpose**: Navigation header for landing page
**Features**:

- Logo (links to `/`)
- Navigation links (Features, How It Works, Pricing)
- "Login" button
- "Sign Up" / "Get Started" button (accent)

### 0.3 HeroSection ⬜

**Purpose**: Main banner with call-to-action
**Features**:

- Large headline: "Turn Your GitHub Projects Into Interview-Ready Stories"
- Subheadline explaining the value
- Primary CTA button: "Analyze Your First Project"
- Secondary CTA: "See Demo"
- Hero image/illustration (code analysis visual)

### 0.4 FeatureCard ⬜

**Purpose**: Highlight individual features
**Features**:

- Icon
- Feature title
- Description text
- Optional "Learn more" link

### 0.5 HowItWorksSection ⬜

**Purpose**: Step-by-step explainer
**Features**:

- Step 1: Paste GitHub URL
- Step 2: Get AI Analysis (30 seconds)
- Step 3: Practice Interview Questions
- Step 4: Ace Your Interview
- Visual timeline/flow

### 0.6 LandingFooter ⬜

**Purpose**: Footer with links
**Features**:

- Logo
- Navigation links
- Social links
- Copyright
- Privacy Policy / Terms links

---

## 1. Core Layout Components

### 1.1 AppShell ✅

**Purpose**: Main application wrapper with sidebar and content area
**Backend Dependency**: None (layout only)
**File**: `App.tsx`

```
├── Sidebar (navigation)
├── MainContent (page content)
└── ToastContainer (notifications) ⬜
```

### 1.2 Sidebar ✅

**Purpose**: Primary navigation
**File**: `components/Sidebar.tsx`
**Features**:

- Logo with home link ✅
- Navigation buttons (Home, Dashboard, History, Settings, Account) 🔄
- Active state indicator ✅
- Collapsed/expanded states (responsive) ⬜

### 1.3 TopBar ⬜ _(optional)_

**Purpose**: Contextual actions for current page
**Features**:

- Page title
- Export buttons (PDF, Markdown)
- Settings dropdown

---

## 2. Authentication Components

### 2.1 LoginPage ✅ ✅

**Purpose**: User authentication
**File**: `pages/LoginPage.tsx`
**Backend API**: `POST /auth/login` via AWS Cognito
**Features**:

- Email input with validation ✅
- Password input with show/hide toggle ⬜
- "Remember me" checkbox ⬜
- Login button with loading state ✅
- "Forgot password" link ⬜
- "Sign up" link ✅
- GitHub OAuth button ⬜
- Error message display ✅

### 2.2 SignupPage ✅

**Purpose**: User registration
**File**: `pages/SignupPage.tsx`
**Backend API**: `POST /auth/signup` via AWS Cognito
**Features**:

- Email input with validation ✅
- Password input with strength indicator ⬜
- Confirm password input ✅
- Terms & conditions checkbox ⬜
- Sign up button with loading state ✅
- "Already have account? Login" link ✅
- GitHub OAuth button ⬜
- Success message with email verification prompt ⬜

### 2.3 ForgotPasswordPage ⬜

**Purpose**: Password recovery
**Backend API**: Cognito `forgotPassword`
**Features**:

- Email input
- Submit button
- Success/error messages
- "Back to login" link

### 2.4 ResetPasswordPage

**Purpose**: Set new password from email link
**Backend API**: Cognito `confirmForgotPassword`
**Features**:

- New password input
- Confirm password input
- Submit button
- Validation messages

### 2.5 EmailVerificationPage ⬜

**Purpose**: Verify email after signup
**Backend API**: Cognito `confirmSignUp`
**Features**:

- Verification code input
- Resend code button
- Auto-redirect on success

### 2.6 GitHubConnectButton ⬜

**Purpose**: OAuth connection for private repos
**Backend API**: GitHub OAuth flow
**Features**:

- Connect/disconnect state
- GitHub username display when connected
- Permission scope explanation
- Revoke access option

### 2.7 ProtectedRoute ✅

**Purpose**: Route guard for authenticated pages
**File**: `components/ProtectedRoute.tsx`
**Features**:

- Redirect to login if unauthenticated ✅
- Loading spinner during auth check ✅

---

## 3. Home Page Components (Authenticated)

### 3.1 HomePage ✅

**Purpose**: Authenticated user's main page with repo input
**Route**: `/app` (after login)
**File**: `pages/HomePage.tsx`
**Backend API**: `POST /analyze`
**Features**:

- Greeting with user name ✅
- Repository URL input ✅
- Quick prompt cards ✅
- Recent analysis history (last 3) ⬜

### 3.2 RepoInputBox ✅ _(inline in HomePage)_

**Purpose**: Main input for GitHub URL
**Backend API**: `POST /analyze`
**Features**:

- URL text input with validation ✅
- Private repo toggle ⬜
- GitHub token input (conditional) ⬜
- Target role selector (optional) ⬜
- File attachment button (future) ⬜
- Submit button with loading state ✅
- Character count ✅
- Error messages ⬜

### 3.3 PromptCard ✅

**Purpose**: Quick action suggestions
**Features**:

- Icon ✅
- Prompt text ✅
- Click to auto-fill input ✅
- Hover animation ✅

### 3.4 TargetRoleSelector ⬜

**Purpose**: Select target job role
**Backend API**: Part of `POST /analyze` request
**Options**:

- Junior SDE
- Senior SDE
- DevOps Engineer
- Data Engineer
- Full Stack Developer

---

## 4. Loading & Progress Components

### 4.1 LoadingPage ✅

**Purpose**: Analysis progress display
**File**: `pages/LoadingPage.tsx`
**Backend API**: `GET /analysis/{id}/status` (polling) or WebSocket
**Features**:

- Repository cloning stage indicator ✅
- Stage 1 (Project Review) progress ✅
- Stage 2 (Intelligence Report) progress ✅
- Stage 3 (Interview Simulation) progress ✅
- Estimated time remaining ⬜
- Cancel button ⬜
- Auto-redirect on Stage 1 completion ⬜

### 4.2 StageIndicator ✅ _(inline in LoadingPage)_

**Purpose**: Individual stage status
**States**:

- Pending (gray)
- In Progress (animated, accent color)
- Completed (green checkmark)
- Failed (red X)
  **Features**:
- Stage name
- Status icon
- Elapsed time
- Error message (if failed)

### 4.3 ProgressBar 🔄

**Purpose**: Overall progress visualization
**Features**:

- Percentage fill ✅
- Animated transition ✅
- Color based on state ⬜

### 4.4 LoadingSpinner 🔄

**Purpose**: Generic loading indicator
**Variants**:

- Small (inline) ⬜
- Medium (button) ⬜
- Large (page/section) ✅ _(used in LoadingPage)_

---

## 5. Dashboard Page Components

### 5.1 DashboardPage ✅

**Purpose**: Main results container
**File**: `pages/DashboardPage.tsx`
**Backend API**: `GET /analysis/{id}`
**Features**:

- Tab navigation (Overview, Review, Report, Interview, History) ✅
- File explorer sidebar (Analysis tabs only) ✅
- Export buttons ⬜

### 5.2 DashboardSidebar ✅ _(inline in DashboardPage)_

**Purpose**: Secondary navigation for analysis
**Features**:

- Repository badge with name ✅
- Analysis section (Overview, Review, Report) ✅
- Practice section (Interview, History) ✅
- "New Analysis" button ✅

### 5.3 FileExplorer ✅

**Purpose**: IDE-like file browser for analyzed files
**File**: `components/dashboard/FileExplorer.tsx`
**Backend API**: Part of `GET /analysis/{id}` response
**Features**:

- Collapsible folder tree ✅
- File type icons (color-coded) ✅
- Click to select/deselect files ✅
- Drag to reorder priority ✅
- Selected file count (max 30) ✅
- Analysis queue panel ✅
- Over-budget warning ✅

---

## 6. Overview Tab Components

### 6.1 OverviewTab ✅

**Purpose**: Summary of all analysis results
**File**: `components/dashboard/OverviewTab.tsx`
**Backend API**: `GET /analysis/{id}` → `projectReview`
**Features**:

- Score cards row ✅
- Warning strip (if applicable) ✅
- Tech stack display ✅
- Strengths panel ✅
- Improvements panel ✅

### 6.2 ScoreCard ✅ _(inline in OverviewTab)_

**Purpose**: Display individual scores
**Variants**:

- Employability Signal (0-100)
- Code Quality (0-100)
- Authenticity Score (0-100)
  **Features**:
- Label
- Large score number (color-coded)
- Score description
- Progress bar fill

### 6.3 WarningStrip ✅ _(inline in OverviewTab)_

**Purpose**: Display authenticity warnings
**Backend API**: `projectReview.projectAuthenticity.warning`
**Features**:

- Warning icon ✅
- Warning message ✅
- Dismissible (optional) ⬜

### 6.4 TechStackDisplay ✅ _(inline in OverviewTab)_

**Purpose**: Show detected technologies
**Backend API**: `projectContextMap.frameworks`
**Features**:

- Tech tags (React, Node.js, etc.) ✅
- Language percentages ⬜
- "Auto-detected" badge ⬜

### 6.5 InsightPanel ✅ _(inline in OverviewTab)_

**Purpose**: Display strengths or improvements
**Features**:

- Panel header with title and count chip
- List of insight items
- Expandable details

### 6.6 InsightItem ✅

**Purpose**: Individual strength or improvement
**Features**:

- Status dot (green/amber/red) ✅
- Strong title ✅
- Description text ✅
- Code reference links (clickable) ⬜

---

## 7. Project Review Tab Components

### 7.1 ReviewTab ✅

**Purpose**: Detailed code quality analysis
**File**: `components/dashboard/ReviewTab.tsx`
**Backend API**: `GET /analysis/{id}` → `projectReview`
**Features**:

- Code quality breakdown ✅
- Architecture clarity section ✅
- Grounded code examples ✅
- Commit authenticity analysis ✅

### 7.2 CodeQualityBreakdown ✅ _(inline in ReviewTab)_

**Purpose**: Detailed quality metrics
**Backend API**: `projectReview.codeQuality`
**Features**:

- Readability score
- Maintainability score
- Best practices score
- Justification text

### 7.3 ArchitectureClarityPanel

**Purpose**: Component organization analysis
**Backend API**: `projectReview.architectureClarity`
**Features**:

- Score display
- Component organization description
- Separation of concerns analysis
- File reference examples

### 7.4 CodeBlockDisplay

**Purpose**: Show code snippets with context
**Features**:

- Syntax highlighting
- File path header
- Line numbers
- Copy button
- Click to expand

### 7.5 CommitAuthenticityPanel ✅ _(inline in ReviewTab)_

**Purpose**: Commit history analysis
**Backend API**: `projectReview.projectAuthenticity`
**Features**:

- Authenticity score ✅
- Commit count ✅
- Time spread analysis ✅
- Message quality assessment ✅
- Warning message (if bulk upload detected) ✅

### 7.6 ImprovementCard ✅

**Purpose**: Actionable improvement suggestion
**Backend API**: `projectReview.improvementAreas`
**Features**:

- Priority badge (high/medium/low) ✅
- Issue title ✅
- Description ✅
- Code example (expandable) ✅
- File references ✅

---

## 8. Intelligence Report Tab Components

### 8.1 ReportTab ✅

**Purpose**: AI-reconstructed architecture
**File**: `components/dashboard/ReportTab.tsx`
**Backend API**: `GET /analysis/{id}` → `intelligenceReport`
**Features**:

- System architecture overview ✅
- Component diagram (Mermaid) ✅
- Design decisions list ✅
- Technical trade-offs ✅
- Scalability analysis ✅
- Resume bullets ✅

### 8.2 ArchitectureDiagram 🔄 🔄

**Purpose**: Visual component diagram
**Backend API**: `intelligenceReport.systemArchitecture.componentDiagram`
**Features**:

- Mermaid diagram renderer ✅
- Zoom/pan controls ⬜
- Fullscreen toggle ⬜
- Export as PNG ⬜

### 8.3 DataFlowSection ✅ _(inline in ReportTab)_

**Purpose**: Data flow description
**Backend API**: `intelligenceReport.systemArchitecture.dataFlow`
**Features**:

- Flow description text
- Optional diagram
- File references

### 8.4 DesignDecisionCard ✅ _(inline in ReportTab)_

**Purpose**: Individual design decision
**Backend API**: `intelligenceReport.designDecisions[]`
**Features**:

- Decision title ✅
- Rationale text ✅
- Alternatives considered ✅
- Trade-offs summary ✅
- Grounding confidence badge ⬜
- File references ✅
- "Insufficient Evidence" handling ⬜

### 8.5 TradeoffTable ✅ _(inline in ReportTab)_

**Purpose**: Technical trade-offs display
**Backend API**: `intelligenceReport.technicalTradeoffs`
**Features**:

- Aspect name
- Pros list (green)
- Cons list (red)
- File references

### 8.6 ScalabilityPanel ✅ _(inline in ReportTab)_

**Purpose**: Growth analysis
**Backend API**: `intelligenceReport.scalabilityAnalysis`
**Features**:

- Bottlenecks list ✅
- Growth limitations ✅
- Optimization opportunities ✅

### 8.7 ResumeBulletsList ✅

**Purpose**: Copy-ready resume points
**Backend API**: `intelligenceReport.resumeBullets`
**Features**:

- 5-7 professional bullet points ✅
- Copy individual button ⬜
- Copy all button ⬜
- Edit inline (optional) ⬜

---

## 9. Interview Tab Components

### 9.1 InterviewTab ✅

**Purpose**: Interview simulation interface
**File**: `components/dashboard/InterviewTab.tsx`
**Backend API**:

- `GET /analysis/{id}` → `interviewSimulation`
- `POST /interview/{id}/answer`
  **Features**:
- Session configuration (before start) ⬜
- Live interview mode (during) ⬜
- Results summary (after) ⬜
- Question display with sample answers ✅

### 9.2 InterviewConfigPanel ⬜

**Purpose**: Configure interview session
**Features**:

- Number of questions selector
- Difficulty filter (Junior/Mid/Senior)
- Category filter (Architecture/Implementation/Trade-offs/Scalability)
- Time limit toggle
- Start button

### 9.3 QuestionCard ✅ _(inline in InterviewTab)_

**Purpose**: Display interview question
**Backend API**: `interviewSimulation.questions[]`
**Features**:

- Question number ✅
- Question text ✅
- Category badge ✅
- Difficulty badge ✅
- File references (clickable) ✅
- Expected topics (hidden until answered) ✅

### 9.4 AnswerTextarea ⬜

**Purpose**: User answer input
**Backend API**: Input for `POST /interview/{id}/answer`
**Features**:

- Multi-line text area
- Character count
- Auto-save draft
- Timer display (if timed)
- Submit button
- Skip button

### 9.5 AnswerEvaluationPanel ⬜ ⬜

**Purpose**: Display answer feedback
**Backend API**: `POST /interview/{id}/answer` → `AnswerEvaluation`
**Features**:

- Score display (0-100)
- Criteria breakdown (accuracy, completeness, clarity)
- Strengths list (green)
- Weaknesses list (amber)
- Missing points list
- Example answer (collapsible)
- Key terms (chips)
- Actionable feedback
- "Next Question" button

### 9.6 LiveInterviewMode ⬜

**Purpose**: Real-time mock interview
**Backend API**: WebSocket `/interview/{id}/live`
**Features**:

- Conversation thread display
- Real-time typing indicator
- Instant feedback after each answer
- Follow-up questions
- Voice input button (future)
- Pause/Resume buttons
- End interview button

### 9.7 InterviewSummaryPanel ⬜

**Purpose**: Post-interview results
**Backend API**: `SessionEvaluation`
**Features**:

- Overall score
- Category score breakdown (radar chart)
- Key strengths
- Key weaknesses
- Improvement areas
- Transcript download
- "Practice Again" button

### 9.8 ImprovementTrajectoryChart ⬜

**Purpose**: Score trends over sessions
**Backend API**: `ImprovementTrajectory`
**Features**:

- Line chart of scores over time
- Session markers
- Trend indicator (improving/stable/declining)
- Strong/weak categories summary

---

## 10. History Tab Components

### 10.1 HistoryTab ✅

**Purpose**: Past analyses and interviews
**File**: `components/dashboard/HistoryTab.tsx`
**Backend API**: `GET /analysis/history`
**Features**:

- Analysis list ✅ (mock data)
- Filter by date/score ⬜
- Search by repo name ⬜
- Skill progression panel ⬜

### 10.2 HistoryItem ✅ _(inline in HistoryTab)_

**Purpose**: Individual analysis entry
**Features**:

- Repository name
- Analysis date
- File count
- Employability score
- Interview count
- Click to view details
- Delete option

### 10.3 SkillProgressionPanel ⬜

**Purpose**: Improvement over time
**Backend API**: Aggregated from history
**Features**:

- Overall trend chart
- Category breakdowns
- Strongest improving area
- Areas needing focus

---

## 11. Export Components

### 11.1 ExportDropdown ⬜

**Purpose**: Export options menu
**Backend API**: `POST /export/{id}`
**Features**:

- PDF export button
- Markdown export button
- Loading state per option
- Success/error toast

### 11.2 PDFPreviewModal ⬜

**Purpose**: Preview before download
**Features**:

- PDF viewer
- Download button
- Cancel button
- Page navigation

---

## 12. Settings & Account Components

### 12.1 SettingsPage ⬜

**Purpose**: User preferences
**Features**:

- Target role default
- Theme toggle (light/dark - future)
- Notification preferences
- GitHub connection management

### 12.2 AccountPage ⬜

**Purpose**: User profile management
**Features**:

- Email display
- Change password
- Connected GitHub account
- Analysis count / quota
- Delete account

### 12.3 QuotaDisplay ⬜

**Purpose**: Show analysis usage
**Backend API**: User attributes
**Features**:

- Analyses used today (X/10)
- Progress bar
- Reset time countdown

---

## 13. Error & Feedback Components

### 13.1 ErrorBoundary ⬜

**Purpose**: Catch React errors
**Features**:

- Friendly error message
- "Try again" button
- Report issue link

### 13.2 ErrorPage ⬜

**Purpose**: Full-page error display
**Variants**:

- 404 Not Found
- 500 Server Error
- Rate Limited
- Maintenance Mode
  **Features**:
- Error icon
- Message
- Action button (home/retry)

### 13.3 Toast ⬜

**Purpose**: Notification alerts
**Variants**:

- Success (green)
- Error (red)
- Warning (amber)
- Info (blue)
  **Features**:
- Icon
- Message
- Auto-dismiss (configurable)
- Manual dismiss button

### 13.4 ConfirmDialog ⬜

**Purpose**: Confirmation prompts
**Features**:

- Title
- Message
- Confirm button (destructive style)
- Cancel button

### 13.5 EmptyState ⬜

**Purpose**: No data display
**Variants**:

- No analyses yet
- No interview history
- No results found
  **Features**:
- Illustration
- Message
- Action button

---

## 14. Shared UI Components

_Note: Most shared UI components are implemented inline. Consider extracting to a component library._

### 14.1 Button 🔄

**Variants**:

- Primary (accent fill) ✅
- Secondary (outline) ✅
- Ghost (no border) 🔄
- Destructive (red) ⬜
  **States**: Default, hover, active, disabled, loading

### 14.2 Input 🔄

**Variants**:

- Text ✅
- URL (with validation) ⬜
- Password (with toggle) ⬜
- Textarea ✅
  **Features**: Label, placeholder, error message 🔄, character count ✅

### 14.3 Select ⬜

**Features**: Dropdown options, search, multi-select variant

### 14.4 Checkbox

**Features**: Label, indeterminate state

### 14.5 Toggle

**Features**: On/off states, label

### 14.6 Badge/Chip ✅

**Variants**: Colored (green/amber/blue/neutral) ✅, size (sm/md) ✅

### 14.7 Tag ✅

**Variants**: Tech tag, accent tag

### 14.8 Tabs ✅

**Features**: Active indicator ✅, click handler ✅, accessible ⬜

### 14.9 Modal ⬜

**Features**: Backdrop, close button, header/body/footer sections

### 14.10 Tooltip ⬜

**Features**: Hover trigger, position (top/bottom/left/right)

### 14.11 Accordion ✅ _(used in InterviewTab)_

**Features**: Expand/collapse ✅, multiple or single open ✅

### 14.12 Avatar ⬜

**Features**: User initials or image, fallback

### 14.13 Skeleton ⬜

**Purpose**: Loading placeholder
**Variants**: Text, card, list, table

---

## 15. Data Visualization Components

### 15.1 ScoreGauge ⬜

**Purpose**: Circular score display
**Features**: Animated fill, color based on value

### 15.2 BarChart ⬜

**Purpose**: Category score comparison
**Features**: Horizontal bars, labels, values

### 15.3 LineChart ⬜

**Purpose**: Score trends over time
**Features**: Multiple series, tooltips, axis labels

### 15.4 RadarChart ⬜

**Purpose**: Category skills overview
**Features**: Multi-axis, filled area

### 15.5 MermaidRenderer ✅ _(used in ReportTab)_

**Purpose**: Render architecture diagrams
**Features**: Parse Mermaid syntax ✅, SVG output ✅

---

## Route Structure

### Current Routes (need update)

```
/login          → LoginPage (public)
/signup         → SignupPage (public)
/               → HomePage (protected) ← needs to move
/loading        → LoadingPage (protected)
/dashboard      → DashboardPage (protected)
```

### Proposed Routes (with Landing Page)

```
/               → LandingPage (public)     ← NEW
/login          → LoginPage (public)
/signup         → SignupPage (public)
/forgot-password → ForgotPasswordPage (public)    ← NEW
/reset-password  → ResetPasswordPage (public)     ← NEW
/verify-email    → EmailVerificationPage (public) ← NEW
/app            → HomePage (protected)    ← MOVED from /
/app/loading    → LoadingPage (protected)
/app/dashboard  → DashboardPage (protected)
/app/settings   → SettingsPage (protected)        ← NEW
/app/account    → AccountPage (protected)         ← NEW
```

---

## Component-to-API Mapping Summary

| Component            | API Endpoint             | Method     | Status |
| -------------------- | ------------------------ | ---------- | ------ |
| LandingPage          | None                     | -          | ⬜     |
| RepoInputBox         | `/analyze`               | POST       | ✅     |
| LoadingPage          | `/analysis/{id}/status`  | GET (poll) | ✅     |
| DashboardPage        | `/analysis/{id}`         | GET        | ✅     |
| AnswerTextarea       | `/interview/{id}/answer` | POST       | ⬜     |
| LiveInterviewMode    | `/interview/{id}/live`   | WebSocket  | ⬜     |
| HistoryTab           | `/analysis/history`      | GET        | ✅     |
| ExportDropdown       | `/export/{id}`           | POST       | ⬜     |
| HistoryItem (delete) | `/analysis/{id}`         | DELETE     | ⬜     |
| LoginPage            | Cognito                  | SDK        | ✅     |
| SignupPage           | Cognito                  | SDK        | ✅     |
| GitHubConnectButton  | GitHub OAuth             | External   | ⬜     |

---

## Priority Implementation Order

### Phase 0: Landing Page ⬜ NEW

1. LandingPage, LandingHeader, HeroSection
2. FeatureCard, HowItWorksSection, LandingFooter
3. Update route structure (`/` → Landing, `/app` → HomePage)

### Phase 1: MVP Core ✅ DONE

1. ~~AppShell, Sidebar~~
2. ~~LoginPage, SignupPage, ProtectedRoute~~
3. ~~HomePage, RepoInputBox~~
4. ~~LoadingPage, StageIndicator~~
5. ~~DashboardPage, DashboardSidebar~~
6. ~~OverviewTab, ScoreCard, InsightPanel~~
7. Toast, ErrorBoundary ⬜

### Phase 2: Analysis Details ✅ DONE

8. ~~ReviewTab, CodeBlockDisplay~~
9. ~~ReportTab, ArchitectureDiagram~~
10. ~~FileExplorer~~
11. ExportDropdown ⬜

### Phase 3: Interview Features 🔄 IN PROGRESS

12. ~~InterviewTab, QuestionCard~~ ✅
13. AnswerTextarea, AnswerEvaluationPanel ⬜
14. InterviewSummaryPanel ⬜

### Phase 4: Live Interview ⬜ NOT STARTED

15. LiveInterviewMode
16. ImprovementTrajectoryChart

### Phase 5: History & Settings 🔄 PARTIAL

17. ~~HistoryTab~~ ✅, HistoryItem filters ⬜
18. SettingsPage, AccountPage ⬜

### Phase 6: Polish ⬜ NOT STARTED

19. ForgotPasswordPage, ResetPasswordPage, EmailVerificationPage
20. GitHubConnectButton
21. Data visualization components (charts)
22. Shared component library extraction

---

## Notes

- All components should follow the existing design system (CSS variables in `styles.css`)
- Use TypeScript interfaces matching backend response schemas
- Implement loading states for all API-dependent components
- Handle error states gracefully with user-friendly messages
- Ensure accessibility (ARIA labels, keyboard navigation)
- Support responsive design (desktop-first, mobile-friendly)
