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

function deriveLevel(score: number): { level: string; color: string } {
    if (score >= 85) return { level: 'Staff Level', color: '#10B981' };
    if (score >= 70) return { level: 'Senior Level', color: '#10B981' };
    if (score >= 55) return { level: 'Mid Level', color: '#F59E0B' };
    if (score >= 35) return { level: 'Junior Level', color: '#F97316' };
    return { level: 'Entry Level', color: '#EF4444' };
}

function getPerformanceColor(score: number): string {
    if (score >= 85) return '#10B981'; // Emerald
    if (score >= 70) return '#F59E0B'; // Amber
    if (score >= 50) return '#F97316'; // Orange
    return '#EF4444'; // Red
}

function getTierFeedback(prob: number): string {
    if (prob >= 85) return 'Excellent fit';
    if (prob >= 70) return 'Strong interview chance';
    if (prob >= 50) return 'Solid candidate';
    if (prob >= 30) return 'Needs improvement';
    return 'Unlikely match';
}

function deriveSalary(score: number, stack: string[]): { low: number; high: number; potential: number } {
    const base = 60000;
    const stackBonus = stack.some(s => ['Go', 'Rust', 'Kubernetes', 'AWS', 'Python', 'React'].includes(s)) ? 15000 : 5000;
    const low = Math.round((base + score * 800 + stackBonus) / 1000) * 1000;
    const high = low + 30000;
    const potential = Math.round((high + 35000) / 1000) * 1000;
    return { low, high, potential };
}

function fmt(n: number) {
    return '$' + (n >= 1000 ? Math.round(n / 1000) + 'K' : n);
}

const TargetIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

const BuildingIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <path d="M9 22v-4h6v4" />
        <path d="M8 6h.01" />
        <path d="M16 6h.01" />
        <path d="M12 6h.01" />
        <path d="M12 10h.01" />
        <path d="M12 14h.01" />
        <path d="M16 10h.01" />
        <path d="M16 14h.01" />
        <path d="M8 10h.01" />
        <path d="M8 14h.01" />
    </svg>
);

const ProbabilityBar = ({ label, prob }: { label: string; prob: number }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => { const t = setTimeout(() => setVisible(true), 150); return () => clearTimeout(t); }, []);
    const color = getPerformanceColor(prob);
    const feedback = getTierFeedback(prob);

    return (
        <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: color }}>{prob}%</span>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                </div>
            </div>
            <div style={{ height: '8px', background: 'var(--surface2)', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px' }}>
                <div style={{
                    height: '100%',
                    width: visible ? `${prob}%` : '0%',
                    background: color,
                    borderRadius: '4px',
                    transition: 'width 1s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }} />
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text3)' }}>{feedback}</div>
        </div>
    );
};

const CareerImpactHero: React.FC<CareerImpactHeroProps> = ({ employabilitySignal, stack = [] }) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

    const overall = employabilitySignal.overall;
    const { level } = deriveLevel(overall);
    const salary = deriveSalary(overall, stack);
    const tierMatch = employabilitySignal.companyTierMatch;
    const mainColor = getPerformanceColor(overall);

    const ringCircumference = 2 * Math.PI * 54;
    const ringFill = visible ? ringCircumference * (1 - overall / 100) : ringCircumference;

    return (
        <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '32px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', color: 'var(--text)' }}>
                <TargetIcon />
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>YOUR HIRING PROBABILITY</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2fr', gap: '40px', alignItems: 'start' }}>

                {/* Left Column: Big Score */}
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg)', borderRadius: '16px', padding: '32px 20px',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <svg width={140} height={140} style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx={70} cy={70} r={54} fill="none" stroke="var(--border)" strokeWidth={10} />
                            <circle
                                cx={70} cy={70} r={54} fill="none"
                                stroke={mainColor} strokeWidth={10}
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
                            <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-1.5px', lineHeight: 1 }}>{overall}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text3)', fontWeight: 600 }}>/100</div>
                        </div>
                    </div>
                    <div style={{
                        fontSize: '15px', fontWeight: 700, color: mainColor,
                        background: `${mainColor}1A`, padding: '6px 16px', borderRadius: '20px'
                    }}>
                        {level}
                    </div>
                </div>

                {/* Right Column: Company match + Salary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--text2)' }}>
                            <BuildingIcon />
                            <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                Company Match Probability
                            </h3>
                        </div>

                        <ProbabilityBar label="FAANG / BigTech" prob={tierMatch.bigTech} />
                        <ProbabilityBar label="Product Companies" prob={tierMatch.productCompanies} />
                        <ProbabilityBar label="High-Growth Startups" prob={tierMatch.startups} />
                        <ProbabilityBar label="Service Companies" prob={tierMatch.serviceCompanies} />
                    </div>

                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                Estimated Market Value
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
                                {fmt(salary.low)} - {fmt(salary.high)}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                                Based on code quality + tech stack
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                Unlock +{fmt(salary.potential - salary.high)} with improvements
                            </div>
                            <button style={{
                                background: 'transparent', border: '1px solid #CBD5E1', borderRadius: '6px',
                                padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#475569', cursor: 'pointer'
                            }} onClick={() => window.scrollTo({ top: 500, behavior: 'smooth' })}>
                                See Roadmap →
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CareerImpactHero;
