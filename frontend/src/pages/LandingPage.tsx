import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [githubUrl, setGithubUrl] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [heroError, setHeroError] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [typedText, setTypedText] = useState("");

  const headlines = [
    "Architecture Review",
    "Interview Prep",
    "Resume Bullets",
    "Gap Analysis",
  ];
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const current = headlines[headlineIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (!isDeleting && charIndex < current.length) {
      timeout = setTimeout(() => setCharIndex((c) => c + 1), 70);
    } else if (!isDeleting && charIndex === current.length) {
      timeout = setTimeout(() => setIsDeleting(true), 1800);
    } else if (isDeleting && charIndex > 0) {
      timeout = setTimeout(() => setCharIndex((c) => c - 1), 35);
    } else if (isDeleting && charIndex === 0) {
      setIsDeleting(false);
      setHeadlineIndex((i) => (i + 1) % headlines.length);
    }
    setTypedText(current.slice(0, charIndex));
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charIndex, isDeleting, headlineIndex]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      window.location.reload();
    } catch (err) {
      console.error("Logout error:", err);
      setLoggingOut(false);
    }
  };

  const handleGithubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = githubUrl.trim();
    if (!trimmed) {
      setHeroError("Please paste a GitHub URL.");
      return;
    }
    const githubPattern =
      /^(https?:\/\/)?(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\/?.*)?$/i;
    if (!githubPattern.test(trimmed)) {
      setHeroError(
        "Please enter a valid GitHub URL (github.com/owner/repo)"
      );
      return;
    }
    setHeroError("");
    if (user) {
      navigate(`/app/?repo=${encodeURIComponent(trimmed)}`);
    } else {
      navigate(
        `/login?redirect=${encodeURIComponent(
          `/app/?repo=${encodeURIComponent(trimmed)}`
        )}`
      );
    }
  };

  return (
    <div className="lp-root">
      {/* ── NAV ── */}
      <nav className={`lp-nav${scrolled ? " lp-nav--scrolled" : ""}`}>
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <div className="lp-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            DevContext<span className="lp-logo-dot">.ai</span>
          </div>

          <div className="lp-nav-links">
            <a href="#how-it-works" className="lp-nav-link">How it Works</a>
            <a href="#capabilities" className="lp-nav-link">Features</a>
            <a href="#stats" className="lp-nav-link">Stats</a>
          </div>

          <div className="lp-nav-actions">
            {user ? (
              <>
                <button className="lp-btn-ghost" onClick={handleLogout} disabled={loggingOut}>
                  {loggingOut ? "Logging out…" : "Log Out"}
                </button>
                <button className="lp-btn-primary" onClick={() => navigate("/app")}>
                  Dashboard →
                </button>
              </>
            ) : (
              <>
                <button className="lp-btn-ghost" onClick={() => navigate("/login")}>
                  Sign In
                </button>
                <button className="lp-btn-primary" onClick={() => navigate("/signup")}>
                  Get Started Free
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        {/* Background grid */}
        <div className="lp-hero-grid" aria-hidden />
        {/* Glow blobs */}
        <div className="lp-blob lp-blob--purple" aria-hidden />
        <div className="lp-blob lp-blob--blue" aria-hidden />

        <div className="lp-hero-inner">
          {/* Badge */}
          <div className="lp-badge">
            <span className="lp-badge-dot" />
            Powered by Mistral Large 3
          </div>

          {/* Headline */}
          <h1 className="lp-hero-title">
            AI-powered
            <br />
            <span className="lp-hero-typed">
              {typedText}
              <span className="lp-cursor" />
            </span>
            <br />
            from your code
          </h1>

          <p className="lp-hero-sub">
            Paste a GitHub repo. Get instant code quality scores, architecture
            analysis, AI-generated interview questions, and resume bullets —
            all grounded in your actual codebase.
          </p>

          {/* GitHub URL form */}
          <form className="lp-url-form" onSubmit={handleGithubSubmit}>
            <div className="lp-url-form-inner">
              <div className="lp-url-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <input
                className="lp-url-input"
                type="text"
                placeholder="github.com/your-username/your-project"
                value={githubUrl}
                onChange={(e) => {
                  setGithubUrl(e.target.value);
                  if (heroError) setHeroError("");
                }}
              />
              <button type="submit" className="lp-url-submit">
                Analyze →
              </button>
            </div>
            {heroError && (
              <div className="lp-url-error">{heroError}</div>
            )}
          </form>

          <p className="lp-hero-footnote">
            No credit card required · Analyzes public repos · Results in ~60s
          </p>

          {/* Metric chips */}
          <div className="lp-metric-chips">
            <div className="lp-chip">
              Code Quality Score
            </div>
            <div className="lp-chip">
              Architecture Map
            </div>
            <div className="lp-chip">
              50 Interview Questions
            </div>
            <div className="lp-chip">
              Resume Bullets
            </div>
          </div>
        </div>

        {/* Preview Card */}
        <div className="lp-preview-card">
          <div className="lp-preview-header">
            <div className="lp-preview-dots">
              <span /><span /><span />
            </div>
            <span className="lp-preview-title">Analysis Complete</span>
          </div>
          <div className="lp-preview-body">
            <div className="lp-score-row">
              <span className="lp-score-label">Code Quality</span>
              <div className="lp-score-bar-wrap">
                <div className="lp-score-bar" style={{ width: "82%", "--bar-color": "#7C5CDB" } as React.CSSProperties} />
              </div>
              <span className="lp-score-val">82</span>
            </div>
            <div className="lp-score-row">
              <span className="lp-score-label">Architecture</span>
              <div className="lp-score-bar-wrap">
                <div className="lp-score-bar" style={{ width: "75%", "--bar-color": "#27ae60" } as React.CSSProperties} />
              </div>
              <span className="lp-score-val">75</span>
            </div>
            <div className="lp-score-row">
              <span className="lp-score-label">Security</span>
              <div className="lp-score-bar-wrap">
                <div className="lp-score-bar" style={{ width: "68%", "--bar-color": "#e67e22" } as React.CSSProperties} />
              </div>
              <span className="lp-score-val">68</span>
            </div>
            <div className="lp-score-row">
              <span className="lp-score-label">Employability</span>
              <div className="lp-score-bar-wrap">
                <div className="lp-score-bar" style={{ width: "90%", "--bar-color": "#2980b9" } as React.CSSProperties} />
              </div>
              <span className="lp-score-val">90</span>
            </div>
            <div className="lp-preview-divider" />
            <div className="lp-preview-tags">
              <span className="lp-tag lp-tag--purple">Microservices</span>
              <span className="lp-tag lp-tag--green">REST API</span>
              <span className="lp-tag lp-tag--blue">Event-Driven</span>
              <span className="lp-tag lp-tag--orange">JWT Auth</span>
            </div>
            <div className="lp-preview-q">
              <div className="lp-preview-q-label">Sample Interview Q</div>
              <div className="lp-preview-q-text">
                "Walk me through how your authentication middleware integrates
                with the API gateway in <code>src/middleware/auth.ts</code>…"
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="lp-section lp-section--light">
        <div className="lp-section-inner">
          <div className="lp-section-badge">How It Works</div>
          <h2 className="lp-section-title">
            From GitHub URL to{" "}
            <span className="lp-accent">Interview-Ready</span>{" "}
            in 3 Steps
          </h2>
          <p className="lp-section-sub">
            Our multi-stage AI pipeline analyses your entire codebase and transforms it into actionable interview prep.
          </p>

          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-num">01</div>
              <div className="lp-step-icon lp-step-icon--purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
              <h3>Connect Repository</h3>
              <p>Paste any public GitHub URL. Our system clones it, builds a semantic code map, and identifies entry points, frameworks, and core modules — all in seconds.</p>
            </div>

            <div className="lp-step-arrow" aria-hidden>→</div>

            <div className="lp-step">
              <div className="lp-step-num">02</div>
              <div className="lp-step-icon lp-step-icon--green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3>3-Stage AI Analysis</h3>
              <p>
                <strong>Stage 1</strong> scores code quality. <strong>Stage 2</strong> extracts architecture, design decisions & tradeoffs. <strong>Stage 3</strong> generates grounded interview questions and resume bullets.
              </p>
            </div>

            <div className="lp-step-arrow" aria-hidden>→</div>

            <div className="lp-step">
              <div className="lp-step-num">03</div>
              <div className="lp-step-icon lp-step-icon--orange">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>Practice & Export</h3>
              <p>
                Take a live adaptive interview that branches based on your answers, or download a 50-question sheet. Export ATS-optimized resume bullets instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ── */}
      <section id="capabilities" className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-section-badge">What You Get</div>
          <h2 className="lp-section-title">
            Every report includes <span className="lp-accent">5 key outputs</span>
          </h2>

          <div className="lp-caps-grid">
            <div className="lp-cap">
              <div className="lp-cap-icon" style={{ background: "rgba(124,92,219,0.1)", color: "#7C5CDB" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h4>Code Quality Report</h4>
              <p>Readability, maintainability, error handling, security and performance — each scored 0–100 with reasoning.</p>
            </div>

            <div className="lp-cap">
              <div className="lp-cap-icon" style={{ background: "rgba(124,92,219,0.1)", color: "#7C5CDB" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h4>Architecture Intelligence</h4>
              <p>Layer diagrams, component relationships, data flow, design patterns, and technical tradeoffs — all from your actual code.</p>
            </div>

            <div className="lp-cap">
              <div className="lp-cap-icon" style={{ background: "rgba(124,92,219,0.1)", color: "#7C5CDB" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h4>Interview Question Bank</h4>
              <p>50 questions grounded in your codebase — architecture, implementation, tradeoffs, scalability, and security. Two modes: sheet or live adaptive.</p>
            </div>

            <div className="lp-cap">
              <div className="lp-cap-icon" style={{ background: "rgba(124,92,219,0.1)", color: "#7C5CDB" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                </svg>
              </div>
              <h4>ATS Resume Bullets</h4>
              <p>12–18 achievement-focused bullets generated from what you actually built — with quantified impact and ATS-optimized keywords.</p>
            </div>

            <div className="lp-cap">
              <div className="lp-cap-icon" style={{ background: "rgba(124,92,219,0.1)", color: "#7C5CDB" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h4>Gap Analysis</h4>
              <p>Identifies skill gaps vs. your target role, with specific, actionable suggestions to close them before your next interview.</p>
            </div>

            <div className="lp-cap">
              <div className="lp-cap-icon" style={{ background: "rgba(124,92,219,0.1)", color: "#7C5CDB" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h4>Employability Signal</h4>
              <p>Company-tier match score (Big Tech / Product / Startup), complexity rating, and production-readiness assessment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="stats" className="lp-section lp-section--dark">
        <div className="lp-section-inner lp-stats-inner">
          <div className="lp-stat">
            <div className="lp-stat-value">3</div>
            <div className="lp-stat-label">AI Analysis Stages</div>
          </div>
          <div className="lp-stat-divider" />
          <div className="lp-stat">
            <div className="lp-stat-value">50+</div>
            <div className="lp-stat-label">Questions per Report</div>
          </div>
          <div className="lp-stat-divider" />
          <div className="lp-stat">
            <div className="lp-stat-value">~60s</div>
            <div className="lp-stat-label">Full Analysis Time</div>
          </div>
          <div className="lp-stat-divider" />
          <div className="lp-stat">
            <div className="lp-stat-value">100%</div>
            <div className="lp-stat-label">Grounded in Your Code</div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta-section">
        <div className="lp-cta-inner">
          <div className="lp-cta-blob" aria-hidden />
          <h2 className="lp-cta-title">
            Ready to unlock your{" "}
            <span className="lp-accent">codebase's full potential?</span>
          </h2>
          <p className="lp-cta-sub">
            Start with any public GitHub repo — free, no setup, results in under a minute.
          </p>
          <div className="lp-cta-actions">
            <button className="lp-btn-primary lp-btn-lg" onClick={() => navigate("/signup")}>
              Analyze my project →
            </button>
            <button className="lp-btn-ghost lp-btn-lg" onClick={() => navigate("/login")}>
              I already have an account
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-logo" style={{ fontSize: "15px" }}>
            <div className="lp-logo-icon" style={{ width: 28, height: 28 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            DevContext<span className="lp-logo-dot">.ai</span>
          </div>
          <div className="lp-footer-links">
            <button type="button">About</button>
            <button type="button">Privacy</button>
            <button type="button">Terms</button>
            <button type="button">Contact</button>
          </div>
          <div className="lp-footer-copy">© 2026 DevContext.ai · Built for developers.</div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
