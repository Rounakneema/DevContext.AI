import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [githubUrl, setGithubUrl] = useState("");

  const handleGithubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;

    if (user) {
      // User is logged in — go to app home with the URL as a query param
      navigate(`/app/?repo=${encodeURIComponent(githubUrl.trim())}`);
    } else {
      // Not logged in — redirect to login, with a return URL
      navigate(`/login?redirect=${encodeURIComponent(`/app/?repo=${encodeURIComponent(githubUrl.trim())}`)}`);
    }
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            DevContext<span>.ai</span>
          </div>

          <div className="landing-nav-center">
            <a href="#how-it-works">Features</a>
            <a href="#how-it-works">How it Works</a>
            <a href="#stats">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className="landing-nav-links">
            {user ? (
              <button className="btn-ghost" onClick={() => { logout(); }}>
                Log Out
              </button>
            ) : (
              <button className="btn-ghost" onClick={() => navigate("/login")}>
                Sign In
              </button>
            )}
            <button className="btn-accent btn-sm" onClick={() => navigate(user ? "/app/" : "/signup")}>
              {user ? "Dashboard" : "Get Started"}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <h1 className="hero-title">
            Ace Your{" "}
            <span className="hero-italic">Technical</span>
            <br />
            <span className="hero-italic">Interview</span>{" "}
            Instantly!
          </h1>
          <p className="hero-subtitle">
            Upload Your GitHub Project, Get AI-Powered Analysis — Your Dream Job
            is Just a Step Away! Let us help you prepare with confidence.
          </p>

          {/* GitHub URL Input */}
          <form className="hero-url-input" onSubmit={handleGithubSubmit}>
            <div className="hero-url-input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Paste a GitHub repository URL to get started..."
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
            <button type="submit" className="hero-url-submit">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </form>

          <div className="hero-cta">
            <button className="btn-accent btn-lg btn-pill" onClick={() => navigate("/signup")}>
              Get Started
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button className="btn-outline btn-lg btn-pill" onClick={() => {}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Watch Demo
            </button>
          </div>
        </div>

        {/* Dashboard Preview Stack */}
        <div className="hero-preview">
          <div className="hero-preview-stack">
            <img
              src="/demoDashboard2.png"
              alt="DevContext.ai dashboard analysis view"
              className="hero-preview-img hero-preview-back"
            />
            <img
              src="/demoDashboard1.png"
              alt="DevContext.ai home page"
              className="hero-preview-img hero-preview-front"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="landing-features">
        <div className="landing-features-inner">
          <div className="features-header">
            <div className="section-badge">How It Works</div>
            <h2 className="section-title">
              Three Steps to{" "}
              <span className="hero-italic accent">Interview Success</span>
            </h2>
            <p className="section-subtitle">
              From code to confidence in minutes
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card feature-card--accent">
              <div className="feature-number">01</div>
              <div className="feature-icon feature-icon--accent">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <h3>Connect Your Repository</h3>
              <p>
                Paste a GitHub URL or upload a ZIP file. Our AI analyzes your
                architecture, patterns, and design decisions in seconds.
              </p>
            </div>

            <div className="feature-card feature-card--emerald">
              <div className="feature-number">02</div>
              <div className="feature-icon feature-icon--emerald">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3>Get Deep Analysis</h3>
              <p>
                Receive a comprehensive intelligence report: code quality scores,
                architecture insights, and employability signals.
              </p>
            </div>

            <div className="feature-card feature-card--amber">
              <div className="feature-number">03</div>
              <div className="feature-icon feature-icon--amber">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>Practice With AI</h3>
              <p>
                Answer personalized interview questions about YOUR code. Get instant
                scoring, feedback, and tips to improve.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section id="stats" className="landing-proof">
        <div className="landing-proof-inner">
          <div className="proof-stats">
            <div className="proof-stat">
              <div className="proof-stat-value">2,500+</div>
              <div className="proof-stat-label">Projects Analyzed</div>
            </div>
            <div className="proof-stat">
              <div className="proof-stat-value">15,000+</div>
              <div className="proof-stat-label">Mock Interviews</div>
            </div>
            <div className="proof-stat">
              <div className="proof-stat-value">89%</div>
              <div className="proof-stat-label">Interview Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="footer-logo">
            DevContext<span>.ai</span>
          </div>
          <div className="footer-links">
            <button type="button" onClick={() => {}}>About</button>
            <button type="button" onClick={() => {}}>Privacy</button>
            <button type="button" onClick={() => {}}>Terms</button>
            <button type="button" onClick={() => {}}>Contact</button>
          </div>
          <div className="footer-copy">© 2026 DevContext.ai</div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
