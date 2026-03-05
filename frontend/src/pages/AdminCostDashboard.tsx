import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface CostMetrics {
  today: { totalCost: number; totalCalls: number; totalTokens: number; };
  thisMonth: { totalCost: number; totalCalls: number; projectedEndOfMonth: number; };
  byModel: Array<{ modelId: string; totalCost: number; callCount: number; avgCostPerCall: number; }>;
  recentAnalyses: Array<{ analysisId: string; repositoryName: string; totalCost: number; createdAt: string; }>;
  alerts: Array<{ type: 'warning' | 'info' | 'critical'; message: string; }>;
}

interface DailyCost { date: string; totalCost: number; callCount: number; }

// ─── Pricing reference (Mistral Large 3 = $0.50 in / $1.50 out per 1M tokens)
// ─── Average tokens per stage (approximate)
const STAGE_TOKEN_ESTIMATES = [
  { stage: 'Stage 1 · Project Review', agentCalls: 1, avgInputTokens: 8_000, avgOutputTokens: 2_000 },
  { stage: 'Stage 2 · Architecture Agent', agentCalls: 1, avgInputTokens: 12_000, avgOutputTokens: 3_000 },
  { stage: 'Stage 2 · Design Decisions', agentCalls: 1, avgInputTokens: 12_000, avgOutputTokens: 2_500 },
  { stage: 'Stage 2 · Tradeoffs Agent', agentCalls: 1, avgInputTokens: 11_000, avgOutputTokens: 2_000 },
  { stage: 'Stage 2 · Scalability/Security', agentCalls: 1, avgInputTokens: 14_000, avgOutputTokens: 4_000 },
  { stage: 'Stage 2 · Resume Bullets', agentCalls: 1, avgInputTokens: 10_000, avgOutputTokens: 2_500 },
  { stage: 'Stage 3 · Core Questions', agentCalls: 1, avgInputTokens: 15_000, avgOutputTokens: 5_000 },
  { stage: 'Stage 3 · Question Sheet (50Q)', agentCalls: 1, avgInputTokens: 16_000, avgOutputTokens: 8_000 },
] as const;

// Mistral Large 3 pricing
const INPUT_PRICE_PER_MILLION = 0.50;
const OUTPUT_PRICE_PER_MILLION = 1.50;

// AWS infrastructure pricing (monthly estimates)
const AWS_SERVICES = [
  { service: 'AWS Lambda', description: '~10 invocations/analysis · 512 MB · ~60s each', monthlyEst: '< $1', freeThreshold: '1M requests/mo free', color: '#e67e22' },
  { service: 'Amazon DynamoDB', description: 'On-demand · reads/writes per analysis', monthlyEst: '< $0.50', freeThreshold: '25 GB storage free', color: '#27ae60' },
  { service: 'Amazon S3', description: 'Cache bucket · ~100 KB avg per repo cache', monthlyEst: '< $0.10', freeThreshold: '5 GB storage free', color: '#2980b9' },
  { service: 'API Gateway (REST)', description: '1 call per analysis routed to Lambda', monthlyEst: '< $0.01', freeThreshold: '1M calls/mo free', color: '#7C5CDB' },
  { service: 'AWS Bedrock', description: 'Mistral Large 3 — $0.50 in / $1.50 out per 1M', monthlyEst: '≈ $0.05/analysis', freeThreshold: 'Pay per token', color: '#e74c3c' },
  { service: 'CloudWatch Logs', description: 'Lambda logs retention 7 days', monthlyEst: '< $0.01', freeThreshold: '5 GB ingestion free', color: '#95a5a6' },
];

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Show full precision including tiny values like $0.00004 */
function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.00001) return `$${usd.toFixed(8)}`;
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.10) return `$${usd.toFixed(5)}`;
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function calcCost(inputTokens: number, outputTokens: number) {
  const inputCost = (inputTokens / 1_000_000) * INPUT_PRICE_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_MILLION;
  return { inputCost, outputCost, total: inputCost + outputCost };
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function getModelDisplayName(modelId: string): string {
  if (modelId.includes('llama')) return '🦙 Llama 3.3 70B';
  if (modelId.includes('cohere')) return '🔷 Cohere Command R+';
  if (modelId.includes('mistral')) return '🌪️ Mistral Large 3';
  if (modelId.includes('nova')) return '⭐ Amazon Nova';
  if (modelId.includes('claude')) return '🤖 Claude 3.5';
  return modelId;
}

// ─── Component ────────────────────────────────────────────────────────────────

const AdminCostDashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);
  const [dailyCosts, setDailyCosts] = useState<DailyCost[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'perAnalysis' | 'aws'>('overview');

  useEffect(() => { if (isAdmin) loadDashboardData(); }, [isAdmin]);
  useEffect(() => {
    if (isAdmin && autoRefresh) {
      const iv = setInterval(loadDashboardData, 30_000);
      return () => clearInterval(iv);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, autoRefresh]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const realtimeData = await api.getCostRealtime();
      setMetrics(realtimeData);
      const rangeData = await api.getCostRange(dateRange.start, dateRange.end);
      setDailyCosts(rangeData.dailySummaries || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const days = Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / 86_400_000);
      const csvData = await api.exportCostData('csv', days);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cost-report-${dateRange.start}-to-${dateRange.end}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export data');
    }
  };

  // ── Per-analysis cost estimate (live calculation) ──
  const perAnalysisCost = (() => {
    let totalIn = 0, totalOut = 0;
    STAGE_TOKEN_ESTIMATES.forEach(s => {
      totalIn += s.avgInputTokens;
      totalOut += s.avgOutputTokens;
    });
    const { inputCost, outputCost, total } = calcCost(totalIn, totalOut);
    return { totalIn, totalOut, inputCost, outputCost, total };
  })();

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: 'Geist, system-ui, sans-serif' }}>
      {/* ── Header ── */}
      <div style={{ background: '#171a23', borderBottom: '1px solid #2d3748', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '2px', letterSpacing: '-0.3px' }}>
            💰 Cost Analytics Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: '#718096' }}>
            Real-time Bedrock cost monitoring · Mistral Large 3 · {user?.email}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#a0aec0', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
            Auto-refresh (30s)
          </label>
          <Btn onClick={loadDashboardData} disabled={loading} color="#4a5568">{loading ? '⟳ Refreshing…' : '↻ Refresh'}</Btn>
          <Btn onClick={exportToCSV} color="#2d6a4f">📥 Export CSV</Btn>
          <Btn onClick={() => (window.location.href = '/app')} color="#2b4b8e">← Dashboard</Btn>
        </div>
      </div>

      {/* ── Alerts ── */}
      {metrics?.alerts && metrics.alerts.length > 0 && (
        <div style={{ padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {metrics.alerts.map((alert, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', background: alert.type === 'critical' ? 'rgba(197,48,48,0.15)' : alert.type === 'warning' ? 'rgba(192,86,33,0.15)' : 'rgba(44,82,130,0.15)', border: `1px solid ${alert.type === 'critical' ? '#fc8181' : alert.type === 'warning' ? '#f6ad55' : '#63b3ed'}`, color: alert.type === 'critical' ? '#fc8181' : alert.type === 'warning' ? '#f6ad55' : '#63b3ed' }}>
              {alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'} {alert.message}
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: '20px 24px', maxWidth: '1440px', margin: '0 auto' }}>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <KpiCard title="Today's Bedrock Cost" value={formatCost(Number(metrics?.today?.totalCost) || 0)} sub={`${metrics?.today?.totalCalls || 0} API calls · ${formatNumber(Number(metrics?.today?.totalTokens) || 0)} tokens`} color="#27ae60" icon="💵" />
          <KpiCard title="This Month" value={formatCost(Number(metrics?.thisMonth?.totalCost) || 0)} sub={`Projected: ${formatCost(Number(metrics?.thisMonth?.projectedEndOfMonth) || 0)}`} color="#4299e1" icon="📊" />
          <KpiCard title="Est. Cost / Analysis" value={formatCost(perAnalysisCost.total)} sub={`${formatNumber(perAnalysisCost.totalIn + perAnalysisCost.totalOut)} tokens · 8 agent calls`} color="#9f7aea" icon="🔬" />
          <KpiCard title="Avg Cost / Call" value={formatCost((Number(metrics?.today?.totalCost) || 0) / Math.max(Number(metrics?.today?.totalCalls) || 1, 1))} sub="Today's average per Bedrock call" color="#ed8936" icon="📈" />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#171a23', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          {(['overview', 'perAnalysis', 'aws'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', fontFamily: 'inherit', transition: 'all 0.15s', background: activeTab === tab ? '#7C5CDB' : 'none', color: activeTab === tab ? '#fff' : '#718096' }}>
              {tab === 'overview' ? '📊 Overview' : tab === 'perAnalysis' ? '🔬 Per-Analysis Cost' : '☁️ AWS Services'}
            </button>
          ))}
        </div>

        {/* ── TAB: OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Cost by Model */}
            <Card title="Cost by Model">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <Tr header>
                    <Th>Model</Th><Th right>Calls</Th><Th right>Avg Input Cost</Th><Th right>Avg Output Cost</Th><Th right>Total Cost</Th><Th right>Avg / Call</Th>
                  </Tr>
                </thead>
                <tbody>
                  {(metrics?.byModel || []).map((m, i) => (
                    <Tr key={i}>
                      <Td>{getModelDisplayName(m.modelId)}</Td>
                      <Td right>{m.callCount}</Td>
                      <Td right dim>—</Td>
                      <Td right dim>—</Td>
                      <Td right bold>{formatCost(Number(m.totalCost) || 0)}</Td>
                      <Td right dim>{formatCost(Number(m.avgCostPerCall) || 0)}</Td>
                    </Tr>
                  ))}
                  {(!metrics?.byModel || metrics.byModel.length === 0) && (
                    <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#4a5568' }}>No data yet</td></tr>
                  )}
                </tbody>
              </table>
            </Card>

            {/* Daily Trend */}
            <Card title="Daily Cost Trend" headerRight={
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} style={dateInputStyle} />
                <span style={{ color: '#4a5568' }}>to</span>
                <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} style={dateInputStyle} />
                <Btn onClick={loadDashboardData} color="#4a5568" sm>Apply</Btn>
              </div>
            }>
              <SimpleBarChart data={dailyCosts} />
            </Card>

            {/* Recent Analyses */}
            <Card title="Recent Analyses">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <Tr header>
                    <Th>Repository</Th><Th>Analysis ID</Th><Th right>Bedrock Cost</Th><Th right>Date</Th>
                  </Tr>
                </thead>
                <tbody>
                  {(metrics?.recentAnalyses || []).map((a, i) => (
                    <Tr key={i}>
                      <Td>{a.repositoryName}</Td>
                      <Td><code style={{ fontSize: '12px', color: '#718096' }}>{a.analysisId.substring(0, 12)}…</code></Td>
                      <Td right bold>{formatCost(Number(a.totalCost) || 0)}</Td>
                      <Td right dim>{new Date(a.createdAt).toLocaleDateString()}</Td>
                    </Tr>
                  ))}
                  {(!metrics?.recentAnalyses || metrics.recentAnalyses.length === 0) && (
                    <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#4a5568' }}>No analyses yet</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ── TAB: PER-ANALYSIS COST ── */}
        {activeTab === 'perAnalysis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Pricing reference */}
            <Card title="Mistral Large 3 · Pricing Reference">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <PriceBox label="Input Tokens" value="$0.50" per="per 1M tokens" color="#7C5CDB" sub="$0.0000005 per token" />
                <PriceBox label="Output Tokens" value="$1.50" per="per 1M tokens" color="#e67e22" sub="$0.0000015 per token" />
                <PriceBox label="Typical Call (10K in + 3K out)" value={formatCost(calcCost(10_000, 3_000).total)} per="per API call" color="#27ae60" sub={`In: ${formatCost(calcCost(10_000, 0).inputCost)} · Out: ${formatCost(calcCost(0, 3_000).outputCost)}`} />
              </div>
            </Card>

            {/* Stage-by-stage breakdown */}
            <Card title="Cost per Stage · Per Full Analysis (Estimated)">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <Tr header>
                    <Th>Stage / Agent</Th>
                    <Th right>Avg Input Tokens</Th>
                    <Th right>Avg Output Tokens</Th>
                    <Th right>Input Cost</Th>
                    <Th right>Output Cost</Th>
                    <Th right>Total Cost</Th>
                  </Tr>
                </thead>
                <tbody>
                  {STAGE_TOKEN_ESTIMATES.map((s, i) => {
                    const { inputCost, outputCost, total } = calcCost(s.avgInputTokens, s.avgOutputTokens);
                    return (
                      <Tr key={i}>
                        <Td>{s.stage}</Td>
                        <Td right dim>{formatNumber(s.avgInputTokens)}</Td>
                        <Td right dim>{formatNumber(s.avgOutputTokens)}</Td>
                        <Td right dim>{formatCost(inputCost)}</Td>
                        <Td right dim>{formatCost(outputCost)}</Td>
                        <Td right bold>{formatCost(total)}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #2d3748', background: 'rgba(124,92,219,0.08)' }}>
                    <td style={tdStyle()}><strong style={{ color: '#fff' }}>TOTAL · 1 Full Analysis</strong></td>
                    <td style={tdStyle(true)}><strong style={{ color: '#a0aec0' }}>{formatNumber(perAnalysisCost.totalIn)}</strong></td>
                    <td style={tdStyle(true)}><strong style={{ color: '#a0aec0' }}>{formatNumber(perAnalysisCost.totalOut)}</strong></td>
                    <td style={tdStyle(true)}><strong style={{ color: '#a78bfa' }}>{formatCost(perAnalysisCost.inputCost)}</strong></td>
                    <td style={tdStyle(true)}><strong style={{ color: '#fda57b' }}>{formatCost(perAnalysisCost.outputCost)}</strong></td>
                    <td style={tdStyle(true)}><strong style={{ color: '#68d391', fontSize: '15px' }}>{formatCost(perAnalysisCost.total)}</strong></td>
                  </tr>
                </tfoot>
              </table>
              <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(124,92,219,0.08)', border: '1px solid rgba(124,92,219,0.2)', borderRadius: '10px', fontSize: '13px', color: '#a0aec0', lineHeight: '1.7' }}>
                <strong style={{ color: '#fff' }}>💡 How to read this:</strong>
                {' '}At <strong style={{ color: '#a78bfa' }}>$0.50 / 1M input</strong> and <strong style={{ color: '#fda57b' }}>$1.50 / 1M output</strong>,
                a typical full analysis (all 8 agent calls) costs approximately <strong style={{ color: '#68d391' }}>{formatCost(perAnalysisCost.total)}</strong> in LLM tokens.
                These are estimates based on average prompt and response lengths — actual costs depend on repo size.
              </div>
            </Card>

            {/* Scale calculator */}
            <Card title="Scale Cost Estimates (LLM tokens only)">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <Tr header>
                    <Th>Analyses / Month</Th>
                    <Th right>LLM Token Cost</Th>
                    <Th right>+ AWS Infra Est.</Th>
                    <Th right>Total Est.</Th>
                  </Tr>
                </thead>
                <tbody>
                  {[10, 50, 100, 500, 1000, 5000].map(n => {
                    const llm = perAnalysisCost.total * n;
                    const infra = Math.min(n * 0.002, 5); // ~$0.002 infra per analysis, capped
                    return (
                      <Tr key={n}>
                        <Td><strong style={{ color: '#fff' }}>{n.toLocaleString()}</strong></Td>
                        <Td right bold>{formatCost(llm)}</Td>
                        <Td right dim>~${infra.toFixed(2)}</Td>
                        <Td right bold style={{ color: '#68d391' }}>{formatCost(llm + infra)}</Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ── TAB: AWS SERVICES ── */}
        {activeTab === 'aws' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card title="AWS Service Cost Breakdown (Monthly Estimates at Low Scale)">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                {AWS_SERVICES.map((s, i) => (
                  <div key={i} style={{ background: '#171a23', border: '1px solid #2d3748', borderRadius: '12px', padding: '18px', borderLeft: `3px solid ${s.color}` }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>{s.service}</div>
                    <div style={{ fontSize: '12px', color: '#718096', marginBottom: '10px', lineHeight: '1.5' }}>{s.description}</div>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: s.color, marginBottom: '4px' }}>{s.monthlyEst}</div>
                    <div style={{ fontSize: '11px', color: '#4a5568', fontStyle: 'italic' }}>Free tier: {s.freeThreshold}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.25)', borderRadius: '10px', padding: '16px', fontSize: '13px', color: '#a0aec0', lineHeight: '1.8' }}>
                <strong style={{ color: '#68d391' }}>✅ Key Takeaway:</strong> AWS infrastructure (Lambda, DynamoDB, S3, API Gateway, CloudWatch) is essentially <strong style={{ color: '#fff' }}>FREE at low-to-mid scale</strong> thanks to generous free tiers.
                <br />
                The <strong style={{ color: '#fff' }}>only real cost is AWS Bedrock</strong> (Mistral Large 3 token usage).
                At <strong style={{ color: '#a78bfa' }}>100 analyses/month</strong>, total estimated cost is <strong style={{ color: '#68d391' }}>~{formatCost(perAnalysisCost.total * 100)}</strong> (LLM only).
              </div>
            </Card>

            {/* Detailed pricing table */}
            <Card title="Detailed AWS Service Pricing Reference">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <Tr header>
                    <Th>Service</Th><Th>Pricing Model</Th><Th right>Free Tier</Th><Th right>Paid Rate</Th>
                  </Tr>
                </thead>
                <tbody>
                  <Tr><Td><strong style={{ color: '#e67e22' }}>Lambda</strong></Td><Td dim>Per invocation + duration (GB-s)</Td><Td right dim>1M req/mo + 400K GB-s</Td><Td right>$0.20 / 1M req · $0.0000166 / GB-s</Td></Tr>
                  <Tr><Td><strong style={{ color: '#27ae60' }}>DynamoDB</strong></Td><Td dim>On-demand (reads + writes)</Td><Td right dim>25 GB storage, 200M req/mo</Td><Td right>$1.25 / 1M writes · $0.25 / 1M reads</Td></Tr>
                  <Tr><Td><strong style={{ color: '#2980b9' }}>S3</strong></Td><Td dim>Storage + GET/PUT requests</Td><Td right dim>5 GB storage, 20K GETs</Td><Td right>$0.023 / GB · $0.005 / 1K PUT</Td></Tr>
                  <Tr><Td><strong style={{ color: '#7C5CDB' }}>API Gateway</strong></Td><Td dim>REST API calls</Td><Td right dim>1M calls/mo (12 months)</Td><Td right>$3.50 / 1M API calls</Td></Tr>
                  <Tr><Td><strong style={{ color: '#e74c3c' }}>Bedrock · Mistral L3</strong></Td><Td dim>Per token (input/output)</Td><Td right dim>None</Td><Td right><strong style={{ color: '#fc8181' }}>$0.50 in / $1.50 out · per 1M tokens</strong></Td></Tr>
                  <Tr><Td><strong style={{ color: '#95a5a6' }}>CloudWatch</strong></Td><Td dim>Log ingestion + storage</Td><Td right dim>5 GB ingestion/mo</Td><Td right>$0.50 / GB ingested</Td></Tr>
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const Btn: React.FC<{ onClick: () => void; disabled?: boolean; color?: string; sm?: boolean; children: React.ReactNode }> = ({ onClick, disabled, color = '#4a5568', sm, children }) => (
  <button onClick={onClick} disabled={disabled} style={{ padding: sm ? '5px 12px' : '8px 16px', background: color, color: 'white', border: 'none', borderRadius: '7px', fontSize: sm ? '12px' : '13px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, fontFamily: 'inherit', fontWeight: '500' }}>
    {children}
  </button>
);

const KpiCard: React.FC<{ title: string; value: string; sub: string; color: string; icon: string }> = ({ title, value, sub, color, icon }) => (
  <div style={{ background: '#171a23', border: `1px solid #2d3748`, borderRadius: '12px', padding: '20px', borderLeft: `3px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
      <div style={{ fontSize: '12px', color: '#718096', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
      <div style={{ fontSize: '20px' }}>{icon}</div>
    </div>
    <div style={{ fontSize: '26px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px', marginBottom: '4px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    <div style={{ fontSize: '12px', color: '#4a5568' }}>{sub}</div>
  </div>
);

const Card: React.FC<{ title: string; headerRight?: React.ReactNode; children: React.ReactNode }> = ({ title, headerRight, children }) => (
  <div style={{ background: '#171a23', border: '1px solid #2d3748', borderRadius: '12px', overflow: 'hidden' }}>
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d3748', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', letterSpacing: '-0.2px' }}>{title}</h2>
      {headerRight}
    </div>
    <div style={{ padding: '20px' }}>{children}</div>
  </div>
);

const PriceBox: React.FC<{ label: string; value: string; per: string; color: string; sub: string }> = ({ label, value, per, color, sub }) => (
  <div style={{ background: '#0f1117', borderRadius: '10px', padding: '16px', border: `1px solid ${color}30`, textAlign: 'center' }}>
    <div style={{ fontSize: '12px', color: '#718096', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
    <div style={{ fontSize: '28px', fontWeight: '900', color, marginBottom: '4px' }}>{value}</div>
    <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '4px' }}>{per}</div>
    <div style={{ fontSize: '11px', color: '#2d3748', fontStyle: 'italic' }}>{sub}</div>
  </div>
);

const Tr: React.FC<{ children: React.ReactNode; header?: boolean }> = ({ children, header }) => (
  <tr style={{ borderBottom: '1px solid #1e2533', background: header ? '#0f1117' : 'transparent' }}>{children}</tr>
);

const thStyle: React.CSSProperties = { padding: '10px 12px', fontSize: '11px', fontWeight: '700', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' };
const Th: React.FC<{ children: React.ReactNode; right?: boolean }> = ({ children, right }) => (
  <th style={{ ...thStyle, textAlign: right ? 'right' : 'left' }}>{children}</th>
);

function tdStyle(right?: boolean): React.CSSProperties {
  return { padding: '10px 12px', fontSize: '13px', textAlign: right ? 'right' : 'left', fontVariantNumeric: 'tabular-nums' };
}

const Td: React.FC<{ children: React.ReactNode; right?: boolean; bold?: boolean; dim?: boolean; style?: React.CSSProperties }> = ({ children, right, bold, dim, style: extraStyle }) => (
  <td style={{ ...tdStyle(right), color: bold ? '#fff' : dim ? '#4a5568' : '#a0aec0', fontWeight: bold ? '700' : '400', ...extraStyle }}>{children}</td>
);

const SimpleBarChart: React.FC<{ data: DailyCost[] }> = ({ data }) => {
  if (!data || data.length === 0) return <div style={{ textAlign: 'center', padding: '40px', color: '#4a5568' }}>No data for selected range</div>;
  const maxCost = Math.max(...data.map(d => Number(d.totalCost) || 0), 0.000001);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '200px', padding: '32px 0 0' }}>
      {data.map((day, i) => {
        const cost = Number(day.totalCost) || 0;
        const height = Math.max((cost / maxCost) * 100, cost > 0 ? 2 : 0);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '100%', height: `${height}%`, background: 'linear-gradient(180deg, #7C5CDB 0%, #5a3db5 100%)', borderRadius: '3px 3px 0 0', position: 'relative', cursor: 'pointer', minHeight: cost > 0 ? '2px' : '0' }}
              title={`${day.date}: ${formatCost(cost)} (${day.callCount ?? 0} calls)`}>
              <div style={{ position: 'absolute', top: '-22px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: '600', color: '#a0aec0', whiteSpace: 'nowrap' }}>
                {cost > 0 ? formatCost(cost) : ''}
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#4a5568', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminCostDashboard;
