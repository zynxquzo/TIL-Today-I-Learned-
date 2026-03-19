import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";

const AuthProtectedRoute = () => {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    // 토큰이 없으면 로그인 페이지로 (경로 주의: /auth/login)
    return <Navigate to="/auth/login" replace />;
  }

  return <Outlet />;
};

export default AuthProtectedRoute;