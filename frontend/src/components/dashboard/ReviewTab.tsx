import React, { useState, useEffect } from "react";
import api from "../../services/api";

interface ReviewTabProps {
  analysisId: string;
}

const ReviewTab: React.FC<ReviewTabProps> = ({ analysisId }) => {
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
        <div style={{ fontSize: '14px', color: 'var(--text2)' }}>Loading project review...</div>
      </div>
    );
  }

  if (error || !analysis?.projectReview) {
    return (
      <div style={{ background: '#FEF4F4', border: '1px solid #FACACA', borderRadius: '8px', padding: '12px 16px', color: '#C0392B', fontSize: '13px' }}>
        {error || 'Project review not available'}
      </div>
    );
  }

  const { projectReview, repository } = analysis;
  const { architectureClarity, projectAuthenticity, codeQuality } = projectReview;

  return (
    <>
      <div className="view-title">Project Review</div>
      <div className="view-sub">
        Detailed code quality analysis grounded in specific files and line numbers.
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Architecture Clarity</div>
          <div className={`chip ${architectureClarity.score >= 70 ? 'green' : architectureClarity.score >= 50 ? 'amber' : 'red'}`}>
            {architectureClarity.score} / 100
          </div>
        </div>
        <div className="panel-body">
          <p style={{ fontSize: "13px", color: "var(--text2)", lineHeight: "1.7", marginBottom: "14px" }}>
            {architectureClarity.componentOrganization}
          </p>
          
          {architectureClarity.designPatterns && architectureClarity.designPatterns.length > 0 && (
            <div className="tag-row" style={{ marginBottom: "14px" }}>
              {architectureClarity.designPatterns.map((pattern: any, idx: number) => {
                const patternName = typeof pattern === 'string' ? pattern : (pattern?.name || JSON.stringify(pattern));
                return (
                  <span key={idx} className="tag tech">
                    {patternName}
                  </span>
                );
              })}
            </div>
          )}

          {architectureClarity.antiPatterns && architectureClarity.antiPatterns.length > 0 && (
            <div className="insight-list">
              {architectureClarity.antiPatterns.map((antiPattern: any, idx: number) => {
                const antiPatternText = typeof antiPattern === 'string' ? antiPattern : (antiPattern?.name || JSON.stringify(antiPattern));
                return (
                  <div key={idx} className="insight-item">
                    <div className="i-dot warn">!</div>
                    <div className="i-text">
                      <strong>Anti-pattern detected:</strong> {antiPatternText}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Code Quality Breakdown</div>
          <div className={`chip ${codeQuality.overall >= 70 ? 'green' : codeQuality.overall >= 50 ? 'amber' : 'red'}`}>
            {codeQuality.overall} / 100
          </div>
        </div>
        <div className="panel-body">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "16px" }}>
            {[
              { label: "Readability", score: codeQuality.readability },
              { label: "Maintainability", score: codeQuality.maintainability },
              { label: "Error Handling", score: codeQuality.errorHandling },
              { label: "Security", score: codeQuality.security },
              { label: "Performance", score: codeQuality.performance },
              { label: "Documentation", score: codeQuality.documentation }
            ].map(({ label, score }) => (
              <div key={label} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "7px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "500" }}>{label}</span>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: score >= 70 ? "#27AE60" : score >= 50 ? "#E67E22" : "#E74C3C" }}>
                    {score}
                  </span>
                </div>
                <div style={{ background: "var(--border2)", borderRadius: "3px", height: "4px", overflow: "hidden" }}>
                  <div style={{ 
                    background: score >= 70 ? "#27AE60" : score >= 50 ? "#E67E22" : "#E74C3C", 
                    height: "100%", 
                    width: `${score}%`,
                    transition: "width 0.3s ease"
                  }}></div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "12px", color: "var(--text3)", fontStyle: "italic" }}>
            {codeQuality.justification}
          </p>
        </div>
      </div>

      {projectAuthenticity && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Project Authenticity</div>
            <div className={`chip ${projectAuthenticity.score >= 70 ? 'green' : projectAuthenticity.score >= 50 ? 'amber' : 'red'}`}>
              {projectAuthenticity.score} / 100
            </div>
          </div>
          <div className="panel-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "7px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-1px" }}>
                  {projectAuthenticity.signals?.commitDiversity || 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text3)", marginTop: "2px" }}>
                  Commit Diversity
                </div>
              </div>
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "7px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-1px" }}>
                  {projectAuthenticity.signals?.timeSpread || 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text3)", marginTop: "2px" }}>
                  Time Spread
                </div>
              </div>
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "7px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-1px" }}>
                  {projectAuthenticity.signals?.messageQuality || 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text3)", marginTop: "2px" }}>
                  Message Quality
                </div>
              </div>
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "7px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-1px" }}>
                  {projectAuthenticity.signals?.codeEvolution || 0}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text3)", marginTop: "2px" }}>
                  Code Evolution
                </div>
              </div>
            </div>
            
            {projectAuthenticity.warnings && projectAuthenticity.warnings.length > 0 && (
              <div className="insight-list">
                {projectAuthenticity.warnings.map((warning: string, idx: number) => (
                  <div key={idx} className="insight-item">
                    <div className="i-dot warn">⚠</div>
                    <div className="i-text">{warning}</div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "12px", fontStyle: "italic" }}>
              Confidence: {projectAuthenticity.confidence}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewTab;
