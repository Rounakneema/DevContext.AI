import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

type WorkflowState =
  | 'stage1_pending'
  | 'stage1_complete_awaiting_approval'
  | 'stage2_pending'
  | 'stage2_complete_awaiting_approval'
  | 'stage3_pending'
  | 'all_complete'
  | 'failed';

interface StageStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt?: string;
  completedAt?: string;
}

interface AnalysisStatus {
  analysisId: string;
  status: 'initiated' | 'processing' | 'completed' | 'failed';
  workflowState: WorkflowState;
  progress: number;
  stages: {
    project_review: StageStatus;
    intelligence_report: StageStatus;
    interview_simulation: StageStatus;
  };
  estimatedTimeRemaining: number;
  nextAction?: string;
}

interface Stage {
  name: string;
  detail: string;
  status: 'done' | 'running' | 'pending' | 'awaiting';
}

const API_BASE = 'http://localhost:3001';

const LoadingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryUrl = (location.state as any)?.query || 'github.com/username/project';
  const analysisId = (location.state as any)?.analysisId || 'mock-analysis-id';

  const [workflowState, setWorkflowState] = useState<WorkflowState>('stage1_pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [stages, setStages] = useState<Stage[]>([
    {
      name: 'Repository cloning & processing',
      detail: 'Extracting files and tokens',
      status: 'done',
    },
    {
      name: 'Stage 1 — Project Review',
      detail: 'Scoring code quality · Claude 3.5 Haiku',
      status: 'running',
    },
    {
      name: 'Stage 2 — Intelligence Report',
      detail: 'Architecture reconstruction · Claude 3.5 Sonnet',
      status: 'pending',
    },
    {
      name: 'Stage 3 — Interview Simulation',
      detail: 'Generating project-specific questions',
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
        const response = await fetch(`${API_BASE}/analysis/${analysisId}/status`);
        if (!response.ok) throw new Error('Failed to fetch status');
        
        const data: AnalysisStatus = await response.json();
        setWorkflowState(data.workflowState);
        updateStagesFromWorkflow(data.workflowState);

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
            navigate('/app/dashboard', { state: { analysisId, activeTab: 'interview' } });
          }, 1500);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    // Initial fetch
    pollStatus();

    // Poll every 3 seconds while processing
    pollInterval = setInterval(pollStatus, 3000);

    return () => clearInterval(pollInterval);
  }, [analysisId, navigate, updateStagesFromWorkflow]);

  // Continue to Stage 2
  const handleContinueStage2 = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/analysis/${analysisId}/continue-stage2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to continue to Stage 2');
      
      setWorkflowState('stage2_pending');
      updateStagesFromWorkflow('stage2_pending');
      
      // Resume polling
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch(`${API_BASE}/analysis/${analysisId}/status`);
        const data = await statusRes.json();
        setWorkflowState(data.workflowState);
        updateStagesFromWorkflow(data.workflowState);
        
        if (data.workflowState === 'stage2_complete_awaiting_approval') {
          clearInterval(pollInterval);
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to continue');
    } finally {
      setLoading(false);
    }
  };

  // Continue to Stage 3
  const handleContinueStage3 = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/analysis/${analysisId}/continue-stage3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to continue to Stage 3');
      
      setWorkflowState('stage3_pending');
      updateStagesFromWorkflow('stage3_pending');
      
      // Resume polling
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch(`${API_BASE}/analysis/${analysisId}/status`);
        const data = await statusRes.json();
        setWorkflowState(data.workflowState);
        updateStagesFromWorkflow(data.workflowState);
        
        if (data.workflowState === 'all_complete') {
          clearInterval(pollInterval);
          setTimeout(() => {
            navigate('/app/dashboard', { state: { analysisId, activeTab: 'interview' } });
          }, 1500);
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
      const response = await fetch(`${API_BASE}/analysis/${analysisId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'pdf' }),
      });
      
      if (!response.ok) throw new Error('Failed to generate report');
      
      const data = await response.json();
      // In real implementation, poll for export completion then download
      console.log('Export initiated:', data);
      alert('Report download started! Check your downloads folder.');
    } catch (err: any) {
      setError(err.message || 'Failed to download report');
    }
  };

  // Go to dashboard
  const handleGoToDashboard = () => {
    navigate('/app/dashboard', { state: { analysisId } });
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

        {/* Progress bar only when processing */}
        {isProcessing && (
          <>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill"></div>
            </div>
            <div className="loading-hint">Results stream progressively — Stage 1 arrives first</div>
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
              <button
                className="btn-accent decision-btn primary"
                onClick={handleContinueStage3}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                {loading ? 'Starting...' : 'Start Interview Practice'}
              </button>
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

