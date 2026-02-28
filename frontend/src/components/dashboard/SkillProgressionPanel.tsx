import React from 'react';
import { UserProgress } from '../../services/api';

interface SkillProgressionPanelProps {
  progress: UserProgress;
}

const SkillProgressionPanel: React.FC<SkillProgressionPanelProps> = ({ progress }) => {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return { icon: '↑', color: '#27AE60', bg: '#E8F8F0' };
      case 'declining': return { icon: '↓', color: '#E74C3C', bg: '#FDECEC' };
      default: return { icon: '→', color: '#E67E22', bg: '#FEF3DC' };
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: '#FDECEC', color: '#E74C3C' };
      case 'medium': return { bg: '#FEF3DC', color: '#A06000' };
      default: return { bg: '#E8F8F0', color: '#27AE60' };
    }
  };

  const categories = Object.entries(progress.categoryPerformance).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    ...val,
  }));

  return (
    <>
      {/* Category Performance */}
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Category Performance</div>
          <div className="chip green">Tracked</div>
        </div>
        <div className="panel-body">
          <div className="skill-categories">
            {categories.map((cat) => {
              const trend = getTrendIcon(cat.trend);
              return (
                <div key={cat.name} className="skill-cat-row">
                  <div className="skill-cat-info">
                    <span className="skill-cat-name">{cat.name}</span>
                    <span
                      className="skill-cat-trend"
                      style={{ background: trend.bg, color: trend.color }}
                    >
                      {trend.icon} {cat.trend}
                    </span>
                  </div>
                  <div className="skill-cat-bar-wrap">
                    <div className="skill-cat-bar">
                      <div
                        className="skill-cat-bar-fill"
                        style={{
                          width: `${cat.averageScore}%`,
                          background: cat.averageScore >= 75 ? '#27AE60' : '#E67E22',
                        }}
                      />
                    </div>
                    <span className="skill-cat-score">{cat.averageScore}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Skill Gaps */}
      {progress.identifiedSkillGaps.length > 0 && (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Skill Gaps</div>
            <div className="chip amber">{progress.identifiedSkillGaps.length} identified</div>
          </div>
          <div className="panel-body">
            <div className="skill-gaps">
              {progress.identifiedSkillGaps.map((gap) => {
                const priority = getPriorityStyle(gap.priority);
                return (
                  <div key={gap.skill} className="skill-gap-card">
                    <div className="skill-gap-header">
                      <span className="skill-gap-name">{gap.skill}</span>
                      <span className="skill-gap-priority" style={{ background: priority.bg, color: priority.color }}>
                        {gap.priority}
                      </span>
                    </div>
                    <div className="skill-gap-bars">
                      <div className="skill-gap-bar-row">
                        <span className="skill-gap-bar-label">Current</span>
                        <div className="skill-gap-bar">
                          <div className="skill-gap-bar-fill current" style={{ width: `${gap.currentLevel}%` }} />
                        </div>
                        <span className="skill-gap-bar-val">{gap.currentLevel}</span>
                      </div>
                      <div className="skill-gap-bar-row">
                        <span className="skill-gap-bar-label">Target</span>
                        <div className="skill-gap-bar">
                          <div className="skill-gap-bar-fill target" style={{ width: `${gap.targetLevel}%` }} />
                        </div>
                        <span className="skill-gap-bar-val">{gap.targetLevel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recommended Topics */}
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Recommended Topics</div>
        </div>
        <div className="panel-body">
          <div className="tag-row">
            {progress.recommendedTopics.map((topic) => (
              <span key={topic} className="tag tech">{topic}</span>
            ))}
          </div>
          {progress.completedTopics.length > 0 && (
            <>
              <div style={{ fontSize: '11px', color: 'var(--text3)', margin: '12px 0 6px', fontWeight: '500' }}>
                Completed
              </div>
              <div className="tag-row">
                {progress.completedTopics.map((topic) => (
                  <span key={topic} className="tag" style={{ background: '#E8F8F0', color: '#27AE60' }}>
                    ✓ {topic}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default SkillProgressionPanel;
