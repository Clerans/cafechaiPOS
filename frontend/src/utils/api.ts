import { useAuthStore } from "@/store/authStore";

const BASE_URL = import.meta.env.VITE_API_URL; // Relative path, proxy handles target redirection

interface RequestOptions extends RequestInit {
  body?: any;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

export const api = {
  async request(endpoint: string, options: RequestOptions = {}) {
    const authState = useAuthStore.getState();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (authState.accessToken) {
      headers["Authorization"] = `Bearer ${authState.accessToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    if (options.body && typeof options.body === "object") {
      config.body = JSON.stringify(options.body);
    }

    let response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Auto-refresh mechanism on 401 (JWT Expiry)
    if (response.status === 401 && authState.refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: authState.refreshToken }),
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            useAuthStore.getState().login(data.accessToken, data.refreshToken, authState.user!);
            isRefreshing = false;
            onRefreshed(data.accessToken);
          } else {
            // Refresh token invalid or revoked
            useAuthStore.getState().logout();
            isRefreshing = false;
            window.location.href = "/login";
            throw new Error("Session expired. Please log in again.");
          }
        } catch (err) {
          isRefreshing = false;
          useAuthStore.getState().logout();
          window.location.href = "/login";
          return Promise.reject(err);
        }
      }

      // Return a promise that waits for the refresh cycle to finish
      const retryOriginalRequest = new Promise((resolve) => {
        subscribeTokenRefresh((token) => {
          headers["Authorization"] = `Bearer ${token}`;
          resolve(fetch(`${BASE_URL}${endpoint}`, config));
        });
      });

      return retryOriginalRequest as Promise<Response>;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return response;
  },

  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(endpoint, { ...options, method: "GET" });
    return response.json();
  },

  async post<T>(endpoint: string, body: any, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(endpoint, { ...options, method: "POST", body });
    return response.json();
  },

  async put<T>(endpoint: string, body: any, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(endpoint, { ...options, method: "PUT", body });
    return response.json();
  },

  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.request(endpoint, { ...options, method: "DELETE" });
    return response.json();
  },
};
export default api;
