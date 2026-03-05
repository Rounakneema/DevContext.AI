import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../services/api";

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

  const { intelligenceReport } = analysis;
  const { designDecisions = [], technicalInsights = [], technologyStack, architecturePatterns = [] } = intelligenceReport;

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
      <div className="view-title">Intelligence Report</div>
      <div className="view-sub">
        AI-reconstructed architectural decisions grounded in your actual code.
      </div>

      {/* Architecture Overview — now always has content */}
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Architecture Overview</div>
          <div className="chip green">Grounded</div>
        </div>
        <div className="panel-body">
          <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.75', marginBottom: '14px' }}>
            {buildArchitectureSummary()}
          </p>

          {architecturePatterns.length > 0 && (
            <div className="tag-row" style={{ marginBottom: '12px' }}>
              {architecturePatterns.map((pattern: string) => (
                <span key={pattern} className="tag tech">{pattern}</span>
              ))}
            </div>
          )}

          {technologyStack && (
            <div className="tag-row">
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

      {/* Key Design Decisions — show ALL */}
      {designDecisions.length > 0 && (
        <div className="panel">
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
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px', fontStyle: 'italic' }}>
                        Tradeoffs: {decision.tradeoffs}
                      </div>
                    )}
                    {decision.fileReferences && decision.fileReferences.length > 0 && (
                      <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Evidence in</span>
                        {decision.fileReferences.slice(0, 4).map((ref: any, i: number) => (
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

      {/* Technical Insights — show ALL */}
      {technicalInsights.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Technical Insights</div>
            <div className="chip green">{technicalInsights.length} insights</div>
          </div>
          <div className="panel-body">
            <div className="insight-list">
              {technicalInsights.map((insight: any, idx: number) => (
                <div key={insight.insightId || idx} className="insight-item">
                  <div className="i-dot pos">💡</div>
                  <div className="i-text">
                    <strong>{insight.insight}</strong>
                    {insight.significance && (
                      <div style={{ fontSize: '12.5px', color: 'var(--text2)', marginTop: '3px', lineHeight: 1.6 }}>
                        {insight.significance}
                      </div>
                    )}
                    {insight.fileReferences && insight.fileReferences.length > 0 && (
                      <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>Found in</span>
                        {insight.fileReferences.slice(0, 4).map((ref: any) => (
                          <code key={ref.file} style={{ fontSize: '11px' }}>{ref.file}</code>
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

      {/* Interview Narrative — properly constructed */}
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Interview Narrative</div>
          <div className="chip green">Ready to use</div>
        </div>
        <div className="panel-body">
          <div
            ref={narrativeRef}
            style={{
              background: 'var(--surface2)',
              borderLeft: '3px solid var(--accent)',
              borderRadius: '0 7px 7px 0',
              padding: '16px 18px',
              fontSize: '13.5px',
              color: 'var(--text)',
              lineHeight: '1.8',
              fontStyle: 'italic',
            }}
          >
            "{buildNarrative()}"
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
            <button
              className="btn-ghost"
              style={{ width: 'auto', padding: '7px 14px', fontSize: '12px' }}
              onClick={() => {
                const text = narrativeRef.current?.textContent;
                if (text) {
                  navigator.clipboard.writeText(text.replace(/^"|"$/g, ''));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
            >
              {copied ? '✓ Copied!' : 'Copy Narrative'}
            </button>
            <span style={{ fontSize: '11.5px', color: 'var(--text3)' }}>
              Tip: personalise this with your own experience before using it
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportPage;
