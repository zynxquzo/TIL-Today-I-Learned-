import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useChatStore from "../store/useChatStore";

const Sidebar = () => {
  const { conversations, fetchConversations, createConversation, deleteConversation } =
    useChatStore();
  const navigate = useNavigate();
  const { threadId } = useParams();

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleNew = async () => {
    const conv = await createConversation();
    navigate(`/chat/${conv.id}`);
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteConversation(id);
    if (threadId === id) {
      navigate("/chat");
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={handleNew}
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
        >
          + 새 대화
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.map((conv) => (
          <Link
            key={conv.id}
            to={`/chat/${conv.id}`}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-gray-100 ${
              threadId === conv.id ? "bg-gray-100 font-medium" : "text-gray-700"
            }`}
          >
            <span className="truncate flex-1">{conv.title}</span>
            <button
              onClick={(e) => handleDelete(e, conv.id)}
              className="text-gray-400 hover:text-red-500 ml-2"
            >
              ✕
            </button>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
