import axios from "axios";
import { getToken, removeToken } from "./auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 = token missing/invalid/expired -> force logout, session is dead.
    // 403 = valid session, but this role isn't allowed to do this action ->
    // do NOT log the user out, let the calling page show its own error.
    if (error.response && error.response.status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        removeToken();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;