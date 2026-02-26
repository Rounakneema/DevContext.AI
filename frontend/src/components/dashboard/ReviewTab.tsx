import React from "react";

const ReviewTab: React.FC = () => {
  return (
    <>
      <div className="view-title">Project Review</div>
      <div className="view-sub">
        Detailed code quality analysis grounded in specific files and line
        numbers.
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Architecture Clarity</div>
          <div className="chip green">74 / 100</div>
        </div>
        <div className="panel-body">
          <p
            style={{
              fontSize: "13px",
              color: "var(--text2)",
              lineHeight: "1.7",
              marginBottom: "14px",
            }}
          >
            The project follows standard MVC with clear separation between
            routes, controllers, and models. The feature-based folder structure
            is a mature organizational decision for a project of this size.
          </p>
          <div
            style={{
              background: "#FAFAF9",
              border: "1px solid var(--border)",
              borderRadius: "7px",
              padding: "14px 16px",
              fontFamily: "monospace",
              fontSize: "12.5px",
              color: "var(--text2)",
              lineHeight: "1.7",
              margin: "10px 0",
              overflowX: "auto",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: "var(--accent)",
                marginBottom: "8px",
                fontFamily: "Geist, sans-serif",
              }}
            >
              📄 src/controllers/userController.js · Lines 45–62
            </div>
            <span style={{ color: "#8B5CF6" }}>const</span>{" "}
            <span style={{ color: "#2563EB" }}>getUser</span> ={" "}
            <span style={{ color: "#8B5CF6" }}>async</span> (req, res) =&gt;{" "}
            {"{"}
            <br />
            &nbsp;&nbsp;
            <span style={{ color: "var(--text3)", fontStyle: "italic" }}>
              {"// ⚠️ Missing try/catch — unhandled promise rejection"}
            </span>
            <br />
            &nbsp;&nbsp;<span style={{ color: "#8B5CF6" }}>const</span> user ={" "}
            <span style={{ color: "#8B5CF6" }}>await</span> User.
            <span style={{ color: "#2563EB" }}>findById</span>(req.params.id);
            <br />
            &nbsp;&nbsp;<span style={{ color: "#8B5CF6" }}>
              if
            </span> (!user) <span style={{ color: "#8B5CF6" }}>return</span>{" "}
            res.<span style={{ color: "#2563EB" }}>status</span>(404).
            <span style={{ color: "#2563EB" }}>json</span>({"{"} msg:{" "}
            <span style={{ color: "#059669" }}>'User not found'</span> {"}"});
            <br />
            &nbsp;&nbsp;res.<span style={{ color: "#2563EB" }}>json</span>
            (user);
            <br />
            {"}"}
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text3)",
              marginTop: "6px",
            }}
          >
            Fix: Wrap in try/catch and use centralized error handler via{" "}
            <code
              style={{
                color: "var(--accent)",
                background: "var(--accent-light)",
                padding: "1px 5px",
                borderRadius: "3px",
                fontSize: "11px",
              }}
            >
              next(err)
            </code>{" "}
            pattern.
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Commit Authenticity</div>
          <div className="chip amber">68 / 100</div>
        </div>
        <div className="panel-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "7px",
                padding: "12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  letterSpacing: "-1px",
                }}
              >
                6
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text3)",
                  marginTop: "2px",
                }}
              >
                Total Commits
              </div>
            </div>
            <div
              style={{
                background: "#FEF9F0",
                border: "1px solid #F5E0A0",
                borderRadius: "7px",
                padding: "12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  letterSpacing: "-1px",
                  color: "#E67E22",
                }}
              >
                3
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text3)",
                  marginTop: "2px",
                }}
              >
                Bulk Commits
              </div>
            </div>
            <div
              style={{
                background: "#F4FCF8",
                border: "1px solid #C8F0DF",
                borderRadius: "7px",
                padding: "12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "700",
                  letterSpacing: "-1px",
                  color: "#27AE60",
                }}
              >
                21
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text3)",
                  marginTop: "2px",
                }}
              >
                Days Span
              </div>
            </div>
          </div>
          <div className="insight-list">
            <div className="insight-item">
              <div className="i-dot warn">~</div>
              <div className="i-text">
                Commit <code>a3f21bc</code> added 34 files in one push —
                suggests code was developed offline and bulk-uploaded.
              </div>
            </div>
            <div className="insight-item">
              <div className="i-dot pos">✓</div>
              <div className="i-text">
                3 incremental commits show genuine development: "Add auth
                middleware", "Fix CORS issue", "Connect MongoDB atlas".
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReviewTab;
