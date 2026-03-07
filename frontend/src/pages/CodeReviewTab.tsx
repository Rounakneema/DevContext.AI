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

    useEffect(() => {
        const loadStats = async () => {
            try {
                setLoading(true);
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

    if (!stats) return null;

    const mainColor = getScoreColor(stats.codeQuality);

    return (
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                    <div className="view-title">Code Review & Metrics</div>
                    <div className="view-sub">Quality profile and dimension breakdown compared to industry standards</div>
                </div>
                <ExportDropdown analysisId={analysisId} analysisData={fullData} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>

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

                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
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

                {/* Right: Strengths & Weaknesses */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Strengths */}
                    <div className="panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderRadius: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Engineering Strengths</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {stats.strengths.slice(0, 3).map((s: any, i: number) => {
                                const patternText = typeof s === 'string' ? s : (s.pattern || s.name || "Engineering Strength");
                                const descText = typeof s === 'string' ? "" : (s.description || s.impact || "");
                                return (
                                    <div key={i} style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '2px' }}>{patternText}</div>
                                        {descText && <div style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.4 }}>{descText}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Improvements */}
                    <div className="panel" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <div style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <line x1="12" y1="19" x2="12" y2="5" />
                                    <polyline points="5 12 12 5 19 12" />
                                </svg>
                            </div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Critical Improvements</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {stats.weaknesses.slice(0, 2).map((w: any, i: number) => {
                                const issueText = typeof w === 'string' ? w : (w.issue || w.name || "Improvement Area");
                                const recommendationText = typeof w === 'string' ? "" : (w.recommendation || w.impact || w.description || "");
                                return (
                                    <div key={i} style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '13.5px', fontWeight: 600, marginBottom: '2px' }}>{issueText}</div>
                                        {recommendationText && <div style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.4 }}>{recommendationText}</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CodeReviewTab;
