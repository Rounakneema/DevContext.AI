import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAnalysisStatus, continueToStage2, continueToStage3, exportAnalysis, cancelAnalysis } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

type WorkflowState =
  | 'stage1_pending'
  | 'stage1_complete_awaiting_approval'
  | 'stage2_pending'
  | 'stage2_complete_awaiting_approval'
  | 'stage3_pending'
  | 'all_complete'
  | 'failed'
  | 'cancelled';

interface Stage {
  name: string;
  detail: string;
  status: 'done' | 'running' | 'pending' | 'awaiting';
}

const LoadingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryUrl = (location.state as any)?.query || 'github.com/username/project';
  const analysisId = (location.state as any)?.analysisId;

  const [workflowState, setWorkflowState] = useState<WorkflowState>('stage1_pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pipelineError, setPipelineError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Redirect if no analysisId
  React.useEffect(() => {
    if (!analysisId) {
      console.error('No analysisId provided');
      navigate('/app');
    }
  }, [analysisId, navigate]);

  // WebSocket — instant stage-complete notifications (polling is the fallback)
  useWebSocket(analysisId, {
    onStageComplete: (payload) => {
      if (payload.workflowState) {
        setWorkflowState(payload.workflowState as WorkflowState);
        updateStagesFromWorkflow(payload.workflowState as WorkflowState);
        if (payload.workflowState === 'all_complete') {
          setTimeout(() => navigate(`/app/dashboard?id=${analysisId}&tab=interview`), 1500);
        }
      }
    },
    onAnalysisComplete: () => {
      setWorkflowState('all_complete');
      updateStagesFromWorkflow('all_complete');
      setTimeout(() => navigate(`/app/dashboard?id=${analysisId}&tab=interview`), 1500);
    },
  });

  const [stages, setStages] = useState<Stage[]>([
    {
      name: 'Repository cloning & processing',
      detail: 'Extracting files and tokens',
      status: 'done',
    },
    {
      name: 'Stage 1 — Project Review',
      detail: 'Scoring code quality · Llama 3.3 70B',
      status: 'running',
    },
    {
      name: 'Stage 2 — Intelligence Report',
      detail: 'Architecture reconstruction · Llama 3.3 70B',
      status: 'pending',
    },
    {
      name: 'Stage 3 — Interview Simulation',
      detail: 'Generating interview questions · Cohere Command R+',
      status: 'pending',
    },
  ]);

  // Update stages based on workflow state
  const updateStagesFromWorkflow = useCallback((state: WorkflowState) => {
    setStages((prev) => {
      const newStages = [...prev];

      switch (state) {
        case 'stage1_pending':
          newStages[1] = { ...newStages[1], status: 'running' };
          newStages[2] = { ...newStages[2], status: 'pending' };
          newStages[3] = { ...newStages[3], status: 'pending' };
          break;
        case 'stage1_complete_awaiting_approval':
          newStages[1] = { ...newStages[1], status: 'done' };
          newStages[2] = { ...newStages[2], status: 'awaiting' };
          newStages[3] = { ...newStages[3], status: 'pending' };
          break;
        case 'stage2_pending':
          newStages[1] = { ...newStages[1], status: 'done' };
          newStages[2] = { ...newStages[2], status: 'running' };
          newStages[3] = { ...newStages[3], status: 'pending' };
          break;
        case 'stage2_complete_awaiting_approval':
          newStages[1] = { ...newStages[1], status: 'done' };
          newStages[2] = { ...newStages[2], status: 'done' };
          newStages[3] = { ...newStages[3], status: 'awaiting' };
          break;
        case 'stage3_pending':
          newStages[1] = { ...newStages[1], status: 'done' };
          newStages[2] = { ...newStages[2], status: 'done' };
          newStages[3] = { ...newStages[3], status: 'running' };
          break;
        case 'all_complete':
          newStages[1] = { ...newStages[1], status: 'done' };
          newStages[2] = { ...newStages[2], status: 'done' };
          newStages[3] = { ...newStages[3], status: 'done' };
          break;
      }

      return newStages;
    });
  }, []);

  // Poll for status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const data = await getAnalysisStatus(analysisId);
        setWorkflowState(data.workflowState as WorkflowState);
        updateStagesFromWorkflow(data.workflowState as WorkflowState);

        // Detect backend failure or cancellation
        if (data.workflowState === 'failed') {
          clearInterval(pollInterval);
          setPipelineError((data as any).errorMessage || 'The analysis failed. Please try again.');
          return;
        }
        if (data.workflowState === 'cancelled') {
          clearInterval(pollInterval);
          return;
        }

        // Stop polling at decision points or completion
        if (
          data.workflowState === 'stage1_complete_awaiting_approval' ||
          data.workflowState === 'stage2_complete_awaiting_approval' ||
          data.workflowState === 'all_complete'
        ) {
          clearInterval(pollInterval);
        }

        // Auto-redirect when all complete
        if (data.workflowState === 'all_complete') {
          setTimeout(() => {
            navigate(`/app/dashboard?id=${analysisId}&tab=interview`);
          }, 1500);
        }
      } catch (err: any) {
        console.error('Polling error:', err);
        const msg = err?.message || '';
        if (msg.includes('not found') || msg.includes('404') || msg.includes('Analysis not found')) {
          clearInterval(pollInterval);
          navigate('/app', { replace: true });
        }
      }
    };

    pollStatus();
    pollInterval = setInterval(pollStatus, 3000);
    return () => clearInterval(pollInterval);
  }, [analysisId, navigate, updateStagesFromWorkflow]);

  // Cancel analysis
  const handleCancel = async () => {
    if (cancelling) return;
    const confirmed = window.confirm('Stop this analysis? You can start a new one any time.');
    if (!confirmed) return;
    setCancelling(true);
    try {
      await cancelAnalysis(analysisId);
      setWorkflowState('cancelled');
    } catch (err: any) {
      // Even if the API call fails, treat it as cancelled on the frontend
      setWorkflowState('cancelled');
    } finally {
      setCancelling(false);
    }
  };

  // Continue to Stage 2
  const handleContinueStage2 = async () => {
    setLoading(true);
    setError('');
    try {
      await continueToStage2(analysisId);

      setWorkflowState('stage2_pending');
      updateStagesFromWorkflow('stage2_pending');

      // Resume polling
      const pollInterval = setInterval(async () => {
        try {
          const data = await getAnalysisStatus(analysisId);
          setWorkflowState(data.workflowState as WorkflowState);
          updateStagesFromWorkflow(data.workflowState as WorkflowState);

          if (data.workflowState === 'stage2_complete_awaiting_approval') {
            clearInterval(pollInterval);
          }
        } catch (err: any) {
          console.error('Polling error:', err);
          const msg = err?.message || '';
          if (msg.includes('not found') || msg.includes('404') || msg.includes('Analysis not found')) {
            clearInterval(pollInterval);
          }
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to continue');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueStage3 = async (mode: 'sheet' | 'live' = 'sheet') => {
    setLoading(true);
    setError('');
    try {
      await continueToStage3(analysisId, mode);

      setWorkflowState('stage3_pending');
      updateStagesFromWorkflow('stage3_pending');

      // Resume polling
      const pollInterval = setInterval(async () => {
        try {
          const data = await getAnalysisStatus(analysisId);
          setWorkflowState(data.workflowState as WorkflowState);
          updateStagesFromWorkflow(data.workflowState as WorkflowState);

          if (data.workflowState === 'all_complete') {
            clearInterval(pollInterval);
            setTimeout(() => {
              navigate(`/app/dashboard?id=${analysisId}&tab=interview`);
            }, 1500);
          }
        } catch (err: any) {
          console.error('Polling error:', err);
          const msg = err?.message || '';
          if (msg.includes('not found') || msg.includes('404') || msg.includes('Analysis not found')) {
            clearInterval(pollInterval);
          }
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to continue');
    } finally {
      setLoading(false);
    }
  };

  // Download report
  const handleDownloadReport = async () => {
    try {
      const data = await exportAnalysis(analysisId, 'pdf');
      console.log('Export initiated:', data);
      alert('Report download started! Check your downloads folder.');
    } catch (err: any) {
      setError(err.message || 'Failed to download report');
    }
  };

  // Go to dashboard
  const handleGoToDashboard = () => {
    navigate(`/app/dashboard?id=${analysisId}`);
  };

  // Go home
  const handleGoHome = () => {
    navigate('/app');
  };

  const displayUrl = queryUrl.replace(/^https?:\/\//, '');

  // Determine title and subtitle based on state
  const getHeaderContent = () => {
    switch (workflowState) {
      case 'stage1_pending':
        return {
          title: 'Analysing your repository',
          subtitle: 'AI pipeline running — Stage 1 results in ~30 seconds',
        };
      case 'stage1_complete_awaiting_approval':
        return {
          title: 'Stage 1 Complete!',
          subtitle: 'Project Review is ready. Choose how to proceed.',
        };
      case 'stage2_pending':
        return {
          title: 'Generating Intelligence Report',
          subtitle: 'Deep architecture analysis in progress...',
        };
      case 'stage2_complete_awaiting_approval':
        return {
          title: 'Intelligence Report Ready!',
          subtitle: 'Full analysis complete. Ready for interview practice?',
        };
      case 'stage3_pending':
        return {
          title: 'Preparing Interview Questions',
          subtitle: 'Generating project-specific questions...',
        };
      case 'all_complete':
        return {
          title: 'All Stages Complete!',
          subtitle: 'Redirecting to your interview session...',
        };
      default:
        return {
          title: 'Processing...',
          subtitle: 'Please wait',
        };
    }
  };

  const header = getHeaderContent();
  const isDecisionPoint =
    workflowState === 'stage1_complete_awaiting_approval' ||
    workflowState === 'stage2_complete_awaiting_approval';
  const isProcessing =
    workflowState === 'stage1_pending' ||
    workflowState === 'stage2_pending' ||
    workflowState === 'stage3_pending';
  const isTerminal = workflowState === 'failed' || workflowState === 'cancelled';

  // ── Terminal failure/cancelled screen ────────────────────────────────────────
  if (isTerminal) {
    const isFailed = workflowState === 'failed';
    return (
      <div className="main page active loading-page">
        <div className="loading-inner">
          <div style={{
            background: isFailed ? 'rgba(231,76,60,0.08)' : 'rgba(230,126,34,0.08)',
            border: `1px solid ${isFailed ? '#E74C3C' : '#E67E22'}44`,
            borderRadius: '16px', padding: '32px', textAlign: 'center', maxWidth: '420px',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>{isFailed ? '❌' : '🚫'}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
              {isFailed ? 'Analysis Failed' : 'Analysis Cancelled'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '6px', lineHeight: 1.6 }}>
              {isFailed
                ? (pipelineError || 'Something went wrong during analysis. This is often a temporary issue.')
                : 'You cancelled this analysis. No problem — you can start a new one any time.'}
            </div>
            {isFailed && (
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '20px', fontStyle: 'italic' }}>
                Common causes: repository too large, unsupported file types, or a temporary API issue.
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '16px' }}>
              <button
                className="btn-accent"
                onClick={() => navigate('/app')}
                style={{ padding: '10px 20px', fontSize: '13px' }}
              >
                ← Try Another Repo
              </button>
              {isFailed && (
                <button
                  className="btn-secondary"
                  onClick={() => navigate('/app', { state: { retryUrl: queryUrl } })}
                  style={{ padding: '10px 16px', fontSize: '13px' }}
                >
                  🔄 Retry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main page active loading-page">
      <div className="loading-inner">
        <div className="loading-chip">
          <div className={`loading-chip-dot ${isDecisionPoint ? 'success' : ''}`}></div>
          <span>{displayUrl}</span>
        </div>
        <div className={`loading-title ${isDecisionPoint ? 'success' : ''}`}>
          {header.title}
        </div>
        <div className="loading-sub">{header.subtitle}</div>

        {error && <div className="loading-error">{error}</div>}

        <div className="stage-list">
          {stages.map((stage, index) => (
            <div key={index} className={`stage-row ${stage.status}`}>
              <div className="stage-dot"></div>
              <div className="stage-text">
                <div className="stage-name">{stage.name}</div>
                <div className="stage-detail">{stage.detail}</div>
              </div>
              <div className="stage-tag">
                {stage.status === 'done' && 'Done'}
                {stage.status === 'running' && 'Running'}
                {stage.status === 'pending' && 'Queued'}
                {stage.status === 'awaiting' && 'Your Decision'}
              </div>
            </div>
          ))}
        </div>

        {/* Progress bar + cancel only when processing */}
        {isProcessing && (
          <>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill"></div>
            </div>
            <div className="loading-hint">Results stream progressively — Stage 1 arrives first</div>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              style={{
                marginTop: '16px',
                padding: '8px 20px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text3)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: cancelling ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {cancelling ? 'Cancelling…' : '✕ Cancel Analysis'}
            </button>
          </>
        )}

        {/* Decision point after Stage 1 */}
        {workflowState === 'stage1_complete_awaiting_approval' && (
          <div className="decision-panel">
            <div className="decision-title">What would you like to do?</div>
            <div className="decision-actions">
              <button
                className="btn-accent decision-btn primary"
                onClick={handleContinueStage2}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                {loading ? 'Starting...' : 'Continue to Intelligence Report'}
              </button>
              <div className="decision-secondary">
                <button className="btn-secondary" onClick={handleGoToDashboard}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                  View Results
                </button>
                <button className="btn-secondary" onClick={handleDownloadReport}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Report
                </button>
                <button className="btn-secondary" onClick={handleGoHome}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  Go Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Decision point after Stage 2 */}
        {workflowState === 'stage2_complete_awaiting_approval' && (
          <div className="decision-panel">
            <div className="decision-title">Ready for interview practice?</div>
            <div className="decision-actions">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                <button
                  className="btn-accent decision-btn primary"
                  onClick={() => handleContinueStage3('live')}
                  disabled={loading}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  {loading ? 'Starting...' : 'Start Live Adaptive Interview'}
                </button>
                <button
                  className="btn-secondary decision-btn"
                  onClick={() => handleContinueStage3('sheet')}
                  disabled={loading}
                  style={{ background: 'var(--surface)', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  {loading ? 'Preparing...' : 'Generate Comprehensive Question Sheet (50+ Qs)'}
                </button>
              </div>
              <div className="decision-secondary">
                <button className="btn-secondary" onClick={handleGoToDashboard}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18" />
                    <path d="M9 21V9" />
                  </svg>
                  View Full Report
                </button>
                <button className="btn-secondary" onClick={handleDownloadReport}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Report
                </button>
                <button className="btn-secondary" onClick={handleGoHome}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  Go Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* All complete message */}
        {workflowState === 'all_complete' && (
          <div className="complete-panel">
            <div className="complete-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="complete-text">Redirecting to Interview Dashboard...</div>
          </div>
        )}

        {/* Preview button only when processing */}
        {isProcessing && (
          <button className="btn-ghost" onClick={handleGoToDashboard}>
            Preview Dashboard →
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingPage;

