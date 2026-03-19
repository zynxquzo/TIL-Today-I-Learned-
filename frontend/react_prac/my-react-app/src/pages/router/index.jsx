import { createBrowserRouter } from "react-router-dom";
import Layout from "../../layouts/Layout";
import AuthProtectedRoute from "../../components/auth_prac/ProtectedRoute";
import PublicRoute from "../../components/auth_prac/PublicRoute";
import PostList from "../posts/PostList";
import PostDetail from "../posts/PostDetail";
import PostNew from "../posts/PostNew";
import LoginPage from "../auth/LoginPage";
// 👇 이 줄을 추가하세요!
import SignupPage from "../auth/SignupPage"; 

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <PostList /> },
      { path: "posts/:id", element: <PostDetail /> },
      {
        element: <PublicRoute />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "signup", element: <SignupPage /> }, // 이제 에러가 나지 않습니다.
        ],
      },
      {
        element: <AuthProtectedRoute />,
        children: [
          { path: "posts/new", element: <PostNew /> },
        ],
      },
    ],
  },
]);

export default router;