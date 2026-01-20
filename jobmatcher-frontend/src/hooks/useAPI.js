import { useState, useEffect, useCallback } from "react";
import { jobsAPI, candidatesAPI, matchingAPI } from "../services/api";

// ============================================================================
// Generic API Hook
// ============================================================================

export function useAPI(apiFunction, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction();
      setData(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      console.error("API Error:", err);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================================================
// Jobs Hooks
// ============================================================================

export function useJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await jobsAPI.getAll();
      setJobs(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, loading, error, refetch: fetchJobs };
}

export function useJob(jobId) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchJob = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await jobsAPI.getById(jobId);
        setJob(data);
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  return { job, loading, error };
}

// ============================================================================
// Candidates Hooks
// ============================================================================

export function useCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await candidatesAPI.getAll();
      setCandidates(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  return { candidates, loading, error, refetch: fetchCandidates };
}

export function useCandidate(candidateId) {
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!candidateId) return;

    const fetchCandidate = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await candidatesAPI.getById(candidateId);
        setCandidate(data);
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [candidateId]);

  return { candidate, loading, error };
}

// ============================================================================
// Matching Hooks
// ============================================================================

export function useCandidateMatches(candidateId, options = {}) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { minScore = 70, autoLoad = false } = options;

  const loadMatches = useCallback(async () => {
    if (!candidateId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await matchingAPI.getJobsForCandidate(candidateId, {
        min_score: minScore,
      });
      setMatches(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [candidateId, minScore]);

  useEffect(() => {
    if (autoLoad && candidateId) {
      loadMatches();
    }
  }, [autoLoad, candidateId, loadMatches]);

  return { matches, loading, error, loadMatches };
}

export function useJobMatches(jobId, options = {}) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { autoLoad = false } = options;

  const loadMatches = useCallback(async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await matchingAPI.getCandidatesForJob(jobId);
      setMatches(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (autoLoad && jobId) {
      loadMatches();
    }
  }, [autoLoad, jobId, loadMatches]);

  return { matches, loading, error, loadMatches };
}

// ============================================================================
// Form Hooks
// ============================================================================

export function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
  };

  const setFieldValue = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const setFieldError = (name, error) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  return {
    values,
    errors,
    handleChange,
    reset,
    setFieldValue,
    setFieldError,
    setValues,
  };
}

// ============================================================================
// Async Action Hook (for create/update/delete)
// ============================================================================

export function useAsyncAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const execute = useCallback(async (actionFunction) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await actionFunction();

      setSuccess(true);
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = () => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  };

  return { loading, error, success, execute, reset };
}

// ============================================================================
// Download Hook
// ============================================================================

export function useDownload() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const download = async (fetchFunction, filename) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchFunction();

      // Get filename from Content-Disposition header if available
      const contentDisposition = response.headers["content-disposition"];
      let finalFilename = filename;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match) {
          finalFilename = match[1];
        }
      }

      // Create blob and download
      const contentType = response.headers["content-type"] || "application/octet-stream";
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { download, loading, error };
}