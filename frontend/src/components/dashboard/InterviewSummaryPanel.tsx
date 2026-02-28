import React from 'react';
import { InterviewSummary } from '../../services/api';

interface InterviewSummaryPanelProps {
  summary: InterviewSummary;
  onStartNew: () => void;
  onViewDetails: () => void;
}

const InterviewSummaryPanel: React.FC<InterviewSummaryPanelProps> = ({
  summary,
  onStartNew,
  onViewDetails,
}) => {
  const getReadinessDisplay = (readiness: InterviewSummary['comparedToTarget']['readiness']) => {
    const displays = {
      not_ready: { text: 'Not Ready Yet', color: '#E74C3C', bg: '#FEF4F4', border: '#FACACA' },
      needs_work: { text: 'Needs More Preparation', color: '#E67E22', bg: '#FEF8F0', border: '#FAE5C8' },
      almost_ready: { text: 'Almost Ready', color: '#3498DB', bg: '#EBF5FB', border: '#AED6F1' },
      ready: { text: 'Interview Ready!', color: '#27AE60', bg: '#F4FCF8', border: '#C8F0DF' },
    };
    return displays[readiness];
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#27AE60';
    if (score >= 60) return '#E67E22';
    return '#E74C3C';
  };

  const readinessDisplay = getReadinessDisplay(summary.comparedToTarget.readiness);

  return (
    <div className="interview-summary-panel">
      {/* Header */}
      <div
        style={{
          textAlign: 'center',
          padding: '28px 24px',
          background: readinessDisplay.bg,
          borderBottom: `1px solid ${readinessDisplay.border}`,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: readinessDisplay.color,
            color: 'white',
            fontSize: '24px',
            fontWeight: '700',
            marginBottom: '14px',
          }}
        >
          {summary.overallScore}
        </div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text)', marginBottom: '6px' }}>
          Interview Complete
        </div>
        <div
          style={{
            display: 'inline-block',
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'white',
            border: `1px solid ${readinessDisplay.border}`,
            color: readinessDisplay.color,
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          {readinessDisplay.text}
        </div>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {[
          { label: 'Questions', value: summary.questionsAnswered },
          { label: 'Time', value: `${summary.totalTimeMinutes} min` },
          { label: 'Percentile', value: `Top ${100 - summary.comparedToTarget.percentile}%` },
        ].map((stat, idx) => (
          <div
            key={stat.label}
            style={{
              padding: '16px',
              textAlign: 'center',
              borderRight: idx < 2 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Category Performance */}
      <div style={{ padding: '20px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text3)',
            marginBottom: '14px',
          }}
        >
          Performance by Category
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Object.entries(summary.categoryPerformance).map(([category, score]) => (
            <div key={category}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '12.5px', color: 'var(--text2)', textTransform: 'capitalize' }}>
                  {category.replace('-', ' ')}
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: getScoreColor(score) }}>
                  {score}%
                </span>
              </div>
              <div
                style={{
                  height: '6px',
                  background: 'var(--surface2)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${score}%`,
                    background: getScoreColor(score),
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Areas for Improvement */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          padding: '0 20px 20px',
        }}
      >
        <div
          style={{
            background: '#F4FCF8',
            borderRadius: '8px',
            padding: '14px',
          }}
        >
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '10px',
              color: '#1E8A4C',
            }}
          >
            Top Strengths
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {summary.topStrengths.map((strength, idx) => (
              <li
                key={idx}
                style={{
                  fontSize: '12px',
                  color: '#2D5A3D',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: '#27AE60', flexShrink: 0 }}>✓</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>
        <div
          style={{
            background: '#FEF8F0',
            borderRadius: '8px',
            padding: '14px',
          }}
        >
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '10px',
              color: '#A06000',
            }}
          >
            Focus Areas
          </div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {summary.areasForImprovement.map((area, idx) => (
              <li
                key={idx}
                style={{
                  fontSize: '12px',
                  color: '#6B4D00',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <span style={{ color: '#E67E22', flexShrink: 0 }}>→</span>
                {area}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      {summary.recommendations.length > 0 && (
        <div style={{ padding: '0 20px 20px' }}>
          <div
            style={{
              background: 'var(--accent-light)',
              border: '1px solid #C8D0FF',
              borderRadius: '8px',
              padding: '14px',
            }}
          >
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--accent)',
                marginBottom: '10px',
              }}
            >
              Recommended Next Steps
            </div>
            <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', counterReset: 'rec' }}>
              {summary.recommendations.map((rec, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--accent)',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {idx + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Target Role Match */}
      <div style={{ padding: '0 20px 20px' }}>
        <div
          style={{
            background: 'var(--surface2)',
            borderRadius: '8px',
            padding: '14px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '6px' }}>
            Compared to target role
          </div>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>
            {summary.comparedToTarget.role}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          padding: '0 20px 20px',
        }}
      >
        <button className="btn-secondary" style={{ flex: 1 }} onClick={onViewDetails}>
          View All Answers
        </button>
        <button className="btn-accent" style={{ flex: 1 }} onClick={onStartNew}>
          Practice Again
        </button>
      </div>
    </div>
  );
};

export default InterviewSummaryPanel;
