import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface ProfileData {
  displayName: string;
  targetRole: string;
  language: string;
  githubConnected: boolean;
}

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<ProfileData>({
    displayName: "",
    targetRole: "",
    language: "en",
    githubConnected: false,
  });

  const targetRoles = [
    { value: "", label: "Select your target role" },
    { value: "junior_sde", label: "Junior SDE" },
    { value: "mid_sde", label: "Mid-Level SDE" },
    { value: "senior_sde", label: "Senior SDE" },
    { value: "devops", label: "DevOps Engineer" },
    { value: "data_engineer", label: "Data Engineer" },
    { value: "fullstack", label: "Full Stack Developer" },
  ];

  const languages = [
    { value: "en", label: "English" },
    { value: "hinglish", label: "Hinglish" },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGitHubConnect = () => {
    // TODO: Implement GitHub OAuth
    setFormData((prev) => ({ ...prev, githubConnected: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.displayName.trim()) {
      setError("Please enter your display name");
      return;
    }

    if (!formData.targetRole) {
      setError("Please select your target role");
      return;
    }

    setLoading(true);

    try {
      // POST /user/profile
      const response = await fetch("http://localhost:3001/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save profile");
      }

      navigate("/app");
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate("/app");
  };

  return (
    <div className="profile-setup-page">
      <div className="setup-card">
        {/* Header */}
        <div className="setup-header">
          <div className="setup-logo">
            DevContext<span className="accent">.ai</span>
          </div>
          <div className="setup-subtitle">
            Let's personalize your experience
          </div>
        </div>

        {/* Progress indicator */}
        <div className="setup-progress">
          <div className="progress-step active">
            <div className="step-dot">1</div>
            <span>Profile</span>
          </div>
          <div className="progress-line"></div>
          <div className="progress-step">
            <div className="step-dot">2</div>
            <span>Preferences</span>
          </div>
          <div className="progress-line"></div>
          <div className="progress-step">
            <div className="step-dot">3</div>
            <span>Connect</span>
          </div>
        </div>

        {/* Error message */}
        {error && <div className="setup-error">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="setup-form">
          {/* Display Name */}
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              placeholder="How should we call you?"
              className="form-input"
            />
          </div>

          {/* Target Role */}
          <div className="form-group">
            <label className="form-label">Target Role</label>
            <div className="select-wrapper">
              <select
                name="targetRole"
                value={formData.targetRole}
                onChange={handleInputChange}
                className="form-select"
              >
                {targetRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <svg
                className="select-arrow"
                viewBox="0 0 10 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <path d="M1 1l4 4 4-4" />
              </svg>
            </div>
            <span className="form-hint">
              We'll tailor interview questions to match your level
            </span>
          </div>

          {/* Language */}
          <div className="form-group">
            <label className="form-label">Preferred Language</label>
            <div className="language-options">
              {languages.map((lang) => (
                <label
                  key={lang.value}
                  className={`language-option ${
                    formData.language === lang.value ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="language"
                    value={lang.value}
                    checked={formData.language === lang.value}
                    onChange={handleInputChange}
                  />
                  <span className="lang-label">{lang.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* GitHub Integration */}
          <div className="form-group">
            <label className="form-label">GitHub Integration</label>
            <div className="github-connect">
              {formData.githubConnected ? (
                <div className="github-connected">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>Connected</span>
                  <svg
                    className="check-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGitHubConnect}
                  className="github-btn"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  Connect GitHub
                </button>
              )}
              <span className="form-hint github-hint">
                Optional — required for private repositories
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="setup-actions">
            <button type="submit" disabled={loading} className="btn-accent">
              {loading ? "Saving..." : "Complete Setup"}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button type="button" onClick={handleSkip} className="btn-skip">
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetupPage;
