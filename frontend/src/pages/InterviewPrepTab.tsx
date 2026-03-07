import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../services/api";
import ExportDropdown from "../components/dashboard/ExportDropdown";

function normalizeQ(s: string) {
    return (s || "")
        .toLowerCase()
        .replace(/[`"'’“”]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokenSet(s: string): Set<string> {
    const out = new Set<string>();
    for (const t of normalizeQ(s).split(" ")) {
        if (!t) continue;
        // Drop ultra-common filler words to reduce false positives.
        if (t.length <= 2) continue;
        if (["the", "and", "for", "with", "that", "this", "from", "into", "your"].includes(t)) continue;
        out.add(t);
    }
    return out;
}

function jaccard(a: Set<string>, b: Set<string>) {
    if (a.size === 0 || b.size === 0) return 0;
    let inter = 0;
    a.forEach((x) => { if (b.has(x)) inter++; });
    return inter / (a.size + b.size - inter);
}

function isTooSimilar(a: string, b: string) {
    const na = normalizeQ(a);
    const nb = normalizeQ(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.length > 40 && (na.includes(nb) || nb.includes(na))) return true;
    return jaccard(tokenSet(na), tokenSet(nb)) >= 0.88;
}

function buildPrepQuestions(fullData: any, prepData: any) {
    const repoName =
        fullData?.repository?.repositoryName ||
        fullData?.analysis?.repositoryName ||
        (fullData?.analysis?.repositoryUrl ? String(fullData.analysis.repositoryUrl).replace(/^https?:\/\//, "") : null) ||
        "this project";

    const bullets: string[] = (prepData?.resumeBullets || [])
        .map((b: any) => b?.bullet)
        .filter(Boolean)
        .slice(0, 6);

    const weaknesses: any[] = (fullData?.projectReview?.weaknesses || []).slice(0, 4);
    const strengths: any[] = (fullData?.projectReview?.strengths || []).slice(0, 3);

    const out: Array<{ id: string; category: string; difficulty: string; question: string }> = [];

    out.push({
        id: "prep-arch-1",
        category: "architecture",
        difficulty: "mid-level",
        question: `Give a 60-second overview of ${repoName}: what problem it solves, who uses it, and the core data flow.`,
    });
    out.push({
        id: "prep-arch-2",
        category: "architecture",
        difficulty: "senior",
        question: `Draw (verbally) the main components of ${repoName}. Where are the boundaries (API, services, storage) and why?`,
    });
    out.push({
        id: "prep-scale-1",
        category: "scalability",
        difficulty: "senior",
        question: `What are the likely bottlenecks in ${repoName} (DB hot spots, external calls, queue backlogs)? How would you measure them (metrics/SLOs)?`,
    });
    out.push({
        id: "prep-trade-1",
        category: "tradeoffs",
        difficulty: "senior",
        question: `Pick one key design decision you made in ${repoName}. What were 2 alternatives, and what tradeoffs made you choose your approach?`,
    });

    bullets.forEach((b, i) => {
        out.push({
            id: `prep-impl-b${i + 1}`,
            category: "implementation",
            difficulty: i < 2 ? "mid-level" : "senior",
            question: `Deep dive: "${b}". What exactly did you implement, what edge cases did you handle, and how did you validate it (tests/monitoring)?`,
        });
    });

    strengths.forEach((s, i) => {
        const label = s?.pattern || s?.title || "a strong area";
        out.push({
            id: `prep-strength-${i + 1}`,
            category: "implementation",
            difficulty: "mid-level",
            question: `You show strength in "${label}". Walk through the code change or pattern behind it, and how it improves maintainability.`,
        });
    });

    weaknesses.forEach((w, i) => {
        const issue = w?.issue || w?.title || "an improvement area";
        out.push({
            id: `prep-weak-${i + 1}`,
            category: "tradeoffs",
            difficulty: "senior",
            question: `The review flagged "${issue}". How would you fix it, what risks/tradeoffs are involved, and what tests would prove the fix?`,
        });
    });

    return out;
}

const InterviewPrepTab: React.FC = () => {
    const { analysisId } = useOutletContext<{ analysisId: string }>();
    const [fullData, setFullData] = useState<any>(null);
    const [prepData, setPrepData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [copiedPitch, setCopiedPitch] = useState(false);
    const [copiedBullet, setCopiedBullet] = useState<number | null>(null);

    useEffect(() => {
        const loadInterviewPrep = async () => {
            try {
                setLoading(true);
                const data: any = await api.getAnalysis(analysisId);
                setFullData(data);
                const prep = data?.intelligenceReport;
                if (!prep) {
                    throw new Error("Interview prep data has not been generated yet.");
                }

                setPrepData({
                    elevatorPitch: prep.elevatorPitch || "Your elevator pitch is being generated.",
                    resumeBullets: (prep.resumeBullets || []).map((b: any) => ({
                        target: b.category || "General",
                        bullet: b.text || b.bullet
                    }))
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load prep data');
            } finally {
                setLoading(false);
            }
        };
        loadInterviewPrep();
    }, [analysisId]);

    const copyToClipboard = (text: string, type: 'pitch' | 'bullet', index?: number) => {
        navigator.clipboard.writeText(text);
        if (type === 'pitch') {
            setCopiedPitch(true);
            setTimeout(() => setCopiedPitch(false), 2000);
        } else if (index !== undefined) {
            setCopiedBullet(index);
            setTimeout(() => setCopiedBullet(null), 2000);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontSize: '14px', color: 'var(--text2)' }}>Synthesizing interview strategy…</div>
            </div>
        );
    }

    if (error || !prepData) {
        return (
            <div style={{ background: '#FEF4F4', border: '1px solid #FACACA', borderRadius: '8px', padding: '12px 16px', color: '#C0392B', fontSize: '13px' }}>
                {error || 'Interview prep data not found'}
            </div>
        );
    }

    const interviewQuestions: any[] = fullData?.interviewSimulation?.questions || [];
    const prepQuestionsRaw = buildPrepQuestions(fullData, prepData);
    const filteredPrepQuestions = prepQuestionsRaw.filter((pq) => {
        // Drop overlap with mock interview bank.
        for (const iq of interviewQuestions) {
            if (isTooSimilar(pq.question, iq?.question || "")) return false;
        }
        return true;
    }).filter((pq, idx, arr) => {
        // Drop near-duplicates within the prep set.
        for (let i = 0; i < idx; i++) {
            if (isTooSimilar(pq.question, arr[i].question)) return false;
        }
        return true;
    }).slice(0, 12);

    const removedOverlapCount = Math.max(0, prepQuestionsRaw.length - filteredPrepQuestions.length);

    return (
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                    <div className="view-title">Interview Prep</div>
                    <div className="view-sub">AI-driven talking points and resume optimization</div>
                </div>
                <ExportDropdown analysisId={analysisId} analysisData={fullData} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Elevator Pitch Panel */}
                <div className="panel" style={{ padding: '0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <div style={{ padding: '20px 20px 16px 20px', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            "Tell me about this project"
                        </h3>
                    </div>
                    <div style={{ padding: '24px' }}>
                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', fontSize: '14.5px', color: '#334155', lineHeight: 1.6, fontStyle: 'italic', marginBottom: '16px' }}>
                            "{prepData.elevatorPitch}"
                        </div>
                        <button
                            onClick={() => copyToClipboard(prepData.elevatorPitch, 'pitch')}
                            style={{ background: copiedPitch ? '#10B981' : 'var(--surface2)', color: copiedPitch ? '#fff' : 'var(--text)', border: `1px solid ${copiedPitch ? '#10B981' : 'var(--border)'}`, borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                {copiedPitch ? (
                                    <polyline points="20 6 9 17 4 12" />
                                ) : (
                                    <>
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </>
                                )}
                            </svg>
                            {copiedPitch ? 'Copied!' : 'Copy Pitch'}
                        </button>
                    </div>
                </div>

                {/* ATS Resume Bullets */}
                <div className="panel" style={{ padding: '0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <div style={{ padding: '20px 20px 16px 20px', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <line x1="8" y1="6" x2="21" y2="6" />
                                <line x1="8" y1="12" x2="21" y2="12" />
                                <line x1="8" y1="18" x2="21" y2="18" />
                                <line x1="3" y1="6" x2="3.01" y2="6" />
                                <line x1="3" y1="12" x2="3.01" y2="12" />
                                <line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                            ATS-Optimized Resume Bullets
                        </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {prepData.resumeBullets.map((item: any, i: number) => (
                            <div key={i} style={{ padding: '20px', borderBottom: i < prepData.resumeBullets.length - 1 ? '1px solid var(--border2)' : 'none' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                    Targeting: {item.target}
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, fontSize: '14px', color: 'var(--text)', lineHeight: 1.5 }}>
                                        • {item.bullet}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(item.bullet, 'bullet', i)}
                                        style={{ background: copiedBullet === i ? '#10B981' : 'transparent', color: copiedBullet === i ? '#fff' : 'var(--text3)', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                                        title="Copy bullet"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                            {copiedBullet === i ? (
                                                <polyline points="20 6 9 17 4 12" />
                                            ) : (
                                                <>
                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                </>
                                            )}
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                        {prepData.resumeBullets.length === 0 && (
                            <div style={{ padding: '20px', color: 'var(--text3)', fontSize: '14px' }}>
                                No resume bullets generated yet.
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Prep Practice Questions (distinct from Mock Interview bank) */}
            <div className="panel" style={{ marginTop: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                        Prep Practice Questions
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: 700 }}>
                        {filteredPrepQuestions.length} Qs
                    </div>
                </div>

                <div className="no-print" style={{ padding: '16px 20px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '12.5px', color: 'var(--text2)' }}>
                        These are warmup questions derived from your elevator pitch, resume bullets, and review findings. We filter out overlap with the Mock Interview question bank.
                    </div>
                    {removedOverlapCount > 0 && (
                        <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                            Removed {removedOverlapCount} overlapping question(s).
                        </div>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                        Tip: use <strong>Mock Interview</strong> for the full deep-dive question bank.
                    </div>
                </div>

                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {filteredPrepQuestions.map((q, i) => (
                            <div key={q.id} style={{ padding: '16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>
                                            {q.category}
                                        </span>
                                        <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', background: 'var(--border)', color: 'var(--text2)', padding: '2px 8px', borderRadius: '4px' }}>
                                            {q.difficulty}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600 }}>Q{i + 1}</div>
                                </div>
                                <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.5 }}>
                                    {q.question}
                                </div>
                            </div>
                        ))}
                        {filteredPrepQuestions.length === 0 && (
                            <div style={{ padding: '16px', color: 'var(--text3)', fontSize: '13px', fontStyle: 'italic' }}>
                                No distinct prep questions available yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InterviewPrepTab;
