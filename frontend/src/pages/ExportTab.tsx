import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";

const ExportTab: React.FC = () => {
    // const { analysisId } = useOutletContext<{ analysisId: string }>();
    const [downloading, setDownloading] = useState<'pdf' | 'md' | null>(null);

    const handleDownload = (type: 'pdf' | 'md') => {
        setDownloading(type);
        // Simulate generation delay
        setTimeout(() => {
            setDownloading(null);
            alert(`Downloaded ${type.toUpperCase()} report! (Mocked)`);
        }, 1500);
    };

    return (
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <div className="view-title">Export & Share</div>
                <div className="view-sub">Download your career intelligence report in multiple formats</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', alignItems: 'start' }}>

                {/* PDF Export */}
                <div className="panel" style={{ padding: '32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, background: 'rgba(231,76,60,0.1)', color: '#E74C3C', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text)' }}>Executive Summary PDF</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text3)', margin: '0 0 24px 0', lineHeight: 1.5, maxWidth: '80%' }}>
                        A beautifully formatted, printable report containing your hiring probability, architecture diagrams, and high-level radar metrics.
                    </p>
                    <button
                        onClick={() => handleDownload('pdf')}
                        disabled={downloading !== null}
                        style={{
                            background: '#E74C3C', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600,
                            cursor: downloading === null ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px', opacity: downloading === 'pdf' ? 0.7 : 1
                        }}
                    >
                        {downloading === 'pdf' ? (
                            <span className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} />
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        )}
                        {downloading === 'pdf' ? 'Generating PDF...' : 'Download PDF'}
                    </button>
                </div>

                {/* Markdown Export */}
                <div className="panel" style={{ padding: '32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, background: 'rgba(41,128,185,0.1)', color: '#2980B9', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                        </svg>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text)' }}>GitHub Readme (.md)</h3>
                    <p style={{ fontSize: '14px', color: 'var(--text3)', margin: '0 0 24px 0', lineHeight: 1.5, maxWidth: '80%' }}>
                        A structured Markdown file ready to be copied directly into your repository's README.md to showcase your engineering rigor.
                    </p>
                    <button
                        onClick={() => handleDownload('md')}
                        disabled={downloading !== null}
                        style={{
                            background: '#2980B9', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 600,
                            cursor: downloading === null ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px', opacity: downloading === 'md' ? 0.7 : 1
                        }}
                    >
                        {downloading === 'md' ? (
                            <span className="spinner" style={{ width: 16, height: 16, borderTopColor: '#fff' }} />
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        )}
                        {downloading === 'md' ? 'Generating MD...' : 'Copy to Clipboard'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ExportTab;
