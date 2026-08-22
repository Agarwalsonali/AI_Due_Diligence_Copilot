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
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

// Company API
export const companyAPI = {
  list: (search?: string) =>
    api.get("/companies", { params: { search } }),
  create: (data: {
    name: string;
    ticker?: string;
    industry?: string;
    sector?: string;
    description?: string;
    website?: string;
  }) => api.post("/companies", data),
  get: (id: number | string) => api.get(`/companies/${id}`),
  delete: (id: number | string) => api.delete(`/companies/${id}`),
};

// Document API
export const documentAPI = {
  upload: (formData: FormData) =>
    api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  list: (companyId?: number | string) =>
    api.get("/documents", { params: companyId ? { company_id: companyId } : {} }),
  get: (id: number | string) => api.get(`/documents/${id}`),
  delete: (id: number | string) => api.delete(`/documents/${id}`),
};

// Chat API
export const chatAPI = {
  send: (data: { message: string; company_id?: number; session_id?: number }) =>
    api.post("/chat", data),
  sessions: () => api.get("/chat/sessions"),
  session: (id: number) => api.get(`/chat/sessions/${id}`),
  deleteSession: (id: number) => api.delete(`/chat/sessions/${id}`),
};

// Analysis API
export const analysisAPI = {
  summary: (companyId: number) =>
    api.post("/analysis/summary", { company_id: companyId }),
  risks: (companyId: number) =>
    api.post("/analysis/risks", { company_id: companyId }),
  opportunities: (companyId: number) =>
    api.post("/analysis/opportunities", { company_id: companyId }),
  financials: (companyId: number) =>
    api.post("/analysis/financials", { company_id: companyId }),
  compare: (companyIds: number[]) =>
    api.post("/analysis/compare", { company_ids: companyIds }),
};

// Report API
export const reportAPI = {
  generate: (companyId: number) =>
    api.post("/reports/generate", { company_id: companyId }),
  get: (id: number) => api.get(`/reports/${id}`),
  download: (id: number) =>
    api.get(`/reports/${id}/download`, { responseType: "blob" }),
};

// SSE helper for streaming chat
export function streamChat(
  data: { message: string; company_id?: number; session_id?: number },
  onChunk: (chunk: string) => void,
  onDone: (response: { session_id: number; sources: any[] }) => void,
  onError: (error: Error) => void
) {
  const token = localStorage.getItem("access_token");

  fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                onChunk(parsed.text);
              } else if (parsed.type === "chunk") {
                onChunk(parsed.content);
              } else if (parsed.type === "done") {
                onDone(parsed);
              } else if (parsed.type === "error") {
                onError(new Error(parsed.message));
              }
            } catch {
              // Not JSON, treat as text chunk
              onChunk(data);
            }
          }
        }
      }
    })
    .catch(onError);
}
