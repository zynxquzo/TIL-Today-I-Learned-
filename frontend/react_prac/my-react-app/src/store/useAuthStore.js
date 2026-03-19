import { create } from "zustand";
import api from "../api";

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem("token") || null,

  // 로그인: 토큰 저장 후 유저 정보 조회
  login: async (email, password) => {
    try {
      const res = await api.post("/auth/login", { email, password }); // 수정
      const { access_token } = res.data;
      localStorage.setItem("token", access_token);
      set({ token: access_token });

      const userRes = await api.get("/auth/me"); // 수정
      set({ user: userRes.data });
    } catch (err) {
      alert(err.response?.data?.detail || "로그인 실패");
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },

  // 앱 시작 시 토큰이 있으면 유저 정보 복구
  checkAuth: async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        // 💡 "/me"를 "/auth/me"로 수정하세요!
        const res = await api.get("/auth/me");
        set({ user: res.data, token });
      } catch (err) {
        console.error("인증 복구 실패:", err);
        localStorage.removeItem("token");
        set({ user: null, token: null });
      }
    }
  },
}));

export default useAuthStore;
