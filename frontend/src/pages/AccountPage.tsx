import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserProfile } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface AccountData {
  email: string;
  displayName: string;
  subscription: {
    tier: string;
    status: string;
    analysisQuota: number;
    analysisUsed: number;
    resetAt?: string;
  };
  createdAt: string;
}

const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const data = await getUserProfile();
        setAccount({
          email: data.email,
          displayName: data.displayName,
          subscription: (data as any).subscription || {
            tier: 'free',
            status: 'active',
            analysisQuota: 10,
            analysisUsed: 0,
          },
          createdAt: data.createdAt,
        });
      } catch (err) {
        console.error('Failed to load account');
      } finally {
        setLoading(false);
      }
    };
    fetchAccount();
  }, []);

  const handleChangePassword = () => {
    // In real app, this would trigger Cognito change password flow
    alert('Change password flow would be triggered via Cognito');
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    // In real app, this would call a delete account endpoint
    alert('Account deletion would be processed');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="main page active account-page">
        <div className="account-inner">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            <div style={{ fontSize: '14px', color: 'var(--text2)' }}>Loading account...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!account) return null;

  const quotaPercent = (account.subscription.analysisUsed / account.subscription.analysisQuota) * 100;

  return (
    <div className="main page active account-page">
      <div className="account-inner">
        <div className="settings-header">
          <h1 className="settings-title">Account</h1>
          <p className="settings-subtitle">Your profile and subscription details</p>
        </div>

        {/* Profile Info */}
        <div className="settings-section">
          <div className="settings-section-title">Profile</div>
          <div className="account-info-grid">
            <div className="account-info-item">
              <div className="account-info-label">Email</div>
              <div className="account-info-value">{account.email}</div>
            </div>
            <div className="account-info-item">
              <div className="account-info-label">Display Name</div>
              <div className="account-info-value">{account.displayName}</div>
            </div>
            <div className="account-info-item">
              <div className="account-info-label">Member Since</div>
              <div className="account-info-value">{formatDate(account.createdAt)}</div>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div className="settings-section">
          <div className="settings-section-title">Subscription</div>
          <div className="account-sub-card">
            <div className="account-sub-header">
              <div className="account-sub-tier">
                <span className="account-tier-badge">{account.subscription.tier.toUpperCase()}</span>
                <span className={`account-status-dot ${account.subscription.status === 'active' ? 'active' : ''}`} />
                <span className="account-status-text">{account.subscription.status}</span>
              </div>
            </div>
            <div className="account-quota">
              <div className="account-quota-header">
                <span className="account-quota-label">Analysis Quota</span>
                <span className="account-quota-value">
                  {account.subscription.analysisUsed} / {account.subscription.analysisQuota}
                </span>
              </div>
              <div className="account-quota-bar">
                <div
                  className="account-quota-fill"
                  style={{ width: `${Math.min(quotaPercent, 100)}%` }}
                />
              </div>
              {account.subscription.resetAt && (
                <div className="account-quota-reset">
                  Resets {formatDate(account.subscription.resetAt)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="settings-section">
          <div className="settings-section-title">Security</div>
          <div className="account-actions">
            <button className="btn-outline-settings" onClick={handleChangePassword}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Change Password
            </button>
            <button className="btn-outline-settings" onClick={() => { logout(); navigate('/'); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="settings-section danger">
          <div className="settings-section-title" style={{ color: '#E74C3C' }}>Danger Zone</div>
          <p className="settings-hint" style={{ marginBottom: '12px' }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button className="btn-danger" onClick={() => setShowDeleteModal(true)}>
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete Account?</h3>
            <p className="modal-text">
              This will permanently delete your account, all analyses, interview sessions, and progress data. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDeleteAccount}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPage;
