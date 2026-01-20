import axios from "axios";

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================================
// Interceptors for Error Handling
// ============================================================================

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log errors for debugging
    console.error("API Error:", error.response?.data || error.message);

    // You can add toast notifications here
    const message = error.response?.data?.detail || error.message || "An error occurred";

    // Optionally show user-friendly errors
    if (error.response?.status === 404) {
      console.warn("Resource not found:", error.config.url);
    } else if (error.response?.status === 500) {
      console.error("Server error:", message);
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// Job API
// ============================================================================

export const jobsAPI = {
  // Get all jobs
  getAll: async (params = {}) => {
    const response = await api.get("/jobs", { params });
    return response.data;
  },

  // Get single job
  getById: async (id) => {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  // Create job
  create: async (jobData) => {
    const response = await api.post("/jobs", jobData);
    return response.data;
  },

  // Update job
  update: async (id, jobData) => {
    const response = await api.patch(`/jobs/${id}`, jobData);
    return response.data;
  },

  // Delete job
  delete: async (id) => {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },

  // Parse job description
  parse: async (text) => {
    const response = await api.post("/parse-job", { text });
    return response.data;
  },
};

// ============================================================================
// Candidate API
// ============================================================================

export const candidatesAPI = {
  // Get all candidates
  getAll: async (params = {}) => {
    const response = await api.get("/candidates", { params });
    return response.data;
  },

  // Get single candidate
  getById: async (id) => {
    const response = await api.get(`/candidates/${id}`);
    return response.data;
  },

  // Create candidate with resume
  create: async (formData) => {
    const response = await api.post("/candidates", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // Update candidate
  update: async (id, candidateData) => {
    const response = await api.patch(`/candidates/${id}`, candidateData);
    return response.data;
  },

  // Delete candidate
  delete: async (id) => {
    const response = await api.delete(`/candidates/${id}`);
    return response.data;
  },

  // Download resume
  downloadResume: async (id) => {
    const response = await api.get(`/candidates/${id}/resume`, {
      responseType: "blob",
    });
    return response;
  },

  // Parse resume
  parseResume: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post("/parse-resume", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};

// ============================================================================
// Matching API
// ============================================================================

export const matchingAPI = {
  // Get job recommendations for candidate
  getJobsForCandidate: async (candidateId, params = {}) => {
    const response = await api.get(`/candidates/${candidateId}/matches`, {
      params: {
        include_summary: false,  // Get just the array
        ...params
      }
    });
    return response.data;
  },

  // Get candidate recommendations for job
  getCandidatesForJob: async (jobId, params = {}) => {
    const response = await api.get(`/recommendations/job/${jobId}`, { params });
    return response.data;
  },

  // Get cache stats
  getCacheStats: async () => {
    const response = await api.get("/candidates/matching/cache-stats");
    return response.data;
  },

  // Clear cache
  clearCache: async () => {
    const response = await api.post("/candidates/matching/clear-cache");
    return response.data;
  },
};

// ============================================================================
// Health Check
// ============================================================================

export const healthAPI = {
  check: async () => {
    const response = await api.get("/healthz");
    return response.data;
  },

  readiness: async () => {
    const response = await api.get("/readiness");
    return response.data;
  },
};

// ============================================================================
// Export default api instance for custom calls
// ============================================================================

export default api;