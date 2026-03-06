import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const GH_ICON = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const { login, logout, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!authLoading && user) {
      navigate(searchParams.get("redirect") || "/app", { replace: true });
    }
  }, [user, authLoading, navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(searchParams.get("redirect") || "/app");
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (!resetEmail.trim()) return;
    setResetSent(true);
    setTimeout(() => { setResetSent(false); setShowForgot(false); }, 4000);
  };

  return (
    <div style={root}>
      {/* Background blobs */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={blob("#7C5CDB", 460, -80, -100)} />
        <div style={blob("#2980b9", 320, "auto", -80, "auto", 20)} />
        <div style={grid} />
      </div>

      <div style={card}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={logoBox}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", letterSpacing: -0.5, marginBottom: 4 }}>
            DevContext<span style={{ color: "#7C5CDB" }}>.ai</span>
          </div>
          <div style={{ fontSize: 13, color: "#6b6b6b" }}>AI-powered code interview prep</div>
        </div>

        {user && (
          <div style={banner("#7C5CDB")}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>Already signed in</div>
              <div style={{ fontSize: 12, color: "#6b6b6b", marginTop: 2 }}>{user.email}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <AuthBtn onClick={() => navigate("/app")} accent>Go to App</AuthBtn>
              <AuthBtn onClick={async () => { await logout(); }}>Sign Out</AuthBtn>
            </div>
          </div>
        )}

        {/* GitHub SSO */}
        <button onClick={() => { }} style={githubBtn} type="button">
          {GH_ICON} Continue with GitHub
        </button>

        <div style={divider}>or sign in with email</div>

        {error && <div style={errBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <Field label="Email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoComplete="email" style={input} />
          </Field>

          <Field label="Password" action={
            <span onClick={() => setShowForgot(f => !f)} style={forgotLink}>Forgot password?</span>
          }>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Your password"
                required autoComplete="current-password" style={{ ...input, paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPass(s => !s)} style={eyeBtn}>
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </Field>

          {showForgot && (
            <div style={forgotBox}>
              {resetSent ? (
                <div style={{ fontSize: 13, color: "#6fcf97", textAlign: "center" }}>
                  ✓ Reset link sent to <strong>{resetEmail}</strong>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                    placeholder="your@email.com" style={{ ...input, flex: 1, marginBottom: 0 }} />
                  <button type="button" onClick={handleReset} style={smallAccentBtn}>Send</button>
                </div>
              )}
            </div>
          )}

          <button type="submit" disabled={loading} style={submitBtn}>
            {loading ? <Spinner /> : null}
            {loading ? "Signing in…" : "Sign In →"}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: 12, color: "#ababab", marginTop: 20 }}>
          Don't have an account?{" "}
          <span onClick={() => navigate("/signup")} style={linkText}>Sign up free</span>
        </div>
      </div>
    </div>
  );
};

/* ── Styles & helpers ───────────────────────────────────────── */

const root: React.CSSProperties = {
  minHeight: "100vh",
  background: "#ECEBED",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 24px",
  fontFamily: "Geist, -apple-system, sans-serif",
};

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e0dfe3",
  borderRadius: 20,
  padding: "40px 36px",
  width: "100%",
  maxWidth: 420,
  boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
  position: "relative",
  zIndex: 1,
};

const logoBox: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 12,
  background: "linear-gradient(135deg, #7C5CDB, #5a3db5)",
  display: "flex", alignItems: "center", justifyContent: "center",
  margin: "0 auto 12px",
};

const githubBtn: React.CSSProperties = {
  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
  gap: 10, background: "#f5f5f4", border: "1px solid #e0dfe3",
  borderRadius: 10, padding: "11px 16px", fontFamily: "Geist, sans-serif",
  fontSize: 14, fontWeight: 600, color: "#1a1a1a", cursor: "pointer",
  transition: "all 0.15s",
};

const divider: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, color: "#ababab",
  fontSize: 12, margin: "20px 0", whiteSpace: "nowrap",
};

const input: React.CSSProperties = {
  width: "100%", background: "#f5f5f4", border: "1px solid #e0dfe3",
  borderRadius: 9, padding: "11px 14px", fontFamily: "Geist, sans-serif",
  fontSize: 14, color: "#1a1a1a", outline: "none", boxSizing: "border-box",
  marginBottom: 14, transition: "border-color 0.2s",
};

const submitBtn: React.CSSProperties = {
  width: "100%", background: "#7C5CDB",
  border: "none", borderRadius: 10, padding: "13px", fontFamily: "Geist, sans-serif",
  fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer",
  transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  marginTop: 4,
};

const smallAccentBtn: React.CSSProperties = {
  background: "#7C5CDB", border: "none", borderRadius: 8, padding: "0 14px",
  color: "#fff", fontFamily: "Geist, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer",
  whiteSpace: "nowrap",
};

const eyeBtn: React.CSSProperties = {
  position: "absolute", right: 12, top: "50%", transform: "translateY(calc(-50% - 7px))",
  background: "none", border: "none", cursor: "pointer", fontSize: 14,
};

const forgotLink: React.CSSProperties = {
  fontSize: 12, color: "#7C5CDB", cursor: "pointer", fontWeight: 500,
};

const forgotBox: React.CSSProperties = {
  background: "#f5f5f4", border: "1px solid #e0dfe3",
  borderRadius: 10, padding: "12px 14px", marginBottom: 14,
};

const errBox: React.CSSProperties = {
  background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)",
  borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#e74c3c", marginBottom: 14,
};

const linkText: React.CSSProperties = {
  color: "#7C5CDB", cursor: "pointer", fontWeight: 600,
};

function blob(color: string, size: number, top?: number | string, left?: number | string, bottom?: number | string, right?: number | string): React.CSSProperties {
  return {
    position: "absolute",
    width: size, height: size, borderRadius: "50%",
    background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`,
    top, left, bottom, right, filter: "blur(60px)",
  };
}

const grid: React.CSSProperties = {
  display: "none",
};

function banner(color: string): React.CSSProperties {
  return {
    background: `${color}12`, border: `1px solid ${color}33`, borderRadius: 10,
    padding: "14px 16px", marginBottom: 20, display: "flex",
    alignItems: "center", justifyContent: "space-between", gap: 12,
  };
}

const Field: React.FC<{ label: string; action?: React.ReactNode; children: React.ReactNode }> = ({ label, action, children }) => (
  <div style={{ marginBottom: 4 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#6b6b6b", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</label>
      {action}
    </div>
    {children}
  </div>
);

const AuthBtn: React.FC<{ onClick: () => void; accent?: boolean; children: React.ReactNode }> = ({ onClick, accent, children }) => (
  <button onClick={onClick} style={{
    background: accent ? "#7C5CDB" : "#f5f5f4", color: accent ? "#fff" : "#1a1a1a", border: accent ? "none" : "1px solid #e0dfe3",
    borderRadius: 7, padding: "7px 13px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "Geist, sans-serif",
  }}>{children}</button>
);

const Spinner = () => (
  <div style={{ width: 16, height: 16, border: "2px solid rgba(124,92,219,0.3)", borderTopColor: "#7C5CDB", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
);

export default LoginPage;
