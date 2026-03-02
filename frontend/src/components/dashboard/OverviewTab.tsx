import React, { useState, useEffect } from "react";
import api from "../../services/api";
import CareerImpactHero from "./CareerImpactHero";
import EngineeringLevelPanel from "./EngineeringLevelPanel";
import ResumeBulletsPanel from "./ResumeBulletsPanel";
import EmployabilitySignalPanel from "./EmployabilitySignalPanel";
import ExportDropdown from "./ExportDropdown";

interface OverviewTabProps {
  analysisId: string;
}

const ScoreColor = (score: number) =>
  score >= 70 ? "#27AE60" : score >= 50 ? "#E67E22" : "#E74C3C";

const MiniBar = ({ score }: { score: number }) => (
  <div style={{ background: 'var(--border2)', borderRadius: '3px', height: '5px', overflow: 'hidden', marginTop: '6px' }}>
    <div style={{ background: ScoreColor(score), height: '100%', width: `${score}%`, transition: 'width 0.4s ease', borderRadius: '3px' }} />
  </div>
);

const OverviewTab: React.FC<OverviewTabProps> = ({ analysisId }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const data = await api.getAnalysis(analysisId);
      setAnalysis(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontSize: '14px', color: 'var(--text2)' }}>Loading your career intelligence report…</div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div style={{ background: '#FEF4F4', border: '1px solid #FACACA', borderRadius: '8px', padding: '12px 16px', color: '#C0392B', fontSize: '13px' }}>
        {error || 'Analysis not found'}
      </div>
    );
  }

  const { projectReview, repository, analysis: meta, intelligenceReport } = analysis;
  const employabilitySignal = projectReview?.employabilitySignal || { overall: 0, companyTierMatch: { bigTech: 0, productCompanies: 0, startups: 0, serviceCompanies: 0 } };
  const codeQuality = projectReview?.codeQuality || { overall: 0 };
  const authenticity = projectReview?.projectAuthenticity || { score: 0 };
  const strengths = projectReview?.strengths || [];
  const weaknesses = projectReview?.weaknesses || [];
  const resumeBullets = intelligenceReport?.resumeBullets || [];

  const repoName = repository?.repositoryName
    || meta?.repositoryName
    || meta?.repositoryUrl?.split('/').slice(-2).join('/')
    || 'Repository';

  const stack = repository?.frameworks || [];

  // ── Quick wins: top 3 weaknesses with severity ──
  const quickWins = [...weaknesses]
    .sort((a: any, b: any) => {
      const sv = (s?: string) => s === 'high' ? 3 : s === 'medium' ? 2 : 1;
      return sv(b.severity) - sv(a.severity);
    })
    .slice(0, 3);

  const pointsMap: Record<string, number> = { high: 15, medium: 10, low: 5 };

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "18px" }}>
        <div>
          <div className="view-title">{repoName}</div>
          <div className="view-sub">
            {[
              repository?.frameworks?.join(' · '),
              repository?.totalFiles ? `${repository.totalFiles} files` : null,
              meta?.createdAt ? `Analysed ${new Date(meta.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : null,
            ].filter(Boolean).join(' · ')}
          </div>
          {meta?.repositoryUrl && (
            <a href={meta.repositoryUrl} target="_blank" rel="noreferrer"
              style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', marginTop: '3px', display: 'inline-block' }}>
              {meta.repositoryUrl.replace('https://github.com/', 'github.com/')} ↗
            </a>
          )}
        </div>
        <ExportDropdown analysisId={analysisId} />
      </div>

      {/* Authenticity warning */}
      {authenticity.warnings && authenticity.warnings.length > 0 && (
        <div className="warn-strip">
          ⚠ <span><strong>{authenticity.warnings[0]}</strong></span>
        </div>
      )}

      {/* ── CAREER IMPACT HERO (new) ── */}
      <CareerImpactHero
        employabilitySignal={employabilitySignal}
        codeQuality={codeQuality}
        stack={stack}
      />

      {/* ── ENGINEERING LEVEL (new) ── */}
      <EngineeringLevelPanel overall={employabilitySignal.overall} codeQuality={codeQuality} />

      {/* ── QUICK WINS ── */}
      {quickWins.length > 0 && (
        <div className="panel" style={{ marginBottom: '16px' }}>
          <div className="panel-head">
            <div className="panel-title">⚡ Quick Wins</div>
            <div className="chip amber">Improve today</div>
          </div>
          <div className="panel-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {quickWins.map((w: any, i: number) => {
                const pts = pointsMap[w.severity] ?? 8;
                return (
                  <div key={w.weaknessId ?? i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    background: 'var(--surface2)', borderRadius: '10px', padding: '12px 14px',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
                      background: i === 0 ? 'rgba(231,76,60,0.1)' : 'rgba(230,126,34,0.1)',
                      color: i === 0 ? '#E74C3C' : '#E67E22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '14px',
                    }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>
                        {w.issue}
                      </div>
                      {w.recommendation && (
                        <div style={{ fontSize: '12px', color: 'var(--text3)', fontStyle: 'italic' }}>→ {w.recommendation}</div>
                      )}
                    </div>
                    <div style={{
                      fontSize: '11px', fontWeight: 800, color: '#27AE60',
                      background: '#E8F8F0', border: '1px solid #A9DFBF',
                      borderRadius: '6px', padding: '2px 8px', flexShrink: 0,
                    }}>+{pts} pts</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── EMPLOYABILITY SIGNAL (original, enhanced) ── */}
      <EmployabilitySignalPanel employabilitySignal={employabilitySignal} />

      {/* ── CODE QUALITY BREAKDOWN (original) ── */}
      {(codeQuality.readability || codeQuality.security) && (
        <div className="panel" style={{ marginBottom: '16px' }}>
          <div className="panel-head">
            <div className="panel-title">Code Quality Breakdown</div>
            <span style={{ fontWeight: 700, fontSize: '13px', color: ScoreColor(codeQuality.overall) }}>
              {codeQuality.overall}<span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text3)' }}>/100</span>
            </span>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { label: 'Readability', score: codeQuality.readability },
                { label: 'Maintainability', score: codeQuality.maintainability },
                { label: 'Error Handling', score: codeQuality.errorHandling },
                { label: 'Security', score: codeQuality.security },
                { label: 'Performance', score: codeQuality.performance },
                { label: 'Documentation', score: codeQuality.documentation },
              ].filter(x => x.score !== undefined).map(({ label, score }) => (
                <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 500, color: 'var(--text2)' }}>{label}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: ScoreColor(score) }}>{score}</span>
                  </div>
                  <MiniBar score={score} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TECH STACK (original) ── */}
      <div className="panel" style={{ marginBottom: '16px' }}>
        <div className="panel-head">
          <div className="panel-title">Tech Stack</div>
          <div className="chip neutral">Auto-detected</div>
        </div>
        <div className="panel-body">
          <div className="tag-row">
            {repository?.frameworks?.map((fw: string) => (
              <span key={fw} className="tag tech">{fw}</span>
            ))}
          </div>
          <div style={{ marginTop: '10px', fontSize: '12.5px', color: 'var(--text3)' }}>
            {Object.entries(repository?.languages || {}).map(([lang, pct]: [string, any], idx) => (
              <span key={lang}>{idx > 0 && ' · '}{lang} <strong style={{ color: 'var(--text)' }}>{pct}%</strong></span>
            ))}
          </div>
        </div>
      </div>

      {/* ── RESUME BULLETS (new, collapsible) ── */}
      <ResumeBulletsPanel resumeBullets={resumeBullets} />

      {/* ── STRENGTHS ── */}
      {strengths.length > 0 && (
        <div className="panel" style={{ marginBottom: '16px' }}>
          <div className="panel-head">
            <div className="panel-title">Strengths</div>
            <div className="chip green">{strengths.length} found</div>
          </div>
          <div className="panel-body">
            <div className="insight-list">
              {strengths.map((strength: any) => (
                <div key={strength.strengthId} className="insight-item">
                  <div className="i-dot pos">✓</div>
                  <div className="i-text">
                    <strong>{strength.pattern}</strong> — {strength.description}
                    {strength.impact && (
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>{strength.impact}</div>
                    )}
                    {strength.fileReferences && strength.fileReferences.length > 0 && (
                      <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {strength.fileReferences.slice(0, 3).map((ref: any, i: number) => (
                          <code key={i} style={{ fontSize: '11px' }}>{ref.file}</code>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── WEAKNESSES ── */}
      {weaknesses.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Improvements Needed</div>
            <div className="chip amber">{weaknesses.length} items</div>
          </div>
          <div className="panel-body">
            <div className="insight-list">
              {weaknesses.map((weakness: any) => (
                <div key={weakness.weaknessId} className="insight-item">
                  <div className={`i-dot ${weakness.severity === 'high' ? 'neg' : 'warn'}`}>
                    {weakness.severity === 'high' ? '!' : '~'}
                  </div>
                  <div className="i-text">
                    <strong>{weakness.issue}</strong>
                    {weakness.severity && (
                      <span style={{
                        marginLeft: '6px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                        color: weakness.severity === 'high' ? '#E74C3C' : '#E67E22',
                        background: weakness.severity === 'high' ? 'rgba(231,76,60,0.1)' : 'rgba(230,126,34,0.1)',
                        padding: '1px 5px', borderRadius: '4px',
                      }}>
                        {weakness.severity}
                      </span>
                    )}
                    {weakness.impact && (
                      <div style={{ fontSize: '12.5px', color: 'var(--text2)', marginTop: '3px' }}>{weakness.impact}</div>
                    )}
                    {weakness.recommendation && (
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px', fontStyle: 'italic' }}>→ {weakness.recommendation}</div>
                    )}
                    {weakness.fileReferences && weakness.fileReferences.length > 0 && (
                      <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {weakness.fileReferences.slice(0, 3).map((ref: any, i: number) => (
                          <code key={i} style={{ fontSize: '11px' }}>{ref.file}</code>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OverviewTab;
