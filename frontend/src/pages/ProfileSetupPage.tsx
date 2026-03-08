import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createUserProfile } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface ProfileData {
  displayName: string;
  targetRole: string;
  language: string;
}

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { checkProfileCompletion } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<ProfileData>({
    displayName: "",
    targetRole: "",
    language: "en",
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
      await createUserProfile(formData);
      // Update auth context to reflect profile completion
      await checkProfileCompletion();
      navigate("/app");
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
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
            <p className="form-hint" style={{ textAlign: 'center', marginTop: '12px', color: 'var(--text3)' }}>
              Complete your profile to access the platform
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetupPage;
