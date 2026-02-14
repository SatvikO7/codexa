import axios from "axios";
import Cookies from "js-cookie";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = Cookies.get("refresh_token");
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = response.data;
          Cookies.set("access_token", access_token, { expires: 1 });
          Cookies.set("refresh_token", refresh_token, { expires: 7 });

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  refresh: (refreshToken: string) =>
    api.post("/auth/refresh", { refresh_token: refreshToken }),
  me: () => api.get("/auth/me"),
};

// Projects API
export const projectsApi = {
  list: () => api.get("/projects"),
  get: (id: string) => api.get(`/projects/${id}`),
  uploadZip: (name: string, file: File, description?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post(
      `/projects/upload?name=${encodeURIComponent(name)}${
        description ? `&description=${encodeURIComponent(description)}` : ""
      }`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
  },
  uploadFile: (data: { name: string; file_name: string; content: string }) =>
    api.post("/projects/file", data),
  getFiles: (id: string) => api.get(`/projects/${id}/files`),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

// Chat API
export const chatApi = {
  send: (projectId: string, content: string) =>
    api.post(`/chat/${projectId}`, { message: content }),
  getHistory: (projectId: string, limit?: number) =>
    api.get(`/chat/${projectId}/history`, { params: { limit } }),
  clearHistory: (projectId: string) => api.delete(`/chat/${projectId}/history`),
  getUsage: () => api.get("/chat/usage/me"),
};

// Billing API
export const billingApi = {
  getSubscription: () => api.get("/billing/subscription"),
  getPricing: () => api.get("/billing/pricing"),
  checkout: (tier: string, currency: string = "INR") =>
    api.post("/billing/checkout", { tier, currency }),
  subscribe: (tier: string, currency: string = "INR") =>
    api.post("/billing/subscribe", { tier, currency }),
  cancel: () => api.post("/billing/cancel"),
};
