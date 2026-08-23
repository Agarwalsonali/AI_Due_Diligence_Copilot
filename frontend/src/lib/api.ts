import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Snake case to camelCase converter
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function camelizeKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(camelizeKeys);
  }
  if (obj !== null && obj !== undefined && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [toCamelCase(key), camelizeKeys(value)])
    );
  }
  return obj;
}

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 120000, // 2 min for analysis endpoints
});

// Transform response data from snake_case to camelCase
api.interceptors.response.use((response) => {
  if (response.data && typeof response.data === "object") {
    response.data = camelizeKeys(response.data);
  }
  return response;
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

// ─── Company API ─────────────────────────────────────────────────────────────
export const companyAPI = {
  list: (search?: string) =>
    api.get("/companies", { params: search ? { search } : {} }).then(r => r.data),
  create: (data: {
    name: string;
    ticker?: string;
    industry?: string;
    sector?: string;
    description?: string;
    website?: string;
  }) => api.post("/companies", data).then(r => r.data),
  get: (id: number | string) => api.get(`/companies/${id}`).then(r => r.data),
  delete: (id: number | string) => api.delete(`/companies/${id}`).then(r => r.data),
  analysis: (id: number | string) => api.get(`/companies/${id}/analysis`).then(r => r.data),
};

// ─── Document API ────────────────────────────────────────────────────────────
export const documentAPI = {
  upload: (formData: FormData) =>
    api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then(r => r.data),
  list: (companyId?: number | string) =>
    api.get("/documents", { params: companyId ? { company_id: companyId } : {} }).then(r => r.data),
  get: (id: number | string) => api.get(`/documents/${id}`).then(r => r.data),
  delete: (id: number | string) => api.delete(`/documents/${id}`).then(r => r.data),
};

// ─── Chat API ────────────────────────────────────────────────────────────────
export const chatAPI = {
  send: (data: { message: string; company_id?: number; document_id?: number; session_id?: number }) =>
    api.post("/chat/", data).then(r => r.data),
  sessions: () => api.get("/chat/sessions").then(r => r.data),
  session: (id: number) => api.get(`/chat/sessions/${id}`).then(r => r.data),
  deleteSession: (id: number) => api.delete(`/chat/sessions/${id}`).then(r => r.data),
};

// ─── Analysis API ────────────────────────────────────────────────────────────
export const analysisAPI = {
  financials: (companyId: number) =>
    api.post("/analysis/financials", { company_id: companyId }).then(r => r.data),
  health: (companyId: number) =>
    api.post("/analysis/health", { company_id: companyId }).then(r => r.data),
  risks: (companyId: number) =>
    api.post("/analysis/risks", { company_id: companyId }).then(r => r.data),
  opportunities: (companyId: number) =>
    api.post("/analysis/opportunities", { company_id: companyId }).then(r => r.data),
  summary: (companyId: number) =>
    api.post("/analysis/summary", { company_id: companyId }).then(r => r.data),
  compare: (companyIds: number[]) =>
    api.post("/analysis/compare", { company_ids: companyIds }).then(r => r.data),
  regenerate: (companyId: number) =>
    api.post(`/analysis/${companyId}/regenerate`).then(r => r.data),
};

// ─── Report API ──────────────────────────────────────────────────────────────
export const reportAPI = {
  generate: (companyId: number) =>
    api.post("/reports/generate", { company_id: companyId }).then(r => r.data),
  get: (id: number) => api.get(`/reports/${id}`).then(r => r.data),
};
