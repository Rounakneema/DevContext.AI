import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
// @ts-ignore
import mermaid from "mermaid";
import api from "../services/api";

const ArchitectureTab: React.FC = () => {
    const { analysisId } = useOutletContext<{ analysisId: string }>();
    const [archData, setArchData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const mermaidRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadArchitecture = async () => {
            try {
                setLoading(true);
                const data: any = await api.getAnalysis(analysisId);
                const sysArch = data?.intelligenceReport?.systemArchitecture;
                if (!sysArch) {
                    throw new Error("Architecture data has not been generated yet for this analysis.");
                }
                setArchData({
                    diagram: sysArch.componentDiagram,
                    components: sysArch.layers?.flatMap((layer: any) =>
                        layer.components.map((comp: string, idx: number) => ({
                            name: comp,
                            type: layer.name,
                            description: layer.responsibilities[idx] || layer.responsibilities[0] || "No description provided."
                        }))
                    ) || []
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load architecture data');
            } finally {
                setLoading(false);
            }
        };
        loadArchitecture();
    }, [analysisId]);

    useEffect(() => {
        if (archData?.diagram && mermaidRef.current) {
            mermaid.initialize({ startOnLoad: true, theme: 'base', themeVariables: { primaryColor: '#f4f4f5', primaryBorderColor: '#e4e4e7', primaryTextColor: '#18181b', linetype: 'basis' } });
            mermaid.render('arch-diagram', archData.diagram).then((result: any) => {
                if (mermaidRef.current) {
                    mermaidRef.current.innerHTML = result.svg;
                }
            }).catch((e: any) => {
                console.error("Mermaid Render Error", e);
                if (mermaidRef.current) {
                    mermaidRef.current.innerHTML = `<div style="color:red">Failed to render architecture diagram</div>`;
                }
            });
        }
    }, [archData]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontSize: '14px', color: 'var(--text2)' }}>Extracting architecture blueprint…</div>
            </div>
        );
    }

    if (error || !archData) {
        return (
            <div style={{ background: '#FEF4F4', border: '1px solid #FACACA', borderRadius: '8px', padding: '12px 16px', color: '#C0392B', fontSize: '13px' }}>
                {error || 'Architecture data not found'}
            </div>
        );
    }

    return (
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <div className="view-title">System Architecture</div>
                <div className="view-sub">Auto-extracted system design and data flow</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 3fr)', gap: '24px', alignItems: 'start' }}>

                {/* Diagram Viewer */}
                <div className="panel" style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                            Live Architecture Diagram
                        </h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>Reset</button>
                        </div>
                    </div>
                    <div
                        style={{
                            background: '#FAFAFA',
                            borderRadius: '8px',
                            border: '1px dashed var(--border2)',
                            padding: '32px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '400px',
                            overflow: 'auto'
                        }}
                    >
                        <div ref={mermaidRef} className="mermaid" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            {/* Mermaid SVG will render here */}
                        </div>
                    </div>
                </div>

                {/* Extracted Components */}
                <div className="panel" style={{ padding: '0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <div style={{ padding: '20px 20px 16px 20px', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                <polyline points="2 17 12 22 22 17" />
                                <polyline points="2 12 12 17 22 12" />
                            </svg>
                            Extracted Components
                        </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {archData.components.map((c: any, i: number) => (
                            <div key={i} style={{ padding: '16px 20px', borderBottom: i < archData.components.length - 1 ? '1px solid var(--border2)' : 'none' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                                    <div style={{ fontSize: '11px', fontWeight: 600, background: 'var(--surface2)', color: 'var(--text2)', padding: '2px 8px', borderRadius: '4px' }}>{c.type}</div>
                                </div>
                                <div style={{ fontSize: '12.5px', color: 'var(--text3)', lineHeight: 1.5 }}>
                                    {c.description}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ArchitectureTab;
