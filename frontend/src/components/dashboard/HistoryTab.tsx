import React from "react";

const HistoryTab: React.FC = () => {
  const historyItems = [
    {
      name: "my-fullstack-app",
      meta: "React + Express · 47 files · 2 hours ago · 3 interviews",
      score: 72,
      icon: "📁",
    },
    {
      name: "django-blog-api",
      meta: "Python + Django · 32 files · 3 days ago · 1 interview",
      score: 81,
      icon: "📁",
    },
    {
      name: "spring-inventory-mgr",
      meta: "Java + Spring Boot · 88 files · 1 week ago",
      score: 55,
      icon: "📁",
    },
    {
      name: "ecommerce-react-app",
      meta: "React + Firebase · 61 files · 2 weeks ago · 2 interviews",
      score: 77,
      icon: "📁",
    },
  ];

  return (
    <>
      <div className="view-title">Analysis History</div>
      <div className="view-sub">
        Previous repository analyses and interview sessions.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {historyItems.map((item, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "14px 18px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "13.5px",
                  fontWeight: "600",
                  marginBottom: "2px",
                }}
              >
                {item.name}
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text3)" }}>
                {item.meta}
              </div>
            </div>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "700",
                letterSpacing: "-0.5px",
                color: item.score >= 70 ? "#27AE60" : "#E67E22",
              }}
            >
              {item.score}
            </div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: "14px" }}>
        <div className="panel-head">
          <div className="panel-title">Skill Progression</div>
          <div className="chip green">Improving</div>
        </div>
        <div className="panel-body">
          <p
            style={{
              fontSize: "13px",
              color: "var(--text2)",
              lineHeight: "1.7",
            }}
          >
            Employability Signal risen from{" "}
            <strong style={{ color: "#E67E22" }}>55</strong> →{" "}
            <strong style={{ color: "#27AE60" }}>72</strong> across 4 analyses.
            Consistent improvement in{" "}
            <span
              style={{
                background: "var(--accent-light)",
                color: "var(--accent)",
                padding: "2px 7px",
                borderRadius: "4px",
                fontSize: "11.5px",
                fontWeight: "500",
              }}
            >
              error handling
            </span>{" "}
            and{" "}
            <span
              style={{
                background: "#E0EAFF",
                color: "#3B5BDB",
                padding: "2px 7px",
                borderRadius: "4px",
                fontSize: "11.5px",
                fontWeight: "500",
              }}
            >
              architecture clarity
            </span>
            . Focus area:{" "}
            <span
              style={{
                background: "#FDECEC",
                color: "#C0392B",
                padding: "2px 7px",
                borderRadius: "4px",
                fontSize: "11.5px",
                fontWeight: "500",
              }}
            >
              test coverage
            </span>{" "}
            still at 0% across all projects.
          </p>
        </div>
      </div>
    </>
  );
};

export default HistoryTab;
