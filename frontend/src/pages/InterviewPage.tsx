import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    createInterviewSession,
    getInterviewSession,
    submitAnswer as apiSubmitAnswer,
    completeInterviewSession,
    InterviewQuestion,
    AnswerEvaluation,
    InterviewSession,
    InterviewSummary,
} from "../services/api";

type Phase = "config" | "loading" | "active" | "evaluating" | "topic_review" | "done";

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

function scoreColor(score: number) {
    if (score >= 80) return "#6fcf97";
    if (score >= 60) return "#f6ad55";
    return "var(--danger)";
}



const SignalBar: React.FC<{ label: string; score: number }> = ({ label, score }) => (
    <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase" }}>{(label || "").replace(/_/g, " ")}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(score) }}>{score}%</span>
        </div>
        <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${score}%`, background: scoreColor(score), borderRadius: 2, transition: "width 0.5s ease" }} />
        </div>
    </div>
);

const PhaseBadge: React.FC<{ phase: string; active: boolean }> = ({ phase, active }) => (
    <div style={{
        padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        background: active ? "var(--accent-light)" : "var(--surface)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        color: active ? "var(--accent)" : "var(--text3)",
        transition: "all 0.3s ease",
        opacity: active ? 1 : 0.6
    }}>
        {phase.replace("_", " ")}
    </div>
);

const pageStyle: React.CSSProperties = {
    minHeight: "100vh", background: "var(--bg)", color: "var(--text)",
    fontFamily: "Geist, -apple-system, sans-serif",
};

const BgBlobs = () => (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: -1 }}>
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, var(--accent-light) 0%, transparent 70%)", top: -150, left: -150, filter: "blur(80px)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(41,128,185,0.08) 0%, transparent 70%)", bottom: "5%", right: "-10%", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
    </div>
);

const backBtnStyle: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8,
    padding: "7px 14px", color: "var(--text2)", fontFamily: "Geist, sans-serif",
    fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
};

const configCardStyle: React.CSSProperties = {
    background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 18, overflow: "hidden",
};

const cfgInputStyle: React.CSSProperties = {
    width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "11px 14px", fontFamily: "Geist, sans-serif", fontSize: 14,
    color: "var(--text)", outline: "none", boxSizing: "border-box",
};

const ConfigSection: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
    <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: hint ? 4 : 12 }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>{hint}</div>}
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
            const evaluation = (result as any).evaluation;
            setCurrentEval(evaluation);

            // Check if topic was completed
            const isTopicCompleted = (result as any).nextTopic !== null || (result as any).isPhaseTransition || (result as any).isCompleted;

            // Refresh session to get updated signals/progress
            try {
                const updatedSession = await getInterviewSession(session.sessionId);
                setSession(updatedSession);

                // If topic completed, we'll transition to topic_review after they view the answer evaluation
            } catch (e) {
                console.error("Failed to refresh session:", e);
            }

            setPhase("active");
        } catch (e: any) {
            setError(e.message || "Failed to submit answer."); setPhase("active");
        }
    }, [session, currentQuestion, answer, startTime]);

    const handleContinueFromEval = useCallback(() => {
        if (!session) return;
        const activeTopic = session.interviewPlan?.allTopics[session.progress?.activeTopicId || ""];
        if (activeTopic?.isCompleted) {
            setPhase("topic_review");
        } else {
            nextQuestion();
        }
    }, [session, nextQuestion]);

    const nextQuestion = useCallback(async () => {
        if (!session) return;

        // Refresh session state
        let currentSdt = session;
        try {
            currentSdt = await getInterviewSession(session.sessionId);
            setSession(currentSdt);
        } catch (e) {
            console.error("Failed to refresh session:", e);
            // Optionally, handle the error more gracefully, e.g., show a message to the user
            return; // Stop execution if session refresh fails
        }

        if (currentSdt.status === 'completed') {
            setPhase("loading");
            try {
                const sum = await completeInterviewSession(session.sessionId);
                setSummary(sum as any); setPhase("done");
            } catch {
                setSummary(null); setPhase("done");
            }
            return;
        }

        const activeId = currentSdt.progress.activeTopicId;
        const topic = currentSdt.interviewPlan?.allTopics[activeId || ""];

        if (topic) {
            setCurrentQuestion({
                questionId: topic.topicId,
                question: `Let's discuss ${topic.title}. ${topic.description}`,
                category: topic.category,
                difficulty: topic.difficulty,
                questionNumber: currentSdt.progress.questionsAnswered + 1,
                expectedTopics: [],
                groundedIn: [],
                hints: [],
                followUpQuestions: []
            });
        }

        setAnswer(""); setCurrentEval(null); setPhase("active");
        setTimeout(() => textareaRef.current?.focus(), 100);
    }, [session]);

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
                        <h1 style={{ fontSize: 32, fontWeight: 900, color: "var(--text)", letterSpacing: -1, marginBottom: 12 }}>Mock Interview</h1>
                        <p style={{ fontSize: 16, color: "var(--text2)", lineHeight: 1.6 }}>
                            Answer questions about <strong style={{ color: "var(--accent)" }}>your project</strong>.<br />
                            AI evaluates your responses in real-time.
                        </p>
                    </div>

                    {!effectiveAnalysisId && (
                        <div style={{ background: "var(--danger-light)", border: "1px solid var(--danger-light)", borderRadius: 12, padding: "16px 20px", marginBottom: 28, fontSize: 14, color: "var(--danger)", lineHeight: 1.6 }}>
                            ⚠️ No analysis selected. Please <span onClick={() => navigate("/app")} style={{ textDecoration: "underline", cursor: "pointer" }}>start an analysis</span> first.
                        </div>
                    )}
                    {error && <div style={{ background: "var(--danger-light)", border: "1px solid var(--danger-light)", borderRadius: 10, padding: "14px 18px", color: "var(--danger)", fontSize: 14, marginBottom: 24 }}>{error}</div>}

                    <div style={configCardStyle}>
                        <ConfigSection label="Target Role" hint="Questions will be calibrated to this level">
                            <input value={role} onChange={e => setRole(e.target.value)} style={cfgInputStyle} placeholder="e.g. Senior Software Engineer" />
                        </ConfigSection>
                        <ConfigSection label="Question Focus">
                            <div style={{ display: "flex", gap: 10 }}>
                                {(["technical", "behavioral", "mixed"] as const).map(f => (
                                    <button key={f} onClick={() => setFocus(f)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: focus === f ? "1px solid var(--accent)" : "1px solid var(--border)", background: focus === f ? "var(--accent-light)" : "var(--surface)", color: focus === f ? "var(--accent)" : "var(--text2)", fontFamily: "Geist, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s" }}>{f}</button>
                                ))}
                            </div>
                        </ConfigSection>
                        <ConfigSection label="Session Length">
                            <div style={{ display: "flex", gap: 10 }}>
                                {([5, 10, 15] as const).map(n => (
                                    <button key={n} onClick={() => setCount(n)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: count === n ? "1px solid var(--accent)" : "1px solid var(--border)", background: count === n ? "var(--accent-light)" : "var(--surface)", color: count === n ? "var(--accent)" : "var(--text2)", fontFamily: "Geist, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{n} Q</button>
                                ))}
                            </div>
                        </ConfigSection>
                        <div style={{ padding: "0 24px 24px" }}>
                            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 16, padding: "12px 16px", background: "var(--surface)", borderRadius: 10 }}>
                                ⏱ Timer per question · Real-time AI evaluation · Full session summary
                            </div>
                            <button onClick={startSession} disabled={!effectiveAnalysisId} style={{ width: "100%", padding: "15px", background: "var(--accent)", border: "none", borderRadius: 12, fontFamily: "Geist, sans-serif", fontSize: 16, fontWeight: 800, color: "#fff", cursor: effectiveAnalysisId ? "pointer" : "not-allowed", opacity: effectiveAnalysisId ? 1 : 0.4 }}>
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
                    <div style={{ width: 56, height: 56, border: "4px solid var(--accent-light)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 24px" }} />
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Preparing your interview…</div>
                    <div style={{ fontSize: 14, color: "var(--text2)" }}>Generating project-specific questions</div>
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
                        <h1 style={{ fontSize: 36, fontWeight: 900, color: "var(--text)", letterSpacing: -1, marginBottom: 12 }}>Interview Complete!</h1>
                        <p style={{ fontSize: 16, color: "var(--text2)" }}>Here's how you performed across {totalQuestions} questions</p>
                    </div>

                    {/* Score ring */}
                    <div style={{ textAlign: "center", marginBottom: 40 }}>
                        <div style={{ position: "relative", display: "inline-block" }}>
                            <svg width="160" height="160" viewBox="0 0 160 160">
                                <circle cx="80" cy="80" r="68" fill="none" stroke="var(--surface)" strokeWidth="10" />
                                <circle cx="80" cy="80" r="68" fill="none" stroke={scoreColor(avg)} strokeWidth="10"
                                    strokeDasharray={`${2 * Math.PI * 68 * avg / 100} ${2 * Math.PI * 68}`}
                                    strokeLinecap="round" transform="rotate(-90 80 80)" />
                            </svg>
                            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                <div style={{ fontSize: 36, fontWeight: 900, color: scoreColor(avg) }}>{avg}</div>
                                <div style={{ fontSize: 12, color: "var(--text2)", fontWeight: 600 }}>SCORE</div>
                            </div>
                        </div>
                    </div>

                    {summary && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}>
                            {[["Questions", totalQuestions, "📋"], ["Avg Score", `${avg}/100`, "📊"], ["Strong Areas", (summary as any).strongAreas?.length ?? "—", "⚡"]].map(([label, value, icon], i) => (
                                <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
                                    <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{value}</div>
                                    <div style={{ fontSize: 12, color: "var(--text2)" }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {summary && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
                            {([{ title: "💪 Strengths", items: (summary as any).strongAreas || [], color: "#6fcf97" }, { title: "📈 Areas to Improve", items: (summary as any).weakAreas || [], color: "#f6ad55" }] as const).map(({ title, items, color }) => (
                                <div key={title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{title}</div>
                                    {(items as string[]).length === 0 ? <div style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>—</div> :
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
                        <button onClick={() => { setPhase("config"); setSession(null); setSummary(null); setCurrentEval(null); setAnswer(""); }} style={{ flex: 1, padding: "14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontFamily: "Geist, sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)", cursor: "pointer" }}>
                            Retry Interview
                        </button>
                        <button onClick={() => navigate("/app/dashboard")} style={{ flex: 1, padding: "14px", background: "var(--accent)", border: "none", borderRadius: 12, fontFamily: "Geist, sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                            View Dashboard →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    /* ── ACTIVE / EVALUATING ── */
    if (!currentQuestion) return null;

    return (
        <div style={pageStyle}>
            <BgBlobs />
            <div style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--surface)", backdropFilter: "blur(16px)", borderBottom: "1px solid var(--border)", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button onClick={() => navigate(-1)} style={backBtnStyle}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                        Exit
                    </button>
                    <div style={{ display: "flex", gap: 8 }}>
                        {(["warmup", "deep_dive", "stretch"] as const).map(p => (
                            <PhaseBadge key={p} phase={p} active={session?.progress?.currentPhase === p} />
                        ))}
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: elapsed > 300 ? "var(--danger)" : "var(--text2)", background: "var(--bg)", borderRadius: 8, padding: "6px 12px", border: "1px solid var(--border)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    {fmtTime(elapsed)}
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 48, maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--accent)", background: "var(--accent-light)", borderRadius: 6, padding: "4px 10px" }}>
                            {currentQuestion.category}
                        </div>
                    </div>
                    <h2 style={{ fontSize: 32, fontWeight: 900, color: "var(--text)", lineHeight: 1.25, letterSpacing: -0.8, marginBottom: 40 }}>
                        {currentQuestion.question}
                    </h2>

                    {phase === "evaluating" ? (
                        <div style={{ textAlign: "center", padding: "64px 24px" }}>
                            <div style={{ width: 48, height: 48, border: "4px solid var(--accent-light)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 24px" }} />
                            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Evaluating...</div>
                        </div>
                    ) : phase === "topic_review" ? (
                        <div style={{ textAlign: "center", padding: "40px 0" }}>
                            <div style={{ fontSize: 64, marginBottom: 24 }}>🏆</div>
                            <h2 style={{ fontSize: 32, fontWeight: 900, color: "var(--text)", marginBottom: 12 }}>Topic Mastered!</h2>
                            <p style={{ fontSize: 18, color: "var(--text2)", marginBottom: 40, maxWidth: 500, margin: "0 auto 40px" }}>
                                You've successfully completed the deep-dive into <strong>{session?.interviewPlan?.allTopics[session?.progress?.activeTopicId || ""]?.title}</strong>.
                            </p>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, textAlign: "left", marginBottom: 48, maxWidth: 1000, margin: "0 auto 48px" }}>
                                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, padding: "32px" }}>
                                    <h3 style={{ fontSize: 12, fontWeight: 900, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 24 }}>System Performance Signals</h3>
                                    {session?.progress?.signals && Object.values(session.progress.signals).map(s => (
                                        <div key={s.signalId} style={{ marginBottom: 24 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{s.name}</span>
                                                <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(s.score) }}>{s.score}%</span>
                                            </div>
                                            <div style={{ height: 6, background: "var(--bg)", borderRadius: 3, marginBottom: 8 }}>
                                                <div style={{ height: "100%", width: `${s.score}%`, background: scoreColor(s.score), borderRadius: 3 }} />
                                            </div>
                                            <div style={{ fontSize: 11, color: "var(--text2)", fontStyle: "italic", lineHeight: 1.4 }}>
                                                "{s.evidence?.[s.evidence.length - 1] || "Consistent performance across related topics."}"
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, padding: "32px" }}>
                                        <h3 style={{ fontSize: 12, fontWeight: 900, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 20 }}>Final Decision Context</h3>
                                        <div style={{ padding: "16px", background: "var(--bg)", borderRadius: 16, border: "1px solid var(--border)", marginBottom: 16 }}>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", marginBottom: 4 }}>Company Tier Match</div>
                                            <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)" }}>Tier 1 (FAANG/Top Tech)</div>
                                        </div>
                                        <div style={{ padding: "16px", background: "var(--bg)", borderRadius: 16, border: "1px solid var(--border)" }}>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", marginBottom: 4 }}>Hiring Recommendation</div>
                                            <div style={{ fontSize: 18, fontWeight: 900, color: "#6fcf97" }}>Strong Hire (Level 6/Senior)</div>
                                        </div>
                                    </div>

                                    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, padding: "32px" }}>
                                        <h3 style={{ fontSize: 12, fontWeight: 900, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 20 }}>Topic Mastery Depth</h3>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                            {session?.interviewPlan && Object.values(session.interviewPlan.allTopics).slice(0, 6).map(t => (
                                                <div key={t.topicId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "var(--bg)", borderRadius: 12, border: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>{t.title}</span>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 800, color: t.isCompleted ? "#6fcf97" : "var(--text3)" }}>{t.currentFulfillment}%</span>
                                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.isCompleted ? "#6fcf97" : "var(--border)" }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button onClick={nextQuestion} style={{ padding: "18px 48px", background: "var(--accent)", border: "none", borderRadius: 12, fontSize: 18, fontWeight: 800, color: "#fff", cursor: "pointer", boxShadow: "0 10px 20px -5px var(--accent-light)" }}>
                                Move to Next Topic →
                            </button>
                        </div>) : currentEval ? (
                            <div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                                    {[["Score", `${Math.round(currentEval.overallScore)}/100`], ["Accuracy", `${currentEval.criteriaScores.technicalAccuracy}%`], ["Depth", `${currentEval.criteriaScores.depthOfUnderstanding}%`]].map(([l, v]) => (
                                        <div key={l} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
                                            <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)" }}>{v}</div>
                                            <div style={{ fontSize: 11, color: "var(--text2)", fontWeight: 700, textTransform: "uppercase" }}>{l}</div>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", marginBottom: 24 }}>
                                    <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.7, margin: "0 0 16px 0" }}>{currentEval.feedback}</p>

                                    {currentEval.missingKeyPoints && currentEval.missingKeyPoints.length > 0 && (
                                        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--danger)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>What was missing:</div>
                                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "var(--text2)", lineHeight: 1.6 }}>
                                                {currentEval.missingKeyPoints.map((p, i) => <li key={i}>{p}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                                <button onClick={handleContinueFromEval} style={{ width: "100%", padding: "16px", background: "var(--accent)", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer" }}>
                                    Continue Interview →
                                </button>
                            </div>
                        ) : (
                        <div>
                            <textarea ref={textareaRef} value={answer} onChange={e => setAnswer(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type your answer here..." style={{ width: "100%", minHeight: 240, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px", fontSize: 16, color: "var(--text)", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.6 }} autoFocus />
                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                                <button onClick={submitAnswer} disabled={!answer.trim()} style={{ padding: "14px 40px", background: answer.trim() ? "var(--accent)" : "var(--border)", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer" }}>Submit Answer</button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 40 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 24 }}>Live Signals</h3>
                    {session?.progress?.signals && Object.values(session.progress.signals).map(s => (
                        <SignalBar key={s.signalId} label={s.name} score={s.score} />
                    ))}

                    <h3 style={{ fontSize: 12, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1.2, marginTop: 40, marginBottom: 20 }}>Topic Mastery</h3>
                    {session?.interviewPlan && Object.values(session.interviewPlan.allTopics).map(t => (
                        <div key={t.topicId} style={{ marginBottom: 12, opacity: t.isCompleted ? 1 : 0.5 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: t.isCompleted ? "#6fcf97" : session.progress.activeTopicId === t.topicId ? "var(--accent)" : "var(--border)" }} />
                                {t.title}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InterviewPage;
