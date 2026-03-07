import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../services/api";
import ExportDropdown from "../components/dashboard/ExportDropdown";

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

    return (
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                    <div className="view-title">Interview Persistence</div>
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

            {/* Comprehensive Question Sheet */}
            {fullData?.interviewSimulation?.questions?.length > 0 && (
                <div className="panel" style={{ marginTop: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                            </svg>
                            Comprehensive Question Sheet ({fullData.interviewSimulation.questions.length} Qs)
                        </h3>
                    </div>

                    <div className="no-print" style={{ padding: '16px 20px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12.5px', color: 'var(--text2)' }}>
                            Deep-dive questions tailored to your codebase. Perfect for practice or offline review.
                        </span>
                    </div>

                    <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {fullData.interviewSimulation.questions.map((q: any, i: number) => (
                                <div key={q.questionId} style={{
                                    padding: '16px',
                                    background: 'var(--surface2)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    pageBreakInside: 'avoid'
                                }}>
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

                                    <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px', lineHeight: 1.5 }}>
                                        {q.question}
                                    </div>

                                    {q.groundedIn && q.groundedIn.length > 0 && (
                                        <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', marginBottom: '6px', textTransform: 'uppercase' }}>Evidence in Codebase:</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {q.groundedIn.slice(0, 3).map((ref: any, idx: number) => (
                                                    <div key={idx} style={{
                                                        fontSize: '11.5px',
                                                        color: 'var(--accent)',
                                                        background: 'rgba(124,92,219,0.08)',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid rgba(124,92,219,0.2)'
                                                    }}>
                                                        <code>{ref.file.split('/').pop()}</code>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterviewPrepTab;
