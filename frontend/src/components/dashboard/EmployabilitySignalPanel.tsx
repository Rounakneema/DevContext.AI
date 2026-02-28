import React from 'react';

interface EmployabilitySignalPanelProps {
  employabilitySignal: {
    overall: number;
    companyTierMatch: {
      bigTech: number;
      productCompanies: number;
      startups: number;
      serviceCompanies: number;
    };
  };
}

const EmployabilitySignalPanel: React.FC<EmployabilitySignalPanelProps> = ({ employabilitySignal }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#27AE60';
    if (score >= 60) return '#E67E22';
    return '#E74C3C';
  };

  const tiers = [
    { label: 'Big Tech (FAANG)', value: employabilitySignal.companyTierMatch.bigTech, icon: '🏢' },
    { label: 'Product Companies', value: employabilitySignal.companyTierMatch.productCompanies, icon: '🚀' },
    { label: 'Startups', value: employabilitySignal.companyTierMatch.startups, icon: '💡' },
    { label: 'Service Companies', value: employabilitySignal.companyTierMatch.serviceCompanies, icon: '🔧' },
  ];

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Employability Signal</div>
        <div className="chip" style={{ 
          background: employabilitySignal.overall >= 80 ? '#E8F8F0' : employabilitySignal.overall >= 60 ? '#FEF3DC' : '#FDECEC',
          color: getScoreColor(employabilitySignal.overall),
        }}>
          {employabilitySignal.overall}/100
        </div>
      </div>
      <div className="panel-body">
        <div className="emp-tiers">
          {tiers.map((tier) => (
            <div key={tier.label} className="emp-tier-row">
              <div className="emp-tier-info">
                <span className="emp-tier-icon">{tier.icon}</span>
                <span className="emp-tier-label">{tier.label}</span>
              </div>
              <div className="emp-tier-bar-wrap">
                <div className="emp-tier-bar">
                  <div
                    className="emp-tier-bar-fill"
                    style={{
                      width: `${tier.value}%`,
                      background: getScoreColor(tier.value),
                    }}
                  />
                </div>
                <span className="emp-tier-score" style={{ color: getScoreColor(tier.value) }}>
                  {tier.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmployabilitySignalPanel;
