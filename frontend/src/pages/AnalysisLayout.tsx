import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Outlet, useParams } from "react-router-dom";
import FileExplorer from "../components/dashboard/FileExplorer";
import api from "../services/api";

type Tab = "overview" | "architecture" | "code-review" | "intelligence" | "interview-prep" | "interview" | "history" | "framework";

interface AnalysisSummary {
  analysisId: string;
  repositoryUrl: string;
  repositoryName?: string;
  status: string;
  createdAt: string;
}

const getRepoName = (item: AnalysisSummary) => {
  if (item.repositoryName) return item.repositoryName;
  const parts = item.repositoryUrl?.split('/') || [];
  return parts[parts.length - 1] || 'Unknown';
};

const AnalysisLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  // Robust analysisId derivation: check params first, then fallback to URL parsing
  // This ensures the parent layout can see IDs from child routes reliably across different RRD versions
  const analysisId = id || (location.pathname.startsWith('/app/dashboard/') ? location.pathname.split('/')[3] : undefined);

  // Calculate active tab based on path
  const pathParts = location.pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  const activeTab = ["history", "framework", "overview", "architecture", "code-review", "intelligence", "interview-prep", "interview"].includes(lastPart)
    ? lastPart as Tab
    : "overview";

  // Analysis selector state
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false); // Restored as it's fully used
  const [loadingAnalyses, setLoadingAnalyses] = useState(false); // Restored as it's fully used
  const selectorRef = useRef<HTMLDivElement>(null);

  const [showSelectPrompt] = useState(false);
  // promptTimerRef removed as it was unused per ESLint

  const currentAnalysis = analyses.find(a => a.analysisId === analysisId);

  useEffect(() => {
    const fetchAnalyses = async () => {
      setLoadingAnalyses(true);
      try {
        const res = await api.getAnalyses();
        const items: AnalysisSummary[] = Array.isArray(res)
          ? res
          : (res as any).items || [];
        setAnalyses(items);
        // Auto-select first completed analysis if no id in URL and we are not on a global page
        if (!analysisId && items.length > 0 && activeTab !== "history" && activeTab !== "framework") {
          const first = items.find(a => a.status === 'completed') || items[0];
          navigate(`/app/dashboard/${first.analysisId}/overview`, { replace: true });
        }
      } catch (e) {
        console.error('Failed to load analyses:', e);
      } finally {
        setLoadingAnalyses(false);
      }
    };
    fetchAnalyses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close selector when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const switchAnalysis = (newId: string) => {
    navigate(`/app/dashboard/${newId}/${activeTab === 'history' || activeTab === 'framework' ? 'overview' : activeTab}`);
    setSelectorOpen(false);
  };

  const tabs = [
    {
      id: "overview" as Tab,
      label: "Career Impact",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
    {
      id: "architecture" as Tab,
      label: "Architecture",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      id: "code-review" as Tab,
      label: "Project Review",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
    },
    {
      id: "intelligence" as Tab,
      label: "Intelligence Report",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      id: "interview-prep" as Tab,
      label: "Interview Prep",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      id: "interview" as Tab,
      label: "Mock Interview",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: "history" as Tab,
      label: "History",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 15" />
        </svg>
      ),
    },
    {
      id: "framework" as Tab,
      label: "How We Score",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      ),
    },
  ];

  const practiceTabIds = ["interview", "history"];
  const metaTabIds = ["framework"];

  const handleTabClick = (tabId: Tab) => {
    if (tabId === 'history') {
      navigate('/app/dashboard/history');
    } else if (tabId === 'framework') {
      navigate('/app/dashboard/framework');
    } else if (tabId === 'interview' && analysisId) {
      navigate(`/app/interview/${analysisId}`);
    } else if (analysisId) {
      navigate(`/app/dashboard/${analysisId}/${tabId}`);
    }
  };

  return (
    <div className="dashboard-page">
      {/* Dash Sidebar */}
      <div className="dash-sidebar">

        {/* Analysis Selector Dropdown */}
        <div className="dash-sidebar-repo" ref={selectorRef} style={{ position: 'relative' }}>
          <div
            className="repo-badge"
            onClick={() => setSelectorOpen(o => !o)}
            style={{ cursor: 'pointer', userSelect: 'none', width: '100%', justifyContent: 'space-between' }}
            title="Switch analysis"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                {loadingAnalyses ? 'Loading...' : currentAnalysis ? getRepoName(currentAnalysis) : 'Select analysis'}
              </span>
            </span>
            <svg width="10" height="10" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
              style={{ transform: selectorOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
              <path d="M1 1l4 4 4-4" />
            </svg>
          </div>

          {/* Dropdown panel */}
          {selectorOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 100,
              maxHeight: '280px',
              overflowY: 'auto',
              padding: '4px',
            }}>
              {analyses.length === 0 && (
                <div style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text3)', textAlign: 'center' }}>
                  No analyses yet
                </div>
              )}
              {analyses.map(a => (
                <div
                  key={a.analysisId}
                  onClick={() => switchAnalysis(a.analysisId)}
                  style={{
                    padding: '9px 12px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    background: a.analysisId === analysisId ? 'var(--surface2)' : 'transparent',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = a.analysisId === analysisId ? 'var(--surface2)' : 'transparent'; }}
                >
                  <div style={{ fontSize: '12.5px', fontWeight: 600, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getRepoName(a)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                    {a.status} · {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '4px' }}>
                <div
                  onClick={() => { setSelectorOpen(false); navigate('/app'); }}
                  style={{ padding: '8px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Analysis
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ds-section-label">Analysis</div>
        {tabs
          .filter((tab) => !practiceTabIds.includes(tab.id) && !metaTabIds.includes(tab.id))
          .map((tab) => (
            <div
              key={tab.id}
              className={`ds-nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => handleTabClick(tab.id as Tab)}
            >
              {tab.icon}
              {tab.label}
            </div>
          ))}

        {showSelectPrompt && (
          <div style={{
            margin: '4px 12px 8px', padding: '10px 12px', borderRadius: 10,
            background: 'rgba(124,92,219,0.08)', border: '1px solid rgba(124,92,219,0.25)',
            fontSize: 11, fontWeight: 600, color: '#7C5CDB', lineHeight: 1.5,
            animation: 'fadeIn 0.2s ease',
          }}>
            Select an analysis from History or the dropdown above to view this page
          </div>
        )}

        <div className="ds-section-label">Practice</div>
        {tabs
          .filter((tab) => practiceTabIds.includes(tab.id))
          .map((tab) => (
            <div
              key={tab.id}
              className={`ds-nav-item ${activeTab === tab.id ? "active" : ""}${tab.id === 'history' && showSelectPrompt ? ' prompt-pulse' : ''}`}
              onClick={() => handleTabClick(tab.id as Tab)}
            >
              {tab.icon}
              {tab.label}
            </div>
          ))}

        <div className="ds-spacer" />

        {/* How We Score — bottom of sidebar */}
        {tabs
          .filter(tab => metaTabIds.includes(tab.id))
          .map(tab => (
            <div
              key={tab.id}
              className={`ds-nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => handleTabClick(tab.id as Tab)}
              style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '4px' }}
            >
              {tab.icon}
              {tab.label}
            </div>
          ))}

        <div style={{ padding: "0 12px 8px" }}>
          <button className="ds-new-btn" onClick={() => navigate("/app")}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Analysis
          </button>
        </div>
      </div>

      {/* File Explorer - Show only for Analysis tabs */}
      {!practiceTabIds.includes(activeTab) && analysisId && (
        <FileExplorer
          analysisId={analysisId}
          readOnly={true}
          onSelectionChange={(files) => {
            console.log("Selected files for analysis:", files);
          }}
        />
      )}

      {/* Dash Main Content - Routed dynamically by Outlet! */}
      <div className="dash-main">
        <div className="tab-view active">
          <Outlet context={{ analysisId }} />
        </div>
      </div>
    </div>
  );
};

export default AnalysisLayout;
