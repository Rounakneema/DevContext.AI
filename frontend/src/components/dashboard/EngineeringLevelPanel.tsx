import React, { useEffect, useState } from 'react';

interface EngineeringLevelPanelProps {
    overall: number;
    codeQuality: {
        readability?: number;
        maintainability?: number;
        errorHandling?: number;
        security?: number;
        performance?: number;
        documentation?: number;
    };
}

const LEVELS = [
    { label: 'Junior', min: 0, max: 50, color: '#EF4444' }, // Red
    { label: 'Mid-Level', min: 50, max: 70, color: '#F97316' }, // Orange
    { label: 'Senior', min: 70, max: 85, color: '#F59E0B' }, // Amber
    { label: 'Staff', min: 85, max: 100, color: '#10B981' }, // Emerald
];

function getAchievements(cq: EngineeringLevelPanelProps['codeQuality']) {
    const dims = [
        { label: '🚀 Performance Pro', key: 'performance', threshold: 75 },
        { label: '🏗 Architecture Scholar', key: 'maintainability', threshold: 70 },
        { label: '🔒 Security Guardian', key: 'security', threshold: 70 },
        { label: '📖 Documentation Master', key: 'documentation', threshold: 70 },
        { label: '🛡 Error Resilient', key: 'errorHandling', threshold: 70 },
        { label: '👁 Code Craftsman', key: 'readability', threshold: 75 },
        { label: '🧪 Test Champion', key: 'documentation', threshold: 80 },
    ];
    return dims.map(d => ({ ...d, unlocked: ((cq as any)[d.key] ?? 0) >= d.threshold }));
}

const EngineeringLevelPanel: React.FC<EngineeringLevelPanelProps> = ({ overall, codeQuality }) => {
    const [animated, setAnimated] = useState(false);
    useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);

    const achievements = getAchievements(codeQuality);
    const unlocked = achievements.filter(a => a.unlocked);
    const locked = achievements.filter(a => !a.unlocked);

    const currentLevelIdx = LEVELS.findIndex(l => overall < l.max);
    const resolvedIdx = currentLevelIdx === -1 ? LEVELS.length - 1 : currentLevelIdx;
    const currentLevel = LEVELS[resolvedIdx];
    const nextLevel = LEVELS[Math.min(resolvedIdx + 1, LEVELS.length - 1)];
    const ptsToNext = nextLevel && nextLevel.label !== currentLevel.label ? Math.max(0, nextLevel.min - overall) : 0;

    return (
        <div className="panel" style={{ marginBottom: '24px', padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    ENGINEERING LEVEL
                </h3>
                <div style={{
                    background: `${currentLevel.color}1A`,
                    color: currentLevel.color,
                    borderRadius: '6px', padding: '4px 12px', fontSize: '12.5px', fontWeight: 700,
                }}>
                    {currentLevel.label}
                </div>
            </div>
            <div>
                {/* Track */}
                <div style={{ position: 'relative', marginBottom: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '0 4px' }}>
                        {LEVELS.map(l => (
                            <span key={l.label} style={{
                                fontSize: '11px', fontWeight: 700,
                                color: overall >= l.min ? l.color : 'var(--text3)',
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>{l.label}</span>
                        ))}
                    </div>
                    <div style={{ height: '10px', background: 'var(--surface2)', borderRadius: '5px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: animated ? `${overall}%` : '0%',
                            background: `linear-gradient(90deg, #EF4444 0%, #F97316 40%, #F59E0B 75%, #10B981 100%)`,
                            borderRadius: '5px',
                            transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                        }} />
                    </div>
                    {/* Milestone ticks */}
                    {LEVELS.map(l => (
                        <div key={l.label} style={{
                            position: 'absolute', bottom: -1, left: `${l.min}%`,
                            width: 2, height: 12, background: 'var(--surface)',
                            transform: 'translateX(-50%)',
                        }} />
                    ))}
                    {/* You-are-here indicator */}
                    <div style={{
                        position: 'absolute', bottom: -3,
                        left: animated ? `calc(${overall}%)` : '0%',
                        transition: 'left 1.2s cubic-bezier(0.4,0,0.2,1)',
                        transform: 'translateX(-50%)',
                        width: 16, height: 16, borderRadius: '50%',
                        background: currentLevel.color,
                        boxShadow: `0 0 10px ${currentLevel.color}88`,
                        border: '3px solid white',
                    }} />
                </div>

                {ptsToNext > 0 && (
                    <div style={{
                        background: '#F8FAFC', borderRadius: '8px', padding: '12px 16px',
                        marginBottom: '20px', fontSize: '13px', color: '#475569',
                        border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="12" y1="19" x2="12" y2="5" />
                            <polyline points="5 12 12 5 19 12" />
                        </svg>
                        <span><strong>{ptsToNext} points</strong> to reach <strong style={{ color: nextLevel.color }}>{nextLevel.label}</strong> level</span>
                    </div>
                )}

                {/* Achievements */}
                {unlocked.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                            🏆 ACHIEVEMENTS UNLOCKED ({unlocked.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {unlocked.map(a => (
                                <span key={a.label} style={{
                                    background: '#ECFDF5', color: '#059669', border: '1px solid #6EE7B7',
                                    borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 600,
                                }}>{a.label}</span>
                            ))}
                        </div>
                    </div>
                )}
                {locked.length > 0 && (
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                            🔒 LOCKED POTENTIAL
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {locked.map(a => (
                                <span key={a.label} style={{
                                    background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)',
                                    borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 500, opacity: 0.8,
                                }}>{a.label}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EngineeringLevelPanel;
