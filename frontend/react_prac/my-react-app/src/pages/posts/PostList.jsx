import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import useAuthStore from "../../store/useAuthStore";

const PostList = () => {
  const [posts, setPosts] = useState([]);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    api.get("/posts")
      .then((res) => setPosts(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">글 목록</h2>
        {token && (
          <Link
            to="/posts/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-all shadow-sm active:scale-95"
          >
            + 글 작성
          </Link>
        )}
      </div>

      {/* 목록 */}
      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">
          아직 작성된 글이 없습니다.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all p-5"
            >
              <Link to={`/posts/${post.id}`} className="block">
                <h3 className="text-base font-semibold text-gray-800 hover:text-indigo-600 transition-colors mb-1">
                  {post.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{post.author?.email}</span>
                  <span>·</span>
                  <span>{new Date(post.created_at).toLocaleDateString("ko-KR")}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PostList;