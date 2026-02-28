import React, { useState } from "react";

interface InterviewTabProps {
  analysisData: any;
  analysisId: string;
}

const InterviewTab: React.FC<InterviewTabProps> = ({ analysisData, analysisId }) => {
  const [isLiveSession, setIsLiveSession] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answer, setAnswer] = useState("");

  const startInterview = () => {
    setIsLiveSession(true);
  };

  const submitAnswer = () => {
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    setAnswer("");
  };

  if (isLiveSession) {
    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "12px 18px",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                fontSize: "12.5px",
                color: "var(--text2)",
                fontWeight: "500",
              }}
            >
              Question 2 / 10
            </div>
            <div style={{ display: "flex", gap: "5px" }}>
              <div
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#27AE60",
                }}
              ></div>
              <div
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  animation: "blink 1s infinite",
                }}
              ></div>
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: "var(--border2)",
                  }}
                ></div>
              ))}
            </div>
          </div>
          <div
            style={{
              background: "#FEF3DC",
              color: "#A06000",
              borderRadius: "6px",
              padding: "4px 12px",
              fontSize: "13px",
              fontWeight: "600",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            12:34
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "18px 20px",
            marginBottom: "14px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "var(--text3)",
              fontWeight: "500",
              marginBottom: "8px",
            }}
          >
            Q2 · Technical · Architecture
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "var(--text)",
              lineHeight: "1.65",
            }}
          >
            Walk me through the data flow when a user submits the login form —
            from the React component to the MongoDB read and back. Be specific
            about each layer.
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              background: "var(--accent-light)",
              color: "var(--accent)",
              fontSize: "11px",
              padding: "3px 9px",
              borderRadius: "4px",
              marginTop: "10px",
              fontWeight: "500",
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Grounded in: controllers/authController.js · models/User.js
          </div>
        </div>

        <textarea
          className="answer-textarea"
          placeholder="Type your answer here…"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          style={{
            width: "100%",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "14px",
            fontFamily: "Geist, sans-serif",
            fontSize: "13px",
            color: "var(--text)",
            resize: "none",
            outline: "none",
            minHeight: "130px",
            lineHeight: "1.6",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "10px",
          }}
        >
          <div style={{ fontSize: "11.5px", color: "var(--text3)" }}>
            {answer.length} / 800
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn-secondary" onClick={nextQuestion}>
              Skip
            </button>
            <button className="btn-accent" onClick={submitAnswer}>
              Submit Answer →
            </button>
          </div>
        </div>

        {showFeedback && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              overflow: "hidden",
              marginTop: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 18px",
                background: "#F4FCF8",
                borderBottom: "1px solid #C8F0DF",
              }}
            >
              <div
                style={{
                  background: "#E67E22",
                  color: "white",
                  borderRadius: "7px",
                  padding: "5px 12px",
                  fontSize: "14px",
                  fontWeight: "700",
                }}
              >
                7.2 / 10
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: "600" }}>
                Good answer — a few gaps identified
              </div>
            </div>
            <div style={{ padding: "18px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  marginBottom: "14px",
                }}
              >
                <div
                  style={{
                    background: "var(--surface2)",
                    borderRadius: "7px",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10.5px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: "8px",
                      color: "#1E8A4C",
                    }}
                  >
                    ✓ STRENGTHS
                  </div>
                  <ul
                    style={{
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <li
                      style={{
                        fontSize: "12.5px",
                        color: "var(--text2)",
                        display: "flex",
                        gap: "6px",
                        alignItems: "flex-start",
                      }}
                    >
                      <span style={{ color: "var(--text3)", flexShrink: 0 }}>
                        –
                      </span>
                      Correctly identified JWT validation in middleware
                    </li>
                    <li
                      style={{
                        fontSize: "12.5px",
                        color: "var(--text2)",
                        display: "flex",
                        gap: "6px",
                        alignItems: "flex-start",
                      }}
                    >
                      <span style={{ color: "var(--text3)", flexShrink: 0 }}>
                        –
                      </span>
                      Mentioned async/await pattern in controller
                    </li>
                    <li
                      style={{
                        fontSize: "12.5px",
                        color: "var(--text2)",
                        display: "flex",
                        gap: "6px",
                        alignItems: "flex-start",
                      }}
                    >
                      <span style={{ color: "var(--text3)", flexShrink: 0 }}>
                        –
                      </span>
                      Demonstrated MVC separation understanding
                    </li>
                  </ul>
                </div>
                <div
                  style={{
                    background: "var(--surface2)",
                    borderRadius: "7px",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10.5px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: "8px",
                      color: "#C0392B",
                    }}
                  >
                    ✗ GAPS
                  </div>
                  <ul
                    style={{
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    <li
                      style={{
                        fontSize: "12.5px",
                        color: "var(--text2)",
                        display: "flex",
                        gap: "6px",
                        alignItems: "flex-start",
                      }}
                    >
                      <span style={{ color: "var(--text3)", flexShrink: 0 }}>
                        –
                      </span>
                      Didn't mention bcrypt password hashing step
                    </li>
                    <li
                      style={{
                        fontSize: "12.5px",
                        color: "var(--text2)",
                        display: "flex",
                        gap: "6px",
                        alignItems: "flex-start",
                      }}
                    >
                      <span style={{ color: "var(--text3)", flexShrink: 0 }}>
                        –
                      </span>
                      Missed CORS middleware before route handlers
                    </li>
                    <li
                      style={{
                        fontSize: "12.5px",
                        color: "var(--text2)",
                        display: "flex",
                        gap: "6px",
                        alignItems: "flex-start",
                      }}
                    >
                      <span style={{ color: "var(--text3)", flexShrink: 0 }}>
                        –
                      </span>
                      Didn't address invalid credentials flow
                    </li>
                  </ul>
                </div>
              </div>
              <div
                style={{
                  background: "#EEF0FF",
                  border: "1px solid #C8D0FF",
                  borderRadius: "7px",
                  padding: "12px 14px",
                  fontSize: "13px",
                  color: "#3B4BDB",
                  lineHeight: "1.55",
                }}
              >
                <strong>Follow-up:</strong> You mentioned JWT is generated on
                login. Where exactly is that token stored on the client, and
                what are the security implications?
              </div>
              <button
                className="btn-accent"
                style={{ marginTop: "14px" }}
                onClick={nextQuestion}
              >
                Next Question →
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="view-title">Mock Interview</div>
      <div className="view-sub">
        Practice explaining your project with AI-generated questions tailored to
        your codebase.
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Configure Session</div>
        </div>
        <div className="panel-body">
          <div
            style={{
              fontSize: "12px",
              fontWeight: "500",
              color: "var(--text2)",
              marginBottom: "8px",
            }}
          >
            Question Focus
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
              margin: "14px 0 20px",
            }}
          >
            {["Technical", "Behavioural", "Mixed"].map((mode, idx) => (
              <div
                key={mode}
                className={idx === 0 ? "mode-card sel" : "mode-card"}
                style={{
                  background:
                    idx === 0 ? "var(--accent-light)" : "var(--surface)",
                  border:
                    idx === 0
                      ? "1px solid var(--accent)"
                      : "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "14px",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    marginBottom: "3px",
                  }}
                >
                  {mode}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                  {mode === "Technical" && "Architecture & code"}
                  {mode === "Behavioural" && "STAR-format stories"}
                  {mode === "Mixed" && "Both types"}
                </div>
              </div>
            ))}
          </div>

          <label
            style={{
              display: "block",
              fontSize: "11.5px",
              fontWeight: "500",
              color: "var(--text2)",
              marginBottom: "6px",
              marginTop: "14px",
            }}
          >
            Target Role
          </label>
          <select
            style={{
              width: "100%",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "7px",
              padding: "9px 12px",
              fontFamily: "Geist, sans-serif",
              fontSize: "13px",
              color: "var(--text)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option>Junior Software Engineer</option>
            <option>Full Stack Developer</option>
            <option>Backend Developer</option>
            <option>SDE-1 (Product Company)</option>
          </select>

          <label
            style={{
              display: "block",
              fontSize: "11.5px",
              fontWeight: "500",
              color: "var(--text2)",
              marginBottom: "6px",
              marginTop: "14px",
            }}
          >
            Session Length
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
              marginBottom: "18px",
            }}
          >
            {[
              { label: "Quick", sub: "5 questions · 10 min" },
              { label: "Standard", sub: "10 questions · 20 min" },
              { label: "Full", sub: "15 questions · 30 min" },
            ].map((length, idx) => (
              <div
                key={length.label}
                className={idx === 1 ? "mode-card sel" : "mode-card"}
                style={{
                  background:
                    idx === 1 ? "var(--accent-light)" : "var(--surface)",
                  border:
                    idx === 1
                      ? "1px solid var(--accent)"
                      : "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "14px",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    marginBottom: "3px",
                  }}
                >
                  {length.label}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                  {length.sub}
                </div>
              </div>
            ))}
          </div>

          <button className="btn-accent" onClick={startInterview}>
            Start Live Interview →
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Sample Questions</div>
          <div className="chip blue">10 ready</div>
        </div>
        <div className="panel-body">
          <div className="insight-list">
            <div className="insight-item">
              <div
                className="i-dot pos"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                }}
              >
                Q
              </div>
              <div className="i-text" style={{ fontSize: "12.5px" }}>
                Why did you choose JWT over session-based auth in{" "}
                <code>middleware/auth.js</code>? What are the tradeoffs?
              </div>
            </div>
            <div className="insight-item">
              <div
                className="i-dot pos"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                }}
              >
                Q
              </div>
              <div className="i-text" style={{ fontSize: "12.5px" }}>
                Walk me through the login data flow — from the React form to the
                MongoDB read and back.
              </div>
            </div>
            <div className="insight-item">
              <div
                className="i-dot pos"
                style={{
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                }}
              >
                Q
              </div>
              <div className="i-text" style={{ fontSize: "12.5px" }}>
                What would you change if this project needed to support 10,000
                concurrent users?
              </div>
            </div>
            <div className="insight-item" style={{ opacity: 0.4 }}>
              <div className="i-dot pos">+</div>
              <div className="i-text" style={{ fontSize: "12.5px" }}>
                7 more questions available in the live session…
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InterviewTab;
