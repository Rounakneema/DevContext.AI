import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import OverviewTab from "../components/dashboard/OverviewTab";
import ReviewTab from "../components/dashboard/ReviewTab";
import ReportTab from "../components/dashboard/ReportTab";
import InterviewTab from "../components/dashboard/InterviewTab";
import HistoryTab from "../components/dashboard/HistoryTab";
import FileExplorer from "../components/dashboard/FileExplorer";
import api from "../services/api";

type Tab = "overview" | "review" | "report" | "interview" | "history";

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

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get("tab") as Tab) || "overview",
  );
  const analysisId = searchParams.get("id") || undefined;

  // Analysis selector state
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

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
        // Auto-select first completed analysis if no id in URL
        if (!analysisId && items.length > 0) {
          const first = items.find(a => a.status === 'completed') || items[0];
          setSearchParams({ id: first.analysisId, tab: activeTab });
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

  const switchAnalysis = (id: string) => {
    setSearchParams({ id, tab: activeTab });
    setSelectorOpen(false);
  };

  const tabs = [
    {
      id: "overview" as Tab,
      label: "Overview",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      id: "review" as Tab,
      label: "Project Review",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      id: "report" as Tab,
      label: "Intelligence Report",
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
  ];

  const practiceTabIds = ["interview", "history"];

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
          .filter((tab) => !practiceTabIds.includes(tab.id))
          .map((tab) => (
            <div
              key={tab.id}
              className={`ds-nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </div>
          ))}

        <div className="ds-section-label">Practice</div>
        {tabs
          .filter((tab) => practiceTabIds.includes(tab.id))
          .map((tab) => (
            <div
              key={tab.id}
              className={`ds-nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </div>
          ))}

        <div className="ds-spacer"></div>

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
          onSelectionChange={(files) => {
            console.log("Selected files for analysis:", files);
          }}
        />
      )}

      {/* Dash Main Content */}
      <div className="dash-main">
        <div className={`tab-view ${activeTab === "overview" ? "active" : ""}`}>
          {analysisId ? <OverviewTab analysisId={analysisId} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px', color: 'var(--text3)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.4 }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <div style={{ fontSize: '14px' }}>Select an analysis from the sidebar dropdown to get started</div>
            </div>
          )}
        </div>
        <div className={`tab-view ${activeTab === "review" ? "active" : ""}`}>
          {analysisId ? <ReviewTab analysisId={analysisId} /> : <div />}
        </div>
        <div className={`tab-view ${activeTab === "report" ? "active" : ""}`}>
          {analysisId ? <ReportTab analysisId={analysisId} /> : <div />}
        </div>
        <div className={`tab-view ${activeTab === "interview" ? "active" : ""}`}>
          <InterviewTab analysisId={analysisId} />
        </div>
        <div className={`tab-view ${activeTab === "history" ? "active" : ""}`}>
          <HistoryTab />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
