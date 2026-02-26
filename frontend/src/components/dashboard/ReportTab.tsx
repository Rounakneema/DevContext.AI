import React from "react";

const ReportTab: React.FC = () => {
  return (
    <>
      <div className="view-title">Intelligence Report</div>
      <div className="view-sub">
        AI-reconstructed architectural decisions grounded in your actual code.
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Architecture Overview</div>
          <div className="chip green">Grounded</div>
        </div>
        <div className="panel-body">
          <p
            style={{
              fontSize: "13px",
              color: "var(--text2)",
              lineHeight: "1.7",
              marginBottom: "18px",
            }}
          >
            Client-server architecture with a React SPA consuming a RESTful
            Node.js/Express API. Enables independent frontend/backend
            deployment, though lacks a reverse proxy configuration expected in
            production.
          </p>
          <div
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "28px",
              minHeight: "220px",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "20px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--accent-light)",
                border: "1px solid var(--accent)",
                borderRadius: "6px",
                padding: "7px 14px",
                fontSize: "11.5px",
                fontWeight: "500",
                color: "var(--accent)",
                whiteSpace: "nowrap",
              }}
            >
              React SPA (Port 3000)
            </div>
            <div
              style={{
                position: "absolute",
                top: "58px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "18px",
                color: "var(--text3)",
              }}
            >
              ↓
            </div>
            <div
              style={{
                position: "absolute",
                top: "82px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--surface)",
                border: "1px solid var(--border2)",
                borderRadius: "6px",
                padding: "7px 14px",
                fontSize: "11.5px",
                fontWeight: "500",
                color: "var(--text)",
                whiteSpace: "nowrap",
              }}
            >
              Express.js REST API (Port 5000)
            </div>
            <div
              style={{
                position: "absolute",
                top: "120px",
                left: "28%",
                fontSize: "16px",
                color: "var(--text3)",
              }}
            >
              ↓
            </div>
            <div
              style={{
                position: "absolute",
                top: "120px",
                left: "62%",
                fontSize: "16px",
                color: "var(--text3)",
              }}
            >
              ↓
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "24px",
                left: "12px",
                background: "#F1FBF1",
                border: "1px solid #4CAF50",
                borderRadius: "6px",
                padding: "7px 14px",
                fontSize: "11.5px",
                fontWeight: "500",
                color: "#2E7D32",
                whiteSpace: "nowrap",
              }}
            >
              JWT Middleware
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "24px",
                right: "12px",
                background: "#FEF9F0",
                border: "1px solid #E67E22",
                borderRadius: "6px",
                padding: "7px 14px",
                fontSize: "11.5px",
                fontWeight: "500",
                color: "#A04000",
                whiteSpace: "nowrap",
              }}
            >
              MongoDB Atlas
            </div>
          </div>
          <div className="tag-row" style={{ marginTop: "14px" }}>
            <span className="tag tech">Client-Server</span>
            <span className="tag tech">REST API</span>
            <span className="tag tech">MVC Pattern</span>
            <span className="tag acc">JWT Auth</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Key Design Decisions</div>
          <div className="chip blue">4 found</div>
        </div>
        <div className="panel-body">
          <div className="insight-list">
            <div className="insight-item">
              <div className="i-dot pos">1</div>
              <div className="i-text">
                <strong>JWT over session-based auth</strong> — Evidence in{" "}
                <code>middleware/auth.js:L8-L22</code>. Implies stateless API
                enabling horizontal scaling without shared session stores.
              </div>
            </div>
            <div className="insight-item">
              <div className="i-dot pos">2</div>
              <div className="i-text">
                <strong>MongoDB over relational DB</strong> — User schemas in{" "}
                <code>models/</code> use embedded subdocuments. Suggests
                flexible schema requirements during MVP development.
              </div>
            </div>
            <div className="insight-item">
              <div className="i-dot warn">3</div>
              <div className="i-text">
                <strong>No caching layer</strong> — Repeated API calls in{" "}
                <code>src/hooks/useData.js</code> hit the DB every time. Redis
                or React Query would address this.
              </div>
            </div>
            <div className="insight-item">
              <div className="i-dot warn">4</div>
              <div className="i-text">
                <strong>No startup config validation</strong> — Missing required
                env vars silently crash at runtime. Add a validation check on
                startup.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Interview Narrative</div>
          <div className="chip green">Ready to use</div>
        </div>
        <div className="panel-body">
          <div
            style={{
              background: "var(--surface2)",
              borderLeft: "3px solid var(--accent)",
              borderRadius: "0 7px 7px 0",
              padding: "16px",
              fontSize: "13px",
              color: "var(--text2)",
              lineHeight: "1.75",
              fontStyle: "italic",
            }}
          >
            "I built a full-stack MERN application with a stateless REST API and
            JWT-based authentication. I chose MongoDB for flexible schema
            design, and structured the Express backend using MVC to separate
            routing, business logic, and data access. JWT over sessions allowed
            the React frontend to store the token locally and keeps the API
            truly stateless — which matters for scaling. In hindsight I'd add
            Joi validation and centralized error handling — areas I'm actively
            addressing."
          </div>
          <button
            className="btn-ghost"
            style={{
              width: "auto",
              marginTop: "12px",
              padding: "7px 14px",
              fontSize: "12px",
            }}
          >
            Copy Narrative
          </button>
        </div>
      </div>
    </>
  );
};

export default ReportTab;
