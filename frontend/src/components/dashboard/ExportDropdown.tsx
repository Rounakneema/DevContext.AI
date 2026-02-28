import React, { useState } from 'react';
import { exportAnalysis } from '../../services/api';

interface ExportDropdownProps {
  analysisId: string;
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ analysisId }) => {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: 'pdf' | 'markdown') => {
    setExporting(format);
    try {
      const result = await exportAnalysis(analysisId, format);
      // Open download URL
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(null);
      setOpen(false);
    }
  };

  return (
    <div className="export-dropdown-wrap" style={{ position: 'relative' }}>
      <button
        className="btn-ghost"
        onClick={() => setOpen(!open)}
        style={{ width: 'auto', fontSize: '12px', padding: '7px 14px', marginTop: 0 }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div className="export-backdrop" onClick={() => setOpen(false)} />
          <div className="export-dropdown">
            <button className="export-option" onClick={() => handleExport('pdf')} disabled={!!exporting}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <div>
                <div className="export-option-title">Export as PDF</div>
                <div className="export-option-sub">Download formatted report</div>
              </div>
              {exporting === 'pdf' && <div className="spinner-sm" />}
            </button>
            <button className="export-option" onClick={() => handleExport('markdown')} disabled={!!exporting}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <div>
                <div className="export-option-title">Export as Markdown</div>
                <div className="export-option-sub">Copy-paste friendly format</div>
              </div>
              {exporting === 'markdown' && <div className="spinner-sm" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportDropdown;
