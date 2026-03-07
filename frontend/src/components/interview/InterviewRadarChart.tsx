import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

// For Recharts compatibility with some environments
const TypedRadarChart = RadarChart as any;
const TypedPolarGrid = PolarGrid as any;
const TypedPolarAngleAxis = PolarAngleAxis as any;
const TypedPolarRadiusAxis = PolarRadiusAxis as any;
const TypedTooltip = Tooltip as any;
const TypedRadar = Radar as any;

interface InterviewRadarChartProps {
    signals: Record<string, { name: string; score: number }>;
}

const InterviewRadarChart: React.FC<InterviewRadarChartProps> = ({ signals }) => {
    const data = Object.values(signals).map(s => ({
        subject: s.name.replace(/_/g, ' '),
        A: s.score,
        fullMark: 100,
    }));

    if (data.length === 0) return null;

    return (
        <div style={{ width: '100%', height: 320, background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)', padding: '24px', marginBottom: 32, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Performance Signal Radar</div>
            <div style={{ width: '100%', height: 240, minWidth: 0 }}>
                <ResponsiveContainer width="99%" height="100%">
                    <TypedRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <TypedPolarGrid stroke="var(--border)" />
                        <TypedPolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text3)', fontSize: 10, fontWeight: 600 }} />
                        <TypedPolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <TypedRadar
                            name="Score"
                            dataKey="A"
                            stroke="var(--accent)"
                            fill="var(--accent)"
                            fillOpacity={0.15}
                            strokeWidth={3}
                        />
                        <TypedTooltip
                            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                            itemStyle={{ color: 'var(--text)', fontSize: 12, fontWeight: 700 }}
                        />
                    </TypedRadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default InterviewRadarChart;
