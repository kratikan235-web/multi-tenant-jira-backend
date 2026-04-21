import axios, { AxiosError } from "axios";
import { computeApiBase } from "../config/apiBase";
import { authStorage } from "../state/auth/authStorage";

export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

export const http = axios.create({
  baseURL: computeApiBase().baseURL,
  timeout: 20000
});

http.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const status = err.response?.status ?? 0;
    const data: any = err.response?.data;
    const message =
      (typeof data?.detail === "string" && data.detail) ||
      (typeof data?.message === "string" && data.message) ||
      err.message ||
      "Request failed";

    const apiError: ApiError = { status, message, details: data };

    // If the token is invalid/expired, clear it so user is forced to login.
    if (status === 401) authStorage.clear();

    return Promise.reject(apiError);
  }
);

