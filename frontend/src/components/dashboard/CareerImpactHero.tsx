import React, { useEffect, useState } from 'react';

interface CareerImpactHeroProps {
    employabilitySignal: {
        overall: number;
        companyTierMatch: {
            bigTech: number;
            productCompanies: number;
            startups: number;
            serviceCompanies: number;
        };
        justification?: string;
    };
    codeQuality: { overall: number };
    stack?: string[];
}

function deriveLevel(score: number): { level: string; next: string; nextScore: number; color: string } {
    if (score >= 85) return { level: 'Staff Engineer', next: 'Principal', nextScore: 95, color: '#7C5CDB' };
    if (score >= 75) return { level: 'Senior Engineer', next: 'Staff', nextScore: 85, color: '#7C5CDB' };
    if (score >= 55) return { level: 'Mid-Level Engineer', next: 'Senior', nextScore: 75, color: '#9B7FE6' };
    if (score >= 35) return { level: 'Junior Engineer', next: 'Mid-Level', nextScore: 55, color: '#B49CEF' };
    return { level: 'Early Career', next: 'Junior', nextScore: 35, color: '#C8B4F5' };
}

function deriveSalary(score: number, stack: string[]): { low: number; high: number; potential: number } {
    const base = 60000;
    const stackBonus = stack.some(s => ['Go', 'Rust', 'Kubernetes', 'AWS', 'Python'].includes(s)) ? 15000 : 5000;
    const low = Math.round((base + score * 700 + stackBonus) / 1000) * 1000;
    const high = low + 30000;
    const potential = Math.round((high + 35000) / 1000) * 1000;
    return { low, high, potential };
}

function fmt(n: number) {
    return '$' + (n >= 1000 ? Math.round(n / 1000) + 'K' : n);
}

const PurpleCheck = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C5CDB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const PurpleBolt = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9B7FE6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
);

const RedX = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);

const PurpleTarget = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7C5CDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

const CareerImpactHero: React.FC<CareerImpactHeroProps> = ({ employabilitySignal, codeQuality, stack = [] }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

    const overall = employabilitySignal.overall;
    const { level, next, nextScore, color } = deriveLevel(overall);
    const salary = deriveSalary(overall, stack);
    const tierMatch = employabilitySignal.companyTierMatch;

    const tiers = [
        { label: 'FAANG / Big Tech', prob: tierMatch.bigTech, company: 'Google · Meta · Apple' },
        { label: 'Product Companies', prob: tierMatch.productCompanies, company: 'Stripe · Airbnb · Shopify' },
        { label: 'High-Growth Startups', prob: tierMatch.startups, company: 'Series A–C companies' },
    ];

    const pointsToNext = Math.max(0, nextScore - overall);

    const ringCircumference = 2 * Math.PI * 44; // r=44
    const ringFill = visible ? ringCircumference * (1 - overall / 100) : ringCircumference;

    return (
        <div style={{
            background: '#ffffff',
            border: '1px solid #e0dfe3',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}>
            {/* Ambient glow */}
            <div style={{
                position: 'absolute', top: -60, right: -60, width: 200, height: 200,
                background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`,
                pointerEvents: 'none',
            }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#ababab', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Career Intelligence Report
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PurpleTarget /> Hiring Probability Analysis
                    </div>
                </div>
                {/* Score ring */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={50} cy={50} r={44} fill="none" stroke="#e0dfe3" strokeWidth={7} />
                        <circle
                            cx={50} cy={50} r={44} fill="none"
                            stroke={color} strokeWidth={7}
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringFill}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
                        />
                    </svg>
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a1a', letterSpacing: '-1px' }}>{overall}</div>
                        <div style={{ fontSize: '9px', color: '#ababab', fontWeight: 600 }}>/100</div>
                    </div>
                </div>
            </div>

            {/* Level badge */}
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: `${color}14`, border: `1px solid ${color}33`,
                borderRadius: '8px', padding: '6px 12px', marginBottom: '20px',
            }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: color }}>{level}</span>
                {pointsToNext > 0 && (
                    <span style={{ fontSize: '11px', color: '#ababab', fontWeight: 500 }}>
                        · {pointsToNext} pts to {next}
                    </span>
                )}
            </div>

            {/* Company tier rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {tiers.map(tier => {
                    const pass = tier.prob >= 65;
                    const great = tier.prob >= 80;
                    return (
                        <div key={tier.label} style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            background: '#f5f5f4', borderRadius: '10px', padding: '12px 14px',
                            border: pass ? '1px solid #e0dfe3' : '1px solid rgba(231,76,60,0.2)',
                        }}>
                            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                {great ? <PurpleCheck /> : pass ? <PurpleBolt /> : <RedX />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1a1a1a', marginBottom: '2px' }}>
                                    {tier.label}
                                </div>
                                <div style={{ fontSize: '11px', color: '#ababab' }}>{tier.company}</div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{
                                    fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px',
                                    color: great ? '#7C5CDB' : pass ? '#9B7FE6' : '#E74C3C',
                                }}>
                                    {tier.prob}%
                                </div>
                                <div style={{ fontSize: '10px', color: '#ababab', fontWeight: 500 }}>chance</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Salary */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                background: '#f5f5f4', borderRadius: '10px', padding: '12px 16px',
                border: '1px solid #e0dfe3',
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#ababab', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7C5CDB" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                        Estimated Market Value
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#1a1a1a', letterSpacing: '-0.5px' }}>
                        {fmt(salary.low)} – {fmt(salary.high)}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#ababab', marginBottom: '3px' }}>Improvement potential</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#7C5CDB' }}>+{fmt(salary.potential - salary.high)}</div>
                </div>
            </div>
        </div>
    );
};

export default CareerImpactHero;
