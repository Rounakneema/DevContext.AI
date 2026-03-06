import React, { useState, useEffect } from 'react';
import { getUserProfile, updateUserPreferences } from '../services/api';

interface ProfileData {
  targetRole: string;
  language: string;
  notifications: boolean;
  emailDigest: boolean;
}

const S = {
  page: { padding: '0' } as React.CSSProperties,
  inner: { width: '60%', padding: '32px 48px', boxSizing: 'border-box' as const, margin: '0 auto'} as React.CSSProperties,
  header: { marginBottom: 32 } as React.CSSProperties,
  h1: { fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5, marginBottom: 4 } as React.CSSProperties,
  sub: { fontSize: 14, color: 'var(--text2)' } as React.CSSProperties,
  section: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 16, overflow: 'hidden' } as React.CSSProperties,
  sectionHeader: { padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase' as const, letterSpacing: 0.6 },
  field: { padding: '18px 20px', borderBottom: '1px solid var(--border)' } as React.CSSProperties,
  label: { fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4, display: 'block' } as React.CSSProperties,
  hint: { fontSize: 12, color: 'var(--text3)', marginBottom: 12 } as React.CSSProperties,
  select: { background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 8, padding: '10px 14px', fontFamily: 'Geist, sans-serif', fontSize: 13, color: 'var(--text)', width: '100%', outline: 'none', cursor: 'pointer', colorScheme: 'light' } as React.CSSProperties,
  toggleRow: { padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 } as React.CSSProperties,
  saveBtn: { background: 'var(--accent)', border: 'none', borderRadius: 10, padding: '12px 28px', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', transition: 'all 0.15s' } as React.CSSProperties,
  toast: (type: 'success' | 'error'): React.CSSProperties => ({
    background: type === 'success' ? 'var(--success-light)' : 'var(--danger-light)',
    border: `1px solid ${type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
    borderRadius: 10, padding: '12px 16px', fontSize: 13,
    color: type === 'success' ? 'var(--success)' : 'var(--danger)',
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
  }),
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
    <div onClick={() => onChange(!checked)} style={{
      width: 46, height: 26, borderRadius: 13, background: checked ? 'var(--accent)' : 'var(--border2)',
      border: `1px solid ${checked ? 'var(--accent)' : 'var(--border2)'}`,
      position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
    }}>
      <div style={{
        position: 'absolute', width: 20, height: 20, borderRadius: 10, background: '#fff',
        top: 2, left: checked ? 22 : 2, transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  </label>
);

const SettingsPage: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData>({ targetRole: 'Full Stack Developer', language: 'en', notifications: true, emailDigest: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserProfile().then(data => {
      setProfile({
        targetRole: data.targetRole || 'Full Stack Developer',
        language: (data as any).language || 'en',
        notifications: (data as any).preferences?.notifications ?? true,
        emailDigest: (data as any).preferences?.emailDigest ?? false,
      });
    }).catch(() => setError('Failed to load profile')).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      await updateUserPreferences({ targetRole: profile.targetRole, language: profile.language as any, emailNotifications: profile.notifications, emailDigest: profile.emailDigest });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError('Failed to save preferences.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="main page active" style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', fontFamily: 'Geist, sans-serif' }}>
      <div style={S.inner}>
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: 100 }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--accent-light)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
            <div style={{ color: 'var(--text3)', fontSize: 14 }}>Loading settings…</div>
          </div>
        ) : (
          <>
            <div style={S.header}>
              <h1 style={S.h1}>Settings</h1>
              <p style={S.sub}>Manage your preferences and configuration</p>
            </div>

            {saved && (
              <div style={S.toast('success')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                Settings saved successfully
              </div>
            )}
            {error && <div style={S.toast('error')}>{error}</div>}

            {/* Interview Preferences */}
            <div style={S.section}>
              <div style={S.sectionHeader}>Interview Preferences</div>
              <div style={S.field}>
                <label style={S.label}>Target Role</label>
                <p style={S.hint}>Questions will be calibrated to this role and experience level</p>
                <select style={S.select} value={profile.targetRole} onChange={e => setProfile(p => ({ ...p, targetRole: e.target.value }))}>
                  {['Junior SDE', 'Mid-Level SDE', 'Senior SDE', 'Full Stack Developer', 'Backend Developer', 'DevOps Engineer', 'Data Engineer', 'ML Engineer'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ ...S.field, borderBottom: 'none' }}>
                <label style={S.label}>Preferred Language</label>
                <p style={S.hint}>Language for analysis reports and AI feedback</p>
                <select style={S.select} value={profile.language} onChange={e => setProfile(p => ({ ...p, language: e.target.value }))}>
                  <option value="en">English</option>
                  <option value="hinglish">Hinglish</option>
                </select>
              </div>
            </div>

            {/* Notifications */}
            <div style={S.section}>
              <div style={S.sectionHeader}>Notifications</div>
              <div style={S.toggleRow}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>Analysis Complete Alerts</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Get notified when your analysis finishes</div>
                </div>
                <Toggle checked={profile.notifications} onChange={v => setProfile(p => ({ ...p, notifications: v }))} />
              </div>
              <div style={{ ...S.toggleRow, borderBottom: 'none' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>Weekly Progress Digest</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>Email summary of your interview performance</div>
                </div>
                <Toggle checked={profile.emailDigest} onChange={v => setProfile(p => ({ ...p, emailDigest: v }))} />
              </div>
            </div>

            {/* AI Model */}
            <div style={{ ...S.section, opacity: 0.6 }}>
              <div style={S.sectionHeader}>AI Model</div>
              <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>🌪️ Mistral Large 3</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>128K context · $0.50 input / $1.50 output per 1M tokens</div>
                </div>
                <div style={{ fontSize: 11, background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 6, padding: '4px 10px', fontWeight: 600 }}>Active</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
              <button onClick={handleSave} disabled={saving} style={{ ...S.saveBtn, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
