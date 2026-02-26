import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import OverviewTab from "../components/dashboard/OverviewTab";
import ReviewTab from "../components/dashboard/ReviewTab";
import ReportTab from "../components/dashboard/ReportTab";
import InterviewTab from "../components/dashboard/InterviewTab";
import HistoryTab from "../components/dashboard/HistoryTab";

type Tab = "overview" | "review" | "report" | "interview" | "history";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get("tab") as Tab) || "overview",
  );

  const tabs = [
    {
      id: "overview" as Tab,
      label: "Overview",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      id: "review" as Tab,
      label: "Project Review",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
    },
    {
      id: "report" as Tab,
      label: "Intelligence Report",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      id: "interview" as Tab,
      label: "Mock Interview",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      id: "history" as Tab,
      label: "History",
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 15" />
        </svg>
      ),
    },
  ];

  const practiceTabIds = ["interview", "history"];

  return (
    <div className="dashboard-page">
      {/* Dash Sidebar */}
      <div className="dash-sidebar">
        <div className="dash-sidebar-repo">
          <div className="repo-badge">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            my-fullstack-app
          </div>
        </div>

        <div className="ds-section-label">Analysis</div>
        {tabs
          .filter((tab) => !practiceTabIds.includes(tab.id))
          .map((tab) => (
            <div
              key={tab.id}
              className={`ds-nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </div>
          ))}

        <div className="ds-section-label">Practice</div>
        {tabs
          .filter((tab) => practiceTabIds.includes(tab.id))
          .map((tab) => (
            <div
              key={tab.id}
              className={`ds-nav-item ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </div>
          ))}

        <div className="ds-spacer"></div>

        <div style={{ padding: "0 12px 8px" }}>
          <button className="ds-new-btn" onClick={() => navigate("/")}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Analysis
          </button>
        </div>
      </div>

      {/* Dash Main Content */}
      <div className="dash-main">
        <div className={`tab-view ${activeTab === "overview" ? "active" : ""}`}>
          <OverviewTab />
        </div>
        <div className={`tab-view ${activeTab === "review" ? "active" : ""}`}>
          <ReviewTab />
        </div>
        <div className={`tab-view ${activeTab === "report" ? "active" : ""}`}>
          <ReportTab />
        </div>
        <div
          className={`tab-view ${activeTab === "interview" ? "active" : ""}`}
        >
          <InterviewTab />
        </div>
        <div className={`tab-view ${activeTab === "history" ? "active" : ""}`}>
          <HistoryTab />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
