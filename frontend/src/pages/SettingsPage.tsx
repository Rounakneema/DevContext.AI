import React, { useState, useEffect } from 'react';
import { getUserProfile, updateUserPreferences } from '../services/api';

interface ProfileData {
  targetRole: string;
  language: string;
  notifications: boolean;
  emailDigest: boolean;
}

const SettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData>({
    targetRole: 'Full Stack Developer',
    language: 'en',
    notifications: true,
    emailDigest: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getUserProfile();
        setProfile({
          targetRole: data.targetRole || 'Full Stack Developer',
          language: (data as any).language || 'en',
          notifications: (data as any).preferences?.notifications ?? true,
          emailDigest: (data as any).preferences?.emailDigest ?? false,
        });
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateUserPreferences({
        targetRole: profile.targetRole,
        preferredLanguage: profile.language as any,
        emailNotifications: profile.notifications,
        emailDigest: profile.emailDigest,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="main page active settings-page">
        <div className="settings-inner">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
            <div style={{ fontSize: '14px', color: 'var(--text2)' }}>Loading settings...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main page active settings-page">
      <div className="settings-inner">
        <div className="settings-header">
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Manage your preferences and configuration</p>
        </div>

        {saved && (
          <div className="settings-toast success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Preferences saved successfully
          </div>
        )}

        {error && (
          <div className="settings-toast error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        {/* Target Role */}
        <div className="settings-section">
          <div className="settings-section-title">Interview Preferences</div>
          <div className="settings-field">
            <label className="settings-label">Target Role</label>
            <p className="settings-hint">Questions will be tailored to this role level</p>
            <select
              className="settings-select"
              value={profile.targetRole}
              onChange={(e) => setProfile({ ...profile, targetRole: e.target.value })}
            >
              <option>Junior SDE</option>
              <option>Mid-Level SDE</option>
              <option>Senior SDE</option>
              <option>Full Stack Developer</option>
              <option>Backend Developer</option>
              <option>DevOps Engineer</option>
              <option>Data Engineer</option>
            </select>
          </div>

          <div className="settings-field">
            <label className="settings-label">Preferred Language</label>
            <p className="settings-hint">Language for analysis reports and feedback</p>
            <select
              className="settings-select"
              value={profile.language}
              onChange={(e) => setProfile({ ...profile, language: e.target.value })}
            >
              <option value="en">English</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-section">
          <div className="settings-section-title">Notifications</div>
          <div className="settings-toggle-row">
            <div>
              <div className="settings-label">Push Notifications</div>
              <div className="settings-hint">Get notified when analysis completes</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={profile.notifications}
                onChange={(e) => setProfile({ ...profile, notifications: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="settings-toggle-row">
            <div>
              <div className="settings-label">Email Digest</div>
              <div className="settings-hint">Weekly summary of your progress</div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={profile.emailDigest}
                onChange={(e) => setProfile({ ...profile, emailDigest: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>

        <div className="settings-actions">
          <button className="btn-accent" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
