import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface CostMetrics {
  today: {
    totalCost: number;
    totalCalls: number;
    totalTokens: number;
  };
  thisMonth: {
    totalCost: number;
    totalCalls: number;
    projectedEndOfMonth: number;
  };
  byModel: Array<{
    modelId: string;
    totalCost: number;
    callCount: number;
    avgCostPerCall: number;
  }>;
  recentAnalyses: Array<{
    analysisId: string;
    repositoryName: string;
    totalCost: number;
    createdAt: string;
  }>;
  alerts: Array<{
    type: 'warning' | 'info' | 'critical';
    message: string;
  }>;
}

interface DailyCost {
  date: string;
  totalCost: number;
  callCount: number;
}

const AdminCostDashboard: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);
  const [dailyCosts, setDailyCosts] = useState<DailyCost[]>([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load dashboard data on mount
  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (isAdmin && autoRefresh) {
      const interval = setInterval(() => {
        loadDashboardData();
      }, 30000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, autoRefresh]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load real-time metrics
      const realtimeData = await api.getCostRealtime();
      setMetrics(realtimeData);

      // Load daily costs for chart
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
      const days = Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24));
      const csvData = await api.exportCostData('csv', days);
      
      // Create download link
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
      console.error('Failed to export CSV:', err);
      alert('Failed to export data');
    }
  };

  // Dashboard Screen
  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc' }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a202c', marginBottom: '4px' }}>
            💰 Cost Analytics Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: '#718096' }}>
            Real-time AWS Bedrock cost monitoring • Logged in as {user?.email}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#4a5568' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '⟳ Refreshing...' : '↻ Refresh'}
          </button>
          <button
            onClick={() => window.location.href = '/app'}
            style={{
              padding: '8px 16px',
              background: '#4299e1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Alerts */}
        {metrics?.alerts && metrics.alerts.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            {metrics.alerts.map((alert, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  background: alert.type === 'critical' ? '#fed7d7' : alert.type === 'warning' ? '#feebc8' : '#bee3f8',
                  border: `1px solid ${alert.type === 'critical' ? '#fc8181' : alert.type === 'warning' ? '#f6ad55' : '#63b3ed'}`,
                  borderRadius: '8px',
                  color: alert.type === 'critical' ? '#c53030' : alert.type === 'warning' ? '#c05621' : '#2c5282',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}
              >
                {alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'} {alert.message}
              </div>
            ))}
          </div>
        )}

        {/* Key Metrics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <MetricCard
            title="Today's Cost"
            value={`$${metrics?.today.totalCost.toFixed(2) || '0.00'}`}
            subtitle={`${metrics?.today.totalCalls || 0} API calls`}
            icon="💵"
            color="#48bb78"
          />
          <MetricCard
            title="This Month"
            value={`$${metrics?.thisMonth.totalCost.toFixed(2) || '0.00'}`}
            subtitle={`Projected: $${metrics?.thisMonth.projectedEndOfMonth.toFixed(2) || '0.00'}`}
            icon="📊"
            color="#4299e1"
          />
          <MetricCard
            title="Total Tokens"
            value={formatNumber(metrics?.today.totalTokens || 0)}
            subtitle="Today"
            icon="🔢"
            color="#9f7aea"
          />
          <MetricCard
            title="Avg Cost/Call"
            value={`$${((metrics?.today.totalCost || 0) / (metrics?.today.totalCalls || 1)).toFixed(3)}`}
            subtitle="Today's average"
            icon="📈"
            color="#ed8936"
          />
        </div>

        {/* Cost by Model */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a202c', marginBottom: '16px' }}>
            Cost by Model
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Model</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Calls</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Total Cost</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Avg/Call</th>
                </tr>
              </thead>
              <tbody>
                {metrics?.byModel.map((model, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#2d3748' }}>
                      {getModelDisplayName(model.modelId)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#2d3748' }}>
                      {model.callCount}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
                      ${model.totalCost.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#718096' }}>
                      ${model.avgCostPerCall.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Cost Chart */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a202c' }}>
              Daily Cost Trend
            </h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
              <span style={{ color: '#718096' }}>to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                style={{ padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
              />
              <button
                onClick={loadDashboardData}
                style={{
                  padding: '6px 12px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Apply
              </button>
            </div>
          </div>
          <SimpleBarChart data={dailyCosts} />
        </div>

        {/* Recent Analyses */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a202c', marginBottom: '16px' }}>
            Recent Analyses
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Repository</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Analysis ID</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Cost</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {metrics?.recentAnalyses.map((analysis, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#2d3748' }}>
                      {analysis.repositoryName}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#718096', fontFamily: 'monospace' }}>
                      {analysis.analysisId.substring(0, 8)}...
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: '#2d3748' }}>
                      ${analysis.totalCost.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#718096' }}>
                      {new Date(analysis.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Export Button */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={exportToCSV}
            style={{
              padding: '12px 24px',
              background: '#48bb78',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            📥 Export to CSV
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
}> = ({ title, value, subtitle, icon, color }) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderLeft: `4px solid ${color}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
      <div style={{ fontSize: '14px', color: '#718096', fontWeight: '500' }}>{title}</div>
      <div style={{ fontSize: '24px' }}>{icon}</div>
    </div>
    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a202c', marginBottom: '4px' }}>
      {value}
    </div>
    <div style={{ fontSize: '13px', color: '#a0aec0' }}>{subtitle}</div>
  </div>
);

const SimpleBarChart: React.FC<{ data: DailyCost[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>No data available</div>;
  }

  const maxCost = Math.max(...data.map(d => d.totalCost), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '200px', padding: '20px 0' }}>
      {data.map((day, idx) => {
        const height = (day.totalCost / maxCost) * 100;
        return (
          <div
            key={idx}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <div
              style={{
                width: '100%',
                height: `${height}%`,
                background: 'linear-gradient(180deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '4px 4px 0 0',
                position: 'relative',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              title={`${day.date}: $${day.totalCost.toFixed(2)} (${day.callCount} calls)`}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '11px',
                fontWeight: '600',
                color: '#2d3748',
                whiteSpace: 'nowrap'
              }}>
                ${day.totalCost.toFixed(2)}
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#718096', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Helper Functions
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getModelDisplayName(modelId: string): string {
  if (modelId.includes('llama')) return '🦙 Llama 3.3 70B';
  if (modelId.includes('cohere')) return '🔷 Cohere Command R+';
  if (modelId.includes('mistral')) return '🌪️ Mistral Large 2';
  if (modelId.includes('nova')) return '⭐ Amazon Nova';
  if (modelId.includes('claude')) return '🤖 Claude 3.5';
  return modelId;
}

export default AdminCostDashboard;
