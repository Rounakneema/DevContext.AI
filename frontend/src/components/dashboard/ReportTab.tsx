import React, { useState, useEffect } from "react";
import api from "../../services/api";

interface ReportTabProps {
  analysisId: string;
}

const ReportTab: React.FC<ReportTabProps> = ({ analysisId }) => {
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
        <div style={{ fontSize: '14px', color: 'var(--text2)' }}>Loading intelligence report...</div>
      </div>
    );
  }

  if (error || !analysis?.intelligenceReport) {
    return (
      <div style={{ background: '#FEF4F4', border: '1px solid #FACACA', borderRadius: '8px', padding: '12px 16px', color: '#C0392B', fontSize: '13px' }}>
        {error || 'Intelligence report not available. Complete Stage 2 first.'}
      </div>
    );
  }

  const { intelligenceReport, repository } = analysis;
  const { designDecisions, technicalInsights, technologyStack, architecturePatterns } = intelligenceReport;

  return (
    <>
      <div className="view-title">Intelligence Report</div>
      <div className="view-sub">
        AI-reconstructed architectural decisions grounded in your actual code.
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Architecture Overview</div>
          <div className="chip green">Grounded</div>
        </div>
        <div className="panel-body">
          {architecturePatterns && architecturePatterns.length > 0 && (
            <>
              <p style={{ fontSize: "13px", color: "var(--text2)", lineHeight: "1.7", marginBottom: "18px" }}>
                Detected architecture patterns: {architecturePatterns.join(', ')}
              </p>
              <div className="tag-row" style={{ marginBottom: "14px" }}>
                {architecturePatterns.map((pattern: string) => (
                  <span key={pattern} className="tag tech">{pattern}</span>
                ))}
              </div>
            </>
          )}

          {technologyStack && (
            <div style={{ marginTop: "14px" }}>
              <div className="tag-row">
                {technologyStack.frameworks?.map((fw: string) => (
                  <span key={fw} className="tag acc">{fw}</span>
                ))}
                {technologyStack.libraries?.slice(0, 5).map((lib: string) => (
                  <span key={lib} className="tag tech">{lib}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {designDecisions && designDecisions.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Key Design Decisions</div>
            <div className="chip blue">{designDecisions.length} found</div>
          </div>
          <div className="panel-body">
            <div className="insight-list">
              {designDecisions.slice(0, 4).map((decision: any, idx: number) => (
                <div key={decision.decisionId || idx} className="insight-item">
                  <div className="i-dot pos">{idx + 1}</div>
                  <div className="i-text">
                    <strong>{decision.decision}</strong> — {decision.rationale}
                    {decision.fileReferences && decision.fileReferences.length > 0 && (
                      <> Evidence in <code>{decision.fileReferences[0].file}</code></>
                    )}
                    {decision.tradeoffs && (
                      <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "4px", fontStyle: "italic" }}>
                        Tradeoffs: {decision.tradeoffs}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {technicalInsights && technicalInsights.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Technical Insights</div>
            <div className="chip green">{technicalInsights.length} insights</div>
          </div>
          <div className="panel-body">
            <div className="insight-list">
              {technicalInsights.slice(0, 3).map((insight: any, idx: number) => (
                <div key={insight.insightId || idx} className="insight-item">
                  <div className="i-dot pos">💡</div>
                  <div className="i-text">
                    <strong>{insight.insight}</strong>
                    {insight.significance && (
                      <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "4px" }}>
                        {insight.significance}
                      </div>
                    )}
                    {insight.fileReferences && insight.fileReferences.length > 0 && (
                      <div style={{ fontSize: "11px", color: "var(--accent)", marginTop: "4px" }}>
                        Found in: {insight.fileReferences.map((ref: any) => ref.file).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Interview Narrative</div>
          <div className="chip green">Ready to use</div>
        </div>
        <div className="panel-body">
          <div style={{
            background: "var(--surface2)",
            borderLeft: "3px solid var(--accent)",
            borderRadius: "0 7px 7px 0",
            padding: "16px",
            fontSize: "13px",
            color: "var(--text2)",
            lineHeight: "1.75",
            fontStyle: "italic",
          }}>
            {designDecisions && designDecisions.length > 0 ? (
              `"I built this project using ${architecturePatterns?.join(' and ') || 'modern architecture patterns'}. ${designDecisions[0]?.decision} because ${designDecisions[0]?.rationale} ${designDecisions[1] ? `I also ${designDecisions[1].decision.toLowerCase()} to ${designDecisions[1].rationale.toLowerCase()}` : ''} These decisions helped me ${technicalInsights?.[0]?.significance || 'achieve better code organization and maintainability'}."`
            ) : (
              `"I built this project with a focus on ${technologyStack?.frameworks?.join(' and ') || 'modern web technologies'}. The architecture emphasizes ${architecturePatterns?.join(', ') || 'clean code principles and maintainability'}."`
            )}
          </div>
          <button
            className="btn-ghost"
            style={{
              width: "auto",
              marginTop: "12px",
              padding: "7px 14px",
              fontSize: "12px",
            }}
            onClick={() => {
              const narrative = document.querySelector('[style*="fontStyle: italic"]')?.textContent;
              if (narrative) {
                navigator.clipboard.writeText(narrative);
              }
            }}
          >
            Copy Narrative
          </button>
        </div>
      </div>
    </>
  );
};

export default ReportTab;
