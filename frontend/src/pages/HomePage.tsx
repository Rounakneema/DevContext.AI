import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UserStatsPanel from '../components/UserStatsPanel';
import api, { getUserStats, UserStats, getUserProfile } from '../services/api';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inputValue, setInputValue] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inProgressAnalysis, setInProgressAnalysis] = useState<any>(null);
  const [checkingInProgress, setCheckingInProgress] = useState(true);
  const charCount = inputValue.length;
  const maxChars = 500;
  const [displayName, setDisplayName] = useState('Dev');

  // Check if repo URL was passed from landing page
  useEffect(() => {
    const repoParam = searchParams.get('repo');
    if (repoParam) {
      setInputValue(repoParam);
    }
  }, [searchParams]);

  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getUserStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    const fetchProfile = async () => {
      try {
        const profile = await getUserProfile();
        if (profile.displayName) setDisplayName(profile.displayName);
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };
    fetchStats();
    fetchProfile();
  }, []);

  // Check for in-progress analysis on mount
  useEffect(() => {
    const checkInProgressAnalysis = async () => {
      try {
        const response = await api.getAnalyses();
        const inProgress = response.items.find((a: any) =>
          a.status === 'in_progress' ||
          a.status === 'processing' ||
          a.status === 'pending'
        );

        if (inProgress) {
          setInProgressAnalysis(inProgress);
        }
      } catch (err) {
        console.error('Failed to check in-progress analysis:', err);
      } finally {
        setCheckingInProgress(false);
      }
    };

    checkInProgressAnalysis();
  }, []);

  const promptSuggestions = [
    {
      text: 'Analyse architecture & design decisions',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      text: 'Review code quality & suggest improvements',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
    },
    {
      text: 'Generate interview questions for this project',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
    {
      text: 'Check commit authenticity & originality score',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
  ];

  const handlePromptClick = (text: string) => {
    // Prompts are descriptive text — just set as placeholder hint, not as URL
    setInputValue('');
    setUrlError('');
  };

  const validateGitHubUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return 'Please enter a GitHub repository URL.';
    // Accept: https://github.com/owner/repo or github.com/owner/repo
    const githubPattern = /^(https?:\/\/)?(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\/?.*)?$/i;
    if (!githubPattern.test(trimmed)) {
      return 'Please enter a valid GitHub URL (e.g. https://github.com/owner/repository)';
    }
    return '';
  };

  const handleSend = async () => {
    const error = validateGitHubUrl(inputValue);
    if (error) {
      setUrlError(error);
      return;
    }
    setUrlError('');
    setIsSubmitting(true);
    try {
      const result = await api.startAnalysis(inputValue.trim());
      navigate('/app/loading', {
        state: {
          query: inputValue.trim(),
          analysisId: result.analysisId
        }
      });
    } catch (error: any) {
      console.error('Failed to start analysis:', error);
      setUrlError(error?.message || 'Failed to start analysis. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (urlError) setUrlError(''); // clear error on edit
  };



  return (
    <div className="main page active home-page">
      <div className="home-inner">
        {/* In-Progress Analysis Banner */}
        {inProgressAnalysis && !checkingInProgress && (
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                  Analysis in Progress
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '12px' }}>
                  {inProgressAnalysis.repositoryUrl || 'Repository analysis'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={async () => {
                  try {
                    await api.deleteAnalysis(inProgressAnalysis.analysisId);
                    setInProgressAnalysis(null);
                    alert('Analysis cancelled successfully');
                  } catch (err) {
                    console.error('Failed to cancel analysis:', err);
                    alert('Failed to cancel analysis. Please try again.');
                  }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => navigate('/app/loading', {
                  state: {
                    analysisId: inProgressAnalysis.analysisId,
                    query: inProgressAnalysis.repositoryUrl
                  }
                })}
                style={{
                  background: 'white',
                  color: '#667eea',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Resume Analysis
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* User Stats */}
        {(statsLoading || stats) && (
          <UserStatsPanel
            stats={stats || { totalAnalyses: 0, completedAnalyses: 0, averageCodeQuality: 0, totalInterviewSessions: 0, averageInterviewScore: 0, lastAnalysisDate: null, lastInterviewDate: null }}
            loading={statsLoading}
          />
        )}

        <div className="greeting">
          <h1>
            Hi there, <span className="name">{displayName}</span>
            <br />
            What repo should we analyse?
          </h1>
          <p>Explore one of our many use cases below, paste your GitHub repo URL to begin</p>
        </div>

        <div className="prompt-cards">
          {promptSuggestions.map((prompt, index) => (
            <div
              key={index}
              className="prompt-card"
              onClick={() => handlePromptClick(prompt.text)}
            >
              <div className="prompt-card-text">{prompt.text}</div>
              <div className="prompt-card-icon">{prompt.icon}</div>
            </div>
          ))}
        </div>

        <div className="refresh-row" onClick={() => navigate('/app/dashboard/history')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15 15" />
          </svg>
          See recent analyses →
        </div>

        <div className="chat-input-box">
          <div className="chat-input-top">
            <textarea
              className="chat-textarea"
              rows={2}
              placeholder="Paste a GitHub URL (e.g. https://github.com/owner/repo)"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              style={urlError ? { borderColor: 'var(--error, #E74C3C)' } : {}}
            />
            {urlError && (
              <div style={{
                fontSize: '12px',
                color: 'var(--error, #E74C3C)',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {urlError}
              </div>
            )}
            <div className="web-badge" style={{ opacity: 0.5, pointerEvents: 'none', cursor: 'default' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: '14px', height: '14px' }}>
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              Mistral AI Large 3
              <svg
                viewBox="0 0 10 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{ width: '9px', height: '9px' }}
              >
                <path d="M1 1l4 4 4-4" />
              </svg>
            </div>
          </div>
          <div className="chat-input-bottom">
            <div className="input-actions">
            </div>
            <div className="input-right">
              <span className="char-count">
                {charCount}/{maxChars}
              </span>
              <button className="send-btn" onClick={handleSend} disabled={!inputValue.trim() || isSubmitting}>
                {isSubmitting ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
