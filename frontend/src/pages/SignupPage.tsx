import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const input: React.CSSProperties = {
  width: "100%", background: "#f5f5f4", border: "1px solid #e0dfe3",
  borderRadius: 9, padding: "11px 14px", fontFamily: "Geist, sans-serif",
  fontSize: 14, color: "#1a1a1a", outline: "none", boxSizing: "border-box",
  marginBottom: 14, transition: "border-color 0.2s",
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ marginBottom: 4 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6b6b6b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{label}</label>
    {children}
  </div>
);

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  const score = [/.{8,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r => r.test(password)).length;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "#e74c3c", "#e67e22", "#27ae60", "#7C5CDB"];
  return password.length > 0 ? (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: -8, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 3, flex: 1 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= score ? colors[score] : "#e0dfe3", transition: "background 0.3s" }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score], fontWeight: 600, width: 38 }}>{labels[score]}</span>
    </div>
  ) : null;
};

const SignupPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"signup" | "verify">("signup");
  const [resendMsg, setResendMsg] = useState("");

  const { signup, confirmSignup, login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) navigate("/app", { replace: true });
  }, [user, authLoading, navigate]);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      await signup(email, password);
      setStep("verify");
    } catch (err: any) {
      if (err.message === "CONFIRMATION_REQUIRED") {
        setStep("verify");
      } else if (err.name === "UsernameExistsException" || err.message?.includes("already exists")) {
        setError("An account with this email already exists.");
      } else {
        setError(err.message || "Failed to create account.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await confirmSignup(email, code);
      await login(email, password);
      navigate("/setup");
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await signup(email, password);
      setResendMsg("Code resent! Check your inbox.");
      setTimeout(() => setResendMsg(""), 5000);
    } catch { setError("Failed to resend. Please try again."); }
  };

  const root: React.CSSProperties = {
    minHeight: "100vh", background: "#ECEBED",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "40px 24px", fontFamily: "Geist, -apple-system, sans-serif",
  };

  const card: React.CSSProperties = {
    background: "#ffffff", border: "1px solid #e0dfe3",
    borderRadius: 20, padding: "40px 36px", width: "100%", maxWidth: 420,
    boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
    position: "relative", zIndex: 1,
  };

  if (step === "verify") {
    return (
      <div style={root}>
        <div style={card}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(124,92,219,0.1)", border: "1px solid rgba(124,92,219,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>📧</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a", marginBottom: 6 }}>Check your email</div>
            <div style={{ fontSize: 13, color: "#6b6b6b", lineHeight: 1.6 }}>
              We sent a 6-digit code to<br /><strong style={{ color: "#7C5CDB" }}>{email}</strong>
            </div>
          </div>

          {error && <div style={{ background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)", borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#e74c3c", marginBottom: 14 }}>{error}</div>}
          {resendMsg && <div style={{ background: "rgba(39,174,96,0.08)", border: "1px solid rgba(39,174,96,0.2)", borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#27ae60", marginBottom: 14 }}>{resendMsg}</div>}

          <form onSubmit={handleVerify}>
            <Field label="Verification Code">
              <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456" required style={{ ...input, fontSize: 22, letterSpacing: 8, textAlign: "center", fontFamily: "Geist, monospace" }} />
            </Field>
            <button type="submit" disabled={loading || code.length < 6} style={{
              width: "100%", background: "#7C5CDB", border: "none",
              borderRadius: 10, padding: 13, fontFamily: "Geist, sans-serif", fontSize: 15, fontWeight: 700,
              color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: code.length < 6 ? 0.5 : 1,
            }}>
              {loading ? "Verifying…" : "Verify & Continue →"}
            </button>
          </form>

          <div style={{ textAlign: "center", fontSize: 12, color: "#ababab", marginTop: 20 }}>
            Didn't receive it?{" "}
            <span onClick={handleResend} style={{ color: "#7C5CDB", cursor: "pointer", fontWeight: 600 }}>Resend code</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={root}>
      <div style={card}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #7C5CDB, #5a3db5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", letterSpacing: -0.5, marginBottom: 4 }}>
            DevContext<span style={{ color: "#7C5CDB" }}>.ai</span>
          </div>
          <div style={{ fontSize: 13, color: "#6b6b6b" }}>Create your free account</div>
        </div>

        <button style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#f5f5f4", border: "1px solid #e0dfe3", borderRadius: 10, padding: "11px 16px", fontFamily: "Geist, sans-serif", fontSize: 14, fontWeight: 600, color: "#1a1a1a", cursor: "pointer", marginBottom: 20 }} type="button">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" /></svg>
          Continue with GitHub
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#ababab", fontSize: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "#e0dfe3" }} />
          or sign up with email
          <div style={{ flex: 1, height: 1, background: "#e0dfe3" }} />
        </div>

        {error && <div style={{ background: "rgba(231,76,60,0.08)", border: "1px solid rgba(231,76,60,0.2)", borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#e74c3c", marginBottom: 14 }}>{error}</div>}

        <form onSubmit={handleSignup}>
          <Field label="Email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={input} />
          </Field>
          <Field label="Password">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" required autoComplete="new-password" style={input} />
          </Field>
          <PasswordStrength password={password} />
          <Field label="Confirm Password">
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" required autoComplete="new-password"
              style={{ ...input, borderColor: confirm && confirm !== password ? "rgba(231,76,60,0.5)" : "#e0dfe3" }} />
          </Field>

          <button type="submit" disabled={loading} style={{ width: "100%", background: "#7C5CDB", border: "none", borderRadius: 10, padding: 13, fontFamily: "Geist, sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer", marginTop: 4 }}>
            {loading ? "Creating Account…" : "Create Account →"}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: 12, color: "#ababab", marginTop: 20 }}>
          Already have an account?{" "}
          <span onClick={() => navigate("/login")} style={{ color: "#7C5CDB", cursor: "pointer", fontWeight: 600 }}>Sign in</span>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
