import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const { login, logout, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Auto-redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      const redirectTo = searchParams.get('redirect');
      navigate(redirectTo || "/app", { replace: true });
    }
  }, [user, authLoading, navigate, searchParams]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      setError("");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      // Check for redirect parameter
      const redirectTo = searchParams.get('redirect');
      navigate(redirectTo || "/app");
    } catch (err: any) {
      setError(
        err.message || "Failed to login. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    // TODO: Implement GitHub OAuth
    console.log("GitHub login clicked");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "40px",
          width: "100%",
          maxWidth: "400px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            fontSize: "17px",
            fontWeight: "700",
            letterSpacing: "-0.3px",
            marginBottom: "6px",
          }}
        >
          DevContext<span style={{ color: "var(--accent)" }}>.ai</span>
        </div>
        <div
          style={{
            fontSize: "12.5px",
            color: "var(--text3)",
            marginBottom: "24px",
          }}
        >
          Welcome back.
        </div>

        {/* Show logged-in user banner if exists */}
        {user && (
          <div
            style={{
              background: "var(--accent-light)",
              border: "1px solid var(--accent)",
              borderRadius: "8px",
              padding: "14px 16px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", fontWeight: "500", color: "var(--text)" }}>
                Already signed in
              </div>
              <div style={{ fontSize: "12px", color: "var(--text2)", marginTop: "2px" }}>
                {user.email}
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => navigate("/app")}
                style={{
                  background: "var(--accent)",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: "500",
                  cursor: "pointer",
                  fontFamily: "Geist, sans-serif",
                }}
              >
                Go to App
              </button>
              <button
                onClick={handleLogout}
                disabled={loading}
                style={{
                  background: "transparent",
                  color: "var(--accent)",
                  border: "1px solid var(--accent)",
                  borderRadius: "6px",
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: "500",
                  cursor: "pointer",
                  fontFamily: "Geist, sans-serif",
                }}
              >
                {loading ? "..." : "Sign Out"}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={handleGitHubLogin}
          type="button"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: "var(--text)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "11px",
            fontFamily: "Geist, sans-serif",
            fontSize: "13px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "var(--text3)",
            fontSize: "11.5px",
            margin: "18px 0",
          }}
        >
          <div
            style={{ flex: 1, height: "1px", background: "var(--border)" }}
          ></div>
          or sign in with email
          <div
            style={{ flex: 1, height: "1px", background: "var(--border)" }}
          ></div>
        </div>

        {error && (
          <div
            style={{
              background: "#FDECEC",
              border: "1px solid #F5C6C6",
              borderRadius: "7px",
              padding: "10px 12px",
              fontSize: "12.5px",
              color: "#C0392B",
              marginBottom: "12px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "500",
                color: "var(--text2)",
                marginBottom: "5px",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{
                width: "100%",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "7px",
                padding: "10px 12px",
                fontFamily: "Geist, sans-serif",
                fontSize: "13px",
                color: "var(--text)",
                outline: "none",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "500",
                color: "var(--text2)",
                marginBottom: "5px",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              required
              style={{
                width: "100%",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "7px",
                padding: "10px 12px",
                fontFamily: "Geist, sans-serif",
                fontSize: "13px",
                color: "var(--text)",
                outline: "none",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Forgot Password Link */}
          <div style={{ textAlign: 'right', marginBottom: '12px' }}>
            <span
              onClick={() => setShowForgotPassword(!showForgotPassword)}
              style={{
                fontSize: '12px',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Forgot password?
            </span>
          </div>

          {/* Forgot Password Form */}
          {showForgotPassword && (
            <div
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '12px',
              }}
            >
              {resetSent ? (
                <div style={{ fontSize: '12.5px', color: '#27AE60', textAlign: 'center' }}>
                  ✓ Password reset instructions sent to {resetEmail}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px' }}>
                    Enter your email to receive a password reset link
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      style={{
                        flex: 1,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '7px',
                        padding: '8px 10px',
                        fontFamily: 'Geist, sans-serif',
                        fontSize: '12.5px',
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (resetEmail.trim()) {
                          setResetSent(true);
                          setTimeout(() => {
                            setResetSent(false);
                            setShowForgotPassword(false);
                          }, 4000);
                        }
                      }}
                      style={{
                        background: 'var(--accent)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '7px',
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        fontFamily: 'Geist, sans-serif',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Send Reset
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-accent"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "11px",
              marginTop: "4px",
            }}
          >
            {loading ? "Signing In..." : "Sign In →"}
          </button>
        </form>

        <div
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "var(--text3)",
            marginTop: "16px",
          }}
        >
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/signup")}
            style={{
              color: "var(--accent)",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Sign up free
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
