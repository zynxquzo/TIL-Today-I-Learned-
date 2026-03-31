# [TIL] LangGraph 기초

## 1. Chain의 한계

### LCEL Chain의 구조

LCEL Chain은 **직선 파이프라인**이다.

```
입력 → A → B → C → 출력
```

이 구조에서 **불가능한 것**들이 있다.

| 한계 | 설명 | 예시 |
|------|------|------|
| **조건 분기** | 중간에 경로를 나눌 수 없음 | 환불 요청이면 A, 일반 문의면 B |
| **반복** | 이전 단계로 돌아갈 수 없음 | 검색 결과 부족 시 질문 바꿔서 재검색 |
| **상태 관리** | 여러 단계에 걸친 중간 결과 누적 불가 | 리서치 → 누적 → 추가 리서치 → 종합 |
| **사람의 개입** | 중간에 멈추고 확인 받을 수 없음 | 결제 전 사람의 승인 대기 |

### Chain으로 반복 구현 시도

"검색 결과가 부족하면 질문을 바꿔서 다시 검색"하는 로직을 Chain으로 시도하면, **Chain 밖에서 Python 루프로 제어**해야 한다. 이 경우 Chain의 장점(재사용, 스트리밍, 트레이싱)을 잃게 된다.

```python
for attempt in range(max_retries):
    docs = retriever.invoke(question)
    context = format_docs(docs)
    
    # 충분한지 확인
    check = llm.invoke([
        HumanMessage(content=f"질문: {question}\n\n검색 결과:\n{context}\n\n"
            "이 검색 결과가 질문에 답변하기에 충분한가? 'yes' 또는 'no'로만 답해.")
    ])
    
    if "yes" in check.content.lower():
        break
    
    # 질문 재작성
    rewrite = llm.invoke([
        HumanMessage(content=f"'{question}'이라는 질문으로 문서를 검색했지만 충분한 결과가 없었다. "
            "같은 의도이지만 다른 표현으로 질문을 다시 작성해줘. 질문만 출력해.")
    ])
    question = rewrite.content
```

이 방식은 **Python 루프 안에서 Chain을 반복 호출**하는 것이므로, Chain의 장점을 제대로 활용하지 못한다.

---

## 2. Workflow vs Agent

AI 애플리케이션의 제어 방식은 **스펙트럼** 위에 있다.

```
개발자가 흐름 결정                                    LLM이 흐름 결정
├──────────────────────────────────────────────────────────┤
Chain       Workflow        Agent           Autonomous Agent
(직선)       (분기+루프)     (LLM이 판단)            (완전 자율)
```

| 방식 | 제어 주체 | 예시 |
|------|----------|------|
| **Chain** | 개발자가 모든 흐름을 고정 | 번역 → 요약 → 출력 |
| **Workflow** | 개발자가 분기와 반복 조건을 정의 | 검색 결과 부족 시 → 질문 재작성 → 재검색 |
| **Agent** | LLM이 다음 행동을 결정 | "검색할까, 계산할까?" LLM이 판단 |
| **Autonomous Agent** | LLM이 목표만 받고 끝까지 자율 실행 | "이메일 10개 정리해" → LLM이 알아서 처리 |

### 각 방식의 트레이드오프

| | 예측 가능성 | 유연성 | 비용 |
|--|------------|--------|------|
| **Chain** | 높음 (항상 같은 경로) | 낮음 | 낮음 |
| **Workflow** | 중간 (조건 분기 있음) | 중간 | 중간 |
| **Agent** | 낮음 (LLM이 판단) | 높음 | 높음 |

**LangGraph는 Workflow와 Agent를 만드는 도구**이다. 개발자가 그래프 구조를 정의하고, 각 노드에서 LLM이 판단할 수 있게 한다.

---

## 3. LangGraph 핵심 개념

### 그래프 vs 체인

**Chain(체인)**은 직선이다.
```
입력 → A → B → C → 출력
```

**Graph(그래프)**는 여러 노드와 간선으로 이루어진 구조이다.
```
       ┌──→ B ──┐
입력 → A         D → 출력
       └──→ C ──┘
```

### LangGraph의 핵심 개념

| 개념 | 설명 | 예시 |
|------|------|------|
| **State** | 그래프를 통과하며 누적되는 데이터 | `{"question": "...", "docs": [...], "answer": "..."}` |
| **Node** | 실행 단위 (함수) | `def search(state): ...` |
| **Edge** | 노드 간 흐름 | `add_edge("search", "generate")` |
| **Conditional Edge** | 조건에 따라 다음 노드 선택 | `if passed: → end, else: → retry` |

---

## 4. State 정의하기

### TypedDict로 State 정의

LangGraph에서 State는 **TypedDict**로 정의한다. 각 필드의 타입을 명시하여 IDE 자동완성과 타입 체크를 활용할 수 있다.

```python
from typing import TypedDict

class SearchState(TypedDict):
    question: str           # 현재 질문
    documents: list[str]    # 검색된 문서들
    answer: str             # 생성된 답변
    attempts: int           # 시도 횟수
```

**State의 역할**
- 그래프를 통과하며 **누적되는 데이터**를 담는다
- 각 노드는 State를 읽고, 업데이트하고, 다음 노드로 전달한다
- 그래프가 끝나면 최종 State가 결과로 반환된다

### State 업데이트 방식

노드 함수는 **딕셔너리를 반환**하여 State를 업데이트한다. 반환한 딕셔너리는 기존 State에 **병합**된다.

```python
def search(state: SearchState):
    question = state["question"]
    docs = retriever.invoke(question)
    
    # 반환한 딕셔너리가 State에 병합됨
    return {
        "documents": [doc.page_content for doc in docs],
        "attempts": state.get("attempts", 0) + 1,
    }
```

---

## 5. 그래프 구성하기

### StateGraph로 그래프 빌더 생성

```python
from langgraph.graph import StateGraph, START, END

# State 타입을 명시하여 그래프 빌더 생성
graph_builder = StateGraph(SearchState)
```

### 노드 추가

```python
def search(state: SearchState):
    """문서를 검색한다."""
    question = state["question"]
    docs = retriever.invoke(question)
    return {
        "documents": [doc.page_content for doc in docs],
        "attempts": state.get("attempts", 0) + 1,
    }

def generate(state: SearchState):
    """답변을 생성한다."""
    question = state["question"]
    documents = state["documents"]
    context = "\n\n".join(documents)
    
    answer = llm.invoke([
        SystemMessage(content=f"다음 문서를 참고하여 질문에 답변해.\n\n{context}"),
        HumanMessage(content=question),
    ])
    
    return {"answer": answer.content}

# 노드 추가
graph_builder.add_node("search", search)
graph_builder.add_node("generate", generate)
```

**노드 함수 규칙**
- 파라미터로 `state: StateType`을 받는다
- 딕셔너리를 반환하여 State를 업데이트한다
- State의 모든 필드를 반환할 필요는 없다 (업데이트할 필드만 반환)

### 엣지 추가

```python
# 시작 → search
graph_builder.add_edge(START, "search")

# search → generate
graph_builder.add_edge("search", "generate")

# generate → 종료
graph_builder.add_edge("generate", END)
```

### 그래프 컴파일

```python
# 그래프를 실행 가능한 형태로 컴파일
graph = graph_builder.compile()
```

### 그래프 실행

```python
# 초기 State와 함께 그래프 실행
result = graph.invoke({
    "question": "AI 반도체 시장의 전망은?"
})

print(result["answer"])
```

---

## 6. 조건 분기 (Conditional Edge)

### Conditional Edge란?

**Conditional Edge**는 현재 State에 따라 다음 노드를 선택하는 분기점이다.

```python
def route_search(state: SearchState):
    """검색 결과가 충분한지 판단하여 다음 노드를 결정한다."""
    documents = state["documents"]
    
    if len(documents) >= 3:
        return "generate"  # 충분하면 답변 생성
    else:
        return "rewrite"   # 부족하면 질문 재작성
```

### 라우팅 함수 정의

라우팅 함수는 **State를 받아서 다음 노드 이름(문자열)을 반환**한다.

```python
def route_search(state: SearchState):
    documents = state["documents"]
    attempts = state["attempts"]
    
    # 시도 횟수 초과
    if attempts >= 3:
        return "generate"
    
    # 검색 결과 충분
    if len(documents) >= 3:
        return "generate"
    
    # 검색 결과 부족
    return "rewrite"
```

### Conditional Edge 추가

```python
graph_builder.add_conditional_edges(
    "search",           # 어떤 노드에서
    route_search,       # 라우팅 함수
    {
        "generate": "generate",  # "generate" 반환 시 → generate 노드
        "rewrite": "rewrite",    # "rewrite" 반환 시 → rewrite 노드
    }
)
```

**매핑 딕셔너리의 의미**
- 키: 라우팅 함수가 반환할 수 있는 값
- 값: 실제로 이동할 노드 이름

---

## 7. 반복 (Cycle) 구현

### 질문 재작성 노드 추가

```python
def rewrite(state: SearchState):
    """질문을 다시 작성한다."""
    question = state["question"]
    
    result = llm.invoke([
        HumanMessage(
            content=f"'{question}'이라는 질문으로 문서를 검색했지만 충분한 결과가 없었다. "
            "같은 의도이지만 다른 표현으로 질문을 다시 작성해줘. 질문만 출력해."
        )
    ])
    
    return {"question": result.content}

graph_builder.add_node("rewrite", rewrite)
```

### 순환 구조 만들기

```python
# rewrite → search (다시 검색)
graph_builder.add_edge("rewrite", "search")
```

완성된 흐름:
```
START → search → (충분?) → generate → END
           ↑         ↓
           └─ rewrite ←
```

---

## 8. 그래프 시각화

```python
from IPython.display import Image, display

# 그래프를 Mermaid 다이어그램으로 렌더링
display(Image(graph.get_graph().draw_mermaid_png()))
```

**그래프 시각화의 장점**
- 복잡한 흐름을 한눈에 파악할 수 있다
- 조건 분기와 순환 구조를 시각적으로 확인할 수 있다
- 팀원과 공유하여 로직을 설명하기 쉽다

---

## 9. 스트리밍으로 실행 과정 관찰

### 스트리밍 실행

```python
for event in graph.stream({"question": "AI 반도체 시장의 전망은?"}):
    for node_name, node_output in event.items():
        print(f"[{node_name}] {node_output}")
    print()
```

**출력 예시**
```
[search] {'documents': [...], 'attempts': 1}

[rewrite] {'question': 'AI 칩 시장의 미래 전망은?'}

[search] {'documents': [...], 'attempts': 2}

[generate] {'answer': 'AI 반도체 시장은...'}
```

**스트리밍의 장점**
- 각 노드가 실행될 때마다 중간 결과를 확인할 수 있다
- 디버깅과 모니터링이 쉽다
- 긴 작업일 경우 진행 상황을 사용자에게 보여줄 수 있다

---

## 10. 실습: 글 작성 + 피드백 루프

### 목표

- LLM이 글을 작성한다 (`write` 노드)
- LLM이 글을 평가한다 (`review` 노드)
- 평가 결과에 따라 **통과** 또는 **재작성**을 결정한다

### State 정의

```python
class WritingState(TypedDict):
    topic: str        # 주제
    draft: str        # 작성된 글
    feedback: str     # 피드백
    passed: bool      # 통과 여부
    attempts: int     # 시도 횟수
```

### 노드 정의

```python
def write(state: WritingState):
    """글을 작성하거나 피드백을 반영하여 재작성한다."""
    topic = state["topic"]
    feedback = state.get("feedback", "")
    attempts = state.get("attempts", 0) + 1
    
    if feedback:
        prompt = f"""
주제: {topic}
이전 피드백: {feedback}

조건:
- 2~3문장
- 자연스럽고 명확하게
- 피드백을 반드시 반영

글을 다시 작성해줘.
"""
    else:
        prompt = f"""
주제: {topic}

이 주제에 대해 2~3문장으로 간단한 글을 작성해줘.
"""
    
    result = llm.invoke(prompt)
    
    return {
        "draft": result.content,
        "attempts": attempts
    }

def review(state: WritingState):
    """글을 평가한다."""
    draft = state["draft"]
    
    prompt = f"""
다음 글을 평가해줘.

글:
{draft}

평가 기준:
- 내용이 구체적인가?
- 설명이 충분한가?
- 문장이 자연스러운가?

형식:
- 완벽하면: PASS
- 부족하면: FAIL: 개선할 점
"""
    
    result = llm.invoke(prompt)
    content = result.content.strip()
    
    if content.startswith("PASS"):
        return {
            "passed": True,
            "feedback": ""
        }
    else:
        return {
            "passed": False,
            "feedback": content.replace("FAIL:", "").strip()
        }
```

### 라우팅 함수

```python
def route_writing(state: WritingState):
    """평가 결과에 따라 다음 노드를 결정한다."""
    if state["passed"]:
        return "pass"
    if state["attempts"] >= 3:
        return "pass"  # 3번 시도해도 통과 못하면 종료
    return "fail"
```

### 그래프 구성

```python
graph_builder = StateGraph(WritingState)

graph_builder.add_node("write", write)
graph_builder.add_node("review", review)

graph_builder.add_edge(START, "write")
graph_builder.add_edge("write", "review")
graph_builder.add_conditional_edges(
    "review",
    route_writing,
    {
        "fail": "write",  # 재작성
        "pass": END,      # 종료
    },
)

writing_graph = graph_builder.compile()
```

### 실행

```python
for event in writing_graph.stream({"topic": "AI가 교육에 미치는 영향"}):
    for node_name, value in event.items():
        if node_name == "write":
            print(f"--- 시도 {value['attempts']} ---")
        print(f"[{node_name}] {value}")
    print()
```

**출력 예시**
```
--- 시도 1 ---
[write] {'draft': 'AI는 교육 분야에서 개인화된 학습 경험을 제공함으로써...', 'attempts': 1}

[review] {'passed': False, 'feedback': '구체적인 예시가 부족합니다...'}

--- 시도 2 ---
[write] {'draft': 'AI 기반 학습 플랫폼인 Knewton은 학생의 학습 스타일을 분석하여...', 'attempts': 2}

[review] {'passed': False, 'feedback': '설명이 더 필요합니다...'}

--- 시도 3 ---
[write] {'draft': 'Knewton은 학생의 학습 패턴을 분석하여 맞춤형 문제를 추천하고...', 'attempts': 3}

[review] {'passed': False, 'feedback': '...'}
```

---

## 11. LangGraph vs Chain 비교

| | Chain | LangGraph |
|--|-------|-----------|
| **구조** | 직선 파이프라인 | 그래프 (분기, 순환 가능) |
| **흐름 제어** | 고정된 순서 | 조건부 분기, 반복 |
| **상태 관리** | 단계별 전달만 가능 | State로 누적 관리 |
| **적합한 케이스** | 간단한 변환, 요약 | 검색 재시도, 멀티 에이전트 |
| **복잡도** | 낮음 | 중간~높음 |

**선택 가이드**
- 흐름이 고정되어 있고 단순하다 → **Chain**
- 조건 분기나 반복이 필요하다 → **LangGraph**
- 여러 에이전트가 협업한다 → **LangGraph**

---

## 12. 핵심 개념 정리

### LangGraph 구성 요소

| 개념 | 설명 | 코드 |
|------|------|------|
| **State** | 그래프를 통과하며 누적되는 데이터 | `class MyState(TypedDict): ...` |
| **Node** | 실행 단위 (함수) | `def my_node(state): return {...}` |
| **Edge** | 노드 간 고정된 흐름 | `add_edge("A", "B")` |
| **Conditional Edge** | 조건에 따라 다음 노드 선택 | `add_conditional_edges("A", route, {...})` |
| **START / END** | 그래프의 시작과 끝 | `add_edge(START, "first")` |

### LangGraph 작성 순서

```
1. State 정의 (TypedDict)
2. 노드 함수 작성 (state를 받아서 딕셔너리 반환)
3. StateGraph 생성 및 노드 추가
4. 엣지 추가 (일반 엣지 + 조건부 엣지)
5. 그래프 컴파일
6. 실행 (invoke 또는 stream)
```

### State 업데이트 규칙

- 노드 함수는 **딕셔너리를 반환**하여 State를 업데이트한다
- 반환한 딕셔너리는 기존 State에 **병합**된다
- State의 모든 필드를 반환할 필요는 없다 (업데이트할 필드만 반환)

---

## 13. 실무 활용 시나리오

### 검색 재시도 패턴

```
질문 → 검색 → (충분?) → 답변 생성
          ↑       ↓
          └ 재작성 ←
```

**사용 사례**
- RAG에서 검색 결과가 부족할 때 질문을 바꿔 재검색
- 검색 실패 시 쿼리를 확장하거나 단순화

### 멀티 에이전트 협업

```
      ┌─→ Researcher (검색)
입력 → Router
      └─→ Calculator (계산)
             ↓
           Generator (통합)
```

**사용 사례**
- 질문 타입에 따라 다른 에이전트로 라우팅
- 여러 에이전트의 결과를 모아서 최종 답변 생성

### 검토-수정 루프

```
작성 → 검토 → (통과?) → 완료
  ↑           ↓
  └─ 피드백 반영 ←
```

**사용 사례**
- 코드 생성 후 린트 검사 → 에러 수정 → 재검사
- 글 작성 후 품질 검토 → 피드백 반영 → 재검토

---

## 14. 추가 학습 방향

### LangGraph 고급 기능

- **Checkpointer**: 그래프 실행 중 State를 저장하여 중단/재개
- **Human-in-the-loop**: 사람의 승인을 기다리는 노드
- **Subgraph**: 그래프 안에 또 다른 그래프를 포함
- **Parallel Execution**: 여러 노드를 동시에 실행

### 멀티 에이전트 시스템

- 여러 전문화된 에이전트를 조합하여 복잡한 작업 수행
- Router 에이전트가 질문 타입을 분류하여 적절한 에이전트로 라우팅
- 각 에이전트의 결과를 종합하는 Supervisor 에이전트

### LangGraph와 LangSmith 통합

- LangSmith로 그래프 실행을 트레이싱하고 모니터링
- 각 노드의 실행 시간, 입력/출력, 에러 추적
- 프로덕션 환경에서 그래프 성능 최적화