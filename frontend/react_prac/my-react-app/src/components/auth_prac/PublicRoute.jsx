import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";

const PublicRoute = () => {
  const token = useAuthStore((state) => state.token);

  if (token) {
    // 이미 로그인했다면 홈으로 리다이렉트
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;