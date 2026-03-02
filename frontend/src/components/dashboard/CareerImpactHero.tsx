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
    if (score >= 85) return { level: 'Staff Engineer', next: 'Principal', nextScore: 95, color: '#8E44AD' };
    if (score >= 75) return { level: 'Senior Engineer', next: 'Staff', nextScore: 85, color: '#2980B9' };
    if (score >= 55) return { level: 'Mid-Level Engineer', next: 'Senior', nextScore: 75, color: '#27AE60' };
    if (score >= 35) return { level: 'Junior Engineer', next: 'Mid-Level', nextScore: 55, color: '#E67E22' };
    return { level: 'Early Career', next: 'Junior', nextScore: 35, color: '#E74C3C' };
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
            background: 'linear-gradient(145deg, #0F1923 0%, #1A2332 60%, #0D1520 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Ambient glow */}
            <div style={{
                position: 'absolute', top: -60, right: -60, width: 200, height: 200,
                background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
                pointerEvents: 'none',
            }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Career Intelligence Report
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
                        🎯 Hiring Probability Analysis
                    </div>
                </div>
                {/* Score ring */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <svg width={100} height={100} style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={50} cy={50} r={44} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={7} />
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
                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>{overall}</div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>/100</div>
                    </div>
                </div>
            </div>

            {/* Level badge */}
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: `${color}1A`, border: `1px solid ${color}44`,
                borderRadius: '8px', padding: '6px 12px', marginBottom: '20px',
            }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: color }}>{level}</span>
                {pointsToNext > 0 && (
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
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
                            background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px 14px',
                            border: pass ? 'none' : '1px solid rgba(231,76,60,0.2)',
                        }}>
                            <div style={{ fontSize: '18px', flexShrink: 0 }}>{great ? '✅' : pass ? '⚡' : '❌'}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
                                    {tier.label}
                                </div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{tier.company}</div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{
                                    fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px',
                                    color: great ? '#2ECC71' : pass ? '#F39C12' : '#E74C3C',
                                }}>
                                    {tier.prob}%
                                </div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>chance</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Salary + separator */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px 16px',
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                        💰 Estimated Market Value
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                        {fmt(salary.low)} – {fmt(salary.high)}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '3px' }}>Improvement potential</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#2ECC71' }}>+{fmt(salary.potential - salary.high)}</div>
                </div>
            </div>
        </div>
    );
};

export default CareerImpactHero;
