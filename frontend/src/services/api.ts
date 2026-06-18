import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Storage helper functions
export const getAccessToken = () => localStorage.getItem('hr_access_token');
export const getRefreshToken = () => localStorage.getItem('hr_refresh_token');
export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('hr_access_token', access);
  localStorage.setItem('hr_refresh_token', refresh);
};
export const clearTokens = () => {
  localStorage.removeItem('hr_access_token');
  localStorage.removeItem('hr_refresh_token');
  localStorage.removeItem('hr_session_auth');
  localStorage.removeItem('hr_session_user');
};

// Request Interceptor: Attach bearer token if available
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Queue system for concurrent failed requests during token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Auto refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Check if error is 401 and request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === '/auth/token/' || originalRequest.url === '/auth/token/refresh/') {
        // If login or refresh fails, do not try again
        clearTokens();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request and wait for token refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.hash = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        // Keep existing refresh token, update only access token
        setTokens(access, refreshToken);

        processQueue(null, access);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.hash = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
