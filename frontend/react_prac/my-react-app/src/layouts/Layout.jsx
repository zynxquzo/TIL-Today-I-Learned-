import { Link, Outlet } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

const Layout = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <Link
            to="/"
            className="text-xl font-bold text-indigo-600 tracking-tight hover:text-indigo-800 transition-colors"
          >
            📝 PostBoard
          </Link>

          <nav className="ml-auto flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{user.email}</span>님
                </span>
                <button
                  onClick={logout}
                  className="text-sm px-4 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors"
                >
                  로그인
                </Link>
                <Link
                  to="/signup"
                  className="text-sm px-4 py-1.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-all shadow-sm"
                >
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;