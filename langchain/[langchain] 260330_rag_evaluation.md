# [TIL] LangChain: RAG 평가 (RAGAS)

## 1. RAG 평가 개요

### RAG 평가가 필요한 이유

RAG 파이프라인을 만들면 자연스럽게 이런 질문이 생긴다.

- chunk_size를 500으로 했는데, 300이 더 나을까?
- 검색 결과를 3개 가져오는 게 나을까, 5개가 나을까?
- 프롬프트를 바꿨더니 답변이 좋아진 건가, 나빠진 건가?

사람이 하나하나 읽어보며 판단할 수 있지만, 느리고 주관적이다. **RAGAS**는 LLM을 활용하여 RAG 파이프라인의 품질을 **자동으로 정량 평가**하는 프레임워크이다.

### 평가 방법 비교

| 방법 | 특징 | 적합한 상황 |
|------|------|-----------| 
| **수동 스팟체크** | 대표 질문 10~20개를 눈으로 확인 | 초기 개발, 빠른 검증 |
| **RAGAS** | LLM 기반 자동 정량 평가 (Python) | 설정 비교, 파이프라인 튜닝 |
| **직접 LLM-as-Judge** | 도메인 특화 기준으로 직접 평가 구현 | RAGAS 메트릭으로 부족할 때 |
| **사용자 피드백** | 👍👎 버튼으로 실사용 데이터 수집 | 서비스 운영 중 |

실무에서는 이 방법들을 **섞어서** 사용한다. 개발 초기에는 수동 스팟체크로 빠르게 확인하고, 설정을 튜닝할 때 RAGAS로 비교하고, 서비스 운영 중에는 사용자 피드백을 수집한다.

---

## 2. RAGAS 평가 진행 순서

RAGAS는 **RAG의 결과물을 받아서 채점하는 도구**이다. RAG 파이프라인 자체를 실행하는 것이 아니라, 이미 실행된 결과를 평가한다.

```
1. 평가 데이터 준비
   - 사람이 질문(user_input)과 정답(reference)을 작성한다

2. RAG 파이프라인 실행
   - 각 질문을 RAG에 넣어서 검색된 문서(retrieved_contexts)와 답변(response)을 수집한다

3. RAGAS에 전달
   - 수집한 4가지(질문, 정답, 검색 문서, 답변)를 RAGAS 형식으로 변환한다

4. 평가 실행
   - RAGAS가 각 메트릭별로 LLM을 호출하여 0~1 점수를 매긴다
   - 예: Faithfulness 평가 시, LLM에게 "이 답변이 검색된 문서에 근거하는가?" 를 판단하게 한다
```

### RAGAS 입력 데이터 구조

| 필드 | 설명 | 출처 |
|------|------|------|
| `user_input` | 사용자 질문 | 직접 작성 (Golden Dataset) |
| `reference` | 정답 (사람이 작성) | 직접 작성 (Golden Dataset) |
| `retrieved_contexts` | 검색된 문서 리스트 | RAG 파이프라인 실행 |
| `response` | LLM이 생성한 답변 | RAG 파이프라인 실행 |

---

## 3. RAGAS 평가 메트릭

RAGAS는 다양한 메트릭을 제공한다. 뭘 개선하고 싶은지에 따라 골라 쓴다.

| 목적 | 메트릭 | 평가 내용 |
|------|--------|----------|
| 검색이 잘 되나? | **Context Precision** | 검색된 문서 중 관련 있는 문서가 상위에 있는가? |
| 검색이 잘 되나? | **Context Recall** | 정답에 필요한 정보가 검색 결과에 포함되어 있는가? |
| 답변이 정확한가? | **Faithfulness** | 답변이 검색된 문서에 근거하는가? (할루시네이션 없는가?) |
| 답변이 정확한가? | **Response Relevancy** | 답변이 질문에 적절하게 대답하는가? |
| 정답과 일치하나? | AnswerCorrectness | 답변이 정답과 얼마나 일치하는가? |
| 노이즈에 강한가? | NoiseSensitivity | 관련 없는 문서가 섞였을 때 답변이 흔들리는가? |

각 메트릭은 0~1 사이의 값을 가지며, 1에 가까울수록 좋다. 처음 평가할 때는 **검색 + 생성을 모두 커버하는 상위 4개**로 시작하고, 필요에 따라 추가하는 것이 일반적이다.

**메트릭 선택 예시**
```
질문: "연차 신청 방법은?"

검색 평가:
  Context Precision → 검색된 3개 문서 중 관련 문서가 1위인가?
  Context Recall    → 정답에 필요한 내용이 검색 결과에 다 있는가?

생성 평가:
  Faithfulness       → 답변이 검색된 문서 내용만 사용했는가?
  Response Relevancy → 답변이 질문에 맞게 대답했는가?
```

---

## 4. 평가 데이터셋 준비

### Golden Dataset이란?

RAG 시스템을 평가하려면 **Golden Dataset**(골든 데이터셋)이 필요하다. 사람이 직접 질문과 기대 정답을 작성해 놓은 기준 데이터로, 자동 평가의 ground truth 역할을 한다.

### 문서 로드 및 벡터 스토어 구성

```python
import chromadb
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# 마크다운 문서 로드
loader = DirectoryLoader(
    "data/company_rules/", 
    glob="*.md", 
    loader_cls=TextLoader, 
    loader_kwargs={"encoding": "utf-8"}
)
all_docs = loader.load()
print(f"로드된 문서: {len(all_docs)}개")

# 텍스트 분할
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
splits = splitter.split_documents(all_docs)
print(f"총 {len(splits)}개 청크 생성")

# 벡터 스토어 생성
COLLECTION_NAME = "company_rules"
PERSIST_DIR = "./chroma_db"

client = chromadb.PersistentClient(path=PERSIST_DIR)
existing_names = [c.name for c in client.list_collections()]
if COLLECTION_NAME in existing_names:
    client.delete_collection(COLLECTION_NAME)

vectorstore = Chroma.from_documents(
    documents=splits,
    embedding=embeddings,
    collection_name=COLLECTION_NAME,
    client=client,
)

# Retriever 구성
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
```

**DirectoryLoader 설명**
- `DirectoryLoader`는 폴더 내 여러 파일을 한 번에 로드하는 LangChain 유틸리티이다
- `glob` 파라미터로 로드할 파일 패턴을 지정한다 (예: `*.md`는 마크다운 파일만)
- `loader_cls`로 개별 파일을 읽을 로더 클래스를 지정한다

### RAG Chain 구성

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

prompt = ChatPromptTemplate.from_messages([
    ("system", """너는 사내 규정 안내 챗봇이야. 아래 검색된 문서를 참고하여 질문에 답변해줘.
검색 결과에 없는 내용은 "해당 정보를 찾을 수 없습니다"라고 답변해.

[검색된 문서]
{context}"""),
    ("human", "{question}"),
])

answer_chain = prompt | llm | StrOutputParser()

def run_rag(question: str) -> dict:
    """검색 → 답변 생성을 순서대로 실행한다."""
    docs = retriever.invoke(question)
    context = format_docs(docs)
    answer = answer_chain.invoke({"context": context, "question": question})
    return {"question": question, "docs": docs, "answer": answer}

# 테스트
result = run_rag("연차는 며칠이야?")
print(f"Q: {result['question']}")
print(f"A: {result['answer']}")
print(f"검색 문서 수: {len(result['docs'])}개")
```

### Golden Dataset 작성

```python
eval_questions = [
    {
        "user_input": "연차는 며칠이야?",
        "reference": "1년 근속 시 연차 15일, 3년 이상 근속 시 2년마다 1일씩 추가되며 최대 25일까지 부여됩니다.",
        "source": "인사규정",
        "difficulty": "easy"
    },
    {
        "user_input": "USB 꽂아서 파일 옮겨도 돼?",
        "reference": "보안규정에 따라 외부 USB 사용은 금지되며, 파일 전송이 필요한 경우 사내 클라우드를 이용해야 합니다.",
        "source": "보안규정",
        "difficulty": "easy"
    },
    {
        "user_input": "결혼하면 회사에서 뭘 해줘?",
        "reference": "경조휴가 5일과 축의금 30만원이 지급됩니다.",
        "source": ["인사규정", "경비처리규정"],
        "difficulty": "medium"
    },
    # ... 더 많은 질문
]
```

**Golden Dataset 작성 팁**
- 난이도 섞기: `easy`, `medium`, `hard` 질문 골고루 포함
- 출처 명시: 어떤 문서에 답이 있는지 기록
- 실패 케이스 추가: 서비스 운영 중 사용자가 👎를 누른 질문
- 정기적 업데이트: 문서가 변경되면 정답도 갱신

---

## 5. RAGAS 평가 실행

### 패키지 설치

```python
# uv add ragas rapidfuzz
```

### RAG 파이프라인 실행 및 결과 수집

```python
from ragas import SingleTurnSample, EvaluationDataset

eval_results = []

for item in eval_questions:
    question = item["user_input"]
    result = run_rag(question)
    
    eval_results.append(
        SingleTurnSample(
            user_input=question,
            response=result["answer"],
            retrieved_contexts=[doc.page_content for doc in result["docs"]],
            reference=item["reference"],
        )
    )
```

**SingleTurnSample 구조**
- RAGAS 평가를 위한 데이터 구조
- 4가지 필드 모두 필수: `user_input`, `response`, `retrieved_contexts`, `reference`
- `retrieved_contexts`는 리스트 형태 (검색된 문서들)

### RAGAS 평가 실행

```python
from ragas import evaluate
from ragas.metrics import (
    context_precision,
    context_recall,
    faithfulness,
    answer_relevancy,
)
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

# 평가용 LLM (답변 생성보다 같거나 높은 성능 모델 권장)
evaluator_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
evaluator_embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# 평가 메트릭 정의
metrics = [
    context_precision,
    context_recall,
    faithfulness,
    answer_relevancy,
]

# RAGAS 평가 실행
dataset = EvaluationDataset(samples=eval_results)
result = evaluate(
    dataset=dataset,
    metrics=metrics,
    llm=evaluator_llm,
    embeddings=evaluator_embeddings,
)
```

**evaluator_llm 설정**
- 평가용 LLM은 답변 생성용 LLM보다 **같거나 더 높은 성능의 모델** 사용이 일반적
- 이유: 평가자가 답변자보다 능력이 떨어지면 정확한 채점이 어렵기 때문
- 예: 답변 생성에 `gpt-4o-mini` 사용 시, 평가는 `gpt-4o-mini` 또는 `gpt-4o` 사용

---

## 6. 평가 결과 분석

### 전체 평균 점수 확인

```python
print("=== 전체 평균 점수 ===")
df = result.to_pandas()

# 메트릭 컬럼만 추출
exclude_cols = {"user_input", "retrieved_contexts", "response", "reference"}
metric_cols = [col for col in df.columns if col not in exclude_cols]

for col in metric_cols:
    print(f"  {col}: {df[col].mean():.4f}")
```

**출력 예시**
```
=== 전체 평균 점수 ===
  context_precision: 0.8257
  context_recall: 0.3410
  faithfulness: 0.8556
  answer_relevancy: 0.7600
```

### 질문별 상세 결과 분석

```python
# 질문별 상세 결과
df = result.to_pandas()

# 난이도 정보 추가
df["difficulty"] = [q["difficulty"] for q in eval_questions]
df["expected_source"] = [
    q["source"] if isinstance(q["source"], str) else ", ".join(q["source"])
    for q in eval_questions
]

display(df[["user_input", "difficulty"] + metric_cols])
```

**코드 설명**
- `result.to_pandas()`: RAGAS 평가 결과를 pandas DataFrame으로 변환
- 각 질문(`user_input`)과 난이도, 그리고 모든 평가 지표를 표 형태로 출력
- 어떤 질문에서 점수가 낮은지 파악 가능

### 난이도별 평균 점수

```python
print("\n=== 난이도별 평균 점수 ===")
for diff in ["easy", "medium", "hard"]:
    sub = df[df["difficulty"] == diff]
    print(f"\n[{diff}] ({len(sub)}개)")
    for col in metric_cols:
        print(f"  {col}: {sub[col].mean():.4f}")
```

**출력 예시**
```
=== 난이도별 평균 점수 ===

[easy] (5개)
  context_precision: 0.8500
  faithfulness: 0.9200
  answer_relevancy: 0.8800

[medium] (7개)
  context_precision: 0.7100
  faithfulness: 0.8300
  answer_relevancy: 0.7600

[hard] (3개)
  context_precision: 0.5800
  faithfulness: 0.7200
  answer_relevancy: 0.6500
```

**분석 포인트**
- 난이도에 따라 RAG 시스템 성능이 어떻게 달라지는지 확인
- 어려운 질문에서 특정 메트릭 점수가 낮다면 → 해당 부분 집중 개선 필요
- 예: "어려운 질문에서 context_precision이 낮네? → 검색 알고리즘 개선 필요"

---

## 7. Retriever 전략 비교 실험

### 3가지 Retriever 전략 정의

```python
from langchain_classic.retrievers import MultiQueryRetriever

retriever_configs = {
    "similarity (기본)": vectorstore.as_retriever(
        search_type="similarity", search_kwargs={"k": 3}
    ),
    "MMR": vectorstore.as_retriever(
        search_type="mmr", search_kwargs={"k": 3, "fetch_k": 10}
    ),
    "MultiQuery": MultiQueryRetriever.from_llm(
        retriever=vectorstore.as_retriever(search_kwargs={"k": 3}),
        llm=llm,
    ),
}
```

**Retriever 전략 설명**

| 전략 | 동작 방식 | 장점 | 단점 |
|------|----------|------|------|
| **similarity (기본)** | 쿼리 벡터와 가장 유사한 문서 k개 반환 | 빠르고 단순 | 중복 문서 가능, 단일 관점 검색 |
| **MMR** | 유사도와 다양성을 동시 고려하여 선택 | 다양한 관점의 문서 제공 | 약간 느림, 다양성 추구 시 핵심 문서 놓칠 수 있음 |
| **MultiQuery** | 원본 질문을 여러 변형 질문으로 확장하여 검색 | 재현율 향상, 포괄적 검색 | LLM 호출로 느림, 비용 증가 |

**각 전략의 동작 방식**

**1. similarity (기본)**
- 코사인 유사도 기반으로 단순하게 상위 k개 선택

**2. MMR (Maximal Marginal Relevance)**
- `fetch_k=10`: 먼저 상위 10개 후보를 가져옴
- `k=3`: 그 중에서 **유사도는 높으면서 서로 다양한** 3개를 최종 선택
- 중복되거나 비슷한 내용의 문서들을 피하고 싶을 때 유용

**3. MultiQuery**
- 원본 질문을 LLM으로 여러 개의 변형 질문으로 확장
- 예: "RAG란 무엇인가?" → 
  - "Retrieval Augmented Generation 설명"
  - "RAG 시스템 동작 원리"
  - "RAG 구조와 구성요소"
- 각 변형 질문으로 검색 후 결과를 합쳐서 중복 제거
- 질문 표현이 애매하거나 다각도 검색이 필요할 때 효과적

### 각 Retriever 평가 실행

```python
retriever_results = {}
for name, ret in retriever_configs.items():
    retriever_results[name] = evaluate_retriever(ret, eval_questions, label=name)

print_comparison(retriever_results)
```

**동작 과정**
1. `"similarity (기본)"` retriever로 전체 평가 질문 실행 → 결과 저장
2. `"MMR"` retriever로 전체 평가 질문 실행 → 결과 저장
3. `"MultiQuery"` retriever로 전체 평가 질문 실행 → 결과 저장

각 retriever는 동일한 `eval_questions`로 테스트되므로 **공정한 비교** 가능

### 실험 결과 분석

```
               | context_precision | context_recall | faithfulness | answer_relevancy
similarity (기본) |     0.8257     |     0.3410     |     0.8556   |     0.7600
MMR              |     0.6879     |     0.2683     |     0.8000   |     0.5911
MultiQuery       |     0.8996     |     0.3333     |     0.8844   |     0.9667
```

**결과 해석**

1. **MultiQuery가 압도적 1등** 🥇
   - `answer_relevancy`: 0.9667 (질문과 답변의 관련성 최고)
   - `context_precision`: 0.8996 (검색된 문서가 정답과 관련성 높음)
   - `faithfulness`: 0.8844 (환각 없이 문서 기반 답변 생성)
   - **→ 실제 RAG 시스템에는 MultiQuery 사용 추천!**

2. **MMR이 의외로 최하위**
   - 모든 지표에서 가장 낮음
   - **이유 추정:**
     - 다양성을 추구하다 보니 정작 **정답과 관련된 핵심 문서**를 놓침
     - 평가 데이터셋이 "다양성"보다 "정확성"을 요구하는 질문들이었을 가능성
     - `fetch_k=10, k=3` 설정이 이 데이터에는 맞지 않았을 수도

3. **공통적으로 낮은 context_recall** (0.26~0.34)
   - **의미:** 정답에 필요한 모든 정보를 retriever가 가져오지 못함
   - **k=3**으로 설정했기 때문에 일부 필요한 문서를 놓쳤을 가능성
   - **개선 방법:** k 값을 5 또는 7로 늘려보기

### 실전 적용 추천

```python
# 1. 최종 retriever로 MultiQuery 선택
best_retriever = MultiQueryRetriever.from_llm(
    retriever=vectorstore.as_retriever(search_kwargs={"k": 5}),  # k 늘림
    llm=llm,
)

# 2. RAG 체인 구성
rag_chain = (
    {
        "context": best_retriever | format_docs,  
        "question": RunnablePassthrough()
    }
    | prompt
    | llm
    | StrOutputParser()
)
```

### 추가 실험 제안

```python
# context_recall 개선을 위해 k 값 변경 실험
retriever_configs = {
    "MultiQuery (k=3)": MultiQueryRetriever.from_llm(
        retriever=vectorstore.as_retriever(search_kwargs={"k": 3}),
        llm=llm,
    ),
    "MultiQuery (k=5)": MultiQueryRetriever.from_llm(
        retriever=vectorstore.as_retriever(search_kwargs={"k": 5}),
        llm=llm,
    ),
    "MultiQuery (k=7)": MultiQueryRetriever.from_llm(
        retriever=vectorstore.as_retriever(search_kwargs={"k": 7}),
        llm=llm,
    ),
}
```

**예상:** k를 늘리면 `context_recall`은 올라가지만, `context_precision`이 약간 떨어질 수 있습니다. 트레이드오프를 실험으로 확인 필요.

---

## 8. 합성 데이터셋 생성

### TestsetGenerator란?

RAGAS는 문서에서 자동으로 질문-정답 쌍을 생성하는 `TestsetGenerator`를 제공한다. 사람이 직접 질문을 작성하기 어려울 때 유용하다.

```python
from ragas.testset import TestsetGenerator

# 합성 테스트 데이터셋 생성 (내부적으로 LLM을 많이 호출하므로 시간이 오래 걸린다)
generator = TestsetGenerator(
    llm=evaluator_llm,
    embedding_model=evaluator_embeddings,
)

testset = generator.generate_with_langchain_docs(
    documents=all_docs,
    testset_size=10,  # 생성할 질문 개수
)

# 결과 확인
test_df = testset.to_pandas()
for _, row in test_df.iterrows():
    print(f"Q: {row['user_input']}")
    print(f"A: {row['reference'][:100]}...")
    print()
```

**특징**
- `TestsetGenerator`는 단순한 질문뿐만 아니라 추론이 필요한 질문, 여러 문서를 종합해야 하는 질문 등 다양한 유형을 자동으로 생성한다
- 실무에서는 수동 작성 + 합성 생성을 섞어서 평가 데이터셋을 구성하는 것이 일반적이다
- **주의:** 내부적으로 LLM을 많이 호출하므로 시간과 비용이 많이 든다

### 합성 데이터셋 평가

```python
# 합성 질문에 대해 RAG 파이프라인 실행
synth_samples = []

for _, row in test_df.iterrows():
    result = run_rag(row["user_input"])
    synth_samples.append(
        SingleTurnSample(
            user_input=row["user_input"],
            response=result["answer"],
            retrieved_contexts=[doc.page_content for doc in result["docs"]],
            reference=row["reference"],
        )
    )

# RAGAS 평가
synth_result = evaluate(
    dataset=EvaluationDataset(samples=synth_samples),
    metrics=metrics,
)

synth_df = synth_result.to_pandas()
metric_cols = [col for col in synth_df.columns if col not in exclude_cols]

print("=== 합성 데이터셋 평가 결과 ===")
for col in metric_cols:
    print(f"  {col}: {synth_df[col].mean():.4f}")
```

---

## 9. 실무에서의 RAG 평가

### 평가는 언제 하는가?

RAGAS를 매일 돌리는 팀은 거의 없다. 실무에서 평가가 필요한 시점은 명확하다.

| 시점 | 하는 일 | 도구 |
|------|--------|------|
| **초기 개발** | 대표 질문 10~20개로 눈으로 확인 | 수동 스팟체크 |
| **파이프라인 튜닝** | chunk_size, k, retriever 전략 변경 시 비교 | RAGAS |
| **프롬프트 변경** | 답변 품질이 달라졌는지 확인 | RAGAS 또는 수동 |
| **서비스 운영 중** | 사용자 만족도 추적 | 👍👎 피드백, 로그 분석 |
| **문서 추가/변경** | 기존 답변 품질이 유지되는지 확인 | RAGAS (회귀 테스트) |

### 실무 평가 흐름

```
[1단계] 개발 중 — 수동 확인
    → 질문 10~20개로 "대충 되나?" 확인
    → 이 단계에서 RAGAS는 과하다

[2단계] 튜닝 시 — RAGAS 비교
    → 설정 A vs B를 수치로 비교
    → 평가 데이터셋은 20~50개면 충분 (난이도 섞어서)
    → 절대 점수가 아니라 "어느 쪽이 더 나은가"를 본다

[3단계] 배포 후 — 사용자 피드백
    → 👍👎 버튼, 답변 로그 수집
    → 낮은 평가를 받은 질문을 평가 데이터셋에 추가
    → 주기적으로 2단계를 반복
```

### 평가 데이터셋 관리

평가 데이터셋은 한 번 만들고 끝이 아니라 **지속적으로 관리**하는 자산이다.

- 서비스 운영 중 실패한 질문(사용자가 👎를 누른 질문)을 평가 데이터셋에 추가한다
- 문서가 변경되면 해당 문서와 관련된 질문의 정답(reference)도 업데이트한다
- 평가 데이터셋이 커지면 난이도별로 샘플링하여 비용을 절약한다

---

## 10. LLM-as-Judge: 직접 평가 구현하기

### LLM-as-Judge란?

RAGAS의 각 메트릭은 내부적으로 **LLM-as-Judge** 방식을 사용한다. LLM에게 채점 기준을 프롬프트로 주고, 결과를 판단하게 하는 것이다.

예를 들어 Faithfulness 메트릭은 내부적으로 이런 과정을 거친다:
1. 답변에서 주장(claim)을 추출한다
2. 각 주장이 검색된 문서에 근거하는지 LLM에게 판단시킨다
3. 근거 있는 주장의 비율을 점수로 계산한다

### RAGAS vs 직접 구현

| | RAGAS | 직접 LLM-as-Judge |
|--|-------|-------------------|
| **장점** | 검증된 메트릭, 바로 사용 가능 | 도메인 특화 기준 자유롭게 정의 |
| **단점** | 커스텀 기준 추가가 제한적 | 프롬프트 설계와 검증을 직접 해야 함 |
| **적합한 상황** | 범용 RAG 품질 평가 | "존댓말 사용 여부", "법률 용어를 쉽게 풀었는가" 등 |

### 언제 직접 구현하는가?

RAGAS의 기본 메트릭은 **검색 품질**과 **답변의 사실 정확성**을 평가한다. 하지만 다음과 같은 기준은 RAGAS로 평가할 수 없다.

- 답변 톤이 적절한가? (존댓말, 친근한 말투 등)
- 민감한 정보를 노출하지 않는가? (개인정보, 내부 시스템명 등)
- 도메인 용어를 정확히 사용하는가?
- 답변 길이가 적절한가?

이런 경우 LLM에게 직접 채점 기준을 주고 평가시킨다.

### LLM-as-Judge 구현

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

judge_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# 출력 스키마 정의
class CriterionScore(BaseModel):
    score: int = Field(description="1~5점")
    reason: str = Field(description="채점 이유")

class JudgeResult(BaseModel):
    accuracy: CriterionScore = Field(description="답변이 검색된 문서에 근거하는가?")
    completeness: CriterionScore = Field(description="질문에 필요한 정보를 빠짐없이 답변했는가?")
    tone: CriterionScore = Field(description="사내 규정 안내에 적합한 톤인가?")

# 채점 기준을 프롬프트로 정의
judge_prompt = ChatPromptTemplate.from_template("""
당신은 RAG 시스템의 답변 품질을 평가하는 심사관입니다.

[질문]
{question}

[답변]
{answer}

[검색된 문서]
{context}

다음 기준으로 각각 1~5점을 매기고, 이유를 간단히 설명하세요.

1. **정확성(accuracy)**: 답변이 검색된 문서에 근거하는가? 지어낸 내용은 없는가?
2. **완전성(completeness)**: 질문에 필요한 정보를 빠짐없이 답변했는가?
3. **톤(tone)**: 사내 규정 안내에 적합한 톤인가? (너무 딱딱하거나 너무 가볍지 않은가?)
""")

judge_chain = judge_prompt | judge_llm.with_structured_output(JudgeResult)
```

### LLM-as-Judge 실행

```python
# 앞에서 수집한 eval_results를 재활용
sample = eval_results[0]

result = judge_chain.invoke({
    "question": sample["user_input"],
    "answer": sample["response"],
    "context": "\n---\n".join(sample["retrieved_contexts"]),
})

print(f"질문: {sample['user_input']}")
print(f"답변: {sample['response'][:100]}...")
print()
for criterion in ["accuracy", "completeness", "tone"]:
    detail = getattr(result, criterion)
    print(f"  {criterion}: {detail.score}/5 — {detail.reason}")
```

**LLM-as-Judge 핵심 원칙**
- **프롬프트에 채점 기준을 명확하게 정의**하는 것이 핵심
- 기준이 모호하면 LLM도 일관성 없이 채점한다
- "좋은 답변인가?"보다 "검색된 문서에 없는 내용을 포함하는가?"처럼 구체적으로 물어야 한다
- 평가용 LLM은 답변 생성용 LLM보다 **같거나 더 높은 성능의 모델**을 사용하는 것이 일반적

---

## 11. 핵심 개념 정리

### RAGAS 평가 전체 흐름

```
[사전 준비]
1. Golden Dataset 작성 (질문 + 정답)
2. RAG 파이프라인 구축 (문서 로드 → 청킹 → 벡터 DB)

[평가 실행]
3. 각 질문을 RAG에 넣어서 결과 수집 (검색 문서 + 생성 답변)
4. RAGAS 형식으로 변환 (SingleTurnSample)
5. RAGAS 평가 실행 (LLM이 각 메트릭 채점)
6. 결과 분석 (전체 평균, 질문별 상세, 난이도별)

[개선 및 반복]
7. 낮은 점수 원인 파악
8. 파이프라인 조정 (retriever, chunk_size, k 등)
9. 재평가
```

### RAGAS 주요 메트릭

| 메트릭 | 평가 대상 | 의미 |
|--------|----------|------|
| **Context Precision** | Retriever | 검색된 문서 중 관련 문서가 상위에 있는가? |
| **Context Recall** | Retriever | 정답에 필요한 정보가 검색 결과에 포함되어 있는가? |
| **Faithfulness** | Generator | 답변이 검색된 문서에 근거하는가? (환각 없는가?) |
| **Response Relevancy** | Generator | 답변이 질문에 적절하게 대답하는가? |

### Retriever 전략 선택 가이드

| 상황 | 추천 전략 | 이유 |
|------|-----------|------|
| 간단한 검색, 프로토타입 | similarity (기본) | 빠르고 단순 |
| 긴 문서, 비슷한 내용 많을 때 | MMR | 다양성 확보 |
| 애매한 질문, 포괄적 검색 | MultiQuery | 재현율 향상 |

### 평가 방법 선택 가이드

| 상황 | 방법 | 도구 |
|------|------|------|
| 초기 개발, 빠른 확인 | 수동 스팟체크 | 눈으로 확인 |
| 설정 비교 실험 | RAGAS | Python 스크립트 |
| 도메인 특화 평가 | LLM-as-Judge | 직접 구현 |
| 서비스 운영 중 | 사용자 피드백 | 👍👎 버튼 |

---

## 12. 실무 활용 팁

### Golden Dataset 작성 전략

1. **난이도 균형**: easy:medium:hard = 5:3:2 비율로 구성
2. **출처 다양화**: 단일 문서 질문 + 복수 문서 질문 섞기
3. **부정 케이스 포함**: "문서에 없는 정보" 질문도 포함 (환각 검증)
4. **실패 사례 추가**: 서비스 운영 중 낮은 평가 받은 질문 지속 추가

### 평가 데이터셋 크기

- **초기 개발**: 10~20개 (대표 질문)
- **파이프라인 튜닝**: 20~50개 (난이도 섞어서)
- **프로덕션 회귀 테스트**: 50~100개 (지속 누적)

### 비용 절감 팁

- 평가용 LLM으로 저렴한 모델 사용 (예: `gpt-4o-mini`)
- 합성 데이터셋 생성은 꼭 필요한 경우만 (비용과 시간 많이 듦)
- 평가 데이터셋이 커지면 샘플링하여 평가

### 평가 결과 해석 가이드

| 메트릭 | 낮을 때 의심할 부분 | 개선 방법 |
|--------|-------------------|----------|
| Context Precision | Retriever 검색 품질 | Retriever 전략 변경, k 값 조정 |
| Context Recall | 검색 범위 부족 | k 값 늘리기, chunk_size 조정 |
| Faithfulness | 환각 발생 | 프롬프트 개선, temperature 낮추기 |
| Response Relevancy | 답변이 질문과 동떨어짐 | 프롬프트 개선, 검색 품질 향상 |

---

## 13. 트러블슈팅

### 문제 1: RAGAS 평가가 너무 느림

**원인**
- 각 메트릭마다 LLM을 호출하므로 시간이 오래 걸림

**해결**
```python
# 메트릭 개수 줄이기
metrics = [context_precision, faithfulness]  # 필수 메트릭만

# 평가 데이터셋 샘플링
eval_sample = eval_questions[:10]  # 전체가 아닌 일부만
```

### 문제 2: context_recall이 계속 낮음

**원인**
- k 값이 너무 작아서 필요한 문서를 다 못 가져옴

**해결**
```python
# k 값 늘리기
retriever = vectorstore.as_retriever(search_kwargs={"k": 7})

# 또는 MultiQuery 사용
multi_retriever = MultiQueryRetriever.from_llm(
    retriever=vectorstore.as_retriever(search_kwargs={"k": 5}),
    llm=llm,
)
```

### 문제 3: 평가 점수가 일관성이 없음

**원인**
- temperature가 0이 아니어서 LLM 응답이 매번 다름

**해결**
```python
# 평가용 LLM temperature를 0으로 설정
evaluator_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
```

### 문제 4: 합성 데이터셋 생성 중 에러

**원인**
- 문서가 너무 많거나 복잡해서 LLM 호출 실패

**해결**
```python
# testset_size를 줄이기
testset = generator.generate_with_langchain_docs(
    documents=all_docs[:10],  # 일부 문서만
    testset_size=5,  # 적은 개수로
)
```

---

## 14. 추가 학습 방향

### 고급 RAGAS 기능
- **답변 교정(Answer Correctness)**: 답변이 정답과 얼마나 일치하는지 평가
- **노이즈 민감도(Noise Sensitivity)**: 관련 없는 문서가 섞였을 때 영향 평가
- **커스텀 메트릭 정의**: 도메인 특화 평가 기준 추가

### RAG 평가 프레임워크
- **DeepEval**: RAGAS 대안, 더 많은 메트릭 제공
- **TruLens**: RAG 모니터링 및 평가 특화 도구
- **LangSmith**: LangChain 공식 관측 플랫폼

### 프로덕션 평가 시스템 구축
- CI/CD에 RAGAS 통합 (PR마다 자동 평가)
- 평가 결과 대시보드 구축 (Streamlit, Grafana)
- A/B 테스트 프레임워크 (여러 RAG 버전 비교)