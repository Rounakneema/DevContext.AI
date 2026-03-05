import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar from "./components/Sidebar";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import LoadingPage from "./pages/LoadingPage";
import AnalysisLayout from "./pages/AnalysisLayout";
import OverviewPage from "./pages/OverviewPage";
import ReviewPage from "./pages/ReviewPage";
import ReportPage from "./pages/ReportPage";
import HistoryPage from "./pages/HistoryPage";
import EvaluationFrameworkPage from "./pages/EvaluationFrameworkPage";
import SettingsPage from "./pages/SettingsPage";
import AccountPage from "./pages/AccountPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import AdminCostDashboard from "./pages/AdminCostDashboard";
import InterviewPage from "./pages/InterviewPage";
import "./styles.css";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* ── Public ── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* ── Admin ── */}
            <Route
              path="/admin/cost-analytics"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminCostDashboard />
                </ProtectedRoute>
              }
            />

            {/* ── Profile Setup (protected, skip onboarding check) ── */}
            <Route
              path="/setup"
              element={
                <ProtectedRoute requireOnboarding={false}>
                  <ProfileSetupPage />
                </ProtectedRoute>
              }
            />

            {/* ── Full-screen Interview (no sidebar) ── */}
            <Route
              path="/app/interview"
              element={
                <ProtectedRoute>
                  <InterviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/app/interview/:analysisId"
              element={
                <ProtectedRoute>
                  <InterviewPage />
                </ProtectedRoute>
              }
            />

            {/* ── Main App (with Sidebar) ── */}
            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <div className="app">
                    <Sidebar />
                    <div className="main-content">
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/loading" element={<LoadingPage />} />

                        {/* Nested Dashboard Routes via AnalysisLayout */}
                        <Route path="/dashboard" element={<AnalysisLayout />}>
                          {/* Global pages inside layout */}
                          <Route path="history" element={<HistoryPage />} />
                          <Route path="framework" element={<EvaluationFrameworkPage />} />

                          {/* Analysis-specific pages inside layout */}
                          <Route path=":id/overview" element={<OverviewPage />} />
                          <Route path=":id/review" element={<ReviewPage />} />
                          <Route path=":id/report" element={<ReportPage />} />

                          {/* Default fallback for dashboard */}
                          <Route index element={
                            <div style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text3)'
                            }}>
                              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.4 }}>
                                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                              </svg>
                              <div style={{ fontSize: '14px' }}>Select an analysis from the sidebar dropdown to get started</div>
                            </div>
                          } />
                        </Route>

                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/account" element={<AccountPage />} />
                        {/* Catch-all inside /app/* */}
                        <Route path="*" element={<Navigate to="/app" replace />} />
                      </Routes>
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            {/* ── Global catch-all ── */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
