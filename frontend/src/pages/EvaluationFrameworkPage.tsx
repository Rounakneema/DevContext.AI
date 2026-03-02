import React from 'react';

/**
 * DevContext Intelligence Framework™
 * Full-page evaluation methodology — descriptive, not prescriptive.
 * Designed to explain our approach without revealing implementation details
 * that could be replicated by pasting into a general-purpose AI.
 */

const Section: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>{title}</h2>
        </div>
        {children}
    </div>
);

const Pill: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = '#2980B9' }) => (
    <span style={{
        display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px',
        fontWeight: 700, background: `${color}14`, color, border: `1px solid ${color}33`,
        marginRight: '6px', marginBottom: '4px',
    }}>{children}</span>
);

const BlockQuote: React.FC<{ children: React.ReactNode; type?: 'warn' | 'info' | 'success' }> = ({ children, type = 'info' }) => {
    const colors = { warn: '#E67E22', info: '#2980B9', success: '#27AE60' };
    const c = colors[type];
    return (
        <div style={{
            borderLeft: `3px solid ${c}`, paddingLeft: '14px', marginBottom: '14px',
            background: `${c}08`, borderRadius: '0 8px 8px 0', padding: '10px 14px',
            fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7,
        }}>{children}</div>
    );
};

const EvaluationFrameworkPage: React.FC = () => {
    return (
        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 4px 60px' }}>

            {/* Hero */}
            <div style={{
                background: 'linear-gradient(145deg, #0F1923 0%, #1A2332 60%, #0D1520 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '32px', marginBottom: '32px',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle, #2980B922 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    DevContext Intelligence Framework™ v3.1
                </div>
                <h1 style={{ margin: '0 0 12px', fontSize: '26px', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                    How We Evaluate Your Code
                </h1>
                <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: '580px' }}>
                    Our evaluation is the result of a multi-layer analysis pipeline — not a checklist. This page explains the <em>philosophy</em> behind our scores so you understand what they mean and how to act on them.
                </p>
            </div>

            {/* Why not a formula */}
            <BlockQuote type="warn">
                <strong>Why we don't publish a scoring formula:</strong> Our model is continuously recalibrated against real hiring outcomes. A published formula creates gaming incentives that degrade accuracy for everyone. What we <em>do</em> publish is our methodology — the reasoning behind how we look at code.
            </BlockQuote>

            {/* Layer 1 */}
            <Section icon="🔬" title="Layer 1 — Signal Extraction">
                <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '14px' }}>
                    We extract <strong>47+ distinct signals</strong> from your repository across four categories. Signals capture patterns in structure, semantics, history, and intent — not just surface-level metrics.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '14px' }}>
                    {[
                        { title: 'Structural Signals', items: ['Component coupling coefficients', 'Dependency graph topology', 'Cyclomatic & cognitive complexity', 'Module boundary clarity'] },
                        { title: 'Semantic Signals', items: ['Naming entropy & consistency', 'Comment intent vs. implementation', 'Error propagation patterns', 'Abstraction level coherence'] },
                        { title: 'Evolutionary Signals', items: ['Commit message quality patterns', 'Time-spread authenticity', 'Code churn vs. stability ratio', 'Feature growth trajectory'] },
                        { title: 'Production Signals', items: ['Observability indicators', 'Graceful degradation patterns', 'Security surface analysis', 'Scalability constraint markers'] },
                    ].map(cat => (
                        <div key={cat.title} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>{cat.title}</div>
                            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '12px', color: 'var(--text2)', lineHeight: 1.8 }}>
                                {cat.items.map(i => <li key={i}>{i}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Layer 2 */}
            <Section icon="⚖️" title="Layer 2 — Contextual Calibration">
                <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '14px' }}>
                    Raw signals are <strong>not treated the same regardless of context</strong>. A Go database proxy, a Python data script, and a React portfolio app are evaluated against fundamentally different standards. Calibration factors include:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                    {['Tech stack conventions', 'Project domain', 'Solo vs. team indicators', 'Repository age & maturity', 'Declared vs. inferred purpose', 'Language paradigm'].map(t => <Pill key={t}>{t}</Pill>)}
                </div>
                <BlockQuote type="info">
                    A 60% Documentation score on a low-level systems library is treated very differently than a 60% on a public-facing SDK. Context changes what "good" means.
                </BlockQuote>
            </Section>

            {/* Layer 3 */}
            <Section icon="🤖" title="Layer 3 — AI-Powered Semantic Analysis">
                <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '14px' }}>
                    We use <strong>Gemini 3.1 Pro</strong> — Google's most capable reasoning model — for semantic understanding that static analysis cannot provide: design intent, architectural coherence, and the "why" behind code decisions.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                    {[
                        { icon: '🏗', label: 'Architecture Reconstruction', desc: 'Understanding how systems connect, not just what exists' },
                        { icon: '🔍', label: 'Design Intent Inference', desc: 'Why decisions were made, what trade-offs exist' },
                        { icon: '⚠️', label: 'Anti-Pattern Detection', desc: 'Patterns that look fine but cause pain at scale' },
                    ].map(c => (
                        <div key={c.label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', marginBottom: '6px' }}>{c.icon}</div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>{c.label}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', lineHeight: 1.5 }}>{c.desc}</div>
                        </div>
                    ))}
                </div>
                <BlockQuote type="warn">
                    We deliberately do not publish our prompts. General-purpose AI models given our rubric cannot replicate our analysis because they lack: (a) your full repository context, (b) our calibration data, and (c) our comparison corpus.
                </BlockQuote>
            </Section>

            {/* Layer 4 */}
            <Section icon="📊" title="Layer 4 — Comparative Benchmarking">
                <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '14px' }}>
                    Every score is anchored to a <strong>comparative baseline</strong>. Your code is not graded on an absolute scale — it's measured against the distribution of similar projects.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                    {[
                        { label: 'Stack-specific percentiles', desc: 'Go microservice projects are benchmarked against Go microservice projects, not generic code.' },
                        { label: 'Domain-adjusted thresholds', desc: 'Security scores for fintech repos use stricter calibration than hobby projects.' },
                        { label: 'Size-normalized complexity', desc: 'A 500-line repo and a 50,000-line system cannot share the same maintainability standard.' },
                    ].map(r => (
                        <div key={r.label} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2980B9', marginTop: 5, flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)' }}>{r.label}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{r.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Layer 5 */}
            <Section icon="🎯" title="Layer 5 — Hiring Outcome Correlation">
                <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '14px' }}>
                    Code scores are mapped to <strong>hiring probability thresholds</strong> derived from engineering interview patterns across different company tiers. This is what makes our scores actionable rather than academic.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                    {[
                        { tier: 'FAANG / Big Tech', bar: '85+', color: '#8E44AD', note: 'Comprehensive testing, observability, system design depth required' },
                        { tier: 'Product Companies', bar: '65+', color: '#2980B9', note: 'Clean architecture, meaningful documentation, solid error handling' },
                        { tier: 'High-Growth Startups', bar: '55+', color: '#27AE60', note: 'Delivery-focused; working software that scales from Day 1' },
                    ].map(t => (
                        <div key={t.tier} style={{ background: 'var(--surface2)', border: `1px solid ${t.color}33`, borderRadius: '10px', padding: '14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: t.color, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.tier}</div>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: t.color, marginBottom: '6px', letterSpacing: '-1px' }}>≥ {t.bar}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text2)', lineHeight: 1.6 }}>{t.note}</div>
                        </div>
                    ))}
                </div>
                <BlockQuote type="success">
                    These thresholds are not opinions — they reflect what screening criteria consistently appear at different company tiers. Falling below a threshold doesn't mean you won't get hired; it means you'll need to compensate with communication skills and portfolio context in the interview itself.
                </BlockQuote>
            </Section>

            {/* What this means for you */}
            <Section icon="💡" title="What Your Score Actually Means">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                        { range: '85 – 100', label: 'Exceptional', color: '#8E44AD', desc: 'Passes BigTech screening comfortably. Code demonstrates staff-level thinking.' },
                        { range: '70 – 84', label: 'Strong', color: '#2980B9', desc: 'Solid Senior+ quality. Will pass Product Company screens with high confidence.' },
                        { range: '55 – 69', label: 'Competitive', color: '#27AE60', desc: 'Mid-level quality. Strong at startups; needs improvement for BigTech.' },
                        { range: '40 – 54', label: 'Developing', color: '#E67E22', desc: 'Junior level. Shows initiative but missing production-grade patterns.' },
                        { range: '0 – 39', label: 'Early Stage', color: '#E74C3C', desc: 'Early career or proof-of-concept. Focus on fundamentals before showcasing.' },
                    ].map(r => (
                        <div key={r.range} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <div style={{ minWidth: '70px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: r.color }}>{r.range}</div>
                            </div>
                            <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{r.label}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6 }}>{r.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Footer */}
            <div style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '20px 24px', textAlign: 'center',
            }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
                    DevContext Intelligence Framework™ is proprietary
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', lineHeight: 1.7, maxWidth: '500px', margin: '0 auto' }}>
                    Our evaluation combines static analysis, AI semantic reasoning, comparative benchmarking, and hiring-outcome correlation in a way that cannot be replicated by prompting general-purpose models. The value is in the calibration, not the checklist.
                </div>
            </div>
        </div>
    );
};

export default EvaluationFrameworkPage;
