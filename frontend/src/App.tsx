import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar from "./components/Sidebar";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import LoadingPage from "./pages/LoadingPage";
import DashboardPage from "./pages/DashboardPage";
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
                        <Route path="/dashboard" element={<DashboardPage />} />
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
