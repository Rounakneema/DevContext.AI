import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    createInterviewSession,
    submitAnswer as apiSubmitAnswer,
    completeInterviewSession,
    InterviewQuestion,
    AnswerEvaluation,
    InterviewSession,
    InterviewSummary,
} from "../services/api";

type Phase = "config" | "loading" | "active" | "evaluating" | "done";

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

function scoreColor(score: number) {
    if (score >= 80) return "#6fcf97";
    if (score >= 60) return "#f6ad55";
    return "#fc8181";
}

const GRADIENTS: Record<string, string> = {
    technical: "linear-gradient(135deg, #7C5CDB 0%, #5a3db5 100%)",
    behavioral: "linear-gradient(135deg, #27ae60 0%, #1a7a42 100%)",
    "system-design": "linear-gradient(135deg, #2980b9 0%, #1a5c8a 100%)",
};

const pageStyle: React.CSSProperties = {
    minHeight: "100vh", background: "#0d0d12", color: "#e8e8f0",
    fontFamily: "Geist, -apple-system, sans-serif",
};

const BgBlobs = () => (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,92,219,0.1) 0%, transparent 70%)", top: -150, left: -150, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(41,128,185,0.08) 0%, transparent 70%)", bottom: "5%", right: "-10%", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(124,92,219,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,219,0.04) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
    </div>
);

const backBtnStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
    padding: "7px 14px", color: "rgba(232,232,240,0.7)", fontFamily: "Geist, sans-serif",
    fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
};

const configCardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 18, overflow: "hidden",
};

const cfgInputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, padding: "11px 14px", fontFamily: "Geist, sans-serif", fontSize: 14,
    color: "#e8e8f0", outline: "none", boxSizing: "border-box",
};

const ConfigSection: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e8e8f0", marginBottom: hint ? 4 : 12 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: "rgba(232,232,240,0.35)", marginBottom: 12 }}>{hint}</div>}
        {children}
    </div>
);

const InterviewPage: React.FC = () => {
    const navigate = useNavigate();
    const { analysisId } = useParams<{ analysisId: string }>();
    const [searchParams] = useSearchParams();
    const effectiveAnalysisId = analysisId || searchParams.get("id") || undefined;

    const [phase, setPhase] = useState<Phase>("config");
    const [session, setSession] = useState<InterviewSession | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
    const [currentEval, setCurrentEval] = useState<AnswerEvaluation | null>(null);
    const [summary, setSummary] = useState<InterviewSummary | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [focus, setFocus] = useState<"technical" | "behavioral" | "mixed">("technical");
    const [role, setRole] = useState("Senior Software Engineer");
    const [count, setCount] = useState<5 | 10 | 15>(10);
    const [answer, setAnswer] = useState("");
    const [elapsed, setElapsed] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (phase === "active" && currentQuestion) {
            setStartTime(Date.now());
            setElapsed(0);
            timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, currentQuestion?.questionId]);

    const currentIndex = session && session.questions ? session.questions.findIndex(q => q.questionId === currentQuestion?.questionId) : 0;
    const totalQuestions = session?.questions?.length ?? count;

    const startSession = useCallback(async () => {
        if (!effectiveAnalysisId) { setError("No analysis ID. Please run an analysis first."); return; }
        setPhase("loading"); setError(null);
        try {
            const types: ("technical" | "behavioral" | "system-design")[] =
                focus === "mixed" ? ["technical", "behavioral", "system-design"]
                    : focus === "behavioral" ? ["behavioral"]
                        : ["technical", "system-design"];
            const newSession = await createInterviewSession({ analysisId: effectiveAnalysisId, config: { questionCount: count, questionTypes: types, targetRole: role } });
            setSession(newSession);
            setCurrentQuestion(newSession.questions?.[0] || null);
            setAnswer(""); setPhase("active");
        } catch (e: any) {
            setError(e.message || "Failed to start interview."); setPhase("config");
        }
    }, [effectiveAnalysisId, focus, count, role]);

    const submitAnswer = useCallback(async () => {
        if (!session || !currentQuestion || !answer.trim()) return;
        setPhase("evaluating");
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        try {
            const result = await apiSubmitAnswer(session.sessionId, {
                questionId: currentQuestion.questionId,
                answer: answer.trim(),
                timeSpentSeconds: timeSpent,
            });
            setCurrentEval((result as any).evaluation ?? (result as any));
        } catch (e: any) {
            setError(e.message || "Failed to submit answer."); setPhase("active");
        }
    }, [session, currentQuestion, answer, startTime]);

    const nextQuestion = useCallback(async () => {
        if (!session) return;
        const nextIdx = currentIndex + 1;
        const questionsLength = session.questions?.length || 0;

        if (nextIdx >= questionsLength) {
            setPhase("loading");
            try {
                const sum = await completeInterviewSession(session.sessionId);
                setSummary(sum as any); setPhase("done");
            } catch {
                setSummary(null); setPhase("done");
            }
        } else {
            setCurrentQuestion(session.questions?.[nextIdx] || null);
            setAnswer(""); setCurrentEval(null); setPhase("active");
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [session, currentIndex]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); submitAnswer(); }
    };

    /* ── CONFIG ── */
    if (phase === "config") {
        return (
            <div style={pageStyle}>
                <BgBlobs />
                <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 24px" }}>
                    <button onClick={() => navigate(-1)} style={backBtnStyle}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                        Back
                    </button>

                    <div style={{ textAlign: "center", marginBottom: 48, marginTop: 32 }}>
                        <div style={{ fontSize: 48, marginBottom: 16 }}>🎙️</div>
                        <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: -1, marginBottom: 12 }}>Mock Interview</h1>
                        <p style={{ fontSize: 16, color: "rgba(232,232,240,0.5)", lineHeight: 1.6 }}>
                            Answer questions about <strong style={{ color: "#a78bfa" }}>your project</strong>.<br />
                            AI evaluates your responses in real-time.
                        </p>
                    </div>

                    {!effectiveAnalysisId && (
                        <div style={{ background: "rgba(231,76,60,0.12)", border: "1px solid rgba(231,76,60,0.3)", borderRadius: 12, padding: "16px 20px", marginBottom: 28, fontSize: 14, color: "#fc8181", lineHeight: 1.6 }}>
                            ⚠️ No analysis selected. Please <span onClick={() => navigate("/app")} style={{ textDecoration: "underline", cursor: "pointer" }}>start an analysis</span> first.
                        </div>
                    )}
                    {error && <div style={{ background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.25)", borderRadius: 10, padding: "14px 18px", color: "#fc8181", fontSize: 14, marginBottom: 24 }}>{error}</div>}

                    <div style={configCardStyle}>
                        <ConfigSection label="Target Role" hint="Questions will be calibrated to this level">
                            <input value={role} onChange={e => setRole(e.target.value)} style={cfgInputStyle} placeholder="e.g. Senior Software Engineer" />
                        </ConfigSection>
                        <ConfigSection label="Question Focus">
                            <div style={{ display: "flex", gap: 10 }}>
                                {(["technical", "behavioral", "mixed"] as const).map(f => (
                                    <button key={f} onClick={() => setFocus(f)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: focus === f ? "1px solid #7C5CDB" : "1px solid rgba(255,255,255,0.12)", background: focus === f ? "rgba(124,92,219,0.2)" : "rgba(255,255,255,0.04)", color: focus === f ? "#a78bfa" : "rgba(232,232,240,0.6)", fontFamily: "Geist, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s" }}>{f}</button>
                                ))}
                            </div>
                        </ConfigSection>
                        <ConfigSection label="Session Length">
                            <div style={{ display: "flex", gap: 10 }}>
                                {([5, 10, 15] as const).map(n => (
                                    <button key={n} onClick={() => setCount(n)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: count === n ? "1px solid #7C5CDB" : "1px solid rgba(255,255,255,0.12)", background: count === n ? "rgba(124,92,219,0.2)" : "rgba(255,255,255,0.04)", color: count === n ? "#a78bfa" : "rgba(232,232,240,0.6)", fontFamily: "Geist, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{n} Q</button>
                                ))}
                            </div>
                        </ConfigSection>
                        <div style={{ padding: "0 24px 24px" }}>
                            <div style={{ fontSize: 12, color: "rgba(232,232,240,0.4)", marginBottom: 16, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                                ⏱ Timer per question · Real-time AI evaluation · Full session summary
                            </div>
                            <button onClick={startSession} disabled={!effectiveAnalysisId} style={{ width: "100%", padding: "15px", background: "linear-gradient(135deg, #7C5CDB, #5a3db5)", border: "none", borderRadius: 12, fontFamily: "Geist, sans-serif", fontSize: 16, fontWeight: 800, color: "#fff", cursor: effectiveAnalysisId ? "pointer" : "not-allowed", opacity: effectiveAnalysisId ? 1 : 0.4 }}>
                                Start Interview →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── LOADING ── */
    if (phase === "loading") {
        return (
            <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BgBlobs />
                <div style={{ textAlign: "center" }}>
                    <div style={{ width: 56, height: 56, border: "4px solid rgba(124,92,219,0.2)", borderTopColor: "#7C5CDB", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 24px" }} />
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Preparing your interview…</div>
                    <div style={{ fontSize: 14, color: "rgba(232,232,240,0.4)" }}>Generating project-specific questions</div>
                </div>
            </div>
        );
    }

    /* ── DONE / SUMMARY ── */
    if (phase === "done") {
        const avg = summary ? Math.round((summary as any).overallScore ?? 0) : 0;
        return (
            <div style={pageStyle}>
                <BgBlobs />
                <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px" }}>
                    <div style={{ textAlign: "center", marginBottom: 48 }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>{avg >= 80 ? "🏆" : avg >= 60 ? "🎯" : "📈"}</div>
                        <h1 style={{ fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: -1, marginBottom: 12 }}>Interview Complete!</h1>
                        <p style={{ fontSize: 16, color: "rgba(232,232,240,0.5)" }}>Here's how you performed across {totalQuestions} questions</p>
                    </div>

                    {/* Score ring */}
                    <div style={{ textAlign: "center", marginBottom: 40 }}>
                        <div style={{ position: "relative", display: "inline-block" }}>
                            <svg width="160" height="160" viewBox="0 0 160 160">
                                <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                                <circle cx="80" cy="80" r="68" fill="none" stroke={scoreColor(avg)} strokeWidth="10"
                                    strokeDasharray={`${2 * Math.PI * 68 * avg / 100} ${2 * Math.PI * 68}`}
                                    strokeLinecap="round" transform="rotate(-90 80 80)" />
                            </svg>
                            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                <div style={{ fontSize: 36, fontWeight: 900, color: scoreColor(avg) }}>{avg}</div>
                                <div style={{ fontSize: 12, color: "rgba(232,232,240,0.4)", fontWeight: 600 }}>SCORE</div>
                            </div>
                        </div>
                    </div>

                    {summary && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
                            {[["Questions", totalQuestions, "📋"], ["Avg Score", `${avg}/100`, "📊"], ["Strong Areas", (summary as any).strongAreas?.length ?? "—", "⚡"]].map(([label, value, icon], i) => (
                                <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
                                    <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{value}</div>
                                    <div style={{ fontSize: 12, color: "rgba(232,232,240,0.4)" }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {summary && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
                            {([{ title: "💪 Strengths", items: (summary as any).strongAreas || [], color: "#6fcf97" }, { title: "📈 Areas to Improve", items: (summary as any).weakAreas || [], color: "#f6ad55" }] as const).map(({ title, items, color }) => (
                                <div key={title} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px" }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>{title}</div>
                                    {(items as string[]).length === 0 ? <div style={{ fontSize: 13, color: "rgba(232,232,240,0.3)", fontStyle: "italic" }}>—</div> :
                                        (items as string[]).map((item, i) => (
                                            <div key={i} style={{ fontSize: 13, color: color, marginBottom: 6, display: "flex", gap: 8 }}>
                                                <span>•</span><span>{item}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={() => { setPhase("config"); setSession(null); setSummary(null); setCurrentEval(null); setAnswer(""); }} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, fontFamily: "Geist, sans-serif", fontSize: 15, fontWeight: 700, color: "#e8e8f0", cursor: "pointer" }}>
                            Retry Interview
                        </button>
                        <button onClick={() => navigate("/app/dashboard")} style={{ flex: 1, padding: "14px", background: "linear-gradient(135deg, #7C5CDB, #5a3db5)", border: "none", borderRadius: 12, fontFamily: "Geist, sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                            View Dashboard →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ── ACTIVE / EVALUATING ── */
    if (!currentQuestion) return null;

    const qType = (currentQuestion as any).type || (currentQuestion as any).questionType || "technical";
    const gradient = GRADIENTS[qType] || GRADIENTS.technical;
    const qProgress = ((currentIndex + 1) / totalQuestions) * 100;

    return (
        <div style={pageStyle}>
            <BgBlobs />

            {/* Top navbar */}
            <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(13,13,18,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button onClick={() => navigate(-1)} style={backBtnStyle}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                        Exit
                    </button>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(232,232,240,0.6)" }}>
                        Question <span style={{ color: "#fff" }}>{currentIndex + 1}</span> of <span style={{ color: "#fff" }}>{totalQuestions}</span>
                    </div>
                </div>
                <div style={{ flex: 1, maxWidth: 300, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, margin: "0 24px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${qProgress}%`, background: gradient, borderRadius: 2, transition: "width 0.4s ease" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: elapsed > 120 ? "#fc8181" : "rgba(232,232,240,0.7)", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "6px 12px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    {fmtTime(elapsed)}
                </div>
            </div>

            <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 24px" }}>
                {/* Badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "#a78bfa", background: "rgba(124,92,219,0.15)", border: "1px solid rgba(124,92,219,0.25)", borderRadius: 6, padding: "4px 10px" }}>
                        {qType.replace("-", " ")}
                    </div>
                    <div style={{ fontSize: 13, color: "rgba(232,232,240,0.35)", fontStyle: "italic" }}>{role}</div>
                </div>

                {/* Question */}
                <div style={{ marginBottom: 36 }}>
                    <h2 style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1.4, letterSpacing: -0.3 }}>
                        {currentQuestion.question}
                    </h2>
                </div>

                {/* Hint */}
                {(currentQuestion as any).hint && (
                    <div style={{ background: "rgba(124,92,219,0.08)", border: "1px solid rgba(124,92,219,0.2)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "rgba(232,232,240,0.55)", marginBottom: 28, lineHeight: 1.6, display: "flex", gap: 10 }}>
                        <span style={{ flexShrink: 0 }}>💡</span>
                        {(currentQuestion as any).hint}
                    </div>
                )}

                {phase === "evaluating" ? (
                    <div style={{ textAlign: "center", padding: "64px 24px" }}>
                        <div style={{ width: 48, height: 48, border: "4px solid rgba(124,92,219,0.2)", borderTopColor: "#7C5CDB", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 24px" }} />
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Evaluating your answer…</div>
                        <div style={{ fontSize: 14, color: "rgba(232,232,240,0.4)" }}>Mistral Large 3 is analysing your response</div>
                    </div>
                ) : currentEval ? (
                    /* EVAL RESULT */
                    <div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                            {[
                                ["Score", `${Math.round((currentEval as any).score ?? currentEval.overallScore ?? 0)}/100`, scoreColor((currentEval as any).score ?? currentEval.overallScore ?? 0)],
                                ["Accuracy", `${Math.round((currentEval as any).accuracy ?? 0)}%`, "#a78bfa"],
                                ["Depth", `${Math.round((currentEval as any).depth ?? 0)}%`, "#5ac8fa"],
                            ].map(([label, value, color]) => (
                                <div key={label as string} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: color as string, marginBottom: 4 }}>{value}</div>
                                    <div style={{ fontSize: 12, color: "rgba(232,232,240,0.4)", fontWeight: 600 }}>{label}</div>
                                </div>
                            ))}
                        </div>

                        {currentEval.feedback && (
                            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(232,232,240,0.6)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>AI Feedback</div>
                                <p style={{ fontSize: 15, color: "#e8e8f0", lineHeight: 1.75, margin: 0 }}>{currentEval.feedback}</p>
                            </div>
                        )}

                        {(currentEval as any).modelAnswer && (
                            <details style={{ marginBottom: 24 }}>
                                <summary style={{ fontSize: 13, fontWeight: 600, color: "#a78bfa", cursor: "pointer", padding: "10px 0", listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
                                    <span>▶</span> View model answer
                                </summary>
                                <div style={{ background: "rgba(124,92,219,0.06)", border: "1px solid rgba(124,92,219,0.15)", borderRadius: 12, padding: "16px 20px", marginTop: 10, fontSize: 14, color: "rgba(232,232,240,0.7)", lineHeight: 1.75 }}>
                                    {(currentEval as any).modelAnswer}
                                </div>
                            </details>
                        )}

                        <button onClick={nextQuestion} style={{ width: "100%", padding: "15px", background: "linear-gradient(135deg, #7C5CDB, #5a3db5)", border: "none", borderRadius: 12, fontFamily: "Geist, sans-serif", fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer" }}>
                            {currentIndex + 1 >= totalQuestions ? "Finish Interview →" : "Next Question →"}
                        </button>
                    </div>
                ) : (
                    /* ANSWER INPUT */
                    <div>
                        <div style={{ position: "relative" }}>
                            <textarea
                                ref={textareaRef}
                                value={answer}
                                onChange={e => setAnswer(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Type your answer here… (Ctrl+Enter to submit)"
                                style={{ width: "100%", minHeight: 220, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "18px 20px", fontFamily: "Geist, sans-serif", fontSize: 15, color: "#e8e8f0", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.7, colorScheme: "dark" }}
                                autoFocus
                            />
                            <div style={{ position: "absolute", bottom: 12, right: 14, fontSize: 12, color: "rgba(232,232,240,0.25)" }}>
                                {answer.length} chars
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
                            <div style={{ fontSize: 12, color: "rgba(232,232,240,0.3)" }}>Ctrl+Enter to submit</div>
                            <button onClick={submitAnswer} disabled={!answer.trim()} style={{ padding: "13px 32px", background: answer.trim() ? "linear-gradient(135deg, #7C5CDB, #5a3db5)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 12, fontFamily: "Geist, sans-serif", fontSize: 15, fontWeight: 800, color: answer.trim() ? "#fff" : "rgba(232,232,240,0.3)", cursor: answer.trim() ? "pointer" : "not-allowed" }}>
                                Submit Answer →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InterviewPage;
