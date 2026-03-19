import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

// 요청 인터셉터: 토큰 자동 주입
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;