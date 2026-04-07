import { create } from "zustand";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const useChatStore = create((set, get) => ({
  conversations: [],
  messages: [],
  loading: false,

  // --- 대화 목록 ---

  fetchConversations: async () => {
    const res = await fetch(`${API_URL}/conversations`);
    const data = await res.json();
    set({ conversations: data });
  },

  createConversation: async () => {
    const res = await fetch(`${API_URL}/conversations`, { method: "POST" });
    const conv = await res.json();
    set((state) => ({
      conversations: [conv, ...state.conversations],
    }));
    return conv;
  },

  deleteConversation: async (id) => {
    await fetch(`${API_URL}/conversations/${id}`, { method: "DELETE" });
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
    }));
  },

  // --- 메시지 히스토리 ---

  fetchMessages: async (threadId) => {
    set({ messages: [] });
    try {
      const res = await fetch(`${API_URL}/conversations/${threadId}/messages`);
      const data = await res.json();
      set({ messages: Array.isArray(data) ? data : [] });
    } catch {
      set({ messages: [] });
    }
  },

  // --- 채팅 ---

  clearMessages: () => set({ messages: [] }),

  sendMessage: async (threadId, content) => {
    // 사용자 메시지 추가
    set((state) => ({
      messages: [...state.messages, { role: "user", content }],
      loading: true,
    }));

    // AI 응답 자리 생성 (tools 배열 포함)
    set((state) => ({
      messages: [...state.messages, { role: "assistant", content: "", tools: [] }],
    }));

    try {
      // SSE 스트리밍 요청
      const response = await fetch(
        `${API_URL}/conversations/${threadId}/chat/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content }),
        }
      );

      if (!response.ok) {
        throw new Error("서버 오류가 발생했습니다.");
      }

      // ReadableStream으로 응답을 chunk 단위로 읽는다
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // chunk를 텍스트로 변환하고 SSE 형식(data: ...)인 줄만 필터링
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter((line) => line.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6); // "data: " 제거
          if (data === "[DONE]") break;

          const parsed = JSON.parse(data);

          // 이벤트 타입에 따라 마지막 assistant 메시지를 업데이트
          set((state) => {
            const updated = [...state.messages];
            const last = { ...updated[updated.length - 1] };

            if (parsed.type === "token") {
              last.content += parsed.content;
            } else if (parsed.type === "tool_call") {
              last.tools = [...(last.tools || []), { name: parsed.name, status: "calling" }];
            } else if (parsed.type === "tool_result") {
              last.tools = (last.tools || []).map((t) =>
                t.name === parsed.name && t.status === "calling"
                  ? { ...t, status: "done" }
                  : t
              );
            }

            updated[updated.length - 1] = last;
            return { messages: updated };
          });
        }
      }
    } finally {
      // 에러가 발생하더라도 loading 해제와 사이드바 갱신은 반드시 실행
      get().fetchConversations();
      set({ loading: false });
    }
  },
}));

export default useChatStore;
