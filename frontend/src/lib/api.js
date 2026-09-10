import axios from "axios";

export const API_BASE = `${process.env.REACT_APP_BACKEND_URL || "http://localhost:8000"}/api`;

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
