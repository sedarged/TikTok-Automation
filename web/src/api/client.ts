export interface HealthPayload {
  status: string;
  version: string;
  timestamp: string;
  ffmpeg: { available: boolean; version: string };
  jobs: { total: number; completed: number; failed: number; running: number };
}

export interface NicheSummary {
  id: string;
  name: string;
  description: string;
}

export interface CreateJobRequest {
  prompt?: string;
  story?: unknown;
  nicheId?: string;
  type?: string;
}

export interface CreateJobResponse {
  success: boolean;
  data: { jobId: string; status: string; nicheId: string; createdAt: string };
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

export const fetchHealth = async (): Promise<HealthPayload> => {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse<HealthPayload>(res);
};

export const fetchNiches = async (): Promise<NicheSummary[]> => {
  const res = await fetch(`${API_BASE}/niches`);
  const data = await handleResponse<{ success: boolean; data: { niches: NicheSummary[] } }>(res);
  return data.data.niches;
};

export const createJob = async (payload: CreateJobRequest): Promise<CreateJobResponse> => {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  return handleResponse<CreateJobResponse>(res);
};
