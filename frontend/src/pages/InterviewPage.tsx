import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    createInterviewSession,
    getInterviewSession,
    getInterviewSessions,
    getSessionAttempts,
    submitAnswer as apiSubmitAnswer,
    completeInterviewSession,
    continueToStage3,
    getAnalysisStatus,
    InterviewQuestion,
    AnswerEvaluation,
    InterviewSession,
    InterviewSummary,
} from "../services/api";
import InterviewRadarChart from "../components/interview/InterviewRadarChart";
import AiGeneratedNotice from "../components/AiGeneratedNotice";

type Phase = "config" | "loading" | "active" | "evaluating" | "topic_review" | "done";

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

function scoreColor(score: number) {
    if (score >= 80) return "#6fcf97";
    if (score >= 60) return "#f6ad55";
    return "var(--danger)";
}

type FixedSignalId =
    | "architecture_thinking"
    | "code_quality"
    | "implementation_depth"
    | "tradeoff_analysis"
    | "scalability_vision"
    | "debugging_communication";

const FIXED_SIGNALS: Array<{ id: FixedSignalId; name: string }> = [
    { id: "architecture_thinking", name: "Architecture Thinking" },
    { id: "code_quality", name: "Code Quality" },
    { id: "implementation_depth", name: "Implementation Depth" },
    { id: "tradeoff_analysis", name: "Trade-off Analysis" },
    { id: "scalability_vision", name: "Scalability Vision" },
    { id: "debugging_communication", name: "Debugging & Communication" },
];

const ROADMAP_TIPS: Record<FixedSignalId, string[]> = {
    architecture_thinking: [
        "Explain the main components and how data flows between them.",
        "Call out failure modes (timeouts, retries, partial failures) and how you'd handle them.",
        "Be explicit about boundaries: what belongs in API, service, storage, and why.",
    ],
    code_quality: [
        "Mention test strategy (unit/integration), error handling, and code organization.",
        "Use concrete examples: file/module names, patterns, and why they help maintainability.",
        "Highlight security basics: input validation, authz checks, safe defaults.",
    ],
    implementation_depth: [
        "Give one deep example from your code: what you built, why, and how it works end-to-end.",
        "Quantify tradeoffs: performance, complexity, reliability, cost.",
        "Discuss edge cases you intentionally handled (or would handle next).",
    ],
    tradeoff_analysis: [
        "Name 2 alternatives and why you didn't choose them (latency, cost, complexity).",
        "Use a clear structure: constraints -> options -> decision -> tradeoffs.",
        "State assumptions explicitly and ask clarifying questions when needed.",
    ],
    scalability_vision: [
        "Talk about bottlenecks: DB hot keys, rate limits, cold starts, network timeouts.",
        "Propose scaling levers: caching, queues, batching, idempotency, and observability.",
        "Explain how you'd measure impact: metrics, SLOs, and load testing.",
    ],
    debugging_communication: [
        "Communicate your approach: reproduce, isolate, inspect logs/metrics, then fix.",
        "Explain what you'd check first and why (most likely causes).",
        "Summarize before coding: hypothesis, plan, expected outcome.",
    ],
};

function mapToFixedSignalId(rawId: string, rawName: string): FixedSignalId | null {
    const s = `${rawId || ""} ${rawName || ""}`.toLowerCase();
    if (s.includes("arch")) return "architecture_thinking";
    if (s.includes("code_quality")) return "code_quality";
    if (s.includes("quality") && s.includes("code")) return "code_quality";
    if (s.includes("implementation") || s.includes("depth")) return "implementation_depth";
    if (s.includes("trade")) return "tradeoff_analysis";
    if (s.includes("scalability") || s.includes("scale")) return "scalability_vision";
    if (s.includes("debug") || s.includes("clarity") || s.includes("communication")) return "debugging_communication";
    return null;
}

function normalizeSignals(raw: any): Array<{ id: FixedSignalId; name: string; score: number }> {
    const buckets: Record<FixedSignalId, { score: number; evidence: string[] }> = {
        architecture_thinking: { score: 0, evidence: [] },
        code_quality: { score: 0, evidence: [] },
        implementation_depth: { score: 0, evidence: [] },
        tradeoff_analysis: { score: 0, evidence: [] },
        scalability_vision: { score: 0, evidence: [] },
        debugging_communication: { score: 0, evidence: [] },
    };

    const entries = raw && typeof raw === "object" ? Object.entries(raw) : [];
    for (const [k, v] of entries) {
        const obj: any = v || {};
        const rawId = String(obj.signalId || k || "");
        const rawName = String(obj.name || rawId || "");
        const fixed = mapToFixedSignalId(rawId, rawName);
        if (!fixed) continue;
        const score = typeof obj.score === "number" ? obj.score : Number(obj.score) || 0;
        buckets[fixed].score = Math.max(buckets[fixed].score, Math.max(0, Math.min(100, score)));
        if (Array.isArray(obj.evidence)) {
            buckets[fixed].evidence.push(...obj.evidence.filter((x: any) => typeof x === "string" && x.trim().length > 0));
        }
    }

    return FIXED_SIGNALS.map(s => ({
        id: s.id,
        name: s.name,
        score: buckets[s.id].score,
    }));
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
    const [recentSessions, setRecentSessions] = useState<InterviewSession[]>([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [attempts, setAttempts] = useState<any[]>([]);
    const [isLoadingAttempts, setIsLoadingAttempts] = useState(false);

    const [focus, setFocus] = useState<"technical" | "behavioral" | "mixed">("technical");
    const [role, setRole] = useState("Senior Software Engineer");
    const [intensity, setIntensity] = useState<"fast" | "normal" | "deep">("normal");
    const [timeLimitMins, setTimeLimitMins] = useState<number>(30);
    const [timeLimitAuto, setTimeLimitAuto] = useState(true);
    const [answer, setAnswer] = useState("");
    const [questionElapsed, setQuestionElapsed] = useState(0);
    const [startTime, setStartTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const autoEndedRef = useRef(false);

    const defaultTimeForIntensity = (v: "fast" | "normal" | "deep") => (v === "fast" ? 15 : v === "deep" ? 60 : 30);

    useEffect(() => {
        if (timeLimitAuto) setTimeLimitMins(defaultTimeForIntensity(intensity));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intensity]);

    useEffect(() => {
        if (phase === "active" && currentQuestion) {
            const start = Date.now();
            setStartTime(start);
            setQuestionElapsed(0);
            autoEndedRef.current = false;
            timerRef.current = setInterval(() => setQuestionElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, currentQuestion?.questionId]);

    // removing legacy totalQuestions reference

    useEffect(() => {
        if (effectiveAnalysisId && phase === "config") {
            setIsLoadingSessions(true);
            getInterviewSessions(effectiveAnalysisId)
                .then(setRecentSessions)
                .catch(err => console.error("Failed to fetch sessions", err))
                .finally(() => setIsLoadingSessions(false));
        }
    }, [effectiveAnalysisId, phase]);

    // Auto-resume the most recent active session for this analysis.
    useEffect(() => {
        if (!effectiveAnalysisId) return;
        if (phase !== "config") return;
        if (session) return;
        if (!recentSessions || recentSessions.length === 0) return;

        const active = [...recentSessions]
            .filter(s => s.analysisId === effectiveAnalysisId && s.status === "active")
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (!active?.sessionId) return;

        (async () => {
            try {
                const s = await getInterviewSession(active.sessionId);
                if (!s || s.status !== "active") return;
                setSession(s);
                const activeId = (s.progress as any)?.activeTopicId;
                const topic = s.interviewPlan?.allTopics?.[activeId || ""];
                setCurrentQuestion({
                    questionId: activeId || (s.questions?.[0]?.questionId || "topic"),
                    question: (s.progress as any)?.currentQuestionOverride || (topic ? `Let's discuss ${topic.title}. ${topic.description}` : (s.questions?.[0]?.question || "Let's begin.")),
                    category: topic?.category || (s.questions?.[0]?.category || "implementation"),
                    difficulty: topic?.difficulty || (s.questions?.[0]?.difficulty || "mid-level"),
                    questionNumber: Number((s.progress as any)?.questionsAnswered || 0) + 1,
                    expectedTopics: [],
                    groundedIn: [],
                    hints: [],
                    followUpQuestions: []
                } as any);
                setPhase("active");
            } catch (e) {
                console.error("Failed to auto-resume session:", e);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [effectiveAnalysisId, phase, recentSessions]);

    useEffect(() => {
        if (session?.sessionId && phase === "done") {
            setIsLoadingAttempts(true);
            getSessionAttempts(session.sessionId)
                .then(setAttempts)
                .catch(err => console.error("Failed to fetch attempts", err))
                .finally(() => setIsLoadingAttempts(false));
        }
    }, [session?.sessionId, phase]);

    const startSession = useCallback(async () => {
        if (!effectiveAnalysisId) { setError("No analysis ID. Please run an analysis first."); return; }
        setPhase("loading"); setError(null);
        try {
            const types: ("technical" | "behavioral" | "system-design")[] =
                focus === "mixed" ? ["technical", "behavioral", "system-design"]
                    : focus === "behavioral" ? ["behavioral"]
                        : ["technical", "system-design"];
            const create = () => createInterviewSession({
                analysisId: effectiveAnalysisId,
                config: { intensity, questionTypes: types, targetRole: role, timeLimit: timeLimitMins }
            } as any);
            let newSession: any;
            try {
                newSession = await create();
            } catch (e: any) {
                const msg = String(e?.message || e || "");
                // If Stage 3 hasn't been run (or was run in sheet mode without a plan), trigger Stage 3 live and retry.
                if (msg.toLowerCase().includes("complete stage 3") || msg.toLowerCase().includes("interview plan not found")) {
                    setError("Preparing interview (Stage 3). This can take a moment...");
                    try {
                        await continueToStage3(effectiveAnalysisId, 'live');
                    } catch {
                        // Ignore if already running/completed; we'll poll status below.
                    }
                    const started = Date.now();
                    // Poll for up to ~90s.
                    while (Date.now() - started < 90_000) {
                        try {
                            const st: any = await getAnalysisStatus(effectiveAnalysisId);
                            const ws = String(st?.workflowState || "");
                            if (ws === "all_complete" || ws === "stage2_complete_awaiting_approval") break;
                        } catch {
                            // ignore transient polling errors
                        }
                        await new Promise((r) => setTimeout(r, 2000));
                    }
                    newSession = await create();
                } else {
                    throw e;
                }
            }
            setSession(newSession);
            setCurrentQuestion(newSession.questions?.[0] || null);
            setAnswer(""); setPhase("active");
        } catch (e: any) {
            setError(e.message || "Failed to start interview."); setPhase("config");
        }
    }, [effectiveAnalysisId, focus, intensity, role, timeLimitMins]);

    const submitAnswer = useCallback(async (action: 'submit' | 'skip_question' | 'end_early' = 'submit') => {
        if (!session || !currentQuestion) return;
        if (action === 'submit' && !answer.trim()) return;
        setPhase("evaluating");
        const timeSpent = Math.max(0, Number(questionElapsed) || Math.floor((Date.now() - startTime) / 1000));
        try {
            const result = await apiSubmitAnswer(session.sessionId, {
                questionId: currentQuestion.questionId,
                questionText: currentQuestion.question,
                answer: action === 'submit' ? answer.trim() : `[${action.toUpperCase()}]`,
                timeSpentSeconds: timeSpent,
                action
            });
            const evaluation = (result as any).evaluation;
            setCurrentEval(evaluation);

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
    }, [session, currentQuestion, answer, startTime, questionElapsed]);

    // Hard-stop the session when time limit is reached.
    useEffect(() => {
        const limitMins = Number((session as any)?.config?.timeLimit || 0) || 0;
        if (phase !== "active") return;
        if (!limitMins) return;
        if (autoEndedRef.current) return;
        const sessionSpent =
            (Number((session as any)?.progress?.totalTimeSpentSeconds || 0) || 0) + (Number(questionElapsed) || 0);
        if (sessionSpent < limitMins * 60) return;
        autoEndedRef.current = true;
        submitAnswer("end_early");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questionElapsed, phase, session?.sessionId]);

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
                question: currentSdt.progress.currentQuestionOverride || `Let's discuss ${topic.title}. ${topic.description}`,
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

    const handleContinueFromEval = useCallback(() => {
        if (!session) return;
        const activeTopic = session.interviewPlan?.allTopics[session.progress?.activeTopicId || ""];
        if (activeTopic?.isCompleted) {
            setPhase("topic_review");
        } else {
            nextQuestion();
        }
    }, [session, nextQuestion]);

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
                        <div style={{ maxWidth: 560, margin: "18px auto 0", textAlign: "left" }}>
                            <AiGeneratedNotice
                                note="AI feedback can be wrong or overly strict. Use it to practice structure and clarity, then validate details in your code."
                                linkToFramework={false}
                            />
                        </div>
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
                        <ConfigSection label="Interview Intensity" hint="Determines length and follow-up depth">
                            <div style={{ display: "flex", gap: 10 }}>
                                {[{ id: "fast", label: "Fast (15m)" }, { id: "normal", label: "Normal (30m)" }, { id: "deep", label: "Deep (60m+)" }].map(opt => (
                                    <button key={opt.id} onClick={() => setIntensity(opt.id as any)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: intensity === opt.id ? "1px solid var(--accent)" : "1px solid var(--border)", background: intensity === opt.id ? "var(--accent-light)" : "var(--surface)", color: intensity === opt.id ? "var(--accent)" : "var(--text2)", fontFamily: "Geist, sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{opt.label}</button>
                                ))}
                            </div>
                        </ConfigSection>
                        <ConfigSection label="Session Time Limit" hint="In minutes. Interview will auto-end when time is up.">
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                <input
                                    type="number"
                                    min={5}
                                    max={120}
                                    value={timeLimitMins}
                                    onChange={(e) => {
                                        const raw = Number(e.target.value);
                                        const v = Math.max(5, Math.min(120, Number.isFinite(raw) ? raw : 0));
                                        setTimeLimitMins(v || defaultTimeForIntensity(intensity));
                                        setTimeLimitAuto(false);
                                    }}
                                    style={{ ...cfgInputStyle, width: 140 }}
                                />
                                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text2)", userSelect: "none", cursor: "pointer" }}>
                                    <input
                                        type="checkbox"
                                        checked={timeLimitAuto}
                                        onChange={(e) => {
                                            const next = e.target.checked;
                                            setTimeLimitAuto(next);
                                            if (next) setTimeLimitMins(defaultTimeForIntensity(intensity));
                                        }}
                                    />
                                    Auto (from intensity)
                                </label>
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

                    {/* Recent Sessions */}
                    {effectiveAnalysisId && (
                        <div style={{ marginTop: 48 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)" }}>Recent Sessions</h3>
                                <div style={{ fontSize: 12, color: "var(--text3)", fontWeight: 600 }}>{recentSessions.length} total</div>
                            </div>

                            {isLoadingSessions ? (
                                <div style={{ textAlign: "center", padding: "40px var(--surface)", background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)" }}>
                                    <div style={{ width: 24, height: 24, border: "3px solid var(--accent-light)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
                                </div>
                            ) : recentSessions.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "48px 24px", background: "var(--surface)", borderRadius: 18, border: "1px dashed var(--border)" }}>
                                    <div style={{ fontSize: 32, marginBottom: 16 }}>📋</div>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>No sessions yet</div>
                                    <div style={{ fontSize: 13, color: "var(--text3)" }}>Complete your first interview to see history here.</div>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {recentSessions.slice(0, 5).map(s => (
                                        <div key={s.sessionId} onClick={() => { setSession(s); setPhase("done"); setSummary(s.progress as any); }} style={{ padding: "16px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.2s" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                                <div style={{ width: 44, height: 44, borderRadius: 12, background: scoreColor(s.progress?.averageScore || 0) + "15", color: scoreColor(s.progress?.averageScore || 0), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900 }}>
                                                    {Math.round(s.progress?.averageScore || 0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{s.config?.targetRole || "Software Engineer"}</div>
                                                    <div style={{ fontSize: 12, color: "var(--text3)" }}>{new Date(s.createdAt).toLocaleDateString()} · {s.progress?.questionsAnswered} questions</div>
                                                </div>
                                            </div>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text3)" }}><polyline points="9 18 15 12 9 6" /></svg>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
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
        const topicsFromPlan = session?.interviewPlan ? Object.keys(session.interviewPlan.allTopics || {}).length : 0;
        const topicsFromSummary =
            Array.isArray((summary as any)?.topics) ? Number((summary as any).topics.length) : Number((summary as any)?.topicsCount || 0) || 0;
        const topicsFromAttempts = new Set(
            (attempts || []).map((a: any) => String(a?.topicId || "").trim()).filter(Boolean)
        ).size;
        const topicsFromQuestions = new Set(
            (session?.questions || []).map((q: any) => String(q?.topicId || "").trim()).filter(Boolean)
        ).size;
        const questionsAnswered =
            Number((summary as any)?.questionsAnswered ?? session?.progress?.questionsAnswered ?? attempts?.length ?? 0) || 0;
        const totalTopicsRaw = topicsFromPlan || topicsFromSummary || topicsFromAttempts || topicsFromQuestions || 0;
        const totalTopics = totalTopicsRaw === 0 && questionsAnswered > 0 ? 1 : totalTopicsRaw;
        const fixedSignals = normalizeSignals(session?.progress?.signals);
        const strongAreasCount = fixedSignals.filter(s => s.score >= 80).length;

        const rankBullets = (values: any[], limit: number) => {
            const counts = new Map<string, number>();
            (values || []).forEach((v) => {
                const s = String(v || "").trim();
                if (!s) return;
                const key = s.toLowerCase();
                counts.set(key, (counts.get(key) || 0) + 1);
            });
            return [...counts.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(([k]) => {
                    // Restore original casing by picking first matching original value.
                    const orig = (values || []).find((v) => String(v || "").trim().toLowerCase() === k);
                    return String(orig || k);
                });
        };

        const derivedStrengths = rankBullets(
            (attempts || [])
                .flatMap((a: any) => (a?.evaluation?.strengths || a?.evaluation?.strongPoints || []) as any[])
                .filter(Boolean),
            6
        );

        const derivedImprovements = rankBullets(
            (attempts || [])
                .flatMap((a: any) => (a?.evaluation?.improvementSuggestions || a?.evaluation?.weaknesses || a?.evaluation?.areasToImprove || []) as any[])
                .filter(Boolean),
            6
        );
        return (
            <div style={pageStyle}>
                <BgBlobs />
                <div style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px" }}>
                    <div style={{ textAlign: "center", marginBottom: 48 }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>{avg >= 80 ? "🏆" : avg >= 60 ? "🎯" : "📈"}</div>
                        <h1 style={{ fontSize: 36, fontWeight: 900, color: "var(--text)", letterSpacing: -1, marginBottom: 12 }}>Interview Complete!</h1>
                        <p style={{ fontSize: 16, color: "var(--text2)" }}>Here's how you performed across {totalTopics} topics</p>
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
                            {[
                                ["Questions", `${questionsAnswered} Asked`, "📋"],
                                ["Avg Score", `${avg}/100`, "📊"],
                                ["Strong Areas", strongAreasCount, "⚡"]
                            ].map(([label, value, icon], i) => (
                                <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
                                    <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{value}</div>
                                    <div style={{ fontSize: 12, color: "var(--text2)" }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    <InterviewRadarChart signals={fixedSignals} />

                    {summary && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 32 }}>
                            {([
                                {
                                    title: "💪 Strengths",
                                    items: ((summary as any).strongAreas || (summary as any).strengths || []) as string[],
                                    fallback: derivedStrengths,
                                    color: "#6fcf97"
                                },
                                {
                                    title: "📈 Areas to Improve",
                                    items: ((summary as any).weakAreas || (summary as any).weaknesses || []) as string[],
                                    fallback: derivedImprovements,
                                    color: "#f6ad55"
                                }
                            ] as const).map(({ title, items, fallback, color }) => {
                                const list = (items || []).filter(Boolean);
                                const finalList = list.length > 0 ? list : fallback;
                                return (
                                <div key={title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "20px" }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{title}</div>
                                    {finalList.length === 0 ? (
                                        <div style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>—</div>
                                    ) : (
                                        finalList.map((item, i) => (
                                            <div key={i} style={{ fontSize: 13, color: color, marginBottom: 6, display: "flex", gap: 8 }}>
                                                <span style={{ fontVariantNumeric: "tabular-nums" }}>{i + 1}.</span>
                                                <span>{item}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Improvement Roadmap */}
                    {fixedSignals.some(s => s.score < 80) && (
                        <div style={{ marginBottom: 40, background: "var(--accent-light)", border: "1px solid var(--accent)", borderRadius: 18, padding: "24px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                                <div style={{ fontSize: 20 }}>🚀</div>
                                <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--accent)" }}>Improvement Roadmap</h3>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {fixedSignals.filter(s => s.score < 80).map(s => (
                                    <div key={s.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px" }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Focus on: {s.name}</div>
                                        <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
                                            Your {s.name} scored {s.score}%. Suggested next steps:
                                            <ul style={{ margin: "8px 0 0", paddingLeft: "18px" }}>
                                                {ROADMAP_TIPS[s.id].map((tip, i) => (
                                                    <li key={i} style={{ marginBottom: 4 }}>{tip}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Question Breakdown */}
                    <div style={{ marginBottom: 40 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 20 }}>Detailed Breakdown</h3>
                        {isLoadingAttempts ? (
                            <div style={{ textAlign: "center", padding: "40px", background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)" }}>
                                <div style={{ width: 24, height: 24, border: "3px solid var(--accent-light)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
                            </div>
                        ) : attempts.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "32px", background: "var(--surface)", borderRadius: 18, border: "1px solid var(--border)", color: "var(--text3)", fontSize: 14 }}>
                                No question data available.
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                {attempts.map((attempt, idx) => (
                                    <div key={attempt.attemptId} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, overflow: "hidden" }}>
                                        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.02)" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 0.5 }}>Question {idx + 1}</div>
                                                <div style={{ fontSize: 12, fontWeight: 800, color: scoreColor(attempt.evaluation?.overallScore || 0) }}>
                                                    {attempt.evaluation?.overallScore || 0}% Score
                                                </div>
                                            </div>
                                         <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", lineHeight: 1.4 }}>
                                                {attempt.questionText || session?.questions?.find(q => q.questionId === attempt.questionId)?.question || "Question"}
                                            </div>
                                        </div>
                                        <div style={{ padding: "20px 24px" }}>
                                            <div style={{ marginBottom: 16 }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase" }}>Your Answer</div>
                                                <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.6, whiteSpace: "pre-wrap", padding: "12px", background: "var(--bg)", borderRadius: 10, border: "1px solid var(--border)" }}>
                                                    {attempt.userAnswer}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)", marginBottom: 8, textTransform: "uppercase" }}>AI Feedback</div>
                                                <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>
                                                    {attempt.evaluation?.narrative}
                                                </div>
                                            </div>

                                            {(() => {
                                                const strengths = (attempt.evaluation?.strengths || []) as string[];
                                                const improvements = (attempt.evaluation?.improvementSuggestions || attempt.evaluation?.weaknesses || []) as string[];
                                                const hasStrengths = Array.isArray(strengths) && strengths.filter(Boolean).length > 0;
                                                const hasImprovements = Array.isArray(improvements) && improvements.filter(Boolean).length > 0;
                                                if (!hasStrengths && !hasImprovements) return null;
                                                return (
                                                    <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                                        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
                                                            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase" }}>Strengths</div>
                                                            {hasStrengths ? (
                                                                strengths.filter(Boolean).slice(0, 6).map((s: string, idx: number) => (
                                                                    <div key={idx} style={{ fontSize: 13, color: "#6fcf97", marginBottom: 6, display: "flex", gap: 8 }}>
                                                                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{idx + 1}.</span>
                                                                        <span>{s}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>—</div>
                                                            )}
                                                        </div>
                                                        <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 12 }}>
                                                            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)", marginBottom: 8, textTransform: "uppercase" }}>Improvements</div>
                                                            {hasImprovements ? (
                                                                improvements.filter(Boolean).slice(0, 6).map((s: string, idx: number) => (
                                                                    <div key={idx} style={{ fontSize: 13, color: "#f6ad55", marginBottom: 6, display: "flex", gap: 8 }}>
                                                                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{idx + 1}.</span>
                                                                        <span>{s}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div style={{ fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>—</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", gap: 12 }}>
                            <button onClick={() => { setPhase("config"); setSession(null); setSummary(null); setCurrentEval(null); setAnswer(""); setAttempts([]); }} style={{ flex: 1, padding: "14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontFamily: "Geist, sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text)", cursor: "pointer" }}>
                                Retry Interview
                            </button>
                            <button onClick={() => navigate("/app/dashboard")} style={{ flex: 1, padding: "14px", background: "var(--accent)", border: "none", borderRadius: 12, fontFamily: "Geist, sans-serif", fontSize: 15, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                                View Dashboard →
                            </button>
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                            <button onClick={() => window.print()} style={{ flex: 1, padding: "12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>
                                Print PDF Report
                            </button>
                            <button onClick={() => {
                                let md = `# Interview Report - ${session?.config?.targetRole || "Software Engineer"}\n\n`;
                                md += `**Overall Score:** ${summary ? Math.round((summary as any).overallScore || 0) : 0}%\n`;
                                md += `**Date:** ${new Date(session?.createdAt || "").toLocaleDateString()}\n\n`;
                                md += `## Detailed Breakdown\n\n`;
                                attempts.forEach((a, i) => {
                                    const q = a.questionText || session?.questions?.find(que => que.questionId === a.questionId)?.question || "Question";
                                    md += `### ${i + 1}. ${q}\n`;
                                    md += `**Score:** ${a.evaluation?.overallScore || 0}%\n`;
                                    md += `**Your Answer:** ${a.userAnswer}\n`;
                                    md += `**AI Feedback:** ${a.evaluation?.narrative}\n\n`;
                                });
                                const blob = new Blob([md], { type: "text/markdown" });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = `interview-report-${session?.sessionId}.md`;
                                link.click();
                            }} style={{ flex: 1, padding: "12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, fontWeight: 600, color: "var(--text2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                                Export Markdown
                            </button>
                        </div>
                        <div style={{ marginTop: 18 }}>
                            <AiGeneratedNotice note="* This interview report is AI-generated and may contain mistakes. Validate important decisions, scores, and recommendations against your real code and experience." />
                        </div>
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
                {(() => {
                    const limitMins = Number((session as any)?.config?.timeLimit || 0) || 0;
                    const limitSecs = limitMins > 0 ? limitMins * 60 : 0;
                    const sessionSpent =
                        (Number((session as any)?.progress?.totalTimeSpentSeconds || 0) || 0) + (Number(questionElapsed) || 0);
                    const remaining = limitSecs > 0 ? Math.max(0, limitSecs - sessionSpent) : 0;
                    const showCountdown = limitSecs > 0;
                    const isLow = showCountdown && remaining <= 60;
                    const isWarn = showCountdown && remaining <= 5 * 60;
                    const color = isLow ? "var(--danger)" : isWarn ? "#f6ad55" : "var(--text2)";

                    return (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg)", borderRadius: 10, padding: "6px 10px", border: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800, color }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                {showCountdown ? fmtTime(remaining) : fmtTime(sessionSpent)}
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text3)", letterSpacing: 0.9, textTransform: "uppercase" }}>
                                {showCountdown ? "Remaining" : "Elapsed"}
                            </div>
                        </div>
                    );
                })()}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 48, maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--accent)", background: "var(--accent-light)", borderRadius: 6, padding: "4px 10px" }}>
                            {currentQuestion.category}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 800, color: "var(--text2)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 999, padding: "4px 10px" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="9" />
                                <path d="M12 7v5l3 2" />
                            </svg>
                            {fmtTime(questionElapsed)}
                            <span style={{ fontSize: 10, fontWeight: 900, color: "var(--text3)", letterSpacing: 0.9, textTransform: "uppercase" }}>This question</span>
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
                                    {normalizeSignals(session?.progress?.signals).map(s => (
                                        <div key={s.id} style={{ marginBottom: 24 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{s.name}</span>
                                                <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(s.score) }}>{s.score}%</span>
                                            </div>
                                            <div style={{ height: 6, background: "var(--bg)", borderRadius: 3, marginBottom: 8 }}>
                                                <div style={{ height: "100%", width: `${s.score}%`, background: scoreColor(s.score), borderRadius: 3 }} />
                                            </div>
                                            <div style={{ fontSize: 11, color: "var(--text2)", fontStyle: "italic", lineHeight: 1.4 }}>
                                                {s.score >= 80 ? "Strong performance in this signal." : "Opportunity to improve this signal."}
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
                                    <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.7, margin: "0 0 16px 0" }}>{currentEval.detailedFeedback || currentEval.feedback}</p>

                                    {((currentEval.keyPointsCoverage?.missed && currentEval.keyPointsCoverage.missed.length > 0) || (currentEval.missingKeyPoints && currentEval.missingKeyPoints.length > 0)) && (
                                        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                                            <div style={{ fontSize: 12, fontWeight: 800, color: "var(--danger)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>What was missing:</div>
                                            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "var(--text2)", lineHeight: 1.6 }}>
                                                {(currentEval.keyPointsCoverage?.missed || currentEval.missingKeyPoints || []).map((p: string, i: number) => <li key={i}>{p}</li>)}
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
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                                <div style={{ display: "flex", gap: 12 }}>
                                    <button onClick={() => submitAnswer('skip_question')} style={{ padding: "14px 24px", background: "transparent", border: "1px solid var(--border)", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "var(--text2)", cursor: "pointer", transition: "all 0.2s" }}>Skip Question</button>
                                    <button onClick={() => submitAnswer('end_early')} style={{ padding: "14px 24px", background: "transparent", border: "1px solid var(--danger-light)", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "var(--danger)", cursor: "pointer", transition: "all 0.2s" }}>End Interview Early</button>
                                </div>
                                <button onClick={() => submitAnswer('submit')} disabled={!answer.trim()} style={{ padding: "14px 40px", background: answer.trim() ? "var(--accent)" : "var(--border)", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 800, color: "#fff", cursor: "pointer", transition: "all 0.2s", opacity: answer.trim() ? 1 : 0.6 }}>Submit Answer</button>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 40 }}>
                    <h3 style={{ fontSize: 12, fontWeight: 800, color: "var(--text3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 24 }}>Live Signals</h3>
                    {normalizeSignals(session?.progress?.signals).map(s => (
                        <SignalBar key={s.id} label={s.name} score={s.score} />
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
