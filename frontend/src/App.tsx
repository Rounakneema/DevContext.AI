import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Sidebar from "./components/Sidebar";
import HomePage from "./pages/HomePage";
import LoadingPage from "./pages/LoadingPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import "./styles.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Main App Routes with Sidebar */}
          <Route
            path="/*"
            element={
              <div className="app">
                <Sidebar />
                <div className="main-content">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/loading" element={<LoadingPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                  </Routes>
                </div>
              </div>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
