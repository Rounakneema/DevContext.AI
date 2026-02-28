import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  createInterviewSession,
  submitAnswer as apiSubmitAnswer,
  completeInterviewSession,
  InterviewQuestion,
  AnswerEvaluation,
  InterviewSession,
  InterviewSummary,
} from "../../services/api";
import AnswerEvaluationPanel from "./AnswerEvaluationPanel";
import InterviewSummaryPanel from "./InterviewSummaryPanel";

interface InterviewTabProps {
  analysisId?: string;
}

type SessionPhase = "config" | "loading" | "active" | "evaluating" | "summary";

const InterviewTab: React.FC<InterviewTabProps> = ({ analysisId }) => {
  // Session state
  const [phase, setPhase] = useState<SessionPhase>("config");
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [currentEvaluation, setCurrentEvaluation] = useState<AnswerEvaluation | null>(null);
  const [summary, setSummary] = useState<InterviewSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Answer state
  const [answer, setAnswer] = useState("");
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Config state
  const [questionFocus, setQuestionFocus] = useState<"technical" | "behavioral" | "mixed">("technical");
  const [targetRole, setTargetRole] = useState("Junior Software Engineer");
  const [sessionLength, setSessionLength] = useState<5 | 10 | 15>(10);

  // Timer effect
  useEffect(() => {
    if (phase === "active" && currentQuestion) {
      setQuestionStartTime(Date.now());
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - questionStartTime) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentQuestion, questionStartTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startInterview = useCallback(async () => {
    if (!analysisId) {
      setError("No analysis ID provided. Please complete an analysis first.");
      return;
    }

    setPhase("loading");
    setError(null);

    try {
      const questionTypes: ("technical" | "behavioral" | "system-design")[] =
        questionFocus === "mixed"
          ? ["technical", "behavioral", "system-design"]
          : questionFocus === "behavioral"
          ? ["behavioral"]
          : ["technical", "system-design"];

      const newSession = await createInterviewSession({
        analysisId,
        config: {
          questionCount: sessionLength,
          questionTypes,
          targetRole,
        },
      });

      setSession(newSession);
      setCurrentQuestion(newSession.questions[0]);
      setAnswer("");
      setElapsedSeconds(0);
      setPhase("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start interview session");
      setPhase("config");
    }
  }, [analysisId, questionFocus, sessionLength, targetRole]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!session || !currentQuestion || !answer.trim()) return;

    setPhase("evaluating");
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

    try {
      const response = await apiSubmitAnswer(session.sessionId, {
        questionId: currentQuestion.questionId,
        answer: answer.trim(),
        timeSpentSeconds: timeSpent,
      });

      setCurrentEvaluation(response.evaluation);
      
      // Update session with the answer
      setSession((prev) =>
        prev
          ? {
              ...prev,
              answers: [
                ...prev.answers,
                {
                  questionId: currentQuestion.questionId,
                  answer: answer.trim(),
                  evaluation: response.evaluation,
                  timeSpentSeconds: timeSpent,
                },
              ],
              currentQuestionIndex: prev.currentQuestionIndex + 1,
            }
          : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer");
      setPhase("active");
    }
  }, [session, currentQuestion, answer, questionStartTime]);

  const handleNextQuestion = useCallback(async () => {
    if (!session) return;

    const nextIndex = session.currentQuestionIndex;
    
    if (nextIndex >= session.questions.length) {
      // Complete the session
      try {
        const completedSession = await completeInterviewSession(session.sessionId);
        setSummary(completedSession.summary || null);
        setPhase("summary");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to complete session");
        setPhase("active");
      }
    } else {
      // Move to next question
      setCurrentQuestion(session.questions[nextIndex]);
      setCurrentEvaluation(null);
      setAnswer("");
      setElapsedSeconds(0);
      setQuestionStartTime(Date.now());
      setPhase("active");
    }
  }, [session]);

  const handleSkipQuestion = useCallback(() => {
    if (!session) return;
    
    const nextIndex = session.currentQuestionIndex + 1;
    
    setSession((prev) =>
      prev
        ? {
            ...prev,
            currentQuestionIndex: nextIndex,
          }
        : null
    );

    if (nextIndex >= session.questions.length) {
      handleNextQuestion();
    } else {
      setCurrentQuestion(session.questions[nextIndex]);
      setAnswer("");
      setElapsedSeconds(0);
      setQuestionStartTime(Date.now());
    }
  }, [session, handleNextQuestion]);

  const handleStartNew = useCallback(() => {
    setPhase("config");
    setSession(null);
    setCurrentQuestion(null);
    setCurrentEvaluation(null);
    setSummary(null);
    setAnswer("");
    setError(null);
  }, []);

  // Loading state
  if (phase === "loading") {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
        <div style={{ fontSize: "14px", color: "var(--text2)" }}>
          Generating interview questions...
        </div>
      </div>
    );
  }

  // Summary state
  if (phase === "summary" && summary) {
    return (
      <div className="panel" style={{ overflow: "hidden" }}>
        <InterviewSummaryPanel
          summary={summary}
          onStartNew={handleStartNew}
          onViewDetails={() => {}}
        />
      </div>
    );
  }

  // Active interview or evaluating
  if ((phase === "active" || phase === "evaluating") && session && currentQuestion) {
    const answeredCount = session.answers.length;
    const totalQuestions = session.questions.length;
    const isLastQuestion = session.currentQuestionIndex >= totalQuestions - 1;

    return (
      <>
        {/* Progress Bar */}
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
            <div style={{ fontSize: "12.5px", color: "var(--text2)", fontWeight: "500" }}>
              Question {currentQuestion.questionNumber} / {totalQuestions}
            </div>
            <div style={{ display: "flex", gap: "5px" }}>
              {session.questions.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background:
                      i < answeredCount
                        ? "#27AE60"
                        : i === session.currentQuestionIndex
                        ? "var(--accent)"
                        : "var(--border2)",
                    animation: i === session.currentQuestionIndex ? "blink 1s infinite" : "none",
                  }}
                />
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
            {formatTime(elapsedSeconds)}
          </div>
        </div>

        {/* Question Card */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "18px 20px",
            marginBottom: "14px",
          }}
        >
          <div style={{ fontSize: "11px", color: "var(--text3)", fontWeight: "500", marginBottom: "8px" }}>
            Q{currentQuestion.questionNumber} · {currentQuestion.type} · {currentQuestion.category}
          </div>
          <div style={{ fontSize: "14px", color: "var(--text)", lineHeight: "1.65" }}>
            {currentQuestion.question}
          </div>
          {currentQuestion.groundedIn.length > 0 && (
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
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Grounded in: {currentQuestion.groundedIn.join(" · ")}
            </div>
          )}
        </div>

        {/* Answer Input */}
        {phase === "active" && (
          <>
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
              <div style={{ fontSize: "11.5px", color: "var(--text3)" }}>{answer.length} / 800</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn-secondary" onClick={handleSkipQuestion}>
                  Skip
                </button>
                <button
                  className="btn-accent"
                  onClick={handleSubmitAnswer}
                  disabled={!answer.trim()}
                  style={{ opacity: !answer.trim() ? 0.5 : 1 }}
                >
                  Submit Answer →
                </button>
              </div>
            </div>
          </>
        )}

        {/* Evaluating State */}
        {phase === "evaluating" && !currentEvaluation && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
            <div style={{ fontSize: "13px", color: "var(--text2)" }}>Evaluating your answer...</div>
          </div>
        )}

        {/* Evaluation Panel */}
        {currentEvaluation && (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              overflow: "hidden",
              marginTop: "14px",
            }}
          >
            <AnswerEvaluationPanel
              evaluation={currentEvaluation}
              onNext={handleNextQuestion}
              isLastQuestion={isLastQuestion}
            />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div
            style={{
              background: "#FEF4F4",
              border: "1px solid #FACACA",
              borderRadius: "8px",
              padding: "12px 16px",
              marginTop: "14px",
              color: "#C0392B",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}
      </>
    );
  }

  // Config screen
  return (
    <>
      <div className="view-title">Mock Interview</div>
      <div className="view-sub">
        Practice explaining your project with AI-generated questions tailored to
        your codebase.
      </div>

      {error && (
        <div
          style={{
            background: "#FEF4F4",
            border: "1px solid #FACACA",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "14px",
            color: "#C0392B",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

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
            {(["technical", "behavioral", "mixed"] as const).map((mode) => (
              <div
                key={mode}
                onClick={() => setQuestionFocus(mode)}
                style={{
                  background: questionFocus === mode ? "var(--accent-light)" : "var(--surface)",
                  border: questionFocus === mode ? "1px solid var(--accent)" : "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "14px",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "3px", textTransform: "capitalize" }}>
                  {mode}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                  {mode === "technical" && "Architecture & code"}
                  {mode === "behavioral" && "STAR-format stories"}
                  {mode === "mixed" && "Both types"}
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
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
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
            {([
              { value: 5 as const, label: "Quick", sub: "5 questions · 10 min" },
              { value: 10 as const, label: "Standard", sub: "10 questions · 20 min" },
              { value: 15 as const, label: "Full", sub: "15 questions · 30 min" },
            ]).map((length) => (
              <div
                key={length.value}
                onClick={() => setSessionLength(length.value)}
                style={{
                  background: sessionLength === length.value ? "var(--accent-light)" : "var(--surface)",
                  border: sessionLength === length.value ? "1px solid var(--accent)" : "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "14px",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "3px" }}>
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
          <div className="chip blue">Preview</div>
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
                More questions generated from your codebase…
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InterviewTab;
