import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
// @ts-ignore
import mermaid from "mermaid";
import api from "../services/api";
import ExportDropdown from "../components/dashboard/ExportDropdown";

type DiagramMode = "component" | "dataflow";

const ArchitectureTab: React.FC = () => {
    const { analysisId } = useOutletContext<{ analysisId: string }>();
    const [fullData, setFullData] = useState<any>(null);
    const [archData, setArchData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [diagramMode, setDiagramMode] = useState<DiagramMode>("component");

    const mermaidRef = useRef<HTMLDivElement>(null);
    const diagramHostRef = useRef<HTMLDivElement>(null);
    const [isMermaidValid, setIsMermaidValid] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: "base",
            themeVariables: {
                primaryColor: "#f4f4f5",
                primaryBorderColor: "#e4e4e7",
                primaryTextColor: "#18181b",
                linetype: "basis",
            },
        });
    }, []);

    useEffect(() => {
        const loadArchitecture = async () => {
            try {
                setLoading(true);
                setError(null);
                const data: any = await api.getAnalysis(analysisId);
                setFullData(data);
                const sysArch = data?.intelligenceReport?.systemArchitecture;
                if (!sysArch) {
                    throw new Error("Architecture data has not been generated yet for this analysis.");
                }

                setArchData({
                    overview: sysArch.overview,
                    componentDiagram: sysArch.componentDiagram,
                    dataFlowDiagram: sysArch.dataFlowDiagram,
                    layers: sysArch.layers || [],
                    technologyStack: sysArch.technologyStack || null,
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
        const diagramTextRaw =
            diagramMode === "dataflow"
                ? archData?.dataFlowDiagram
                : archData?.componentDiagram;

        if (diagramTextRaw && mermaidRef.current) {
            const diagramText = String(diagramTextRaw).trim();
            const validMermaidStarts = [
                "graph",
                "flowchart",
                "sequenceDiagram",
                "classDiagram",
                "stateDiagram",
                "erDiagram",
                "gantt",
                "pie",
                "requirementDiagram",
                "gitGraph",
                "C4Context",
            ];

            const isProbablyValid = validMermaidStarts.some((start) =>
                diagramText.startsWith(start)
            );
            setIsMermaidValid(isProbablyValid);

            if (isProbablyValid) {
                // Use a unique render id so mode switches always re-render correctly.
                const renderId = `arch-diagram-${diagramMode}-${Date.now()}`;
                mermaid.render(renderId, diagramText).then((result: any) => {
                    if (mermaidRef.current) {
                        mermaidRef.current.innerHTML = result.svg;
                    }
                }).catch((e: any) => {
                    console.error("Mermaid Render Error", e);
                    setIsMermaidValid(false); // Fallback if rendering fails despite startsWith
                });
            }
        }
    }, [archData, diagramMode]);

    const activeDiagramText = (() => {
        const raw =
            diagramMode === "dataflow"
                ? archData?.dataFlowDiagram
                : archData?.componentDiagram;
        return raw ? String(raw).trim() : "";
    })();

    const copyDiagram = async () => {
        if (!activeDiagramText) return;
        try {
            await navigator.clipboard.writeText(activeDiagramText);
            setCopied("Copied");
            setTimeout(() => setCopied(null), 900);
        } catch {
            setCopied("Copy failed");
            setTimeout(() => setCopied(null), 900);
        }
    };

    const downloadSvg = () => {
        const svgEl = mermaidRef.current?.querySelector("svg");
        if (!svgEl) return;

        const svg = svgEl.outerHTML;
        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `architecture-${analysisId.substring(0, 8)}-${diagramMode}.svg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const resetView = () => {
        if (diagramHostRef.current) {
            diagramHostRef.current.scrollTop = 0;
            diagramHostRef.current.scrollLeft = 0;
        }
        if (mermaidRef.current) {
            mermaidRef.current.innerHTML = "";
        }
        // Trigger rerender via state update.
        setDiagramMode((m) => (m === "component" ? "component" : "dataflow"));
    };

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
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                    <div className="view-title">System Architecture</div>
                    <div className="view-sub">Auto-extracted system design and data flow</div>
                </div>
                <ExportDropdown analysisId={analysisId} analysisData={fullData} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Overview */}
                {archData.overview && (
                    <div className="panel" style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                            Overview
                        </div>
                        <div style={{ fontSize: '13.5px', color: 'var(--text)', lineHeight: 1.6 }}>
                            {archData.overview}
                        </div>
                    </div>
                )}

                {/* Diagram Viewer */}
                <div className="panel" style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                <line x1="8" y1="21" x2="16" y2="21" />
                                <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                            Architecture Diagrams
                        </h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ display: "flex", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 2 }}>
                                <button
                                    onClick={() => setDiagramMode("component")}
                                    style={{
                                        background: diagramMode === "component" ? "var(--surface)" : "transparent",
                                        border: "none",
                                        borderRadius: 6,
                                        padding: "5px 10px",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        color: "var(--text)",
                                    }}
                                    title="Component diagram"
                                >
                                    Components
                                </button>
                                <button
                                    onClick={() => setDiagramMode("dataflow")}
                                    style={{
                                        background: diagramMode === "dataflow" ? "var(--surface)" : "transparent",
                                        border: "none",
                                        borderRadius: 6,
                                        padding: "5px 10px",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        color: "var(--text)",
                                    }}
                                    title="Data flow diagram"
                                    disabled={!archData.dataFlowDiagram}
                                >
                                    Data flow
                                </button>
                            </div>

                            <button
                                onClick={copyDiagram}
                                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}
                                title="Copy Mermaid source"
                                disabled={!activeDiagramText}
                            >
                                {copied || "Copy"}
                            </button>
                            <button
                                onClick={downloadSvg}
                                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}
                                title="Download diagram as SVG"
                                disabled={!isMermaidValid}
                            >
                                SVG
                            </button>
                            <button
                                onClick={resetView}
                                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}
                                title="Reset diagram viewport"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                    <div
                        ref={diagramHostRef}
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
                        {!activeDiagramText ? (
                            <div style={{ padding: '18px 16px', background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 13 }}>
                                {diagramMode === "dataflow"
                                    ? "No data flow diagram found for this analysis yet."
                                    : "No component diagram found for this analysis yet."}
                            </div>
                        ) : !isMermaidValid ? (
                            <div style={{ padding: '24px', background: 'var(--surface2)', borderRadius: '12px', color: 'var(--text)', fontSize: '14px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', border: '1px solid var(--border)' }}>
                                {activeDiagramText}
                            </div>
                        ) : (
                            <div ref={mermaidRef} className="mermaid" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                {/* Mermaid SVG will render here */}
                            </div>
                        )}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: "var(--text3)", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div>
                            {diagramMode === "component" ? "Component map" : "Request/response flow"} powered by Mermaid
                        </div>
                        <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }}>
                            {activeDiagramText ? `${activeDiagramText.split("\n").length} lines` : ""}
                        </div>
                    </div>
                </div>

                {/* Technology Stack */}
                {archData.technologyStack && (
                    <div className="panel" style={{ padding: '0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                        <div style={{ padding: '20px 20px 16px 20px', borderBottom: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M3 3h18v6H3z" />
                                    <path d="M3 15h18v6H3z" />
                                    <path d="M7 9v6" />
                                    <path d="M17 9v6" />
                                </svg>
                                Technology Stack
                            </h3>
                        </div>
                        <div style={{ padding: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                            <div style={{ padding: 14, border: "1px solid var(--border2)", borderRadius: 12, background: "var(--surface2)" }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)", marginBottom: 8 }}>Languages</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {Object.entries(archData.technologyStack.languages || {}).sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).slice(0, 10).map(([lang, pct]: any) => (
                                        <span key={lang} style={{ fontSize: 12, fontWeight: 700, padding: "4px 8px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
                                            {lang} <span style={{ color: "var(--text3)", fontWeight: 800 }}>{pct}%</span>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div style={{ padding: 14, border: "1px solid var(--border2)", borderRadius: 12, background: "var(--surface2)" }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)", marginBottom: 8 }}>Frameworks</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {(archData.technologyStack.frameworks || []).slice(0, 12).map((x: string) => (
                                        <span key={x} style={{ fontSize: 12, fontWeight: 700, padding: "4px 8px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
                                            {x}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div style={{ padding: 14, border: "1px solid var(--border2)", borderRadius: 12, background: "var(--surface2)" }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)", marginBottom: 8 }}>Databases</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {(archData.technologyStack.databases || []).slice(0, 12).map((x: string) => (
                                        <span key={x} style={{ fontSize: 12, fontWeight: 700, padding: "4px 8px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
                                            {x}
                                        </span>
                                    ))}
                                    {(archData.technologyStack.databases || []).length === 0 && (
                                        <span style={{ fontSize: 12, color: "var(--text3)" }}>None detected</span>
                                    )}
                                </div>
                            </div>

                            <div style={{ padding: 14, border: "1px solid var(--border2)", borderRadius: 12, background: "var(--surface2)" }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text2)", marginBottom: 8 }}>Dev tools</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {(archData.technologyStack.devTools || []).slice(0, 12).map((x: string) => (
                                        <span key={x} style={{ fontSize: 12, fontWeight: 700, padding: "4px 8px", borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}>
                                            {x}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Layers */}
                <div className="panel" style={{ padding: '0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                    <div style={{ padding: '20px 20px 16px 20px', borderBottom: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                                <polyline points="2 17 12 22 22 17" />
                                <polyline points="2 12 12 17 22 12" />
                            </svg>
                            Layers and Components
                        </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {(archData.layers || []).length === 0 ? (
                            <div style={{ padding: 18, color: "var(--text2)", fontSize: 13 }}>
                                No architecture layers were detected for this analysis yet.
                            </div>
                        ) : (
                            (archData.layers || []).map((layer: any, i: number) => (
                                <div key={i} style={{ padding: '16px 20px', borderBottom: i < (archData.layers || []).length - 1 ? '1px solid var(--border2)' : 'none' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>{layer.name}</div>
                                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                            {(layer.components || []).slice(0, 8).map((c: string) => (
                                                <span key={c} style={{ fontSize: 11, fontWeight: 700, background: 'var(--surface2)', color: 'var(--text2)', padding: '2px 8px', borderRadius: 999, border: "1px solid var(--border2)" }}>
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {(layer.responsibilities || []).length > 0 && (
                                        <ul style={{ margin: "0 0 10px 18px", padding: 0, color: "var(--text3)", fontSize: 12.5, lineHeight: 1.55 }}>
                                            {(layer.responsibilities || []).slice(0, 6).map((r: string, idx: number) => (
                                                <li key={idx} style={{ marginBottom: 4 }}>{r}</li>
                                            ))}
                                        </ul>
                                    )}

                                    {(layer.fileReferences || []).length > 0 && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                            {(layer.fileReferences || []).slice(0, 10).map((ref: any, idx: number) => (
                                                <span key={`${ref.file || "ref"}-${idx}`} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }}>
                                                    {ref.file}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ArchitectureTab;
