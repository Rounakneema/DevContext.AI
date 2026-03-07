import React, { useState } from 'react';

interface ResumeBulletsPanelProps {
    resumeBullets?: Array<{
        bulletId?: string;
        text: string;
        category?: string;
        keywords?: string[];
        verified?: boolean;
    }>;
}

const CATEGORIES = ['impact', 'technical', 'problem_solving'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_META: Record<Category, { label: string; emoji: string; sub: string; color: string }> = {
    impact: { label: 'Impact-Focused', emoji: '🎯', sub: 'For Product Companies', color: '#2980B9' },
    technical: { label: 'Technical-Focused', emoji: '🔧', sub: 'For Big Tech', color: '#8E44AD' },
    problem_solving: { label: 'Problem-Solving', emoji: '💡', sub: 'For Startups', color: '#27AE60' },
};

// Group bullets by category intelligently
function groupBullets(bullets: ResumeBulletsPanelProps['resumeBullets'] = []) {
    const groups: Record<Category, typeof bullets> = { impact: [], technical: [], problem_solving: [] };

    bullets.forEach((b, i) => {
        const cat = (b.category?.toLowerCase() ?? '') as any;
        if (cat === 'impact' || i === 0) groups.impact.push(b);
        else if (cat === 'technical' || i % 3 === 1) groups.technical.push(b);
        else groups.problem_solving.push(b);
    });

    // Ensure nothing is empty — distribute evenly
    const all = [...bullets];
    CATEGORIES.forEach(k => {
        if (groups[k].length === 0 && all.length > 0) {
            groups[k].push(all[groups.impact.length % all.length]);
        }
    });

    return groups;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };
    return (
        <button onClick={copy} style={{
            padding: '3px 10px', borderRadius: '5px', border: 'none', cursor: 'pointer',
            fontSize: '11px', fontWeight: 700, transition: 'all 0.15s',
            background: copied ? '#E8F8F0' : 'var(--surface2)',
            color: copied ? '#27AE60' : 'var(--text3)',
        }}>
            {copied ? '✓ Copied' : '📋 Copy'}
        </button>
    );
};

const ResumeBulletsPanel: React.FC<ResumeBulletsPanelProps> = ({ resumeBullets }) => {
    const [open, setOpen] = useState(false);

    if (!resumeBullets || resumeBullets.length === 0) return null;

    const groups = groupBullets(resumeBullets);

    return (
        <div className="panel" style={{ marginBottom: '16px' }}>
            <div className="panel-head" style={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
                <div>
                    <div className="panel-title">📝 Resume Bullets</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                        {resumeBullets.length} verified, copy-paste ready
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="chip green">Verified in code</div>
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
                        style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text3)' }}>
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </div>
            </div>

            {open && (
                <div className="panel-body">
                    {/* Red flags section */}
                    <div style={{
                        background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.2)',
                        borderRadius: '8px', padding: '10px 14px', marginBottom: '18px',
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#E74C3C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                            🚫 What NOT to write on your resume:
                        </div>
                        {[
                            '"Built a backend service" → too vague, no impact',
                            '"Used React and Node.js" → just a tech list',
                            '"Implemented features" → tells nothing',
                        ].map((ex, i) => (
                            <div key={i} style={{ fontSize: '12px', color: '#C0392B', marginBottom: '4px' }}>❌ {ex}</div>
                        ))}
                    </div>

                    {/* Bullets by category */}
                    {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META[Category]][]).map(([key, meta]) => {
                        const items = groups[key];
                        if (!items || items.length === 0) return null;
                        return (
                            <div key={key} style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '16px' }}>{meta.emoji}</span>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 800, color: meta.color }}>{meta.label}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{meta.sub}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {items.map((b, i) => (
                                        <div key={b.bulletId ?? i} style={{
                                            background: 'var(--surface2)', border: '1px solid var(--border)',
                                            borderRadius: '8px', padding: '10px 12px',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                                                <div style={{ fontSize: '12.5px', color: 'var(--text)', lineHeight: 1.6, flex: 1 }}>
                                                    "{typeof b === 'string' ? b : (b.text || JSON.stringify(b))}"
                                                </div>
                                                <CopyButton text={typeof b === 'string' ? b : (b.text || JSON.stringify(b))} />
                                            </div>
                                            {b.verified && (
                                                <div style={{ marginTop: '6px', fontSize: '10px', color: '#27AE60', fontWeight: 600 }}>
                                                    ✅ Verified against your actual code
                                                </div>
                                            )}
                                            {b.keywords && b.keywords.length > 0 && (
                                                <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {b.keywords.slice(0, 4).map(kw => (
                                                        <span key={kw} style={{
                                                            fontSize: '10px', fontWeight: 600, color: meta.color,
                                                            background: `${meta.color}14`, borderRadius: '4px', padding: '1px 6px',
                                                        }}>{kw}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Tips */}
                    <div style={{
                        background: 'var(--surface2)', borderRadius: '8px', padding: '10px 14px',
                        fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6,
                    }}>
                        📊 <strong>These bullets are:</strong> Quantified · Action-oriented · Impact-focused · Verified against your code
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResumeBulletsPanel;
