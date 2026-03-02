import React, { useState } from 'react';

interface GapAnalysisPanelProps {
    employabilitySignal: {
        overall: number;
        companyTierMatch: { bigTech: number; productCompanies: number; startups: number };
    };
    weaknesses: Array<{
        weaknessId?: string;
        issue: string;
        impact?: string;
        recommendation?: string;
        severity?: string;
        fileReferences?: Array<{ file: string; line?: number }>;
    }>;
    strengths: Array<{
        strengthId?: string;
        pattern: string;
        description: string;
        impact?: string;
    }>;
}

type Target = 'bigtech' | 'product' | 'startup';

const TARGET_CONFIG = {
    bigtech: { label: 'FAANG / Big Tech', bar: 85, examples: 'Google · Meta · Amazon', color: '#8E44AD' },
    product: { label: 'Product Companies', bar: 65, examples: 'Stripe · Shopify · Figma', color: '#2980B9' },
    startup: { label: 'High-Growth Startups', bar: 55, examples: 'YC · Series A–C', color: '#27AE60' },
};

function buildRoadmap(weaknesses: GapAnalysisPanelProps['weaknesses'], target: Target) {
    const sorted = [...weaknesses].sort((a, b) => {
        const sv = (s?: string) => s === 'high' ? 3 : s === 'medium' ? 2 : 1;
        return sv(b.severity) - sv(a.severity);
    });
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4+'];
    return sorted.slice(0, 4).map((w, i) => ({
        week: weeks[i] ?? `Week ${i + 1}`,
        action: w.recommendation || `Fix: ${w.issue}`,
        impact: w.severity === 'high' ? '+15–20 pts' : '+5–12 pts',
    }));
}

const GapAnalysisPanel: React.FC<GapAnalysisPanelProps> = ({ employabilitySignal, weaknesses, strengths }) => {
    const [target, setTarget] = useState<Target>('product');

    const cfg = TARGET_CONFIG[target];
    const userScore = employabilitySignal.overall;
    const gap = Math.max(0, cfg.bar - userScore);
    const tierScore = employabilitySignal.companyTierMatch[
        target === 'bigtech' ? 'bigTech' : target === 'product' ? 'productCompanies' : 'startups'
    ];

    const dealBreakers = weaknesses.filter(w => w.severity === 'high');
    const weakAreas = weaknesses.filter(w => w.severity !== 'high');
    const roadmap = buildRoadmap(weaknesses, target);

    return (
        <div className="panel" style={{ marginBottom: '16px' }}>
            <div className="panel-head">
                <div className="panel-title">💔 The Gap Analysis</div>
                <div className="chip amber">
                    {gap === 0 ? '✅ At bar' : `${gap} pts gap`}
                </div>
            </div>
            <div className="panel-body">

                {/* Target selector */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
                    {(Object.entries(TARGET_CONFIG) as [Target, typeof cfg][]).map(([key, c]) => (
                        <button key={key} onClick={() => setTarget(key)} style={{
                            padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            fontSize: '12px', fontWeight: 700, transition: 'all 0.15s',
                            background: target === key ? c.color : 'var(--surface2)',
                            color: target === key ? '#fff' : 'var(--text2)',
                            boxShadow: target === key ? `0 2px 8px ${c.color}44` : 'none',
                        }}>{c.label}</button>
                    ))}
                </div>

                {/* Score vs bar */}
                <div style={{
                    background: 'var(--surface2)', borderRadius: '10px', padding: '14px 16px',
                    marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: '12px',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px' }}>{userScore}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Your Score</div>
                    </div>
                    <div style={{ background: 'var(--border)', width: 1 }} />
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: cfg.color, letterSpacing: '-1px' }}>{cfg.bar}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>{cfg.label} Bar</div>
                    </div>
                    <div style={{ background: 'var(--border)', width: 1 }} />
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-1px', color: tierScore >= 65 ? '#27AE60' : '#E74C3C' }}>
                            {tierScore}%
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Interview Chance</div>
                    </div>
                </div>

                {/* Deal-breakers */}
                {dealBreakers.length > 0 && (
                    <div style={{ marginBottom: '18px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
                            padding: '8px 12px', background: 'rgba(231,76,60,0.08)', borderLeft: '3px solid #E74C3C',
                            borderRadius: '0 8px 8px 0',
                        }}>
                            <span style={{ fontSize: '14px' }}>🚨</span>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#E74C3C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Deal-Breakers — Would cause auto-reject
                            </span>
                        </div>
                        <div className="insight-list">
                            {dealBreakers.map((w, i) => (
                                <div key={w.weaknessId ?? i} className="insight-item">
                                    <div className="i-dot neg">!</div>
                                    <div className="i-text">
                                        <strong>{w.issue}</strong>
                                        {w.impact && <div style={{ fontSize: '12.5px', color: 'var(--text2)', marginTop: '2px' }}>{w.impact}</div>}
                                        {w.recommendation && (
                                            <div style={{ fontSize: '12px', color: '#27AE60', marginTop: '4px', fontStyle: 'italic' }}>
                                                → Fix: {w.recommendation}
                                            </div>
                                        )}
                                        {w.fileReferences && w.fileReferences.length > 0 && (
                                            <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {w.fileReferences.slice(0, 3).map((r, ri) => (
                                                    <code key={ri} style={{ fontSize: '10px' }}>{r.file}{r.line ? `:${r.line}` : ''}</code>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Weak areas */}
                {weakAreas.length > 0 && (
                    <div style={{ marginBottom: '18px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                            ⚠️ Weak Areas — Would hurt in interviews
                        </div>
                        <div className="insight-list">
                            {weakAreas.slice(0, 4).map((w, i) => (
                                <div key={w.weaknessId ?? i} className="insight-item">
                                    <div className="i-dot warn">~</div>
                                    <div className="i-text">
                                        <strong>{w.issue}</strong>
                                        {w.recommendation && (
                                            <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>→ {w.recommendation}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Strengths as talking points */}
                {strengths.length > 0 && (
                    <div style={{ marginBottom: '18px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#27AE60', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                            ✅ Talking Points — Bring these up confidently
                        </div>
                        <div className="insight-list">
                            {strengths.slice(0, 3).map((s, i) => (
                                <div key={s.strengthId ?? i} className="insight-item">
                                    <div className="i-dot pos">✓</div>
                                    <div className="i-text">
                                        <strong>{s.pattern}</strong>
                                        {s.impact && <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{s.impact}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Roadmap */}
                {roadmap.length > 0 && (
                    <div style={{
                        background: 'var(--surface2)', borderRadius: '10px', padding: '14px 16px',
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
                            📅 Your Roadmap to {cfg.label}
                        </div>
                        {roadmap.map((r, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'flex-start', gap: '12px',
                                paddingBottom: i < roadmap.length - 1 ? '10px' : 0,
                                borderBottom: i < roadmap.length - 1 ? '1px solid var(--border)' : 'none',
                                marginBottom: i < roadmap.length - 1 ? '10px' : 0,
                            }}>
                                <div style={{
                                    fontSize: '10px', fontWeight: 800, color: cfg.color,
                                    background: `${cfg.color}1A`, borderRadius: '5px',
                                    padding: '2px 7px', flexShrink: 0, marginTop: '1px',
                                }}>{r.week}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '12.5px', color: 'var(--text)' }}>{r.action}</div>
                                </div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#27AE60', flexShrink: 0 }}>{r.impact}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GapAnalysisPanel;
