import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../services/api";
import ExportDropdown from "../components/dashboard/ExportDropdown";

const ReportPage: React.FC = () => {
  const { analysisId } = useOutletContext<{ analysisId: string }>();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const narrativeRef = useRef<HTMLDivElement>(null);

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

  const { intelligenceReport, projectReview } = analysis;
  const { designDecisions = [], technicalInsights = [], technologyStack, architecturePatterns = [] } = intelligenceReport;
  const grounding = (intelligenceReport as any)?.groundingReport;
  const architectureClarity = projectReview?.architectureClarity || {};
  const codeQuality = projectReview?.codeQuality || {};

  // Build a meaningful architecture summary from available data
  const buildArchitectureSummary = () => {
    const parts: string[] = [];
    if (architecturePatterns.length > 0) {
      parts.push(`This project follows a ${architecturePatterns.join(' + ')} architecture.`);
    }
    if (technologyStack?.frameworks?.length > 0) {
      parts.push(`Core technologies include ${technologyStack.frameworks.join(', ')}.`);
    }
    if (technicalInsights.length > 0) {
      parts.push(technicalInsights[0].insight || '');
    }
    if (designDecisions.length > 0) {
      const top = designDecisions[0];
      parts.push(`A key design choice was to ${top.decision?.toLowerCase()}: ${top.rationale}`);
    }
    return parts.filter(Boolean).join(' ') || 'No architecture summary available.';
  };

  // Build a grammatical interview narrative
  const buildNarrative = () => {
    const patterns = architecturePatterns.join(' and ') || 'modern architecture patterns';
    const techs = technologyStack?.frameworks?.join(', ') || '';
    const decisions = designDecisions.slice(0, 3);

    let narrative = `I built this project using ${[patterns, techs].filter(Boolean).join(', ')}.`;

    decisions.forEach((d: any, i: number) => {
      const decision = d.decision ? d.decision.charAt(0).toLowerCase() + d.decision.slice(1) : '';
      const rationale = d.rationale ? d.rationale.charAt(0).toLowerCase() + d.rationale.slice(1) : '';
      if (!decision) return;
      if (i === 0) narrative += ` I chose to ${decision} because ${rationale || 'it was the best fit'}.`;
      else if (i === 1) narrative += ` Additionally, I ${decision}${rationale ? `, which ${rationale}` : ''}.`;
      else narrative += ` I also ${decision}.`;
    });

    if (technicalInsights.length > 0) {
      const sig = technicalInsights[0].significance;
      if (sig) narrative += ` ${sig.charAt(0).toUpperCase() + sig.slice(1)}.`;
    }

    return narrative;
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "18px" }}>
        <div>
          <div className="view-title">Intelligence Report</div>
          <div className="view-sub">
            AI-reconstructed architectural decisions grounded in your actual code.
          </div>
          {grounding && typeof grounding.totalClaims === "number" && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text3)" }} title="Grounding confidence (verified claims / total claims)">
              {Math.round((Number(grounding.verifiedClaims || 0) / Math.max(Number(grounding.totalClaims || 0), 1)) * 100)}% grounded
            </div>
          )}
        </div>
        <ExportDropdown analysisId={analysisId} analysisData={analysis} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Architecture Overview — now always has content */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-head">
              <div className="panel-title">Architecture Overview</div>
              <div className="chip green">Grounded</div>
            </div>
            <div className="panel-body">
              <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.75', marginBottom: '14px' }}>
                {buildArchitectureSummary()}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {architectureClarity.componentOrganization && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '4px' }}>Organization</div>
                    <div style={{ fontSize: '13px', color: 'var(--text)' }}>{architectureClarity.componentOrganization}</div>
                  </div>
                )}
                {architectureClarity.separationOfConcerns && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '4px' }}>Separation of Concerns</div>
                    <div style={{ fontSize: '13px', color: 'var(--text)' }}>{architectureClarity.separationOfConcerns}</div>
                  </div>
                )}
              </div>

              {technologyStack && (
                <div className="tag-row" style={{ marginTop: '16px' }}>
                  {technologyStack.frameworks?.map((fw: string) => (
                    <span key={fw} className="tag acc">{fw}</span>
                  ))}
                  {technologyStack.libraries?.slice(0, 6).map((lib: string) => (
                    <span key={lib} className="tag tech">{lib}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Key Design Decisions */}
          {designDecisions.length > 0 && (
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-head">
                <div className="panel-title">Key Design Decisions</div>
                <div className="chip blue">{designDecisions.length} found</div>
              </div>
              <div className="panel-body">
                <div className="insight-list">
                  {designDecisions.map((decision: any, idx: number) => (
                    <div key={decision.decisionId || idx} className="insight-item">
                      <div className="i-dot pos">{idx + 1}</div>
                      <div className="i-text">
                        <strong>{decision.decision}</strong>
                        <div style={{ fontSize: '12.5px', color: 'var(--text2)', marginTop: '3px', lineHeight: 1.6 }}>
                          {decision.rationale}
                        </div>
                        {decision.tradeoffs && (
                          <div style={{ fontSize: '11.5px', color: 'var(--accent)', marginTop: '4px', opacity: 0.8 }}>
                            Tradeoff: {decision.tradeoffs}
                          </div>
                        )}
                        {decision.fileReferences && decision.fileReferences.length > 0 && (
                          <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Evidence:</span>
                            {decision.fileReferences.slice(0, 3).map((ref: any, i: number) => (
                              <code key={i} style={{ fontSize: '11px', padding: '1px 4px', background: 'var(--surface2)' }}>{ref.file.split('/').pop()}</code>
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
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Engineering Justification */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-head">
              <div className="panel-title">Technical Rationale</div>
              <div className="chip purple">Quality</div>
            </div>
            <div className="panel-body">
              <div style={{ fontSize: '12.5px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '12px' }}>
                {codeQuality.justification || "Critical evaluation of implementation standards and engineering rigor."}
              </div>

              {architectureClarity.antiPatterns && architectureClarity.antiPatterns.length > 0 && (
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--warn)', textTransform: 'uppercase', marginBottom: '8px' }}>Anti-Patterns Noted</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {architectureClarity.antiPatterns.map((p: any, i: number) => {
                      const text = typeof p === 'string' ? p : (p.name || p.description || p.issue || "Unknown anti-pattern");
                      return (
                        <div key={i} style={{ fontSize: '12px', color: 'var(--text2)', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--warn)' }}>⚠</span> {text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interview Narrative */}
          <div className="panel" style={{ margin: 0, background: 'var(--surface2)', border: '1px solid var(--accent)' }}>
            <div className="panel-head">
              <div className="panel-title">The "Story"</div>
              <div className="chip green">Pitch</div>
            </div>
            <div className="panel-body">
              <div
                ref={narrativeRef}
                style={{
                  fontSize: '13px',
                  color: 'var(--text)',
                  lineHeight: '1.7',
                  fontStyle: 'italic',
                  marginBottom: '14px'
                }}
              >
                "{buildNarrative()}"
              </div>
              <button
                className="btn-accent"
                style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '6px' }}
                onClick={() => {
                  const text = narrativeRef.current?.textContent;
                  if (text) {
                    navigator.clipboard.writeText(text.replace(/^"|"$/g, ''));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                {copied ? '✓ Copied' : 'Copy Narrative'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Insights — Full Width Bottom */}
      {technicalInsights.length > 0 && (
        <div className="panel" style={{ marginTop: '20px' }}>
          <div className="panel-head">
            <div className="panel-title">Deep Technical Insights</div>
            <div className="chip green">{technicalInsights.length} insights</div>
          </div>
          <div className="panel-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {technicalInsights.map((insight: any, idx: number) => (
                <div key={insight.insightId || idx} style={{ padding: '14px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ fontSize: '18px' }}>💡</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{insight.insight}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: 1.5 }}>
                        {insight.significance}
                      </div>
                      {insight.fileReferences && insight.fileReferences.length > 0 && (
                        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {insight.fileReferences.slice(0, 2).map((ref: any) => (
                            <code key={ref.file} style={{ fontSize: '10.5px', opacity: 0.7 }}>{ref.file.split('/').pop()}</code>
                          ))}
                        </div>
                      )}
                    </div>
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

export default ReportPage;
