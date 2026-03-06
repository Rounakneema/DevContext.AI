import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserProfile } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface AccountData {
  email: string;
  displayName: string;
  subscription: { tier: string; status: string; analysisQuota: number; analysisUsed: number; resetAt?: string; };
  createdAt: string;
}

const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [passNote, setPassNote] = useState(false);

  useEffect(() => {
    getUserProfile().then(data => setAccount({
      email: data.email,
      displayName: data.displayName,
      subscription: (data as any).subscription || { tier: 'free', status: 'active', analysisQuota: 10, analysisUsed: 0 },
      createdAt: data.createdAt,
    })).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => { setLoggingOut(true); try { await logout(); navigate('/', { replace: true }); } catch { setLoggingOut(false); } };
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await fetch(`${process.env.REACT_APP_API_ENDPOINT || 'https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod'}/user/account`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
      await logout(); navigate('/', { replace: true });
    } catch { setDeleting(false); setShowDelete(false); }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const card: React.CSSProperties = { background: '#ffffff', border: '1px solid #e0dfe3', borderRadius: 14, marginBottom: 16, overflow: 'hidden' };
  const sh: React.CSSProperties = { padding: '16px 20px', borderBottom: '1px solid #e0dfe3', fontSize: 13, fontWeight: 700, color: '#6b6b6b', textTransform: 'uppercase', letterSpacing: 0.6 };
  const lbl: React.CSSProperties = { fontSize: 12, color: '#ababab', fontWeight: 500, marginBottom: 4 };
  const val: React.CSSProperties = { fontSize: 14, color: '#1a1a1a', fontWeight: 600 };
  const outBtn: React.CSSProperties = { background: '#f5f5f4', border: '1px solid #e0dfe3', borderRadius: 9, padding: '10px 16px', color: '#1a1a1a', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' };

  if (loading) return (
    <div className="main page active" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(124,92,219,0.2)', borderTopColor: '#7C5CDB', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: '#6b6b6b', fontSize: 14 }}>Loading account…</div>
      </div>
    </div>
  );

  if (!account) return null;

  const quota = account.subscription;
  const pct = Math.min((quota.analysisUsed / quota.analysisQuota) * 100, 100);
  const initials = (account.displayName || account.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="main page active" style={{ background: 'var(--bg)', minHeight: '100vh', color: '#1a1a1a', fontFamily: 'Geist, sans-serif', padding: 0 }}>
      <div style={{ width: '60%', margin: '0 auto', padding: '32px 48px', boxSizing: 'border-box' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a', letterSpacing: -0.5, marginBottom: 4 }}>Account</h1>
          <p style={{ fontSize: 14, color: '#6b6b6b' }}>Your profile, subscription, and security settings</p>
        </div>

        {/* Profile Card */}
        <div style={card}>
          <div style={sh}>Profile</div>
          <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 20, borderBottom: '1px solid #e0dfe3' }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg, #7C5CDB, #5a3db5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>{account.displayName || 'Developer'}</div>
              <div style={{ fontSize: 13, color: '#6b6b6b' }}>{account.email}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
            {[['Email', account.email], ['Member Since', fmt(account.createdAt)], ['Tier', quota.tier.toUpperCase()]].map(([l, v], i) => (
              <div key={i} style={{ padding: '16px 20px', borderRight: i < 2 ? '1px solid #e0dfe3' : 'none' }}>
                <div style={lbl}>{l}</div>
                <div style={val}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription */}
        <div style={card}>
          <div style={sh}>Subscription</div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ background: 'rgba(124,92,219,0.12)', color: '#7C5CDB', borderRadius: 8, padding: '5px 14px', fontSize: 13, fontWeight: 700, letterSpacing: 0.5 }}>{quota.tier.toUpperCase()}</span>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: quota.status === 'active' ? '#27ae60' : '#e74c3c', boxShadow: `0 0 8px ${quota.status === 'active' ? '#27ae60' : '#e74c3c'}` }} />
                <span style={{ fontSize: 13, color: '#6b6b6b', textTransform: 'capitalize' }}>{quota.status}</span>
              </div>
            </div>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b6b6b' }}>
              <span>Analysis quota used</span>
              <span style={{ fontWeight: 700, color: pct > 80 ? '#e74c3c' : '#1a1a1a' }}>{quota.analysisUsed} / {quota.analysisQuota}</span>
            </div>
            <div style={{ height: 6, background: '#e0dfe3', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct > 80 ? 'linear-gradient(90deg, #e67e22, #e74c3c)' : 'linear-gradient(90deg, #7C5CDB, #5a9fd4)', borderRadius: 3, transition: 'width 0.5s' }} />
            </div>
            {quota.resetAt && <div style={{ fontSize: 12, color: '#ababab', marginTop: 8 }}>Resets {fmt(quota.resetAt)}</div>}
          </div>
        </div>

        {/* Security */}
        <div style={card}>
          <div style={sh}>Security</div>
          <div style={{ padding: '20px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button style={outBtn} onClick={() => { setPassNote(true); setTimeout(() => setPassNote(false), 6000); }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              Change Password
            </button>
            <button style={{ ...outBtn, color: '#e74c3c', border: '1px solid rgba(231,76,60,0.3)' }} onClick={handleLogout} disabled={loggingOut}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              {loggingOut ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
          {passNote && (
            <div style={{ margin: '0 20px 20px', fontSize: 12, color: '#6b6b6b', background: '#f5f5f4', border: '1px solid #e0dfe3', borderRadius: 9, padding: '10px 14px', lineHeight: 1.6 }}>
              To change your password, sign out and use "Forgot Password" on the login page. Password resets are handled via AWS Cognito.
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div style={{ ...card, borderColor: 'rgba(231,76,60,0.3)' }}>
          <div style={{ ...sh, color: '#e74c3c', borderColor: 'rgba(231,76,60,0.15)' }}>Danger Zone</div>
          <div style={{ padding: '20px' }}>
            <p style={{ fontSize: 13, color: '#6b6b6b', marginBottom: 16, lineHeight: 1.6 }}>
              Permanently delete your account and all associated data including analyses, interview sessions, and progress. <strong style={{ color: '#e74c3c' }}>This cannot be undone.</strong>
            </p>
            <button onClick={() => setShowDelete(true)} style={{ background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 9, padding: '10px 18px', color: '#e74c3c', fontFamily: 'Geist, sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDelete && (
        <div onClick={() => setShowDelete(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e0dfe3', borderRadius: 18, padding: '32px', maxWidth: 420, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a', textAlign: 'center', marginBottom: 12 }}>Delete Account?</h3>
            <p style={{ fontSize: 13, color: '#6b6b6b', textAlign: 'center', lineHeight: 1.7, marginBottom: 24 }}>
              This will permanently delete all your analyses, interview sessions, and progress data. This action <strong style={{ color: '#e74c3c' }}>cannot be undone</strong>.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDelete(false)} style={{ flex: 1, background: '#f5f5f4', border: '1px solid #e0dfe3', borderRadius: 10, padding: 12, color: '#1a1a1a', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleting} style={{ flex: 1, background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 10, padding: 12, color: '#e74c3c', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {deleting ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountPage;
