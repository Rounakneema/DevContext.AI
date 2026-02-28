// Temporary API service without authentication for testing
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT || 'https://2jhc5i9ex2.execute-api.ap-southeast-1.amazonaws.com/prod';

// Helper for API calls (no auth)
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_ENDPOINT}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// API Methods
export const api = {
  // Start repository analysis
  async startAnalysis(repositoryUrl: string) {
    return apiCall('/analyze', {
      method: 'POST',
      body: JSON.stringify({ repositoryUrl }),
    });
  },

  // Get analysis status
  async getAnalysisStatus(analysisId: string) {
    return apiCall(`/analysis/${analysisId}/status`);
  },

  // Get full analysis details
  async getAnalysis(analysisId: string) {
    return apiCall(`/analysis/${analysisId}`);
  },

  // Submit interview answer
  async submitAnswer(analysisId: string, questionId: string, answer: string) {
    return apiCall(`/interview/${analysisId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ questionId, answer }),
    });
  },

  // Poll for analysis completion
  async pollAnalysis(analysisId: string, onProgress?: (status: any) => void): Promise<any> {
    const maxAttempts = 60; // 5 minutes max (5 second intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.getAnalysisStatus(analysisId);
      
      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'completed') {
        return this.getAnalysis(analysisId);
      }

      if (status.status === 'failed') {
        throw new Error(status.errorMessage || 'Analysis failed');
      }

      // Wait 5 seconds before next poll
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Analysis timeout - taking longer than expected');
  },
};

export default api;
