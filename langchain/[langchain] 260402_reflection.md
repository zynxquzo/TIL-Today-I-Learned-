# [TIL] LangGraph Reflection & Evaluator-Optimizer 패턴

## 1. 자기 개선 패턴의 필요성

Agent가 생성한 결과를 **자동으로 검토하고 개선**하는 두 가지 패턴을 학습했다.

| 패턴 | 핵심 메커니즘 | 평가 방식 | 종료 조건 |
|------|-------------|-----------|----------|
| **Reflection** | 생성 → 자기 검토 → 수정 루프 | 정성적 (자연어 피드백) | 고정 횟수 |
| **Evaluator-Optimizer** | 생성 → 루브릭 채점 → 미달 항목 개선 | 정량적 (점수 + pass/fail) | 점수 기준 달성 시 조기 종료 |

---

## 2. Reflection 패턴

### 동작 구조

가장 단순한 자기 개선 루프다.

```
START → generate → reflect → should_continue? → generate (반복)
                                              → END (종료)
```

**동작 순서**
1. **generate** 노드가 초안을 작성한다
2. **reflect** 노드가 초안을 읽고 자연어 피드백을 준다 (톤, 빠진 정보, 길이 등)
3. **should_continue**가 반복 횟수를 체크한다 — 상한에 도달하면 종료
4. 종료 전이면 피드백을 반영해 다시 generate로 돌아간다

State에 `messages`를 누적하므로 generate 노드는 이전 피드백을 자연스럽게 참고한다.

### State 정의

```python
from typing import Annotated, TypedDict
from langgraph.graph.message import add_messages

class ReflectionState(TypedDict):
    messages: Annotated[list, add_messages]
    iteration: int

MAX_ITERATIONS = 3
```

### 노드 구현

**generate 노드 - 초안 작성 또는 수정**

```python
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

def generate(state: ReflectionState):
    """초안을 작성하거나 피드백을 반영해 수정한다."""
    system = SystemMessage(content=(
        "너는 고객 커뮤니케이션 전문가다. "
        "이전 피드백이 있으면 반영해서 이메일을 수정해. "
        "이메일 본문만 출력해."
    ))
    # 전체 messages를 넘기면 generate는 이전 피드백까지 자연스럽게 참고한다
    response = llm.invoke([system] + state["messages"])
    return {
        # name으로 역할을 구분한다 — reflect에서 generator의 메시지만 골라내기 위함
        "messages": [AIMessage(content=response.content, name="generator")],
        "iteration": state.get("iteration", 0) + 1,
    }
```

**reflect 노드 - 피드백 생성**

```python
def reflect(state: ReflectionState):
    """초안을 검토하고 구체적인 피드백을 준다."""
    system = SystemMessage(content=(
        "너는 비즈니스 이메일 리뷰어다. "
        "다음 관점에서 피드백을 줘:\n"
        "1. 톤: 진정성 있는 사과인가?\n"
        "2. 빠진 정보: 구체적 해결 방안이 있는가?\n"
        "3. 길이: 간결한가?\n\n"
        "개선이 필요한 부분만 구체적으로 지적해. "
        "잘 된 부분은 언급하지 마."
    ))
    # 리뷰어는 최신 초안만 보면 된다 — 이전 대화 맥락 없이 객관적으로 평가
    last_ai = [m for m in state["messages"] if m.name == "generator"][-1]
    response = llm.invoke([system, HumanMessage(content=last_ai.content)])
    # HumanMessage로 넣는 이유: generate 노드의 LLM 입장에서 피드백은
    # "사용자 지시"처럼 작용해야 하므로 AIMessage가 아닌 HumanMessage로 넣는다
    return {
        "messages": [HumanMessage(content=response.content, name="reviewer")],
    }
```

**should_continue - 반복 조건 체크**

```python
def should_continue(state: ReflectionState):
    if state["iteration"] >= MAX_ITERATIONS:
        return "end"
    return "continue"
```

### 그래프 구성

```python
from langgraph.graph import StateGraph, START, END

builder = StateGraph(ReflectionState)

builder.add_node("generate", generate)
builder.add_node("reflect", reflect)

builder.add_edge(START, "generate")
builder.add_edge("generate", "reflect")
builder.add_conditional_edges(
    "reflect",
    should_continue,
    {"continue": "generate", "end": END},
)

reflection_graph = builder.compile()
```

### 실행 예시

```python
task = "배송이 2주 지연된 고객에게 사과 이메일을 작성해줘. 고객명: 김민수, 주문번호: ORD-2024-1234"

result = reflection_graph.invoke(
    {"messages": [HumanMessage(content=task)], "iteration": 0}
)

print(f"총 반복 횟수: {result['iteration']}")
print(f"총 메시지 수: {len(result['messages'])}")

for msg in result["messages"]:
    name = getattr(msg, "name", None) or msg.type
    print(f"\n[{name}]")
    print(msg.content)
```

### Reflection의 한계

반복할수록 피드백이 반영되어 품질이 올라가지만, 다음과 같은 한계가 있다:

- 피드백이 **자연어**라서 "얼마나 좋아졌는지" 정량화할 수 없다
- "충분히 좋다"의 기준이 없으므로 항상 `MAX_ITERATIONS`까지 반복한다
- 반복할수록 피드백이 점점 미세해진다 — 3번째 리뷰어는 "깊이 유감스럽게" → "진심으로 안타깝게" 같은 표현 수준의 차이만 지적하는데, 이것이 실질적 개선인지 알 수 없다
- 반복이 많아지면 원래 의도에서 벗어나거나 과하게 수정되는 경우도 있다 (항상 품질이 올라가는 것은 아니다)

**이 문제를 해결하는 것이 Evaluator-Optimizer 패턴이다.**

---

## 3. Evaluator-Optimizer 패턴

### Reflection과의 차이점

| | Reflection | Evaluator-Optimizer |
|---|---|---|
| 평가 방식 | 자연어 피드백 | 점수 (1~10) + pass/fail |
| 종료 조건 | 고정 횟수 | 점수 기준 달성 시 조기 종료 |
| 개선 지시 | 전체적 피드백 | 미달 항목만 타겟팅 |
| 재현성 | 낮음 | 높음 (루브릭 고정) |

### 동작 구조

```
START → generate → evaluate → pass? → END
                      ↓ fail
                   optimize → generate (재시도)
```

### 루브릭(Rubric) 설계

루브릭은 **평가 항목과 점수 기준을 정리한 채점표**다. 좋은 루브릭은 구체적이고 측정 가능하다.

| 나쁜 루브릭 | 좋은 루브릭 |
|------------|------------|
| "매력적인가?" | "감정을 자극하는 단어가 1개 이상 포함되어 있는가?" |
| "적절한 길이인가?" | "50자 이상 150자 이하인가?" |
| "좋은 카피인가?" | "행동 유도(CTA)가 포함되어 있는가?" |

**루브릭은 도메인마다 완전히 달라진다.** 마케팅 카피라면 "감정 자극, CTA 포함, 글자 수", 기술 문서라면 "정확성, 재현 가능성, 코드 포함" 등이 핵심 기준이 된다.

### Pydantic 모델 정의

```python
from pydantic import BaseModel, Field

class CriterionScore(BaseModel):
    name: str = Field(description="평가 항목명")
    score: int = Field(description="1~10 점수", ge=1, le=10)
    reason: str = Field(description="점수 근거 (1문장)")

class EvaluationResult(BaseModel):
    criteria: list[CriterionScore] = Field(description="각 항목별 평가")
    summary: str = Field(description="전체 평가 요약 (1~2문장)")
```

### State 정의

```python
from operator import add

class EvalOptState(TypedDict):
    task: str          # 입력: 작성 지시
    copy: str          # 현재 생성된 카피
    evaluation: dict   # EvaluationResult를 dict로 저장
    iteration: int     # 반복 횟수
    history: Annotated[list, add]  # 이전 시도 기록

MAX_ITERATIONS = 4
PASS_THRESHOLD = 8  # 8점 이상이어야 통과
```

**`history`의 각 원소 구조**
```python
{
    "copy": "이전에 생성한 카피",
    "evaluation": {...},  # EvaluationResult.model_dump() 결과
    "improvement": "미달 항목에 대한 개선 지시",
}
```

### 노드 구현

**generate 노드 - 생성 또는 개선**

```python
def generate_copy(state: EvalOptState):
    """카피를 생성한다. 이전 평가가 있으면 optimize 노드의 지시를 참고한다."""
    task = state["task"]
    history = state.get("history", [])

    if history:
        last = history[-1]
        prompt = (
            f"작업: {task}\n\n"
            f"이전 카피:\n{last['copy']}\n\n"
            f"개선 지시:\n{last['improvement']}\n\n"
            "위 지시를 반영해서 카피를 다시 작성해. 카피만 출력해."
        )
    else:
        prompt = f"다음 마케팅 카피를 작성해. 카피만 출력해.\n\n작업: {task}"

    response = llm.invoke(prompt)
    return {"copy": response.content}
```

**evaluate 노드 - 루브릭 채점**

```python
def evaluate_copy(state: EvalOptState):
    """루브릭에 따라 카피를 채점한다. Structured Output 사용."""
    copy = state["copy"]
    evaluator = eval_llm.with_structured_output(EvaluationResult)

    result = evaluator.invoke(f"""\
다음 마케팅 카피를 평가해.

카피:
{copy}

평가 기준 (각 1~10점):
1. clarity: 메시지가 명확하고 이해하기 쉬운가?
2. emotion: 감정을 자극하는 표현이 있는가?
3. cta: 행동 유도(구매, 클릭 등)가 포함되어 있는가?
4. conciseness: 간결한가? (불필요한 표현 없는가?)""")

    # pass/fail 판정은 LLM이 아닌 코드로 수행한다 — 점수 기반 판정의 핵심은 재현성이다
    evaluation = result.model_dump()
    evaluation["overall_pass"] = all(
        c["score"] >= PASS_THRESHOLD for c in evaluation["criteria"]
    )

    return {
        "evaluation": evaluation,
        "iteration": state.get("iteration", 0) + 1,
    }
```

**optimize 노드 - 미달 항목 개선 지시**

```python
def optimize_copy(state: EvalOptState):
    """미달 항목만 골라서 구체적인 개선 지시를 만든다."""
    evaluation = state["evaluation"]
    failed = [c for c in evaluation["criteria"] if c["score"] < PASS_THRESHOLD]
    items = "\n".join(
        f"- {c['name']} ({c['score']}점): {c['reason']}" for c in failed
    )

    return {
        "history": [{
            "copy": state["copy"],
            "evaluation": evaluation,
            "improvement": f"다음 항목을 개선해:\n{items}",
        }],
    }
```

**should_continue_eval - 조건부 라우팅**

```python
def should_continue_eval(state: EvalOptState):
    if state["evaluation"]["overall_pass"]:
        return "end"  # 모든 항목 8점 이상 → 종료
    if state["iteration"] >= MAX_ITERATIONS:
        return "end"  # 상한 도달 시에도 종료
    return "fail"     # 개선 필요 → optimize로
```

### 그래프 구성

```python
builder = StateGraph(EvalOptState)

builder.add_node("generate", generate_copy)
builder.add_node("evaluate", evaluate_copy)
builder.add_node("optimize", optimize_copy)

builder.add_edge(START, "generate")
builder.add_edge("generate", "evaluate")
builder.add_conditional_edges(
    "evaluate",
    should_continue_eval,
    {"end": END, "fail": "optimize"},
)
builder.add_edge("optimize", "generate")

eval_opt_graph = builder.compile()
```

### 실행 예시

```python
task = "AI 기반 영어 학습 앱 'SmartLingo' 출시 광고 카피. 타겟: 20~30대 직장인. 핵심 가치: 출퇴근 10분으로 영어 실력 향상."

for event in eval_opt_graph.stream({"task": task, "iteration": 0, "history": []}):
    node_name = list(event.keys())[0]
    state_update = event[node_name]

    if node_name == "generate":
        print(f"\n{'=' * 60}")
        print(f"[generate] 카피 생성")
        print(state_update["copy"])

    elif node_name == "evaluate":
        iteration = state_update["iteration"]
        evaluation = state_update["evaluation"]
        status = "PASS ✓" if evaluation["overall_pass"] else "FAIL ✗"
        print(f"\n[evaluate] 반복 {iteration} — {status}")
        for c in evaluation["criteria"]:
            mark = "PASS" if c["score"] >= PASS_THRESHOLD else "FAIL"
            print(f"  {c['name']}: {c['score']}/10 ({mark}) - {c['reason']}")

    elif node_name == "optimize":
        h = state_update["history"][0]
        print(f"\n[optimize] 개선 지시")
        print(h["improvement"])
```

### 핵심 포인트

- `evaluate` 노드가 Structured Output으로 **정량 점수**를 반환한다
- `overall_pass` 판정은 LLM이 아닌 **코드로** 수행한다 — 점수를 매기는 건 LLM, 합격 여부는 코드가 결정
- `overall_pass`로 **조기 종료**가 가능하다 (불필요한 반복 방지)
- `optimize` 노드가 **미달 항목만** 타겟팅한다 (이미 좋은 부분은 건드리지 않음)
- `MAX_ITERATIONS`로 무한 반복을 방지한다

**주의**: 이 예제에서는 같은 LLM이 생성과 평가를 모두 수행한다. 실무에서는 평가에 더 강한 모델을 쓰거나, 생성 모델과 별도의 모델을 사용해서 자기 평가 편향(self-evaluation bias)을 줄이기도 한다.

---

## 4. Evaluator를 테스트에 재활용하기

Evaluator-Optimizer의 채점 로직은 품질 테스트에 그대로 재활용할 수 있다.

**회귀 테스트 패턴**
1. 테스트 케이스(입력-기대 품질 기준 쌍)를 미리 작성해둔다
2. 프롬프트를 변경할 때마다 실행해서 점수가 떨어진 케이스가 있는지 확인한다
3. 프롬프트를 수정하면 기존에 잘 되던 케이스가 망가질 수 있기 때문에, 이런 회귀 테스트가 중요하다

**실무 활용**
- 테스트 케이스는 점진적으로 추가한다
- CI/CD에 넣어 자동화할 수 있다

---

## 5. 실습: 제품 리뷰 요약

제품 리뷰를 **한 문단(3~5문장)**으로 요약하는 과제를 두 가지 패턴으로 구현했다.

### Part 1: Reflection 패턴

```python
class ReflectionState(TypedDict):
    messages: Annotated[list, add_messages]
    iteration: int

def generate(state: ReflectionState):
    system = SystemMessage(content=(
        "너는 제품 리뷰 요약 전문가다. "
        "긴 리뷰를 한 문단(3~5문장)으로 요약해. "
        "장점, 단점, 추천 대상을 균형 있게 포함해. "
        "이전 피드백이 있으면 반영해서 수정해. 요약문만 출력해."
    ))
    response = llm.invoke([system] + state["messages"])
    return {
        "messages": [AIMessage(content=response.content, name="generator")],
        "iteration": state.get("iteration", 0) + 1,
    }

def reflect(state: ReflectionState):
    system = SystemMessage(content=(
        "너는 제품 리뷰 요약 편집자다. 다음 관점에서 피드백을 줘: "
        "1. 정보 누락: 원문의 핵심 정보가 빠졌는가? "
        "2. 균형: 장점과 단점이 균형 있게 반영되었는가? "
        "3. 간결성: 불필요한 표현이 있는가? "
        "4. 구체성: 모호한 표현 대신 구체적 수치나 사례가 있는가? "
        "개선이 필요한 부분만 구체적으로 지적해."
    ))
    last_ai = [m for m in state["messages"] if m.name == "generator"][-1]
    response = llm.invoke([system, HumanMessage(content=last_ai.content)])
    return {
        "messages": [HumanMessage(content=response.content, name="reviewer")],
    }
```

### Part 2: Evaluator-Optimizer 패턴

**루브릭 설계 (각 1~10점)**
1. **completeness**: 원문의 핵심 정보(음질, 노캔, 배터리, 착용감, 통화, 가격)가 빠짐없이 반영되었는가?
2. **balance**: 장점과 단점이 한쪽에 치우치지 않고 균형 있게 서술되었는가?
3. **conciseness**: 3~5문장 이내로 간결하게 작성되었는가? 불필요한 수식어가 없는가?
4. **recommendation**: 어떤 사용자에게 적합하고 어떤 사용자에게 부적합한지 명확히 언급했는가?

```python
class EvalOptState(TypedDict):
    task: str
    review: str
    evaluation: dict
    iteration: int
    history: Annotated[list, add]

def generate_copy(state: EvalOptState):
    task = state["task"]
    history = state.get("history", [])

    if history:
        last = history[-1]
        prompt = (
            f"작업: {task}\n\n"
            f"이전 요약:\n{last['summary']}\n\n"
            f"개선 지시:\n{last['improvement']}\n\n"
            "위 지시를 반영해서 리뷰 요약을 다시 작성해. 리뷰 요약만 출력해."
        )
    else:
        prompt = f"다음 리뷰 요약을 작성해. 리뷰 요약만 출력해.\n\n작업: {task}"

    response = llm.invoke(prompt)
    return {"review": response.content}

def evaluate_copy(state: EvalOptState):
    review = state["review"]
    evaluator = eval_llm.with_structured_output(EvaluationResult)

    result = evaluator.invoke(f"""\
다음 리뷰 요약을 평가해.

리뷰 요약:
{review}

평가 기준 (각 1~10점):
1. completeness: 원문의 핵심 정보(음질, 노캔, 배터리, 착용감, 통화, 가격)가 빠짐없이 반영되었는가?
2. balance: 장점과 단점이 한쪽에 치우치지 않고 균형 있게 서술되었는가?
3. conciseness: 3~5문장 이내로 간결하게 작성되었는가? 불필요한 수식어가 없는가?
4. recommendation: 어떤 사용자에게 적합하고 어떤 사용자에게 부적합한지 명확히 언급했는가?""")

    evaluation = result.model_dump()
    evaluation["overall_pass"] = all(
        c["score"] >= PASS_THRESHOLD for c in evaluation["criteria"]
    )

    return {
        "evaluation": evaluation,
        "iteration": state.get("iteration", 0) + 1,
    }

def optimize_copy(state: EvalOptState):
    evaluation = state["evaluation"]
    failed = [c for c in evaluation["criteria"] if c["score"] < PASS_THRESHOLD]
    items = "\n".join(
        f"- {c['name']} ({c['score']}점): {c['reason']}" for c in failed
    )

    return {
        "history": [{
            "summary": state["review"],
            "evaluation": evaluation,
            "improvement": f"다음 항목을 개선해:\n{items}",
        }],
    }
```

---

## 6. 두 패턴 비교

### 언제 Reflection을 사용하는가?

- 평가 기준이 **주관적이고 유동적**일 때
- "창의성", "톤", "스타일" 같은 정량화하기 어려운 기준
- 빠른 프로토타이핑 단계
- 루브릭 설계가 어려운 초기 탐색 단계

### 언제 Evaluator-Optimizer를 사용하는가?

- 평가 기준이 **구체적이고 측정 가능**할 때
- "길이", "포함 여부", "정확성" 같은 명확한 기준
- **조기 종료**로 비용을 절약하고 싶을 때
- **재현성**이 중요한 프로덕션 환경
- 테스트 자동화가 필요할 때

### 실무 활용 팁

| 상황 | 권장 패턴 |
|------|----------|
| 마케팅 카피 초안 작성 | Reflection (창의성 중시) |
| 마케팅 카피 A/B 테스트 | Evaluator-Optimizer (측정 가능한 지표) |
| 기술 문서 작성 | Evaluator-Optimizer (정확성, 완성도) |
| 소설/시나리오 작성 | Reflection (예술성, 톤) |
| 데이터 추출/변환 | Evaluator-Optimizer (정확성, 형식) |

---

## 7. 핵심 개념 정리

### Reflection 패턴

| 개념 | 설명 |
|------|------|
| **generate** | 초안 작성 또는 피드백 반영 수정 |
| **reflect** | 자연어 피드백 생성 |
| **should_continue** | 반복 횟수 기준 종료 판단 |
| **messages** | 전체 대화 맥락 누적 (add_messages) |
| **name 속성** | generator vs reviewer 역할 구분 |

### Evaluator-Optimizer 패턴

| 개념 | 설명 |
|------|------|
| **generate** | 콘텐츠 생성 또는 개선 지시 반영 |
| **evaluate** | 루브릭 기반 정량 채점 (Structured Output) |
| **optimize** | 미달 항목만 타겟팅한 개선 지시 생성 |
| **overall_pass** | 코드 기반 합격 여부 판단 (LLM이 아님) |
| **history** | 이전 시도들의 기록 누적 (operator.add) |
| **PASS_THRESHOLD** | 합격 점수 기준 (예: 8점) |
| **MAX_ITERATIONS** | 무한 반복 방지 상한 |

### 루브릭 설계 원칙

1. **구체성**: "좋은가?" → "감정 자극 단어가 1개 이상 포함되었는가?"
2. **측정 가능성**: "적절한가?" → "50~150자 이내인가?"
3. **도메인 특화**: 마케팅/기술문서/창작물마다 기준이 다름
4. **개선 가능성**: 점수를 올리기 위해 무엇을 해야 하는지 명확해야 함

---

## 8. 추가 학습 방향

### 고급 Evaluator 기법

- **다중 모델 평가**: 생성 모델과 평가 모델 분리 (self-evaluation bias 방지)
- **가중치 루브릭**: 항목별로 중요도 다르게 설정
- **임계값 전략**: 항목마다 다른 PASS_THRESHOLD 설정
- **Human-in-the-loop**: 사람의 최종 승인 단계 추가

### 루브릭 자동화

- **LLM 기반 루브릭 생성**: 도메인 설명을 주면 LLM이 루브릭 초안 작성
- **데이터 기반 임계값 설정**: 과거 데이터로 적절한 PASS_THRESHOLD 찾기
- **루브릭 진화**: 사용자 피드백으로 루브릭 점진적 개선

### 프로덕션 최적화

- **비용 최적화**: 조기 종료로 불필요한 LLM 호출 방지
- **병렬 평가**: 여러 항목을 동시에 채점
- **캐싱**: 동일한 입력에 대한 평가 결과 재사용
- **A/B 테스트**: 다른 루브릭 비교 실험