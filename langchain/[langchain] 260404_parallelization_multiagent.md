# [TIL] LangGraph Parallelization, Plan-and-Execute, Human-in-the-Loop, Multi-Agent

## 1. 오늘 학습한 패턴 개요

복잡한 Agent 워크플로우를 구성하는 4가지 패턴을 학습했다.

| 패턴 | 핵심 | 적합한 상황 |
|------|------|------------|
| **Parallelization** | 독립 작업을 동시에 실행 | 다중 분석, 크롤링, Voting |
| **Plan-and-Execute** | 전체 계획 수립 후 단계별 실행 | 멀티스텝 조사, 보고서 작성 |
| **Human-in-the-Loop** | 위험 작업 전 사람 승인 | 결제, 삭제, 이메일 발송 |
| **Multi-Agent** | 전문 Agent 분리 후 협업 | 역할이 명확히 나뉘는 복잡한 작업 |

---

## 2. Parallelization

### Fan-out / Fan-in

같은 출발 노드에서 여러 노드를 연결하면 LangGraph가 자동으로 **병렬 실행**한다.

```
START → prepare ─→ legal_analysis    ─┐
                 ─→ financial_analysis ─┼→ summarize → END
                 ─→ technical_analysis ─┘
```

State에 `Annotated[list, operator.add]`를 사용해 각 노드의 결과를 하나의 리스트에 누적한다. **병렬 노드의 결과 순서는 보장되지 않는다** — 순서가 중요하면 결과에 식별자를 포함시키고 후처리에서 정렬해야 한다.

노드 함수가 일반 `def`이고 `invoke`(동기)로 실행해도 병렬 처리가 된다. LangGraph는 내부적으로 비동기 런타임 위에서 동작하기 때문이다. `async def` + `ainvoke`는 노드 안에서 `await`나 `Semaphore` 같은 비동기 기능을 직접 사용할 때만 필요하다.

### Send API (동적 병렬)

Fan-out/Fan-in은 컴파일 시점에 병렬 노드가 고정되지만, `Send` API는 **런타임에 동적으로** 병렬 노드를 생성한다.

```python
from langgraph.types import Send

def generate_tasks(state: SendState):
    return [Send("analyze_topic", {"topic": t}) for t in state["topics"]]

builder.add_conditional_edges("split", generate_tasks, ["analyze_topic"])
```

`Send(노드이름, state)`를 반환하면 그 수만큼 병렬 실행된다. `add_conditional_edges`의 세 번째 인자로 가능한 목적지 노드를 명시해야 컴파일 시 그래프를 구성할 수 있다.

### Rate Limiting

병렬 처리로 동시에 많은 요청을 보내면 API Rate Limit(429)에 걸리기 쉽다. `asyncio.Semaphore`로 동시 실행 수를 제한해 회피한다.

```python
semaphore = asyncio.Semaphore(3)  # 동시에 최대 3개

async def analyze_node(state):
    async with semaphore:
        response = await llm.ainvoke(...)
    return {"results": [...]}
```

### Voting 패턴

하나의 질문에 대해 여러 LLM 응답을 동시에 생성하고 최선의 답변을 선택하는 패턴이다. Temperature를 높여 다양한 후보를 생성하고, Judge LLM(Temperature=0)이 평가한다. 마케팅 카피, 코드 생성, 번역 등 품질 변동이 큰 작업에서 유용하다.

---

## 3. Plan-and-Execute

### ReAct와의 차이

| | ReAct | Plan-and-Execute |
|---|---|---|
| 전략 | 한 단계씩 결정 | 전체 계획 먼저 수립 |
| 장점 | 단순, 빠름 | 복잡한 태스크에 강함 |
| 단점 | 큰 그림을 놓칠 수 있음 | 계획 수립에 비용 발생 |

### 동작 흐름

```
입력 → Planner → Executor → Replanner → Executor → ... → 최종 응답
```

Replanner는 매 단계 실행 후 **남은 계획을 수정하거나 최종 응답을 생성**한다. 항상 `state["plan"][0]`을 실행하고, Replanner가 완료된 단계를 제거한 새 계획을 반환하기 때문이다.

```
초기 계획: [A, B, C] → execute A → replan → [B, C] → execute B → ...
```

### State 설계 핵심

```python
class PlanExecuteState(TypedDict):
    input: str
    plan: list[str]                            # 최신 값만 필요 → 덮어쓰기
    past_steps: Annotated[list, operator.add]  # 누적 필요 → reducer
    response: str
```

- **누적이 필요한 데이터** (실행 이력) → `operator.add` reducer 사용
- **최신 값만 필요한 데이터** (현재 계획) → reducer 없이 덮어쓰기

### Replanner에서 Union 타입 활용

```python
from typing import Union

class Response(BaseModel):
    """최종 응답을 할 수 있을 때"""
    response: str

class Plan(BaseModel):
    """아직 단계가 남았을 때"""
    steps: list[str]

replanner = llm.with_structured_output(Union[Response, Plan])
```

LLM이 상황에 따라 두 스키마 중 하나를 선택해 응답한다.

### 컨텍스트 관리

멀티스텝이 쌓이면 context window 압박이 생긴다. 가장 효율적인 방법은 프롬프트로 간결한 결과를 유도하는 것이다.

```python
# Bad: 모호한 지시
"다음 작업을 수행하고 간결하게 정리하세요"

# Good: 구체적인 지시
"다음 작업을 수행하고 핵심 수치와 사실 위주로 정리하세요. 부가 설명은 생략하세요"
```

---

## 4. Human-in-the-Loop

### 핵심 원칙

**되돌리기 어려운 작업 전에는 반드시 사람의 승인을 받는다.**

| 보안 레벨 | 동작 | 예시 |
|-----------|------|------|
| 안전 | 자동 실행 | 검색, 날씨 조회 |
| 위험 | interrupt 필수 | 결제, 삭제, 이메일 발송 |

### `interrupt_before` / `interrupt_after`

`compile()` 시 중단 지점을 지정한다. **Checkpointer가 필수**다 — 중단 시점의 상태를 저장해야 이어서 실행할 수 있기 때문이다.

```python
graph = builder.compile(
    checkpointer=MemorySaver(),
    interrupt_before=["tools"]
)

# 중단된 그래프 이어서 실행
graph.invoke(None, config)  # None = 새 입력 없이 이어서

# 거부 시 상태를 수정하고 재실행
graph.update_state(config, {"messages": [cancel_msg]}, as_node="agent")
graph.invoke(None, config)
```

`as_node="agent"`를 지정하면 해당 메시지를 **agent가 생성한 것으로 취급**해, 대기 중이던 tool 호출을 대체한다.

### `interrupt()` 함수

노드 **내부에서** 직접 중단을 호출하는 방식으로 더 세밀한 제어가 가능하다.

```python
from langgraph.types import interrupt, Command

def my_node(state):
    answer = interrupt("사용자에게 보여줄 메시지")  # 여기서 중단
    return {"result": answer}

# 재개 시
graph.invoke(Command(resume="승인"), config)
```

**주의**: resume 시 노드가 **처음부터 다시 실행**된다. DB 쓰기나 외부 API 호출 같은 부작용(side effect)은 반드시 `interrupt()` 뒤에 배치해야 한다.

| 비교 | `interrupt_before/after` | `interrupt()` |
|------|--------------------------|---------------|
| 지정 시점 | `compile()` 시 | 노드 실행 중 |
| 값 전달 | `update_state`로 상태 수정 | `Command(resume=값)` |
| 재실행 | 중단된 노드부터 이어서 | 노드 전체를 처음부터 |

---

## 5. Multi-Agent

### Multi-Agent가 필요한 이유

하나의 Agent에 모든 것을 넣으면 프롬프트가 비대해지고, Tool이 많아질수록 LLM의 선택 정확도가 떨어진다. **전문 Agent를 분리하고 협업**시키면 각 Agent의 프롬프트가 짧아지고 Tool 수가 줄어 정확도가 올라간다.

### Supervisor 패턴

**중앙 관리자(Supervisor)**가 작업을 분배하고 결과를 종합한다.

```
사용자 → Supervisor ─→ researcher ─┐
                    ─→ writer     ─┼→ Supervisor → 최종 답변
                    ─→ reviewer   ─┘
```

Supervisor가 Structured Output으로 `next` 필드에 다음 Agent를 기록하면 `conditional_edges`가 해당 노드로 라우팅한다. 프롬프트에는 순서 대신 **판단 기준**을 제공해 LLM이 맥락을 보고 동적으로 결정하도록 한다.

### Swarm 패턴

**중앙 관리자 없이** Agent끼리 `Command(goto=...)`로 직접 작업을 넘긴다.

```python
def flight_agent(state):
    # 작업 수행 후 다음 Agent를 스스로 결정
    return Command(goto="hotel_agent", update={"messages": [...]})
```

그래프 시각화에서 Agent 간 엣지가 없다 — `Command`가 런타임에 동적으로 전환하기 때문이다.

### Supervisor vs Swarm

| 항목 | Supervisor | Swarm |
|------|-----------|-------|
| 전환 결정 | Supervisor가 결정 | 현재 Agent가 결정 |
| 구현 방식 | Structured Output + conditional_edges | Command(goto=...) |
| 흐름 가시성 | 높음 | 중간 |
| 적합한 상황 | 복잡한 워크플로우, 명확한 역할 분리 | 대화형 서비스, 자연스러운 전환 |

> Swarm은 Agent끼리 서로를 계속 호출해 무한 루프에 빠질 수 있으므로 `recursion_limit` 설정에 주의한다.

### Subgraph

각 Agent를 독립적인 그래프로 구성한 뒤 부모 그래프의 노드로 등록할 수 있다. 부모와 State 스키마가 다르면 **래퍼 함수**로 State를 변환한다.

```python
def subgraph_wrapper(state: ParentState):
    result = subgraph.invoke({"query": state["messages"][-1].content})
    return {"messages": [AIMessage(content=result["output"])]}

builder.add_node("search_agent", subgraph_wrapper)
```

Subgraph 내부에서 부모 그래프의 노드로 직접 이동할 때는 `Command(goto="parent_node", graph=Command.PARENT)`를 사용한다.

---

## 6. 핵심 개념 정리

| 개념 | 설명 |
|------|------|
| `Annotated[list, operator.add]` | 병렬 노드 결과를 하나의 리스트에 누적 |
| `Send(노드, state)` | 런타임에 동적으로 병렬 노드 생성 |
| `asyncio.Semaphore(N)` | 동시 실행 수를 N개로 제한해 Rate Limit 회피 |
| `interrupt_before` | 특정 노드 실행 전 그래프 중단 (compile 시 지정) |
| `interrupt()` | 노드 내부에서 동적으로 중단, resume 시 노드 처음부터 재실행 |
| `Command(resume=값)` | interrupt()로 중단된 노드에 값 전달하며 재개 |
| `update_state(config, ..., as_node=)` | 특정 노드가 생성한 것으로 취급해 상태 수정 |
| `Command(goto=..., graph=Command.PARENT)` | Subgraph에서 부모 그래프의 노드로 이동 |