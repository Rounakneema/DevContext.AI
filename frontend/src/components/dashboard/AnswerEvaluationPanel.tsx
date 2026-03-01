import React from 'react';
import { AnswerEvaluation } from '../../services/api';

interface AnswerEvaluationPanelProps {
  evaluation: AnswerEvaluation;
  onNext: () => void;
  isLastQuestion: boolean;
}

const AnswerEvaluationPanel: React.FC<AnswerEvaluationPanelProps> = ({
  evaluation,
  onNext,
  isLastQuestion,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#27AE60';
    if (score >= 60) return '#E67E22';
    return '#E74C3C';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return '#F4FCF8';
    if (score >= 60) return '#FEF8F0';
    return '#FEF4F4';
  };

  const getScoreBorder = (score: number) => {
    if (score >= 80) return '#C8F0DF';
    if (score >= 60) return '#FAE5C8';
    return '#FACACA';
  };

  const getCategoryLabel = (category: 'weak' | 'acceptable' | 'strong' | 'excellent') => {
    const labels = {
      weak: { text: 'Needs Improvement', color: '#E74C3C', bg: '#FEF4F4' },
      acceptable: { text: 'Acceptable', color: '#E67E22', bg: '#FEF8F0' },
      strong: { text: 'Strong Answer', color: '#27AE60', bg: '#F4FCF8' },
      excellent: { text: 'Excellent Answer', color: '#2ECC71', bg: '#F0FDF4' },
    };
    return labels[category];
  };

  const categoryLabel = getCategoryLabel(evaluation.comparison.yourAnswerCategory);

  return (
    <div className="answer-evaluation-panel">
      {/* Score Header */}
      <div
        className="eval-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 20px',
          background: getScoreBackground(evaluation.overallScore),
          borderBottom: `1px solid ${getScoreBorder(evaluation.overallScore)}`,
        }}
      >
        <div
          className="eval-score"
          style={{
            background: getScoreColor(evaluation.overallScore),
            color: 'white',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '16px',
            fontWeight: '700',
          }}
        >
          {evaluation.overallScore} / 100
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>
            {evaluation.feedback}
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '6px',
              padding: '3px 10px',
              background: categoryLabel.bg,
              color: categoryLabel.color,
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
            }}
          >
            {categoryLabel.text}
          </div>
        </div>
      </div>

      {/* Criteria Scores */}
      <div style={{ padding: '18px 20px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text3)',
            marginBottom: '12px',
          }}
        >
          Criteria Scores
        </div>
        <div
          className="criteria-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
            marginBottom: '18px',
          }}
        >
          {[
            { label: 'Technical Accuracy', score: evaluation.criteriaScores.technicalAccuracy },
            { label: 'Completeness', score: evaluation.criteriaScores.completeness },
            { label: 'Clarity', score: evaluation.criteriaScores.clarity },
            { label: 'Depth', score: evaluation.criteriaScores.depthOfUnderstanding },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: 'var(--surface2)',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: getScoreColor(item.score),
                  marginBottom: '4px',
                }}
              >
                {item.score}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text3)', fontWeight: '500' }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Strengths & Weaknesses */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--surface2)',
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
              ✓ Strengths
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {evaluation.strengths.map((strength, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--text2)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ color: '#1E8A4C', flexShrink: 0 }}>•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
          <div
            style={{
              background: 'var(--surface2)',
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
                color: '#C0392B',
              }}
            >
              ✗ Areas to Improve
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {evaluation.weaknesses.map((weakness, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--text2)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ color: '#C0392B', flexShrink: 0 }}>•</span>
                  {weakness}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Missing Key Points */}
        {evaluation.missingKeyPoints.length > 0 && (
          <div
            style={{
              background: '#FEF8F0',
              border: '1px solid #FAE5C8',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#A06000',
                marginBottom: '8px',
              }}
            >
              Missing Key Points
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {evaluation.missingKeyPoints.map((point, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: '12.5px',
                    color: '#6B4D00',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ color: '#A06000', flexShrink: 0 }}>–</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Answer Comparison */}
        <div
          style={{
            background: 'var(--surface2)',
            borderRadius: '8px',
            padding: '14px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontSize: '10.5px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text3)',
              marginBottom: '12px',
            }}
          >
            Answer Comparison
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #FACACA',
                background: '#FEF4F4',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#E74C3C',
                  marginBottom: '4px',
                }}
              >
                WEAK ANSWER EXAMPLE
              </div>
              <div style={{ fontSize: '12px', color: '#6B4D4D', lineHeight: '1.5' }}>
                {evaluation.comparison.weakAnswer}
              </div>
            </div>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #C8F0DF',
                background: '#F4FCF8',
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: '600',
                  color: '#27AE60',
                  marginBottom: '4px',
                }}
              >
                STRONG ANSWER EXAMPLE
              </div>
              <div style={{ fontSize: '12px', color: '#2D5A3D', lineHeight: '1.5' }}>
                {evaluation.comparison.strongAnswer}
              </div>
            </div>
          </div>
        </div>

        {/* Improvement Suggestions */}
        {evaluation.improvementSuggestions.length > 0 && (
          <div
            style={{
              background: 'var(--accent-light)',
              border: '1px solid #C8D0FF',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--accent)',
                marginBottom: '8px',
              }}
            >
              How to Improve
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {evaluation.improvementSuggestions.map((suggestion, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--accent)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ flexShrink: 0 }}>{idx + 1}.</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Button */}
        <button className="btn-accent" style={{ width: '100%' }} onClick={onNext}>
          {isLastQuestion ? 'Complete Interview →' : 'Next Question →'}
        </button>
      </div>
    </div>
  );
};

export default AnswerEvaluationPanel;
