# [TIL] LangGraph 패턴 선택 가이드 — 어떤 문제에 어떤 패턴을?

## 1. 오늘 학습한 내용 개요

개별 패턴을 배운 뒤, **"언제 어떤 패턴을 쓸 것인가"** 를 다뤘다. 패턴을 아는 것과 적재적소에 쓰는 것은 다르다.

핵심 질문은 하나다: **"지금 내 문제가 왜 단순 LLM 호출로 안 되는가?"** 그 답이 패턴을 결정한다.

| 문제 증상 | 선택할 패턴 |
|-----------|------------|
| 어떤 Tool을 몇 번 써야 할지 모른다 | **ReAct** |
| 입력 유형에 따라 처리가 달라야 한다 | **Router** |
| 생성 품질이 불안정하다 | **Reflection** |
| 명확한 품질 기준이 있다 | **Evaluator-Optimizer** |
| 여러 단계를 순서대로 밟아야 한다 | **Plan-and-Execute** |
| 독립적인 작업을 빠르게 처리해야 한다 | **Parallelization** |
| 되돌리기 어려운 작업이 포함된다 | **Human-in-the-Loop** |
| 전문 분야가 나뉘고 협업이 필요하다 | **Multi-Agent** |

---

## 2. 전체 패턴 요약

| 패턴 | 핵심 아이디어 | 제어 방식 | 적합한 경우 |
|------|-------------|----------|------------|
| 단순 LLM Chain | 프롬프트 → 응답 | 없음 (1회 호출) | Tool 없이 답할 수 있을 때 |
| 단순 RAG | 검색 → 응답 | 고정 파이프라인 | 문서 검색이 필요하지만 전략을 동적으로 바꿀 필요는 없을 때 |
| ReAct | Think → Act → Observe 루프 | LLM이 Tool 선택 | 어떤 Tool을 몇 번 쓸지 모를 때 |
| Router | 입력 분류 → 경로 분기 | 개발자가 분기 설계 | 입력 유형별 다른 처리 |
| Reflection | 생성 → 자기 검토 → 개선 | LLM이 자기 평가 | 품질이 불안정한 생성 태스크 |
| Evaluator-Optimizer | 루브릭 기반 평가 → 개선 | 루브릭이 판단 | 명확한 품질 기준이 있을 때 |
| Plan-and-Execute | 계획 → 단계별 실행 → Re-plan | 계획이 흐름 결정 | 여러 단계를 순서대로 밟는 복잡한 태스크 |
| Parallelization | 독립 작업 동시 실행 | 개발자가 분기 | 독립적 작업 여러 개를 빠르게 |
| Human-in-the-Loop | 중요 지점에서 사람 승인 | 사람이 개입 | 되돌리기 어려운 작업 |
| Multi-Agent (Supervisor) | 관리자가 전문 Agent에 분배 | Supervisor가 조율 | 전문 분야가 다른 여러 Agent |
| Multi-Agent (Swarm) | Agent 간 자율 handoff | Agent가 자율 전환 | 대화 흐름에 따라 담당자 변경 |

---

## 3. 패턴 조합

실무에서는 패턴 하나만 쓰는 경우가 드물다. **패턴은 레고 블록처럼** 조합해서 쓰고, LangGraph의 Subgraph 기능으로 자연스럽게 연결할 수 있다.

| 조합 | 예시 |
|------|------|
| RAG + ReAct (Agentic RAG) | 검색 결과가 부족하면 쿼리를 바꿔 재검색하는 동적 검색 |
| Router + ReAct | 문의 유형 분류 → Tool이 필요한 경우만 ReAct로 처리 |
| Plan-and-Execute + ReAct | 계획 수립 후 각 단계를 ReAct Agent로 실행 |
| Supervisor + Reflection | 전문 Agent 결과를 Supervisor가 검토 후 재작업 지시 |
| ReAct + Human-in-the-Loop | Agent가 위험한 Tool 호출 전 사람에게 확인 |
| Router + Parallelization | 입력 분류 후 여러 분석을 병렬 실행 |

### 조합 구현 예시: Router + Parallelization

입력을 분류하고, "비교 분석" 요청이면 항목별로 병렬 분석 후 결과를 종합한다.

```python
class State(TypedDict):
    messages: Annotated[list, add_messages]
    category: str
    items: list[str]
    results: Annotated[list[str], operator.add]  # 병렬 결과 누적

class AnalyzeInput(TypedDict):
    """Send로 전달되는 개별 분석 입력. State와는 별도의 타입이다."""
    item: str

def classify(state: State):
    response = llm.invoke(
        f"다음 요청을 'compare' 또는 'general' 중 하나로 분류해. 단어 하나만 답해.\n\n{state['messages'][-1].content}"
    )
    return {"category": response.content.strip().lower()}

def fan_out(state: State):
    """항목 수만큼 병렬 분석 노드를 생성한다."""
    return [Send("analyze", {"item": item}) for item in state["items"]]

def analyze(state: AnalyzeInput):
    """Send가 넘긴 AnalyzeInput을 받아 개별 항목을 분석한다."""
    response = llm.invoke(f"{state['item']}의 주요 특징을 2줄로 요약해.")
    return {"results": [f"**{state['item']}**: {response.content}"]}
```

**핵심 포인트**: `Send`로 동적 병렬 분기할 때, 병렬 노드가 받는 State 타입(`AnalyzeInput`)은 부모 State와 **분리해서 정의**해야 한다. 두 타입이 섞이면 누락된 필드로 오류가 발생한다.

---

## 4. 비용과 지연 시간

패턴이 복잡할수록 LLM 호출 수가 늘고, 비용과 지연이 증가한다.

| 패턴 | LLM 호출 수 | 비용 특성 | 지연 시간 |
|------|------------|----------|----------|
| 단순 Chain | 1회 | 최저 | 최단 |
| ReAct | 2~10+회 | Tool 수에 비례 | 중간~긴 |
| Reflection | 2~6회 | 반복 수에 비례 | 중간 |
| Plan-and-Execute | 3~15+회 | 단계 수에 비례 | 긴 |
| Multi-Agent | 5~20+회 | Agent 수 × 호출 수 | 가장 긴 |
| Parallelization | N회 (동시) | 병렬 수에 비례 | 순차보다 짧음 |

> **원칙**: 항상 가장 단순한 패턴부터 시도하고, 부족할 때만 복잡한 패턴으로 올린다.

---

## 5. 패턴 선택 실습 — 시나리오별 정답

| 시나리오 | 적합한 패턴 조합 |
|---------|----------------|
| 환불 요청 처리 (정책 검색 → 조건 확인 → 담당자 승인) | RAG + ReAct + Human-in-the-Loop |
| 질문 유형(일반/기술/영업)에 따라 다른 프롬프트로 답변 | Router |
| 블로그 글 작성 (SEO, 톤 일관성, 최소 글자 수 기준 충족) | Evaluator-Optimizer |
| 경쟁사 5곳 조사 → 비교표 → 종합 보고서 | Plan-and-Execute + Parallelization + ReAct |

---

## 6. 핵심 개념 정리

| 개념 | 설명 |
|------|------|
| 패턴 선택의 출발점 | "왜 단순 LLM 호출로 안 되는가?"를 먼저 묻는다 |
| 패턴 조합의 단위 | 각 패턴은 독립 레고 블록 — Subgraph로 중첩 가능 |
| `Send` + 분리된 State 타입 | 동적 병렬 분기 시 병렬 노드 전용 TypedDict를 별도 정의한다 |
| 비용/지연 트레이드오프 | 복잡한 패턴 = 많은 호출 = 높은 비용 + 긴 지연 |
| 단순성 우선 원칙 | 단순한 패턴부터 시작, 필요할 때만 복잡도를 높인다 |