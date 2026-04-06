# [TIL] Agentic RAG — 검색 파이프라인의 자율화

## 1. 오늘 학습한 내용 개요

RAG Agent와 Agentic RAG의 차이를 이해하고, **검색 파이프라인 자체를 에이전트화**하는 방법을 학습했다. 핵심은 "검색 → 평가 → 재시도"의 자율적 루프를 구성하는 것이다.

RAG Agent는 "검색 여부"를 Agent가 판단하지만 검색 자체는 1회성이다. Agentic RAG는 검색 결과를 평가하고, 부족하면 쿼리를 재작성해서 다시 검색하고, 답변 생성 후에도 자체 검증을 거친다.

| 구분 | RAG Agent | Agentic RAG |
|----|-----------|-------------|
| 핵심 아이디어 | Agent가 RAG를 **도구로 사용** | RAG 흐름 자체가 **에이전트화** |
| 검색 횟수 | 보통 1회 | 필요에 따라 반복 |
| 자율성 | Agent 레벨에서 결정 (검색 여부) | 검색 레벨에서도 자율 판단 (쿼리 재작성, 관련성 평가) |
| 쿼리 수정 | 사용자 질문 그대로 | 동적으로 재작성 |
| 적합한 상황 | 단순 질문, 빠른 응답 | 복잡한 질문, 높은 정확도 |

---

## 2. Agentic RAG 그래프 구조

Reflection 패턴의 "자기 평가 → 수정 → 재시도" 루프를 RAG 파이프라인에 적용한다.

```
START
  ↓
retrieve (문서 검색)
  ↓
grade_documents (문서 관련성 평가)
  ↓ ↙
  관련 있음? → generate (답변 생성)
  ↓               ↓
  관련 없음      grade_generation (답변 품질 검증)
  ↓               ↓ ↙
rewrite_query    충분함? → END
  ↓               ↓
  ←───────────── 불충분함 (최대 재시도 내)
  (다시 retrieve로)
```

### State 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `question` | str | 현재 질문 (재작성될 수 있음) |
| `documents` | list | 검색된 문서 객체 리스트 |
| `generation` | Optional[str] | 생성된 답변 |
| `citations` | list[str] | 답변의 근거가 된 문서 원문 발췌 |
| `relevance` | Optional[bool] | 문서 관련성 평가 결과 |
| `is_sufficient` | Optional[bool] | 답변 품질 검증 결과 |
| `retry_count` | int | 재시도 횟수 (무한 루프 방지) |

---

## 3. 주요 노드 구현

### 노드 1: retrieve - 문서 검색

retriever를 호출해서 문서를 검색하고 `retry_count`를 증가시킨다.

```python
def retrieve(state: ReflectionState):
    print(f"--- retrieve | retry_count: {state['retry_count']} ---")
    question = state["question"]
    
    docs = retriever.invoke(question)
    
    print(f"검색된 문서 수: {len(docs)}")
    for i, doc in enumerate(docs[:3], 1):
        filename = os.path.basename(doc.metadata.get('source', 'Unknown'))
        print(f"  문서 {i}: {filename}")
    
    return {
        "documents": docs,
        "retry_count": state["retry_count"] + 1
    }
```

### 노드 2: grade_documents - 문서 관련성 평가

Structured Output으로 문서가 질문에 직접 답할 수 있는 정보를 포함하는지 판단한다.

```python
class GradeDocumentsResult(BaseModel):
    reason: str = Field(description="판단 근거")
    result: bool = Field(description="직접 답할 수 있는 정보가 있으면 True")

def grade_documents(state: ReflectionState):
    print("\n--- grade_documents ---")
    question = state["question"]
    documents = state["documents"]
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """
너는 검색 결과가 질문과 관련성이 있는지를 판단하는 평가자야.
아래 문서가 질문에 대해서 직접적으로 답변할 수 있는 구체적인 정보가 있는지 판단해줘.

# 판단 기준
- 질문에 대한 구체적인 사실/수치/설명이 있으면 result: true
- 비슷한 분야지만 다른 주제면 result: false

# 문서
{documents}
"""),
        ("human", "질문: {question}"),
    ])
    
    chain = prompt | grade_docs_llm
    response = chain.invoke({
        "documents": _format_docs_with_index(documents),
        "question": question
    })
    
    print(f"문서 관련성: {'✓ 관련 있음' if response.result else '✗ 관련 없음'}")
    print(f"판단 근거: {response.reason}")
    
    return {"relevance": response.result}
```

### 노드 3: rewrite_query - 질문 재작성

검색 품질을 높이기 위해 질문을 구체적이고 검색 가능한 형태로 재작성한다.

```python
def rewrite_query(state: ReflectionState):
    print("\n--- rewrite_query ---")
    question = state["question"]
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """
embedding의 품질을 높이기 위해 다음 질문과 같은 의도의 다른 표현 질문을 작성해줘.

재작성 가이드:
- 구체적인 규정명이나 키워드를 포함
- 질문의 핵심 의도를 명확히 표현
- 검색 가능한 형태로 변환
- 예: "법인카드 사용 한도" → "법인카드 월 사용 한도 직급별 기준"

질문만 출력해.
"""),
        ("human", "질문: {question}"),
    ])
    
    chain = prompt | llm
    response = chain.invoke({"question": question})
    new_question = response.content.strip()
    
    print(f"재작성된 질문: {new_question}")
    
    return {"question": new_question}
```

### 노드 4: generate - 답변 생성

Structured Output으로 답변과 근거 자료(citations)를 함께 생성한다.

```python
class GenerationOutput(BaseModel):
    answer: str = Field(description="질문에 대한 상세한 답변")
    citations: list[str] = Field(description="답변의 근거가 된 문서 원문 발췌")

def generate(state: ReflectionState):
    print("\n--- generate ---")
    question = state["question"]
    documents = state["documents"]
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """
당신은 회사 사내 규정 전문가입니다. 
다음 사내 규정 문서를 참고하여 질문에 정확하고 상세하게 답변하세요.

답변 작성 지침:
1. 규정에 명시된 내용을 정확히 인용
2. 조항 번호가 있다면 함께 제시
3. 구체적인 금액, 기간, 절차 등을 명확히 제시
4. 문서에 없는 내용은 추측하지 마라

# 참고 문서
{documents}
"""),
        ("human", "질문: {question}"),
    ])
    
    chain = prompt | structured_llm
    response = chain.invoke({
        "documents": _format_docs_with_index(documents),
        "question": question
    })
    
    print(f"생성된 답변 (처음 100자): {response.answer[:100]}...")
    
    return {
        "generation": response.answer,
        "citations": response.citations
    }
```

### 노드 5: grade_generation - 답변 품질 검증

Structured Output으로 답변이 문서 기반인지, 질문에 충분히 답했는지 검증한다.

```python
class GradeGenerationResult(BaseModel):
    reason: str = Field(description="판단 근거")
    result: bool = Field(description="문서 기반이고 충분하면 True")

def grade_generation(state: ReflectionState):
    print("\n--- grade_generation ---")
    question = state["question"]
    documents = state["documents"]
    generation = state["generation"]
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """
너는 답변에 대한 품질 검사자야.
다음 두 가지를 모두 만족해야 True를 반환해:
1. 답변이 문서를 기반으로 작성되어 있는가?
2. 답변이 질문에 대해서 충분히 답변했는가?

# 문서
{documents}

# 질문
{question}
"""),
        ("human", "답변: {generation}"),
    ])
    
    chain = prompt | grade_generation_llm
    response = chain.invoke({
        "documents": _format_docs_with_index(documents),
        "question": question,
        "generation": generation
    })
    
    print(f"답변 충분성: {'✓ 충분함' if response.result else '✗ 불충분함'}")
    print(f"판단 근거: {response.reason}")
    
    return {"is_sufficient": response.result}
```

---

## 4. 조건부 엣지 — 흐름 제어 로직

### should_rewrite - 문서 관련성에 따른 분기

```python
def should_rewrite(state: ReflectionState):
    """문서가 관련 없으면 질문 재작성, 있으면 답변 생성"""
    if state["relevance"]:
        print("→ 문서가 관련 있음: generate로 이동")
        return "generate"
    
    # 최대 재시도 횟수 도달 시 강제 생성
    if state["retry_count"] >= MAX_RETRIES:
        print(f"→ 최대 재시도 횟수({MAX_RETRIES})에 도달: 현재 문서로 generate")
        return "generate"
    
    print("→ 문서가 관련 없음: rewrite_query로 이동")
    return "rewrite_query"
```

### should_retry - 답변 품질에 따른 분기

```python
def should_retry(state: ReflectionState):
    """답변이 충분하지 않고 재시도 횟수가 남았으면 재검색"""
    if state["is_sufficient"]:
        print("→ 답변이 충분함: END로 이동")
        return END
    
    if state["retry_count"] >= MAX_RETRIES:
        print(f"→ 최대 재시도 횟수({MAX_RETRIES})에 도달: END로 이동")
        return END
    
    print("→ 답변이 불충분함: rewrite_query로 재검색")
    return "rewrite_query"
```

**핵심 포인트**: `retry_count >= MAX_RETRIES` 체크로 **무한 루프를 방지**한다. 재시도 한도에 도달하면 현재 상태에서 강제로 답변을 생성하거나 종료한다.

---

## 5. 그래프 구성 코드

```python
workflow = StateGraph(ReflectionState)

# 노드 추가
workflow.add_node("retrieve", retrieve)
workflow.add_node("grade_documents", grade_documents)
workflow.add_node("rewrite_query", rewrite_query)
workflow.add_node("generate", generate)
workflow.add_node("grade_generation", grade_generation)

# 엣지 연결
workflow.add_edge(START, "retrieve")
workflow.add_edge("retrieve", "grade_documents")

# 조건부 엣지: 문서 관련성 평가 후 분기
workflow.add_conditional_edges(
    "grade_documents",
    should_rewrite,
    {
        "generate": "generate",
        "rewrite_query": "rewrite_query"
    }
)

# 질문 재작성 후 다시 검색
workflow.add_edge("rewrite_query", "retrieve")

# 답변 생성 후 품질 검증
workflow.add_edge("generate", "grade_generation")

# 조건부 엣지: 답변 품질 검증 후 분기
workflow.add_conditional_edges(
    "grade_generation",
    should_retry,
    {
        END: END,
        "rewrite_query": "rewrite_query"
    }
)

app = workflow.compile()
```

---

## 6. 주요 개선 사항 (Cell 3 → Cell 4)

| 항목 | 개선 전 (Cell 3) | 개선 후 (Cell 4) |
|------|-----------------|-----------------|
| Retriever 전략 | 단순 similarity search | **MMR** (다양성 확보) |
| State 카운터 | `iteration` | `retry_count` (의미 명확화) |
| Structured Output | generate만 | **모든 평가 노드** 적용 |
| 프롬프트 | 문자열 | **ChatPromptTemplate** |
| 문서 포맷팅 | 인라인 | **헬퍼 함수** 분리 |
| 조건부 엣지 | 단순 체크 | **재시도 한도 명시적 처리** |

### MMR Retriever 설정

```python
retriever = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={"k": 4, "fetch_k": 10}
)
```

MMR(Maximal Marginal Relevance)은 관련성과 다양성을 동시에 고려해서 문서를 검색한다. `fetch_k=10`개를 먼저 검색한 뒤 그 중에서 다양성을 고려해 `k=4`개를 최종 선택한다.

---

## 7. 핵심 개념 정리

| 개념 | 설명 |
|------|------|
| Agentic RAG | 검색 파이프라인 자체를 에이전트화해서 "검색 → 평가 → 재시도" 루프를 자율적으로 실행 |
| 문서 관련성 평가 | `grade_documents` 노드에서 검색 결과가 질문에 직접 답할 수 있는지 판단 |
| 쿼리 재작성 | `rewrite_query` 노드에서 검색 품질을 높이기 위해 질문을 구체화/재표현 |
| 답변 품질 검증 | `grade_generation` 노드에서 답변이 문서 기반이고 질문에 충분한지 확인 |
| 무한 루프 방지 | `retry_count`로 재시도 횟수를 추적하고 `MAX_RETRIES`에 도달하면 강제 종료 |
| MMR 검색 | 관련성과 다양성을 동시에 고려한 문서 검색 전략 |
| Structured Output | Pydantic 스키마로 LLM 응답 구조를 명시해서 파싱 안정성 확보 |
| ChatPromptTemplate | 프롬프트를 system/human 역할로 구조화해서 관리 |

---

## 8. RAG Agent vs Agentic RAG 비교 정리

| 구분 | RAG Agent | Agentic RAG |
|------|-----------|-------------|
| 패턴 | ReAct + RAG Tool | Reflection + RAG |
| Agent 역할 | "검색이 필요한가?" 판단 | 검색 흐름 전체가 자율화 |
| 검색 횟수 | 보통 1회 | 평가 결과에 따라 반복 |
| 쿼리 수정 | 없음 | 관련성 낮으면 자동 재작성 |
| 답변 검증 | 없음 | 생성 후 품질 자체 검증 |
| 복잡도 | 낮음 (단순 Tool 호출) | 중간 (평가 루프 추가) |
| 정확도 | 중간 (1회 검색 의존) | 높음 (재시도로 품질 개선) |
| 비용 | 낮음 | 중간 (LLM 호출 증가) |
| 적합한 상황 | 단순 질문, 빠른 응답 | 복잡한 질문, 높은 정확도 요구 |