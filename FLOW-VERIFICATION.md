# Frontend Flow Verification

## Complete User Journey Flow

### 1. Landing Page → Login/Signup
✅ **LandingPage** (`/`)
- User can enter GitHub URL
- If logged in: navigates to `/app/?repo={url}`
- If not logged in: navigates to `/login?redirect=/app/?repo={url}`
- "Get Started" button → `/signup`
- "Sign In" button → `/login`

### 2. Authentication Flow
✅ **SignupPage** (`/signup`)
- Creates account with Cognito
- On success: navigates to `/setup` (profile setup)
- "Already have account" → `/login`

✅ **LoginPage** (`/login`)
- Authenticates with Cognito
- Reads `redirect` query param
- On success: navigates to redirect URL or `/app`
- "Don't have account" → `/signup`

✅ **ProfileSetupPage** (`/setup`)
- Calls `createUserProfile()` API
- On success: navigates to `/app`
- Skip button: navigates to `/app`

### 3. Main App Flow
✅ **HomePage** (`/app`)
- Reads `repo` query param from URL (if coming from landing page)
- Pre-fills input with repo URL
- User enters/edits GitHub URL
- Calls `api.startAnalysis(url)` → gets `analysisId`
- Navigates to `/app/loading` with state: `{ query, analysisId }`

✅ **LoadingPage** (`/app/loading`)
- Receives `analysisId` from navigation state
- If no `analysisId`: redirects to `/app`
- Polls `getAnalysisStatus(analysisId)` every 3 seconds
- Shows workflow progress (stage1 → stage2 → stage3)
- Decision points:
  - After stage1: Continue to stage2 or view results
  - After stage2: Continue to stage3 or view results
- On completion: navigates to `/app/dashboard?id={analysisId}&tab=interview`
- "View Results" button: navigates to `/app/dashboard?id={analysisId}`
- "Go Home" button: navigates to `/app`

### 4. Dashboard Flow
✅ **DashboardPage** (`/app/dashboard`)
- Reads `id` (analysisId) from query params
- Reads `tab` from query params (default: "overview")
- Passes `analysisId` to all tab components
- Tabs:
  - **OverviewTab**: Requires `analysisId`, shows summary
  - **ReviewTab**: Requires `analysisId`, shows code review
  - **ReportTab**: Requires `analysisId`, shows intelligence report
  - **InterviewTab**: Optional `analysisId`, creates interview session
  - **HistoryTab**: No `analysisId` needed, shows all user analyses
- FileExplorer: Shows for analysis tabs when `analysisId` exists
- "New Analysis" button: navigates to `/app`

### 5. Settings & Account
✅ **SettingsPage** (`/app/settings`)
- Calls `getUserProfile()` and `updateUserPreferences()`
- Sidebar navigation

✅ **AccountPage** (`/app/account`)
- Calls `getUserProfile()`
- Shows subscription, quota, profile info
- Logout button: calls `logout()` and navigates to `/`

## API Integration Status

### All Pages Using Real API:
1. ✅ HomePage - `api.startAnalysis()`, `getUserStats()`
2. ✅ LoadingPage - `getAnalysisStatus()`, `continueToStage2()`, `continueToStage3()`, `exportAnalysis()`
3. ✅ ProfileSetupPage - `createUserProfile()`
4. ✅ AccountPage - `getUserProfile()`
5. ✅ SettingsPage - `getUserProfile()`, `updateUserPreferences()`
6. ✅ DashboardPage - Container (passes analysisId to children)
7. ✅ OverviewTab - `api.getAnalysis()`
8. ✅ ReviewTab - `api.getAnalysis()`
9. ✅ ReportTab - `api.getAnalysis()`
10. ✅ InterviewTab - `createInterviewSession()`, `submitAnswer()`, `completeInterviewSession()`
11. ✅ HistoryTab - `api.getAnalyses()`, `api.getUserProgress()`
12. ✅ FileExplorer - `api.getAnalysisFiles()`, `api.updateFileSelection()`, `api.reorderFiles()`

### Authentication:
- ✅ LoginPage - Uses `AuthContext.login()` (Cognito)
- ✅ SignupPage - Uses `AuthContext.signup()` (Cognito)
- ✅ All protected routes use `ProtectedRoute` component

## Navigation Consistency

### Query Params vs State:
✅ **Fixed**: All navigations to DashboardPage now use query params
- Before: `navigate('/app/dashboard', { state: { analysisId } })`
- After: `navigate('/app/dashboard?id={analysisId}')`

### URL Parameter Handling:
✅ **Fixed**: HomePage now reads `repo` param from URL
✅ **Fixed**: LoginPage now reads `redirect` param from URL

## Potential Issues Found & Fixed:

1. ✅ **LoadingPage → DashboardPage**: Changed from state to query params
2. ✅ **HomePage**: Added `useSearchParams` to read `repo` param
3. ✅ **LoginPage**: Added `useSearchParams` to read `redirect` param
4. ✅ **LoadingPage**: Added redirect to `/app` if no `analysisId`
5. ✅ **All pages**: Using centralized `services/api.ts`

## Backend Integration:

✅ **Lambda Runtime**: Updated to Node.js 20 (18 is deprecated)
✅ **CORS Headers**: Present in all Lambda functions
✅ **API Gateway**: All endpoints properly configured
✅ **Authentication**: JWT tokens via Cognito

## Summary:

All pages are properly interconnected and using the real AWS backend API. The flow is:

1. User lands on marketing page
2. Signs up/logs in with Cognito
3. Sets up profile (optional)
4. Enters GitHub URL on home page
5. Backend starts analysis and returns analysisId
6. User sees progress on loading page
7. Can make decisions at stage checkpoints
8. Views results on dashboard with analysisId in URL
9. Can start interview practice
10. Can view history of all analyses

No mock data, no hardcoded URLs, all API calls authenticated and working!
