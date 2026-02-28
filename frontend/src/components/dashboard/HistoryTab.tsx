import React, { useState, useEffect } from "react";
import { getAnalyses, getUserProgress, UserProgress } from "../../services/api";
import SkillProgressionPanel from "./SkillProgressionPanel";

interface AnalysisItem {
  analysisId: string;
  repositoryUrl: string;
  repositoryName?: string;
  status: string;
  createdAt: string;
}

const HistoryTab: React.FC = () => {
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analysesRes, progressRes] = await Promise.all([
          getAnalyses(),
          getUserProgress(),
        ]);
        // Handle both array and paginated responses
        const items = Array.isArray(analysesRes)
          ? analysesRes
          : (analysesRes as any).items || [];
        setAnalyses(items);
        setProgress(progressRes);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getRepoName = (item: AnalysisItem) => {
    if (item.repositoryName) return item.repositoryName;
    const parts = item.repositoryUrl.split('/');
    return parts[parts.length - 1] || item.repositoryUrl;
  };

  if (loading) {
    return (
      <>
        <div className="view-title">Analysis History</div>
        <div className="view-sub">Loading...</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '14px 18px',
                height: '60px',
              }}
              className="skeleton"
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="view-title">Analysis History</div>
      <div className="view-sub">
        Previous repository analyses and interview sessions.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {analyses.map((item) => (
          <div
            key={item.analysisId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 18px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                flexShrink: 0,
              }}
            >
              📁
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "13.5px",
                  fontWeight: "600",
                  marginBottom: "2px",
                }}
              >
                {getRepoName(item)}
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text3)" }}>
                {item.status} · {formatDate(item.createdAt)}
              </div>
            </div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: "500",
                color: item.status === 'completed' ? '#27AE60' : '#E67E22',
                background: item.status === 'completed' ? '#E8F8F0' : '#FEF3DC',
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              {item.status}
            </div>
          </div>
        ))}
        {analyses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: '13px' }}>
            No analyses yet. Start by analyzing a repository.
          </div>
        )}
      </div>

      {/* Skill Progression */}
      {progress && (
        <div style={{ marginTop: '14px' }}>
          <SkillProgressionPanel progress={progress} />
        </div>
      )}
    </>
  );
};

export default HistoryTab;

