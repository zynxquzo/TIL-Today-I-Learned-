import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../api";
import useAuthStore from "../../store/useAuthStore";

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    api.get(`/posts/${id}`)
      .then((res) => setPost(res.data))
      .catch((err) => alert(err.response?.data?.detail || "불러오기 실패"));
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm("삭제하시겠습니까?")) {
      try {
        await api.delete(`/posts/${id}`);
        navigate("/");
      } catch (err) {
        alert(err.response?.data?.detail || "삭제 실패");
      }
    }
  };

  if (!post) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        불러오는 중...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 뒤로가기 */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-500 mb-6 transition-colors"
      >
        ← 목록으로
      </Link>

      {/* 카드 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-snug">
          {post.title}
        </h1>

        <div className="flex items-center gap-2 text-xs text-gray-400 mb-6 pb-6 border-b border-gray-100">
          <span className="font-medium text-gray-500">{post.author?.email}</span>
          <span>·</span>
          <span>{new Date(post.created_at).toLocaleDateString("ko-KR")}</span>
        </div>

        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
          {post.content}
        </p>

        {/* 삭제 버튼 */}
        {user?.id === post.author?.id && (
          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-all"
            >
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetail;