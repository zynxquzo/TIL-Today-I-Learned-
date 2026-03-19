import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import router from "./pages/router"; 
import useAuthStore from "./store/useAuthStore";
import "./App.css";

// 에러 원인인 ThemeToggle, ThemedPage import를 제거했습니다.

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      {/* 라우팅 시스템 실행 */}
      <RouterProvider router={router} />
      
      {/* 에러가 났던 아래 UI 부분도 깔끔하게 정리했습니다. */}
      <div className="App">
        {/* 필요한 경우 여기에 공통 푸터를 넣을 수 있습니다. */}
      </div>
    </>
  );
}

export default App;
