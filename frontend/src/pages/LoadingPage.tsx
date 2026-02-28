import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";

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
      detail: "Fetching files from GitHub API",
      status: "running",
    },
    {
      name: "Stage 1 — Project Review",
      detail: "Scoring code quality · Amazon Nova 2 Lite",
      status: "pending",
    },
    {
      name: "Stage 3 — Interview Simulation",
      detail: "Generating project-specific questions · Amazon Nova Micro",
      status: "pending",
    },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function startAnalysis() {
      try {
        // Extract GitHub URL from query
        const githubUrlMatch = queryUrl.match(/github\.com\/[\w-]+\/[\w-]+/);
        const repositoryUrl = githubUrlMatch 
          ? `https://${githubUrlMatch[0]}` 
          : queryUrl;

        // Start analysis
        const result = await api.startAnalysis(repositoryUrl);
        
        if (!isMounted) return;
        
        const currentAnalysisId = result.analysisId;
        setAnalysisId(currentAnalysisId);

        // Poll for completion
        await api.pollAnalysis(currentAnalysisId, (status) => {
          if (!isMounted) return;

          // Update stages based on completedStages
          setStages((prev) => {
            const newStages = [...prev];
            
            // Repository processing is always done if we got here
            newStages[0].status = "done";
            newStages[0].detail = `Processing complete`;

            // Check completed stages
            const completed = status.completedStages || [];
            
            if (completed.includes('project_review')) {
              newStages[1].status = "done";
              newStages[1].detail = "Code quality analysis complete";
            } else if (status.status === 'processing') {
              newStages[1].status = "running";
            }

            if (completed.includes('interview_simulation')) {
              newStages[2].status = "done";
              newStages[2].detail = "Interview questions generated";
            } else if (completed.includes('project_review')) {
              newStages[2].status = "running";
            }

            return newStages;
          });
        });

        // Analysis complete - navigate to dashboard
        if (isMounted) {
          navigate(`/dashboard?analysisId=${currentAnalysisId}`);
        }

      } catch (err: any) {
        if (isMounted) {
          console.error('Analysis error:', err);
          setError(err.message || 'Failed to analyze repository');
        }
      }
    }

    startAnalysis();

    return () => {
      isMounted = false;
    };
  }, [navigate, queryUrl]);

  const displayUrl = queryUrl.replace(/^https?:\/\//, "");

  if (error) {
    return (
      <div className="main page active loading-page">
        <div className="loading-inner">
          <div className="loading-chip error">
            <div className="loading-chip-dot"></div>
            <span>Error</span>
          </div>
          <div className="loading-title">Analysis Failed</div>
          <div className="loading-sub" style={{ color: '#ef4444' }}>
            {error}
          </div>
          <button className="btn-ghost" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

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
