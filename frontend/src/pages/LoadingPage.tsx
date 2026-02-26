import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface Stage {
  name: string;
  detail: string;
  status: "done" | "running" | "pending";
}

const LoadingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryUrl =
    (location.state as any)?.query || "github.com/username/project";

  const [stages, setStages] = useState<Stage[]>([
    {
      name: "Repository cloning & processing",
      detail: "47 user files · 12,340 tokens extracted",
      status: "done",
    },
    {
      name: "Stage 1 — Project Review",
      detail: "Scoring code quality · Claude 3.5 Haiku",
      status: "running",
    },
    {
      name: "Stage 2 — Intelligence Report",
      detail: "Architecture reconstruction · Claude 3.5 Sonnet",
      status: "pending",
    },
    {
      name: "Stage 3 — Interview Simulation",
      detail: "Generating project-specific questions",
      status: "pending",
    },
  ]);

  useEffect(() => {
    // Simulate stage progression
    const timer1 = setTimeout(() => {
      setStages((prev) =>
        prev.map((stage, idx) => {
          if (idx === 1) return { ...stage, status: "done" as const };
          if (idx === 2) return { ...stage, status: "running" as const };
          return stage;
        }),
      );
    }, 2000);

    const timer2 = setTimeout(() => {
      setStages((prev) =>
        prev.map((stage, idx) => {
          if (idx === 2) return { ...stage, status: "done" as const };
          if (idx === 3) return { ...stage, status: "running" as const };
          return stage;
        }),
      );
    }, 4000);

    const timer3 = setTimeout(() => {
      navigate("/dashboard");
    }, 6000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [navigate]);

  const displayUrl = queryUrl.replace(/^https?:\/\//, "");

  return (
    <div className="main page active loading-page">
      <div className="loading-inner">
        <div className="loading-chip">
          <div className="loading-chip-dot"></div>
          <span>{displayUrl}</span>
        </div>
        <div className="loading-title">Analysing your repository</div>
        <div className="loading-sub">
          AI pipeline running — Stage 1 results in ~30 seconds
        </div>

        <div className="stage-list">
          {stages.map((stage, index) => (
            <div key={index} className={`stage-row ${stage.status}`}>
              <div className="stage-dot"></div>
              <div className="stage-text">
                <div className="stage-name">{stage.name}</div>
                <div className="stage-detail">{stage.detail}</div>
              </div>
              <div className="stage-tag">
                {stage.status === "done" && "Done"}
                {stage.status === "running" && "Running"}
                {stage.status === "pending" && "Queued"}
              </div>
            </div>
          ))}
        </div>

        <div className="progress-bar-wrap">
          <div className="progress-bar-fill"></div>
        </div>
        <div className="loading-hint">
          Results stream progressively — Stage 1 arrives first
        </div>

        <button className="btn-ghost" onClick={() => navigate("/dashboard")}>
          Preview Dashboard →
        </button>
      </div>
    </div>
  );
};

export default LoadingPage;
