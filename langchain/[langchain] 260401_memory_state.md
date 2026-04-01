# [TIL] LangGraph Memory & State 관리

## 1. Memory & State의 필요성

Agent가 대화를 이어가려면 **State를 저장하고 복원**하는 기능이 필요하다. 

### 대화 기억의 두 가지 유형

| 유형 | 범위 | 수명 | 용도 |
|------|------|------|------|
| **Short-term Memory** | thread_id 단위 | 해당 대화 세션 동안 | 대화 기록, 중단/재개 |
| **Long-term Memory** | 유저/네임스페이스 단위 | 명시적 삭제까지 | 유저 선호도, 학습 내용 |

LangGraph는 이를 위해 **Checkpointer**(Short-term)와 **Store**(Long-term)를 제공한다.

---

## 2. Checkpointer (Short-term Memory)

### Checkpointer란?

Checkpointer는 **그래프의 State 스냅샷을 저장하고 복원**하는 기능이다.

**동작 원리**
- 그래프 실행 시작 시와 각 노드 실행 후에 자동으로 State 스냅샷을 저장한다
- 같은 `thread_id`로 다시 호출하면 마지막 스냅샷부터 이어서 실행한다
- 다른 `thread_id`는 완전히 별도의 세션으로 취급된다

### Checkpointer 종류

| 타입 | 저장 위치 | 용도 | 지속성 |
|------|----------|------|--------|
| **MemorySaver** | 메모리 | 개발/테스트 | 프로세스 종료 시 사라짐 |
| **PostgresSaver** | PostgreSQL | 프로덕션 | 서버 재시작 후에도 유지 |

### MemorySaver 사용

```python
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.checkpoint.memory import MemorySaver

def simple_chatbot(state: MessagesState):
    return {"messages": [llm.invoke(state["messages"])]}

builder = StateGraph(MessagesState)
builder.add_node("chatbot", simple_chatbot)
builder.add_edge(START, "chatbot")
builder.add_edge("chatbot", END)

# Checkpointer 연결
memory = MemorySaver()
graph = builder.compile(checkpointer=memory)

# thread_id로 대화 세션을 구분한다
config = {"configurable": {"thread_id": "session-1"}}

# 첫 번째 대화
graph.invoke(
    {"messages": [("user", "내 이름은 Alice야. 반가워!")]},
    config=config,
)

# 두 번째 대화 - 같은 thread_id이므로 이전 대화를 기억한다
result = graph.invoke(
    {"messages": [("user", "내 이름이 뭐라고 했지?")]},
    config=config,
)
# → "당신의 이름은 Alice입니다!"
```

**다른 thread_id는 별도의 세션**
```python
config2 = {"configurable": {"thread_id": "session-2"}}
result = graph.invoke(
    {"messages": [("user", "내 이름이 뭐야?")]},
    config2,
)
# → "죄송하지만, 당신의 이름을 알 수 있는 정보가 없습니다."
```

### 저장된 State 확인

`get_state(config)`로 현재 저장된 State를 확인할 수 있다.

```python
state = graph.get_state(config)
state.values    # {"messages": [...]} — 현재 State 데이터
state.next      # 다음에 실행될 노드 (완료 시 빈 튜플)
state.config    # checkpoint_id가 포함된 config
```

---

## 3. PostgresSaver (영속화)

`MemorySaver`는 메모리에만 저장하므로 서버가 재시작되면 상태가 사라진다. 프로덕션에서는 **PostgresSaver**로 영속화한다.

### 설치

```bash
uv add langgraph-checkpoint-postgres "psycopg[binary]"
```

### PostgresSaver 사용

```python
from langgraph.checkpoint.postgres import PostgresSaver

DATABASE_URL = os.environ["DATABASE_URL"]

# from_conn_string은 내부적으로 커넥션 풀을 생성하고 with 블록 종료 시 정리한다.
with PostgresSaver.from_conn_string(DATABASE_URL) as pg_saver:
    pg_saver.setup()  # 테이블 생성
    
    pg_graph = builder.compile(checkpointer=pg_saver)
    
    config = {"configurable": {"thread_id": "pg-1"}}
    
    result = pg_graph.invoke(
        {"messages": [("user", "내 이름은 김철수야. 기억해줘.")]},
        config,
    )
    
    # 이어서 대화 - 같은 thread_id이므로 이전 대화가 유지된다
    result = pg_graph.invoke(
        {"messages": [("user", "내 이름이 뭐였지?")]},
        config,
    )
    # → "김철수님이십니다!"
```

**사용법은 MemorySaver와 동일하고, 연결 대상만 다르다.**

---

## 4. 대화 요약 관리

### 문제: 토큰 비용 증가

대화가 길어지면 메시지가 계속 누적되어 토큰 비용이 증가한다.

### 해결: 요약 노드

전체 토큰 수가 임계값을 넘으면 **요약 노드**가 실행되어, 최근 메시지만 남기고 나머지를 요약으로 대체한다.

```
START → chatbot → 토큰 초과? → summarize → END
                → 토큰 이내? →             END
```

### 핵심 도구

| 도구 | 역할 |
|------|------|
| **trim_messages** | 토큰 기준으로 최근 메시지만 유지 |
| **RemoveMessage** | State에서 특정 메시지를 ID 기반으로 삭제 |

`add_messages` reducer가 `RemoveMessage`를 만나면 해당 ID의 메시지를 제거한다.

### 요약 후 State 구조

```python
messages: [최근 user 메시지, 최근 ai 응답]   # trim 후 남은 것만
summary: "이전 대화 요약 텍스트"              # 삭제된 메시지의 요약
```

### State 정의

```python
from langchain_core.messages import RemoveMessage, SystemMessage, trim_messages

class SummaryState(MessagesState):
    """대화 메시지와 요약을 함께 관리하는 State."""
    summary: str
```

### Chatbot 노드

요약이 있으면 시스템 메시지로 추가하여 LLM에 전달한다.

```python
def chatbot_with_summary(state: SummaryState):
    messages = state["messages"]
    summary = state.get("summary", "")
    
    system_content = "모든 답변을 2문장 이내로 짧게 해줘."
    if summary:
        system_content += f"\n\n이전 대화 요약: {summary}"
    
    messages = [SystemMessage(content=system_content)] + messages
    response = llm.invoke(messages)
    
    return {"messages": [response]}
```

### 라우팅 함수

토큰 수가 임계값을 초과하면 `summarize` 노드로, 그렇지 않으면 종료한다.

```python
MAX_TOKENS = 300

def route_after_chatbot(state: SummaryState):
    """전체 메시지의 토큰 수가 MAX_TOKENS 초과 → summarize, 그 외 → END"""
    token_count = llm.get_num_tokens_from_messages(state["messages"])
    if token_count > MAX_TOKENS:
        return "summarize"
    return END
```

### 요약 노드

오래된 메시지를 요약하고 삭제한다.

```python
def summarize_conversation(state: SummaryState):
    """이전 메시지를 요약하고, 오래된 메시지를 삭제한다."""
    messages = state["messages"]
    existing_summary = state.get("summary", "")
    
    # 요약 프롬프트 생성
    if existing_summary:
        prompt = (
            f"기존 요약:\n{existing_summary}\n\n"
            f"위 요약에 다음 새 메시지 내용을 반영하여 요약을 업데이트해줘:\n\n"
        )
    else:
        prompt = "다음 대화를 간결하게 요약해줘:\n\n"
    
    # 최근 메시지를 토큰 기준으로 유지하고 나머지를 요약 대상으로 분리
    kept = trim_messages(
        messages,
        max_tokens=100,
        strategy="last",
        token_counter=llm,
        start_on="human",
    )
    kept_ids = {msg.id for msg in kept}
    old_messages = [msg for msg in messages if msg.id not in kept_ids]
    
    # 요약 대상 메시지를 프롬프트에 추가
    for msg in old_messages:
        if msg.type in ("human", "ai") and msg.content:
            prompt += f"{msg.type}: {msg.content}\n"
    
    summary_response = llm.invoke(prompt)
    
    # 오래된 메시지 삭제
    delete_messages = [RemoveMessage(id=msg.id) for msg in old_messages]
    
    return {
        "summary": summary_response.content,
        "messages": delete_messages,
    }
```

### 그래프 구성

```python
builder = StateGraph(SummaryState)

builder.add_node("chatbot", chatbot_with_summary)
builder.add_node("summarize", summarize_conversation)

builder.add_edge(START, "chatbot")
builder.add_conditional_edges("chatbot", route_after_chatbot, {
    "summarize": "summarize",
    END: END,
})
builder.add_edge("summarize", END)

memory = MemorySaver()
graph = builder.compile(checkpointer=memory)
```

### 실행 예시

```python
config = {"configurable": {"thread_id": "summary-test"}}

questions = [
    "파이썬이 뭐야?",
    "자바스크립트와 비교하면?",
    "웹 개발에는 어떤 게 좋아?",
    "데이터 분석에는?",
    "머신러닝 프레임워크 추천해줘",
]

for q in questions:
    result = graph.invoke({"messages": [("user", q)]}, config)
    token_count = llm.get_num_tokens_from_messages(result["messages"])
    print(f"Q: {q}")
    print(f"메시지 수: {len(result['messages'])}, 토큰 수: {token_count}")
    if result.get("summary"):
        print(f"요약: {result['summary'][:100]}...")
```

**중요**: `RemoveMessage`로 삭제된 메시지는 현재 State에서 완전히 사라진다. Checkpointer 히스토리에는 과거 스냅샷이 남아있지만, 그래프가 사용하는 현재 State에는 없다. 따라서 **요약의 품질이 중요**하다.

---

## 5. Store (Long-term Memory)

### Checkpointer vs Store

Checkpointer는 **Short-term Memory**다. thread_id 단위로 대화 기록을 저장하지만, 다른 스레드에서는 접근할 수 없다.

**Long-term Memory**는 스레드를 넘어서 유저별 선호도, 학습 내용 등을 기억한다.

| 구분 | Short-term (Checkpointer) | Long-term (Store) |
|------|---------------------------|-------------------|
| 범위 | thread_id 단위 | 유저/네임스페이스 단위 |
| 수명 | thread_id 범위 내 | 명시적 삭제까지 |
| 용도 | 대화 기록, 중단/재개 | 유저 선호도, 학습 내용 |

### Store의 데이터 구조

Store는 **namespace, key, value** 구조로 데이터를 저장한다.

| 요소 | 설명 | 예시 |
|------|------|------|
| **namespace** | 데이터를 분류하는 계층 구조 (튜플) | `("users", "alice", "preferences")` |
| **key** | namespace 안에서 개별 항목을 식별하는 이름 | `"style"` |
| **value** | 실제 저장되는 데이터 (dict) | `{"tone": "반말", "language": "한국어"}` |

### namespace 설계 예시

| namespace 예시 | 용도 | value 예시 |
|---|---|---|
| `("users", "alice", "preferences")` | 응답 스타일 선호 | `{"tone": "반말", "language": "한국어"}` |
| `("users", "alice", "facts")` | 대화에서 파악한 사실 | `{"fact": "백엔드 개발자, Python 주력"}` |
| `("users", "alice", "instructions")` | 유저가 직접 지시한 규칙 | `{"rule": "코드 예시는 항상 타입 힌트 포함"}` |
| `("users", "alice", "history")` | 과거 대화 요약 | `{"summary": "RAG 파이프라인 구축 논의"}` |

**preference는 가장 기본적인 예시일 뿐이고, 실제로는 유저에 대해 기억할 가치가 있는 모든 것을 저장한다.**

### search는 prefix 매칭이다

`store.search(namespace)`는 해당 namespace의 **하위 namespace까지 포함**하여 검색한다.

```python
# ("users", "alice") 하위의 모든 항목을 가져온다
# → preferences, facts, instructions 등 전부 포함
store.search(("users", "alice"))

# ("users", "alice", "preferences") 하위만 가져온다
store.search(("users", "alice", "preferences"))
```

따라서 namespace를 세분화해두면 **좁게 검색할 수도, 넓게 검색할 수도** 있다.

### PostgresStore 사용

```python
from langgraph.store.postgres import PostgresStore

with PostgresStore.from_conn_string(DATABASE_URL) as store:
    store.setup()  # 테이블 생성
    
    # put(namespace, key, value)
    store.put(
        namespace=("users", "alice", "preferences"),
        key="style",
        value={"tone": "친근한 반말", "language": "한국어"},
    )
    
    store.put(
        namespace=("users", "alice", "facts"),
        key="job",
        value={"fact": "백엔드 개발자, Python 주력"},
    )
    
    # search(namespace): 네임스페이스 내 모든 항목 검색
    results = store.search(("users", "alice", "preferences"))
    for item in results:
        print(f"key={item.key}, value={item.value}")
```

---

## 6. 그래프에서 Store 활용

### Store 주입

그래프 노드에서 Store에 접근하려면 함수 시그니처에 `*, store: BaseStore`를 추가한다. LangGraph가 컴파일 시 연결된 Store를 자동으로 주입해준다.

```python
from langgraph.store.base import BaseStore

def my_node(state: MessagesState, config, *, store: BaseStore):
    user_id = config["configurable"]["user_id"]
    memories = store.search(("users", user_id))
    # ...
```

### Memory Chatbot 구현

```python
from uuid import uuid4
from langchain_core.messages import SystemMessage

def memory_chatbot(state: MessagesState, config, *, store: BaseStore):
    user_id = config["configurable"].get("user_id", "default")
    
    # 유저의 모든 Long-term Memory를 한 번에 조회
    memories = store.search(("users", user_id))
    memory_text = "\n".join(
        f"- [{'/'.join(m.namespace)}] {m.key}: {m.value}" 
        for m in memories
    )
    
    system = (
        f"유저에 대해 알고 있는 정보:\n{memory_text}" 
        if memory_text else "유저 정보 없음"
    )
    messages = [SystemMessage(content=system)] + state["messages"]
    
    response = llm.invoke(messages)
    
    # 대화에서 새로운 사실을 감지하면 저장
    # 실무에서는 LLM으로 "저장할 만한 사실이 있는가?"를 판단하는 것이 적절하다.
    # 여기서는 간단한 키워드 매칭으로 대체한다.
    user_msg = state["messages"][-1].content if state["messages"] else ""
    
    # key에 UUID를 사용하여 여러 번 감지해도 덮어쓰지 않고 각각 저장한다.
    if "좋아" in user_msg or "선호" in user_msg:
        store.put(
            ("users", user_id, "preferences"), 
            uuid4().hex[:8], 
            {"note": user_msg}
        )
    if "기억해" in user_msg:
        store.put(
            ("users", user_id, "instructions"), 
            uuid4().hex[:8], 
            {"rule": user_msg}
        )
    
    return {"messages": [response]}
```

### 그래프 구성 및 실행

```python
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.store.postgres import PostgresStore

builder = StateGraph(MessagesState)
builder.add_node("chatbot", memory_chatbot)
builder.add_edge(START, "chatbot")
builder.add_edge("chatbot", END)

with PostgresSaver.from_conn_string(DATABASE_URL) as checkpointer, \
     PostgresStore.from_conn_string(DATABASE_URL) as store:
    
    checkpointer.setup()
    store.setup()
    
    graph = builder.compile(
        checkpointer=checkpointer,
        store=store,
    )
    
    # alice의 대화 — 위에서 저장한 facts, preferences를 참조한다
    config_alice = {
        "configurable": {
            "thread_id": "alice-1", 
            "user_id": "alice"
        }
    }
    result = graph.invoke(
        {"messages": [("user", "안녕! 오늘 뭐 배울까?")]},
        config_alice,
    )
    print(result["messages"][-1].content)
```

---

## 7. 유저 격리

`thread_id`와 `user_id`를 유저별로 다르게 설정하면 Short-term Memory(대화 기록)와 Long-term Memory(유저 정보) 모두 완전히 분리된다.

```python
with PostgresSaver.from_conn_string(DATABASE_URL) as checkpointer, \
     PostgresStore.from_conn_string(DATABASE_URL) as store:
    
    checkpointer.setup()
    store.setup()
    
    graph = builder.compile(checkpointer=checkpointer, store=store)
    
    # 유저별 Long-term Memory 저장
    store.put(("users", "alice", "facts"), "job", {"fact": "백엔드 개발자"})
    store.put(("users", "bob", "facts"), "job", {"fact": "데이터 분석가"})
    
    # Alice의 대화
    config_a = {
        "configurable": {"thread_id": "alice-thread", "user_id": "alice"}
    }
    graph.invoke(
        {"messages": [("user", "요즘 FastAPI 공부하고 있어")]}, 
        config_a
    )
    
    # Bob의 대화
    config_b = {
        "configurable": {"thread_id": "bob-thread", "user_id": "bob"}
    }
    graph.invoke(
        {"messages": [("user", "요즘 판다스 성능 최적화를 공부하고 있어")]}, 
        config_b
    )
    
    # 각자 자신의 정보만 조회
    result_a = graph.invoke(
        {"messages": [("user", "내 직업이랑 요즘 관심사가 뭐였지?")]}, 
        config_a
    )
    result_b = graph.invoke(
        {"messages": [("user", "내 직업이랑 요즘 관심사가 뭐였지?")]}, 
        config_b
    )
    
    print(f"[alice] {result_a['messages'][-1].content}")
    # → "백엔드 개발자이시고, 요즘 FastAPI를 공부하고 계십니다."
    
    print(f"[bob] {result_b['messages'][-1].content}")
    # → "데이터 분석가이시고, 요즘 판다스 성능 최적화를 공부하고 계십니다."
    
    # 같은 유저, 다른 thread_id → Short-term은 접근 불가, Long-term은 유지된다
    config_a2 = {
        "configurable": {"thread_id": "alice-thread-2", "user_id": "alice"}
    }
    result_a2 = graph.invoke(
        {"messages": [("user", "내 직업이랑 요즘 관심사가 뭐였지?")]}, 
        config_a2
    )
    print(f"\n[alice, 새 thread] {result_a2['messages'][-1].content}")
    # → "백엔드 개발자이십니다. (최근 관심사는 새 thread라 모름)"
```

**핵심**
- 같은 `user_id`, 다른 `thread_id` → Long-term Memory는 공유, Short-term Memory는 분리
- 다른 `user_id` → 모든 Memory 완전 분리

---

## 8. 핵심 개념 정리

### Short-term vs Long-term Memory

| | Checkpointer | Store |
|--|--------------|-------|
| **범위** | thread_id 단위 | 유저/네임스페이스 단위 |
| **저장 대상** | 대화 메시지 (State 전체) | 유저 정보, 선호도, 사실 |
| **접근 방법** | `thread_id`로 자동 조회 | `store.search(namespace)` |
| **수명** | 해당 스레드 동안 | 명시적 삭제까지 |

### 구성 요소

| 개념 | 설명 | 코드 |
|------|------|------|
| **MemorySaver** | 메모리에 Checkpoint 저장 (개발용) | `compile(checkpointer=MemorySaver())` |
| **PostgresSaver** | PostgreSQL에 Checkpoint 저장 (프로덕션) | `compile(checkpointer=PostgresSaver(...))` |
| **PostgresStore** | PostgreSQL에 Long-term Memory 저장 | `compile(store=PostgresStore(...))` |
| **thread_id** | 대화 세션 구분 | `config={"configurable": {"thread_id": "..."}}` |
| **user_id** | 유저 구분 (Store용) | `config={"configurable": {"user_id": "..."}}` |

### 대화 요약 핵심 도구

| 도구 | 역할 |
|------|------|
| **trim_messages** | 토큰 기준으로 최근 메시지만 유지 |
| **RemoveMessage** | State에서 특정 메시지를 ID 기반으로 삭제 |

### Store 데이터 구조

```python
namespace = ("users", "alice", "preferences")  # 계층 구조
key = "style"                                  # 개별 항목 ID
value = {"tone": "반말", "language": "한국어"}  # 실제 데이터
```

---

## 9. 실무 활용 패턴

### 대화 세션 관리

```
유저 A, 스레드 1 → [대화 1, 대화 2, 대화 3] ← Checkpointer
유저 A, 스레드 2 → [대화 1, 대화 2]         ← Checkpointer
                ↓
           유저 A의 Long-term Memory ← Store
           (직업, 선호도, 학습 내용 등)
```

### 대화 요약 트리거

```
대화 시작 → 메시지 누적 → 토큰 임계값 초과? → 요약 노드 실행
                                         → 오래된 메시지 삭제
                                         → 요약을 summary 필드에 저장
```

### 멀티 유저 격리

```
config = {
    "configurable": {
        "thread_id": f"{user_id}-{session_id}",  # Short-term 격리
        "user_id": user_id,                      # Long-term 격리
    }
}
```

---

## 10. 추가 학습 방향

### 고급 Checkpointer 기능

- **Human-in-the-loop**: 사람의 승인을 기다리는 노드와 State 복원
- **State 히스토리 탐색**: 과거 checkpoint로 되돌아가기
- **Partial State Update**: State의 일부만 업데이트

### Store 활용 고도화

- **LLM 기반 사실 추출**: 대화에서 자동으로 저장할 정보 탐지
- **임베딩 기반 검색**: 벡터 DB와 결합하여 의미 기반 Memory 조회
- **Memory 우선순위**: 자주 참조되는 정보 vs 오래된 정보 관리

### 프로덕션 최적화

- **Connection Pool 관리**: PostgreSQL 연결 최적화
- **Checkpoint 정리 정책**: 오래된 thread 자동 삭제
- **Memory 압축**: 장기 대화의 요약 품질 개선