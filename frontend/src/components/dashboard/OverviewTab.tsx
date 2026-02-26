import React from "react";

const OverviewTab: React.FC = () => {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "18px",
        }}
      >
        <div>
          <div className="view-title">my-fullstack-app</div>
          <div className="view-sub">
            React + Express.js · 47 files · 6 commits · Analysed 2 min ago
          </div>
        </div>
        <button
          className="btn-ghost"
          style={{
            marginTop: 0,
            width: "auto",
            fontSize: "12px",
            padding: "7px 14px",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export PDF
        </button>
      </div>

      <div className="warn-strip">
        ⚠{" "}
        <span>
          <strong>Low commit diversity</strong> — 3 of 6 commits are bulk
          uploads. This may impact recruiter perception.
        </span>
      </div>

      <div className="score-row">
        <div className="score-card">
          <div className="sc-label">Employability Signal</div>
          <div className="sc-num green">72</div>
          <div className="sc-sub">Good foundation, room to grow</div>
          <div className="sc-bar">
            <div className="sc-bar-fill green" style={{ width: "72%" }}></div>
          </div>
        </div>
        <div className="score-card">
          <div className="sc-label">Code Quality</div>
          <div className="sc-num amber">61</div>
          <div className="sc-sub">Moderate — missing error handling</div>
          <div className="sc-bar">
            <div className="sc-bar-fill amber" style={{ width: "61%" }}></div>
          </div>
        </div>
        <div className="score-card">
          <div className="sc-label">Authenticity Score</div>
          <div className="sc-num green">68</div>
          <div className="sc-sub">Organic development detected</div>
          <div className="sc-bar">
            <div className="sc-bar-fill green" style={{ width: "68%" }}></div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Tech Stack</div>
          <div className="chip neutral">Auto-detected</div>
        </div>
        <div className="panel-body">
          <div className="tag-row">
            <span className="tag acc">React 18</span>
            <span className="tag tech">Node.js</span>
            <span className="tag tech">Express.js</span>
            <span className="tag tech">MongoDB</span>
            <span className="tag tech">JWT Auth</span>
            <span className="tag tech">REST API</span>
            <span className="tag tech">Tailwind CSS</span>
          </div>
          <div
            style={{
              marginTop: "14px",
              fontSize: "12.5px",
              color: "var(--text3)",
            }}
          >
            JavaScript <strong style={{ color: "var(--text)" }}>82%</strong> ·
            CSS 12% · HTML 6%
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Strengths</div>
          <div className="chip green">3 found</div>
        </div>
        <div className="panel-body">
          <div className="insight-list">
            <div className="insight-item">
              <div className="i-dot pos">✓</div>
              <div className="i-text">
                <strong>Clean component architecture</strong> — React components
                well-decomposed with clear separation in{" "}
                <code>src/components/</code>.
              </div>
            </div>
            <div className="insight-item">
              <div className="i-dot pos">✓</div>
              <div className="i-text">
                <strong>JWT authentication</strong> — Token-based auth correctly
                applied in <code>middleware/auth.js</code>, demonstrating
                security awareness.
              </div>
            </div>
            <div className="insight-item">
              <div className="i-dot pos">✓</div>
              <div className="i-text">
                <strong>Environment variable separation</strong> — Sensitive
                config properly externalized via <code>.env</code> with example
                file committed.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Improvements Needed</div>
          <div className="chip amber">3 items</div>
        </div>
        <div className="panel-body">
          <div className="insight-list">
            <div className="insight-item">
              <div className="i-dot neg">!</div>
              <div className="i-text">
                <strong>Missing global error handling</strong> — Express routes
                in <code>routes/api.js:L24-L87</code> lack try/catch. Production
                APIs should never expose stack traces.
              </div>
            </div>
            <div className="insight-item">
              <div className="i-dot neg">!</div>
              <div className="i-text">
                <strong>No input validation</strong> — Requests passed directly
                to MongoDB in <code>controllers/user.js:L15</code>. Vulnerable
                to NoSQL injection.
              </div>
            </div>
            <div className="insight-item">
              <div className="i-dot warn">~</div>
              <div className="i-text">
                <strong>Zero test coverage</strong> — No test files detected.
                Product companies (Flipkart, Razorpay) increasingly evaluate
                testing discipline.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OverviewTab;
