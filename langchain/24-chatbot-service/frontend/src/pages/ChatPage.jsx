import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import useChatStore from "../store/useChatStore";

const TOOL_LABELS = {
  document_search: "문서 검색",
};

const ToolStatus = ({ tools }) => {
  if (!tools || tools.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-1.5">
      {tools.map((tool, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
            tool.status === "calling"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {tool.status === "calling" ? (
            <span className="inline-block w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>&#10003;</span>
          )}
          {TOOL_LABELS[tool.name] || tool.name}
        </span>
      ))}
    </div>
  );
};

const ChatPage = () => {
  const { threadId } = useParams();
  const { messages, loading, sendMessage, clearMessages, fetchMessages } =
    useChatStore();
  const [input, setInput] = useState("");
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  // threadId가 바뀌면 히스토리 로드
  useEffect(() => {
    if (threadId) {
      fetchMessages(threadId);
    } else {
      clearMessages();
    }
  }, [threadId]);

  const handleSend = async () => {
    if (!input.trim() || loading || !threadId) return;
    const message = input;
    setInput("");
    scrollRef.current.scrollTop = 0;
    await sendMessage(threadId, message);
    inputRef.current?.focus();
  };

  if (!threadId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        새 대화를 시작하거나 기존 대화를 선택하세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-0 p-4">
      {/* 메시지 영역 */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col-reverse border border-gray-200 rounded-lg bg-white p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-gray-400 mt-20">
              메시지를 입력하여 대화를 시작하세요.
            </p>
          )}
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-lg whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.role === "assistant" && <ToolStatus tools={msg.tools} />}
                {msg.content}
                {msg.role === "assistant" && !msg.content && loading && (
                  <span className="text-gray-400">...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="flex gap-2 mt-3">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="메시지를 입력하세요"
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
        >
          전송
        </button>
      </div>
    </div>
  );
};

export default ChatPage;
