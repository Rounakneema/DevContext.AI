import React from 'react';

interface CodeDNAPanelProps {
    codeQuality: {
        overall: number;
        readability?: number;
        maintainability?: number;
        errorHandling?: number;
        security?: number;
        performance?: number;
        documentation?: number;
    };
    stack?: string[];
}

interface Personality {
    title: string;
    emoji: string;
    tagline: string;
    similar: string[];
    description: string;
}

function derivePersonality(cq: CodeDNAPanelProps['codeQuality']): Personality {
    const { performance = 0, documentation = 0, security = 0, maintainability = 0, readability = 0 } = cq;

    if (performance >= 80 && documentation < 60)
        return { title: 'Speed Demon', emoji: '⚡', tagline: 'You build it fast. Now make it last.', similar: ['Linus Torvalds', 'John Carmack'], description: 'You optimise relentlessly but skip the paper trail. Employers love your output; teams love you more with docs.' };
    if (security >= 80 && maintainability >= 70)
        return { title: 'Security Architect', emoji: '🔐', tagline: "You don't just build — you fortify.", similar: ['Bruce Schneier', 'Dan Kaminsky'], description: 'Your code is your castle. You think in threat models and trust boundaries. A rare find in most engineering orgs.' };
    if (readability >= 80 && documentation >= 75)
        return { title: 'Code Artist', emoji: '🎨', tagline: 'Your code reads like prose.', similar: ['Uncle Bob Martin', 'DHH'], description: 'Clean, expressive, opinionated. You write code that your future self — and your teammates — will actually enjoy reading.' };
    if (maintainability >= 80 && performance >= 75)
        return { title: 'Systems Thinker', emoji: '🧠', tagline: 'You see the whole board.', similar: ['Jeff Dean', 'Martin Fowler'], description: 'You architect for the long game. Scale, maintainability, and complexity tradeoffs all live rent-free in your head.' };
    return { title: 'Pragmatic Builder', emoji: '🔨', tagline: 'You ship. That matters.', similar: ['Guido van Rossum', 'Ryan Dahl'], description: 'Balanced, practical, and delivery-focused. You hit deadlines without sacrificing too much on quality.' };
}

function deriveRoles(cq: CodeDNAPanelProps['codeQuality'], stack: string[]) {
    const roles: { label: string; fit: 'great' | 'good' | 'weak' }[] = [];
    const { performance = 0, security = 0, maintainability = 0, documentation = 0 } = cq;

    if (performance >= 75) roles.push({ label: 'Backend / Infrastructure', fit: 'great' });
    if (performance >= 70) roles.push({ label: 'Performance Engineering', fit: 'great' });
    if (security >= 75) roles.push({ label: 'Security Engineering', fit: 'great' });
    if (maintainability >= 75) roles.push({ label: 'Platform / SRE', fit: 'good' });
    if (documentation < 60) roles.push({ label: 'Technical Writing', fit: 'weak' });
    if (stack.some(s => ['React', 'Vue', 'Angular', 'CSS'].includes(s))) roles.push({ label: 'Frontend Engineering', fit: 'good' });
    else roles.push({ label: 'Frontend Engineering', fit: 'weak' });

    return roles.slice(0, 5);
}

const TraitBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text2)' }}>{label}</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color }}>{value}%</span>
        </div>
        <div style={{ height: '6px', background: 'var(--border2)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
                height: '100%', width: `${value}%`, background: color,
                borderRadius: '3px', transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
            }} />
        </div>
    </div>
);

const CodeDNAPanel: React.FC<CodeDNAPanelProps> = ({ codeQuality, stack = [] }) => {
    const persona = derivePersonality(codeQuality);
    const roles = deriveRoles(codeQuality, stack);

    const traits = [
        { label: '🧠 Systems Thinker', value: Math.round(((codeQuality.maintainability ?? 0) + (codeQuality.performance ?? 0)) / 2), color: '#8E44AD' },
        { label: '⚡ Problem Solver', value: Math.round(((codeQuality.errorHandling ?? 0) + (codeQuality.performance ?? 0)) / 2), color: '#2980B9' },
        { label: '🎨 Code Artist', value: Math.round(((codeQuality.readability ?? 0) + (codeQuality.documentation ?? 0)) / 2), color: '#27AE60' },
        { label: '🔒 Security Mindset', value: codeQuality.security ?? 0, color: '#E67E22' },
        { label: '📖 Documentation Advocate', value: codeQuality.documentation ?? 0, color: '#1ABC9C' },
    ];

    return (
        <div className="panel" style={{ marginBottom: '16px' }}>
            <div className="panel-head">
                <div className="panel-title">🧬 Your Code DNA</div>
                <div className="chip neutral">Unique fingerprint</div>
            </div>
            <div className="panel-body">

                {/* Personality card */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--surface2) 0%, var(--surface) 100%)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px', padding: '16px', marginBottom: '20px',
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                }}>
                    <div style={{ fontSize: '36px', flexShrink: 0 }}>{persona.emoji}</div>
                    <div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', marginBottom: '2px' }}>
                            {persona.title}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', marginBottom: '6px', fontStyle: 'italic' }}>
                            "{persona.tagline}"
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'var(--text2)', lineHeight: 1.6 }}>{persona.description}</div>
                        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text3)' }}>
                            Similar engineers: <strong style={{ color: 'var(--text2)' }}>{persona.similar.join(', ')}</strong>
                        </div>
                    </div>
                </div>

                {/* Trait bars */}
                <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
                        Technical Traits
                    </div>
                    {traits.map(t => <TraitBar key={t.label} {...t} />)}
                </div>

                {/* Role fit */}
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                        Best Fit Roles
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {roles.map(r => (
                            <div key={r.label} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                fontSize: '12.5px', fontWeight: 600,
                                color: r.fit === 'weak' ? 'var(--text3)' : 'var(--text)',
                            }}>
                                <span>{r.fit === 'great' ? '✅' : r.fit === 'good' ? '⚡' : '⚠️'}</span>
                                {r.label}
                                <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--text3)', marginLeft: 'auto' }}>
                                    {r.fit === 'great' ? 'Strong match' : r.fit === 'good' ? 'Good match' : 'Not your strength'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CodeDNAPanel;
