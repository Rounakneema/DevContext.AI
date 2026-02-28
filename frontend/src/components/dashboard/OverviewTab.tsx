import React, { useState, useEffect } from "react";
import api from "../../services/api";
import EmployabilitySignalPanel from "./EmployabilitySignalPanel";
import ExportDropdown from "./ExportDropdown";

interface OverviewTabProps {
  analysisId: string;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ analysisId }) => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalysis();
  }, [analysisId]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const data = await api.getAnalysis(analysisId);
      setAnalysis(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
        <div style={{ fontSize: '14px', color: 'var(--text2)' }}>Loading analysis...</div>
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

  const { projectReview, repository } = analysis;
  const employabilitySignal = projectReview?.employabilitySignal || { overall: 0, companyTierMatch: {} };
  const codeQuality = projectReview?.codeQuality || { overall: 0 };
  const authenticity = projectReview?.projectAuthenticity || { score: 0 };
  
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "18px",
        }}
      >
        <div>
          <div className="view-title">{repository?.repositoryName || 'Repository'}</div>
          <div className="view-sub">
            {repository?.frameworks?.join(' + ') || 'Unknown'} · {repository?.totalFiles || 0} files · Analysed {new Date(analysis.analysis.createdAt).toLocaleString()}
          </div>
        </div>
        <ExportDropdown analysisId={analysisId} />
      </div>

      {authenticity.warnings && authenticity.warnings.length > 0 && (
        <div className="warn-strip">
          ⚠{" "}
          <span>
            <strong>{authenticity.warnings[0]}</strong>
          </span>
        </div>
      )}

      <div className="score-row">
        <div className="score-card">
          <div className="sc-label">Employability Signal</div>
          <div className={`sc-num ${employabilitySignal.overall >= 70 ? 'green' : employabilitySignal.overall >= 50 ? 'amber' : 'red'}`}>
            {employabilitySignal.overall}
          </div>
          <div className="sc-sub">{employabilitySignal.justification?.substring(0, 50) || 'Analysis complete'}</div>
          <div className="sc-bar">
            <div className={`sc-bar-fill ${employabilitySignal.overall >= 70 ? 'green' : employabilitySignal.overall >= 50 ? 'amber' : 'red'}`} style={{ width: `${employabilitySignal.overall}%` }}></div>
          </div>
        </div>
        <div className="score-card">
          <div className="sc-label">Code Quality</div>
          <div className={`sc-num ${codeQuality.overall >= 70 ? 'green' : codeQuality.overall >= 50 ? 'amber' : 'red'}`}>
            {codeQuality.overall}
          </div>
          <div className="sc-sub">{codeQuality.justification?.substring(0, 50) || 'Quality assessed'}</div>
          <div className="sc-bar">
            <div className={`sc-bar-fill ${codeQuality.overall >= 70 ? 'green' : codeQuality.overall >= 50 ? 'amber' : 'red'}`} style={{ width: `${codeQuality.overall}%` }}></div>
          </div>
        </div>
        <div className="score-card">
          <div className="sc-label">Authenticity Score</div>
          <div className={`sc-num ${authenticity.score >= 70 ? 'green' : authenticity.score >= 50 ? 'amber' : 'red'}`}>
            {authenticity.score}
          </div>
          <div className="sc-sub">{authenticity.confidence} confidence</div>
          <div className="sc-bar">
            <div className={`sc-bar-fill ${authenticity.score >= 70 ? 'green' : authenticity.score >= 50 ? 'amber' : 'red'}`} style={{ width: `${authenticity.score}%` }}></div>
          </div>
        </div>
      </div>

      <EmployabilitySignalPanel employabilitySignal={employabilitySignal} />

      <div className="panel">
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
          <div
            style={{
              marginTop: "14px",
              fontSize: "12.5px",
              color: "var(--text3)",
            }}
          >
            {Object.entries(repository?.languages || {}).map(([lang, pct]: [string, any], idx) => (
              <span key={lang}>
                {idx > 0 && ' · '}
                {lang} <strong style={{ color: "var(--text)" }}>{pct}%</strong>
              </span>
            ))}
          </div>
        </div>
      </div>

      {projectReview?.strengths && projectReview.strengths.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Strengths</div>
            <div className="chip green">{projectReview.strengths.length} found</div>
          </div>
          <div className="panel-body">
            <div className="insight-list">
              {projectReview.strengths.slice(0, 3).map((strength: any) => (
                <div key={strength.strengthId} className="insight-item">
                  <div className="i-dot pos">✓</div>
                  <div className="i-text">
                    <strong>{strength.pattern}</strong> — {strength.description}
                    {strength.fileReferences && strength.fileReferences.length > 0 && (
                      <> in <code>{strength.fileReferences[0].file}</code></>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {projectReview?.weaknesses && projectReview.weaknesses.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Improvements Needed</div>
            <div className="chip amber">{projectReview.weaknesses.length} items</div>
          </div>
          <div className="panel-body">
            <div className="insight-list">
              {projectReview.weaknesses.slice(0, 3).map((weakness: any) => (
                <div key={weakness.weaknessId} className="insight-item">
                  <div className={`i-dot ${weakness.severity === 'high' ? 'neg' : 'warn'}`}>
                    {weakness.severity === 'high' ? '!' : '~'}
                  </div>
                  <div className="i-text">
                    <strong>{weakness.issue}</strong> — {weakness.impact}
                    {weakness.fileReferences && weakness.fileReferences.length > 0 && (
                      <> in <code>{weakness.fileReferences[0].file}</code></>
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
