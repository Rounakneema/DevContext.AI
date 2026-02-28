import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserStatsPanel from '../components/UserStatsPanel';
import { getUserStats, UserStats } from '../services/api';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const charCount = inputValue.length;
  const maxChars = 1000;
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
    fetchStats();
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
    setInputValue(text);
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      navigate('/app/loading', { state: { query: inputValue } });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const refreshPrompts = () => {
    // Visual feedback only - in real app would fetch new prompts
    console.log('Refreshing prompts...');
  };

  return (
    <div className="main page active home-page">
      <div className="home-inner">
        {/* User Stats */}
        {(statsLoading || stats) && (
          <UserStatsPanel
            stats={stats || { totalAnalyses: 0, averageCodeQuality: 0, totalInterviewSessions: 0, averageInterviewScore: 0, lastAnalysisDate: null, lastInterviewDate: null }}
            loading={statsLoading}
          />
        )}

        <div className="greeting">
          <h1>
            Hi there, <span className="name">Dev</span>
            <br />
            What repo should we analyse?
          </h1>
          <p>Use one of the common prompts below or paste your own GitHub URL to begin</p>
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

        <div className="refresh-row" onClick={refreshPrompts}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
          </svg>
          Refresh Prompts
        </div>

        <div className="chat-input-box">
          <div className="chat-input-top">
            <textarea
              className="chat-textarea"
              rows={2}
              placeholder="Paste a GitHub URL or ask anything about your project..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="web-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              All Web
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
              <button className="input-action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Add Attachment
              </button>
              <button className="input-action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Use Image
              </button>
            </div>
            <div className="input-right">
              <span className="char-count">
                {charCount}/{maxChars}
              </span>
              <button className="send-btn" onClick={handleSend} disabled={!inputValue.trim()}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
