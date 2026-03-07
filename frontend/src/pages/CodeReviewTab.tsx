import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";
import api from "../services/api";

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
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadCodeReview = async () => {
            try {
                setLoading(true);
                const res: any = await api.getAnalysis(analysisId);
                const review = res?.projectReview;
                if (!review || !review.codeQuality) {
                    throw new Error("Code review data has not been generated yet.");
                }

                const cq = review.codeQuality;
                setData({
                    overall: cq.overall || 0,
                    dimensions: [
                        { subject: 'Readability', A: cq.readability || 0, fullMark: 100 },
                        { subject: 'Performance', A: cq.performance || 0, fullMark: 100 },
                        { subject: 'Security', A: cq.security || 0, fullMark: 100 },
                        { subject: 'Maintainability', A: cq.maintainability || 0, fullMark: 100 },
                        { subject: 'Error Handling', A: cq.errorHandling || 0, fullMark: 100 },
                        { subject: 'Documentation', A: cq.documentation || 0, fullMark: 100 },
                    ],
                    gapAnalysis: {
                        strengths: (review.strengths || []).map((s: any) => s.description || s.pattern),
                        weaknesses: (review.weaknesses || []).map((w: any) => w.issue)
                    }
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load code review data');
            } finally {
                setLoading(false);
            }
        };
        loadCodeReview();
    }, [analysisId]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontSize: '14px', color: 'var(--text2)' }}>Analyzing code metrics…</div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div style={{ background: '#FEF4F4', border: '1px solid #FACACA', borderRadius: '8px', padding: '12px 16px', color: '#C0392B', fontSize: '13px' }}>
                {error || 'Code review data not found'}
            </div>
        );
    }

    const mainColor = getScoreColor(data.overall);

    return (
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <div className="view-title">Code Review & Metrics</div>
                <div className="view-sub">Quality profile and dimension breakdown compared to industry standards</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>

                {/* Radar Chart Panel */}
                <div className="panel" style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            Quality Radar
                        </h3>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: mainColor }}>{data.overall}</div>
                    </div>

                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <TypedRadarChart cx="50%" cy="50%" outerRadius="75%" data={data.dimensions}>
                                <TypedPolarGrid stroke="var(--border2)" />
                                <TypedPolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text2)', fontSize: 12, fontWeight: 600 }} />
                                <TypedPolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 10 }} />
                                <TypedTooltip
                                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ color: 'var(--text)', fontWeight: 600 }}
                                />
                                <TypedRadar name="Score" dataKey="A" stroke={mainColor} fill={mainColor} fillOpacity={0.3} />
                            </TypedRadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Dimension Breakdown List */}
                    <div className="panel" style={{ padding: '0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                        <div style={{ padding: '20px 20px 16px 20px', borderBottom: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <line x1="18" y1="20" x2="18" y2="10" />
                                    <line x1="12" y1="20" x2="12" y2="4" />
                                    <line x1="6" y1="20" x2="6" y2="14" />
                                </svg>
                                Detailed Metrics
                            </h3>
                        </div>
                        <div style={{ padding: '4px 20px 20px 20px' }}>
                            {data.dimensions.concat().sort((a: any, b: any) => b.A - a.A).map((dim: any) => {
                                const c = getScoreColor(dim.A);
                                return (
                                    <div key={dim.subject} style={{ marginTop: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{dim.subject}</div>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: c }}>{dim.A}/100</div>
                                        </div>
                                        <div style={{ height: '6px', background: 'var(--surface2)', borderRadius: '3px', position: 'relative' }}>
                                            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${dim.A}%`, background: c, borderRadius: '3px' }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Gap Analysis */}
                    <div className="panel" style={{ padding: '24px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius)' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A', marginBottom: '20px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            Gap Analysis
                        </h3>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#059669', marginBottom: '10px', letterSpacing: '0.05em' }}>Key Strengths</div>
                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {data.gapAnalysis.strengths.length > 0 ? (
                                    data.gapAnalysis.strengths.map((str: string, i: number) => <li key={i}>{str}</li>)
                                ) : (
                                    <li>No major strengths identified yet.</li>
                                )}
                            </ul>
                        </div>

                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#E11D48', marginBottom: '10px', letterSpacing: '0.05em' }}>Critical Weaknesses</div>
                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {data.gapAnalysis.weaknesses.length > 0 ? (
                                    data.gapAnalysis.weaknesses.map((wk: string, i: number) => <li key={i}>{wk}</li>)
                                ) : (
                                    <li>No critical weaknesses found.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CodeReviewTab;
