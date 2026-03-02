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
    { label: 'Junior', min: 0, max: 50, color: '#E74C3C' },
    { label: 'Mid-Level', min: 50, max: 70, color: '#E67E22' },
    { label: 'Senior', min: 70, max: 85, color: '#2980B9' },
    { label: 'Staff', min: 85, max: 100, color: '#8E44AD' },
];

function getAchievements(cq: EngineeringLevelPanelProps['codeQuality']) {
    const dims = [
        { label: '🚀 Performance Pro', key: 'performance', threshold: 75 },
        { label: '🏗 Architecture Scholar', key: 'maintainability', threshold: 70 },
        { label: '🔒 Security Guardian', key: 'security', threshold: 70 },
        { label: '📖 Documentation Master', key: 'documentation', threshold: 70 },
        { label: '🛡 Error Resilient', key: 'errorHandling', threshold: 70 },
        { label: '👁 Code Craftsman', key: 'readability', threshold: 75 },
        { label: '🧪 Test Champion', key: 'documentation', threshold: 80 }, // proxy – unlocks rarely
    ];
    return dims.map(d => ({ ...d, unlocked: ((cq as any)[d.key] ?? 0) >= d.threshold }));
}

const EngineeringLevelPanel: React.FC<EngineeringLevelPanelProps> = ({ overall, codeQuality }) => {
    const [animated, setAnimated] = useState(false);
    useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);

    const achievements = getAchievements(codeQuality);
    const unlocked = achievements.filter(a => a.unlocked);
    const locked = achievements.filter(a => !a.unlocked);

    const currentLevelIdx = LEVELS.findIndex(l => overall < l.max) ?? LEVELS.length - 1;
    const currentLevel = LEVELS[Math.min(currentLevelIdx, LEVELS.length - 1)];
    const nextLevel = LEVELS[Math.min(currentLevelIdx + 1, LEVELS.length - 1)];
    const ptsToNext = nextLevel ? Math.max(0, nextLevel.min - overall) : 0;


    return (
        <div className="panel" style={{ marginBottom: '16px' }}>
            <div className="panel-head">
                <div className="panel-title">🎮 Engineering Level</div>
                <div style={{
                    background: `${currentLevel.color}1A`,
                    color: currentLevel.color,
                    border: `1px solid ${currentLevel.color}44`,
                    borderRadius: '6px', padding: '2px 10px', fontSize: '12px', fontWeight: 700,
                }}>
                    {currentLevel.label}
                </div>
            </div>
            <div className="panel-body">

                {/* Rail */}
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        {LEVELS.map(l => (
                            <span key={l.label} style={{
                                fontSize: '10px', fontWeight: 700,
                                color: overall >= l.min ? l.color : 'var(--text3)',
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>{l.label}</span>
                        ))}
                    </div>
                    {/* Track */}
                    <div style={{ height: '8px', background: 'var(--border2)', borderRadius: '4px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: animated ? `${overall}%` : '0%',
                            background: `linear-gradient(90deg, #E74C3C 0%, #E67E22 35%, #2980B9 60%, #8E44AD 100%)`,
                            borderRadius: '4px',
                            transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                        }} />
                    </div>
                    {/* Milestone ticks */}
                    {LEVELS.map(l => (
                        <div key={l.label} style={{
                            position: 'absolute', bottom: 0, left: `${l.min}%`,
                            width: 1, height: 14, background: 'var(--surface)',
                            transform: 'translateX(-50%)',
                        }} />
                    ))}
                    {/* You-are-here indicator */}
                    <div style={{
                        position: 'absolute', top: -2,
                        left: animated ? `calc(${overall}% - 6px)` : '0%',
                        transition: 'left 1.2s cubic-bezier(0.4,0,0.2,1)',
                        width: 12, height: 12, borderRadius: '50%',
                        background: currentLevel.color,
                        boxShadow: `0 0 8px ${currentLevel.color}88`,
                        border: '2px solid white',
                    }} />
                </div>

                {ptsToNext > 0 && (
                    <div style={{
                        background: 'var(--surface2)', borderRadius: '8px', padding: '10px 14px',
                        marginBottom: '16px', fontSize: '12px', color: 'var(--text2)',
                    }}>
                        🚀 <strong>{ptsToNext} points</strong> to <strong style={{ color: nextLevel.color }}>{nextLevel.label}</strong>
                    </div>
                )}

                {/* Achievements */}
                {unlocked.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                            🏆 Achievements Unlocked ({unlocked.length})
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {unlocked.map(a => (
                                <span key={a.label} style={{
                                    background: '#E8F8F0', color: '#1E8449', border: '1px solid #A9DFBF',
                                    borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 600,
                                }}>{a.label}</span>
                            ))}
                        </div>
                    </div>
                )}
                {locked.length > 0 && (
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
                            🔒 Locked
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {locked.map(a => (
                                <span key={a.label} style={{
                                    background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)',
                                    borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, opacity: 0.7,
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
