import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api";

const PostNew = () => {
  const [form, setForm] = useState({ title: "", content: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/posts", form);
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.detail || "작성 실패");
    }
  };

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
        <h2 className="text-2xl font-bold text-gray-800 mb-6">새 글 작성</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
              제목
            </label>
            <input
              type="text"
              placeholder="제목을 입력하세요"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
              내용
            </label>
            <textarea
              placeholder="내용을 입력하세요"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
              rows={8}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Link
              to="/"
              className="px-5 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
            >
              취소
            </Link>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg transition-all shadow-sm active:scale-95"
            >
              작성하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostNew;