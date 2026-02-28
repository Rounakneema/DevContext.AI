import React from 'react';
import { UserStats } from '../services/api';

interface UserStatsPanelProps {
  stats: UserStats;
  loading?: boolean;
}

const UserStatsPanel: React.FC<UserStatsPanelProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="stats-panel loading">
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card skeleton">
              <div className="skeleton-text" style={{ width: '60%', height: '24px' }} />
              <div className="skeleton-text" style={{ width: '80%', height: '12px', marginTop: '8px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#27AE60';
    if (score >= 60) return '#E67E22';
    return '#E74C3C';
  };

  return (
    <div className="stats-panel">
      <div className="stats-grid">
        {/* Total Analyses */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalAnalyses}</div>
            <div className="stat-label">Projects Analyzed</div>
            <div className="stat-sub">Last: {formatDate(stats.lastAnalysisDate)}</div>
          </div>
        </div>

        {/* Code Quality Score */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#F4FCF8', color: getScoreColor(stats.averageCodeQuality) }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value" style={{ color: getScoreColor(stats.averageCodeQuality) }}>
              {stats.averageCodeQuality}%
            </div>
            <div className="stat-label">Avg. Code Quality</div>
            <div className="stat-progress">
              <div 
                className="stat-progress-bar" 
                style={{ 
                  width: `${stats.averageCodeQuality}%`,
                  background: getScoreColor(stats.averageCodeQuality)
                }} 
              />
            </div>
          </div>
        </div>

        {/* Interview Sessions */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EBF5FB', color: '#3498DB' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalInterviewSessions}</div>
            <div className="stat-label">Interview Sessions</div>
            <div className="stat-sub">Last: {formatDate(stats.lastInterviewDate)}</div>
          </div>
        </div>

        {/* Interview Score */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF8F0', color: getScoreColor(stats.averageInterviewScore) }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value" style={{ color: getScoreColor(stats.averageInterviewScore) }}>
              {stats.averageInterviewScore}%
            </div>
            <div className="stat-label">Avg. Interview Score</div>
            <div className="stat-progress">
              <div 
                className="stat-progress-bar" 
                style={{ 
                  width: `${stats.averageInterviewScore}%`,
                  background: getScoreColor(stats.averageInterviewScore)
                }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserStatsPanel;
