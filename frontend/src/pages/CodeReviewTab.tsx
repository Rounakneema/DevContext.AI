import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import api from "../services/api";
import ExportDropdown from "../components/dashboard/ExportDropdown";

const TypedRadarChart = RadarChart as any;
const TypedPolarGrid = PolarGrid as any;
const TypedPolarAngleAxis = PolarAngleAxis as any;
const TypedPolarRadiusAxis = PolarRadiusAxis as any;
const TypedTooltip = Tooltip as any;
const TypedRadar = Radar as any;

const getScoreColor = (score: number) => {
    if (score >= 85) return '#10B981';
    if (score >= 70) return '#F59E0B';
    if (score >= 50) return '#F97316';
    return '#EF4444';
};

const CodeReviewTab: React.FC = () => {
    const { analysisId } = useOutletContext<{ analysisId: string }>();
    const [fullData, setFullData] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        const loadStats = async () => {
            try {
                setLoading(true);
                setError(null);
                const data: any = await api.getAnalysis(analysisId);
                setFullData(data);
                const review = data?.projectReview;
                if (!review) return;

                const cq = review.codeQuality || {};
                const radarData = [
                    { subject: 'Readability', A: cq.readability || 0, fullMark: 100 },
                    { subject: 'Maintainability', A: cq.maintainability || 0, fullMark: 100 },
                    { subject: 'Security', A: cq.security || 0, fullMark: 100 },
                    { subject: 'Performance', A: cq.performance || 0, fullMark: 100 },
                    { subject: 'Documentation', A: cq.documentation || 0, fullMark: 100 },
                    { subject: 'Error Handling', A: cq.errorHandling || 0, fullMark: 100 },
                ];

                setStats({
                    radarData,
                    totalIssues: (review.strengths?.length || 0) + (review.weaknesses?.length || 0),
                    strengths: review.strengths || [],
                    weaknesses: review.weaknesses || [],
                    codeQuality: cq.overall || 0
                });
            } catch (err) {
                console.error("Failed to load code review stats", err);
                setError(err instanceof Error ? err.message : "Failed to load code review stats");
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, [analysisId]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontSize: '14px', color: 'var(--text2)' }}>Performing deep code audit…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ background: '#FEF4F4', border: '1px solid #FACACA', borderRadius: '8px', padding: '12px 16px', color: '#C0392B', fontSize: '13px' }}>
                {error}
            </div>
        );
    }

    if (!stats) {
        return (
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', color: 'var(--text3)', fontSize: '13px' }}>
                Code review data not available yet. Complete Stage 1 first.
            </div>
        );
    }

    const mainColor = getScoreColor(stats.codeQuality);

    const severityRank = (s?: string) => (s === "high" ? 3 : s === "medium" ? 2 : s === "low" ? 1 : 0);
    const sortedWeaknesses = [...(stats.weaknesses || [])].sort((a: any, b: any) => {
        const as = severityRank(typeof a === "string" ? "" : a.severity);
        const bs = severityRank(typeof b === "string" ? "" : b.severity);
        if (bs !== as) return bs - as;
        const af = typeof a === "string" ? 0 : (a.fileReferences?.length || 0);
        const bf = typeof b === "string" ? 0 : (b.fileReferences?.length || 0);
        return bf - af;
    });
    const shownWeaknesses = showAll ? sortedWeaknesses : sortedWeaknesses.slice(0, 6);

    return (
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                    <div className="view-title">Code Review & Metrics</div>
                    <div className="view-sub">Quality profile and dimension breakdown compared to industry standards</div>
                </div>
                <ExportDropdown analysisId={analysisId} analysisData={fullData} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Left: Score & Radar */}
                <div className="panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <div>
                            <div style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Code Quality Score</div>
                            <div style={{ fontSize: '48px', fontWeight: 800, color: mainColor }}>{stats.codeQuality}<span style={{ fontSize: '20px', color: 'var(--text3)', fontWeight: 400 }}>/100</span></div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Observations</div>
                            <div style={{ fontSize: '24px', fontWeight: 700 }}>{stats.totalIssues}</div>
                        </div>
                    </div>

                    <div style={{ height: '300px', width: '100%', minWidth: 0 }}>
                        <ResponsiveContainer width="99%" height="100%">
                            <TypedRadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarData}>
                                <TypedPolarGrid stroke="var(--border)" />
                                <TypedPolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text2)', fontSize: 12 }} />
                                <TypedPolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <TypedRadar
                                    name="Score"
                                    dataKey="A"
                                    stroke={mainColor}
                                    fill={mainColor}
                                    fillOpacity={0.15}
                                />
                                <TypedTooltip
                                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                />
                            </TypedRadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Actionable Fixes */}
                <div className="panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <line x1="12" y1="19" x2="12" y2="5" />
                                    <polyline points="5 12 12 5 19 12" />
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Top Fixes</h3>
                        </div>
                        {sortedWeaknesses.length > 6 && (
                            <button
                                onClick={() => setShowAll(v => !v)}
                                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer', color: 'var(--text)' }}
                            >
                                {showAll ? 'Show less' : `Show all (${sortedWeaknesses.length})`}
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {shownWeaknesses.map((w: any, i: number) => {
                            const issueText = typeof w === 'string' ? w : (w.issue || w.name || "Improvement Area");
                            const recommendationText = typeof w === 'string' ? "" : (w.recommendation || w.impact || w.description || "");
                            const sev = typeof w === 'string' ? "" : (w.severity || "");
                            const sevColor = sev === "high" ? "#EF4444" : sev === "medium" ? "#F59E0B" : "#64748B";
                            return (
                                <div key={i} style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                                        <div style={{ fontSize: '13.5px', fontWeight: 800, marginBottom: '2px' }}>{issueText}</div>
                                        {sev && (
                                            <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: sevColor, background: `${sevColor}14`, border: `1px solid ${sevColor}33`, padding: "2px 8px", borderRadius: 999 }}>
                                                {sev}
                                            </span>
                                        )}
                                    </div>
                                    {recommendationText && <div style={{ fontSize: '12.5px', color: 'var(--text2)', lineHeight: 1.55 }}>{recommendationText}</div>}
                                    {typeof w !== "string" && w.fileReferences && w.fileReferences.length > 0 && (
                                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                                            {w.fileReferences.slice(0, 4).map((ref: any, idx: number) => (
                                                <code key={`${ref.file}-${idx}`} style={{ fontSize: 11, opacity: 0.8 }}>{ref.file}</code>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {sortedWeaknesses.length === 0 && (
                            <div style={{ color: "var(--text3)", fontSize: 13 }}>
                                No major issues detected in the current review output.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CodeReviewTab;
