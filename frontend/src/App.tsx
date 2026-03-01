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
import "./styles.css";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes - Only Landing, Login, Signup */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Admin Route - Cognito Protected */}
            <Route
              path="/admin/cost-analytics"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminCostDashboard />
                </ProtectedRoute>
              }
            />

            {/* Profile Setup - Protected but no onboarding check */}
            <Route
              path="/setup"
              element={
                <ProtectedRoute requireOnboarding={false}>
                  <ProfileSetupPage />
                </ProtectedRoute>
              }
            />

            {/* Main App Routes with Sidebar - Protected */}
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
                      </Routes>
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />

            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
