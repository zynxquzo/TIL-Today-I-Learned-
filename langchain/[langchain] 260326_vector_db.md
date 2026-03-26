# [TIL] LangChain: 벡터 DB와 검색

## 1. 벡터 DB란?

### 기본 개념

**정의**
- 텍스트를 임베딩 벡터로 변환하여 저장하고, 유사도 기반으로 검색하는 전용 데이터베이스
- 일반 DB의 정확한 매칭이 아닌 "가장 비슷한 k개"를 찾는 근사 검색에 최적화
- 고차원 벡터(수백~수천 차원)를 효율적으로 인덱싱하고 검색

**벡터 DB vs 일반 DB**

| | 일반 DB | 벡터 DB |
|---|---|---|
| **검색 방식** | 정확한 값 매칭 (=, >, <) | 유사도 기반 근사 검색 |
| **인덱스** | B-Tree, Hash | HNSW, IVF 등 벡터 전용 인덱스 |
| **데이터** | 숫자, 문자열, 날짜 | 고차원 벡터 (수백~수천 차원) |
| **결과** | 조건에 맞는 정확한 결과 | "가장 비슷한" 근사 결과 |

### 직관적 이해: 표 vs 지도

**RDB - 엑셀 시트처럼 행과 열에 정리**
```
| ID | Name | Age |
|----|------|-----|
| 1  | 홍길동 | 25  |
| 2  | 김철수 | 30  |
```

**벡터 DB - 좌표 공간에 점으로 배치 (의미가 비슷하면 가까이)**
```
다차원 좌표 공간
    •  "강아지"
  • "고양이"
            •  "자동차"
         •  "비행기"
```

물리적으로는 벡터 DB도 디스크에 데이터가 저장되지만, 논리적으로는 각 데이터가 **다차원 좌표 공간에서 위치를 점유**하는 구조이다. 이 좌표에서의 **위치가 곧 의미**이고, **검색은 거리를 재는 것**이다.

### 왜 일반 DB로는 부족한가?

일반 DB에서 벡터 유사도를 계산하려면 모든 행에 대해 코사인 유사도를 계산해야 한다. 이는 O(n)으로, 데이터가 늘어날수록 선형으로 느려진다.

**예시: 10만 개의 1536차원 벡터**
- 일반 DB: 10만 개 × 1536차원 = 매번 전수 조사 → 느림
- 벡터 DB: 인덱스로 후보를 빠르게 좁힘 → 빠름 (ANN 알고리즘)

---

## 2. ANN (Approximate Nearest Neighbor)

### 기본 개념

**역할**
- 벡터 DB의 핵심 알고리즘
- 100% 정확한 결과 대신 99%+ 정확도를 허용하는 대신, 검색 속도를 **수십~수백 배** 빠르게 만듦

**동작 원리**
```
Exact Search (전수 조사):  벡터 10만 개 × 1536차원 → 모두 비교 → 느림
ANN (근사 검색):           인덱스로 후보를 빠르게 좁힘 → 빠름
```

### 대표적인 ANN 인덱싱 방식

| 알고리즘 | 원리 | 특징 |
|---------|------|------|
| **HNSW** | 그래프 기반. 벡터들을 노드로, 가까운 벡터끼리 간선으로 연결한 다층 그래프 | 검색 정확도와 속도 모두 우수하지만 메모리 사용량이 큼. Chroma 기본 방식 |
| **IVF** | 벡터 공간을 여러 클러스터로 나누고, 질문 벡터가 속한 클러스터 주변만 검색 | 메모리 효율적이라 대규모 데이터에 유리하지만 정확도가 약간 낮을 수 있음. FAISS에서 주로 사용 |

> 실무에서 ANN의 내부 동작을 직접 구현할 일은 없다. 중요한 건 "벡터 DB가 어떻게 빠른 검색을 가능하게 하는지"의 원리를 이해하는 것이다.

---

## 3. 벡터 DB의 동작 흐름

### 저장 과정

```
문서 → 청킹 → 임베딩 모델 → 벡터 + 메타데이터 → 벡터 DB에 저장 (인덱스 구축)
```

### 검색 과정

```
질문 → 임베딩 모델 → 질문 벡터 → 벡터 DB에서 ANN 검색 → 상위 k개 문서 반환
```

**저장되는 데이터**

| 구성 요소 | 설명 | 예시 |
|----------|------|------|
| **벡터** | 임베딩 모델이 생성한 좌표값. 유사도 검색에 사용 | `[0.12, -0.34, 0.56, ...]` |
| **원본 텍스트** | 벡터의 원래 문서 내용. LLM에 전달할 때 사용 | `"연차는 최소 1일 전에 신청..."` |
| **메타데이터** | 벡터에 붙이는 이름표. 필터링에 사용 | `{"source": "사내규정.pdf", "page": 3}` |

> 저장할 때 벡터뿐 아니라 **원본 텍스트**와 **메타데이터**도 함께 저장한다. 검색 결과로 벡터가 아닌 원본 텍스트를 돌려받아야 LLM에 전달할 수 있기 때문이다.

---

## 4. 메타데이터 (Metadata)

### 기본 개념

**메타데이터는 임베딩되지 않는다.**
- 좌표 공간에 점을 찍은 뒤, 그 점에 포스트잇을 붙여놓는 것과 같음
- 유사도 검색의 대상이 아니라, 검색 결과를 **필터링**할 때 사용

**검색 과정**
```
1. 메타데이터 필터링: "user_id가 'kim'인 데이터만 골라냄"  ← 정확한 매칭 (RDB처럼)
2. 벡터 검색: "골라낸 것 중에서 질문과 가장 가까운 k개 반환"  ← 유사도 기반
```

### 메타데이터를 쓰는 이유

벡터 검색만으로는 **"이 데이터가 누구 것인지"**, **"어떤 문서에서 왔는지"** 를 구분할 수 없기 때문이다.

**대표적인 사용 사례**
- **멀티테넌트**: 사용자별로 업로드한 문서가 다를 때, `user_id`로 필터링하여 본인 문서만 검색
- **문서 구분**: 여러 PDF를 하나의 컬렉션에 저장하고, `source`로 특정 문서만 검색
- **페이지 범위**: 특정 페이지 범위의 내용만 검색

### 자동 생성되는 메타데이터

> LangChain의 Document Loader들은 메타데이터를 **자동으로 생성**한다. 예를 들어 `PyPDFLoader`는 `source`(파일 경로)와 `page`(페이지 번호)를 자동으로 넣어준다. 따로 지정하지 않아도 이 정보로 바로 필터링할 수 있다. 추가 메타데이터가 필요하면 Document 객체의 `metadata` 딕셔너리에 직접 추가하면 된다.

### 메타데이터 vs 임베딩 대상

> 메타데이터에 넣을 정보는 **필터링이 필요한 속성**만 포함하면 된다. 만약 메타데이터의 내용으로도 "의미 검색"을 하고 싶다면, 해당 내용을 원본 텍스트에 포함시켜 함께 임베딩해야 한다.

---

## 5. 벡터 DB 비교

### 주요 벡터 스토어

| 벡터 스토어 | 특징 |
|------------|------|
| **Chroma** | 가볍고 간단. 설치가 쉽고 로컬 파일로 저장. 서버 없이 바로 사용 가능 |
| pgvector | PostgreSQL 확장. 기존 DB에 벡터 검색을 추가할 때 유용 |
| FAISS | Meta의 라이브러리. 대규모 벡터에 빠름. 서버 없이 로컬에서 동작 |
| Pinecone | 클라우드 매니지드 서비스. 운영 부담 없음 |

### Chroma 선택 이유

- 별도 서버 설치 없이 `pip install langchain-chroma`만 하면 바로 사용 가능
- 데이터는 로컬 폴더에 파일로 저장
- 프로그램을 다시 실행해도 유지됨 (영속성)

---

## 6. Chroma 실습

### 벡터 스토어 생성 및 저장

```python
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb

COLLECTION_NAME = "spri_ai_brief"  # 컬렉션 이름 (RDB의 테이블에 해당)
PERSIST_DIR = "./chroma_db"  # 저장 폴더 경로 (RDB의 데이터베이스에 해당)

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# 문서 로드 → 분할
loader = PyPDFLoader("data/SPRi AI Brief_9월호_산업동향_0909_F.pdf")
docs = loader.load()

splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(docs)

print(f"총 {len(chunks)}개 청크를 벡터 DB에 저장합니다...")

# 기존 컬렉션이 있으면 삭제 (중복 방지)
client = chromadb.PersistentClient(path=PERSIST_DIR)
if COLLECTION_NAME in [c.name for c in client.list_collections()]:
    client.delete_collection(COLLECTION_NAME)

# 벡터 스토어 생성 + 문서 저장
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    collection_name=COLLECTION_NAME,
    persist_directory=PERSIST_DIR,
)

print("저장 완료!")
```

**핵심 개념**
- `COLLECTION_NAME`: RDB의 테이블과 유사. 하나의 DB에 여러 컬렉션 생성 가능
- `PERSIST_DIR`: 벡터와 메타데이터가 저장될 디렉토리 경로
- `from_documents()`: 문서 리스트를 받아 임베딩하고 벡터 스토어에 저장

### 유사도 검색

```python
# 유사도 검색
query = "즈푸 AI의 AI 모델 이름이 뭐야?"
results = vectorstore.similarity_search(query, k=3)

print(f"질문: {query}\n")
for i, doc in enumerate(results):
    print(f"--- 결과 {i+1} (페이지 {doc.metadata.get('page')}) ---")
    print(doc.page_content[:150])
    print()
```

**파라미터**
- `query`: 검색할 질문 (문자열)
- `k`: 반환할 상위 문서 개수 (기본값: 4)

**반환값**
- `Document` 객체 리스트
- 각 Document는 `page_content`(원본 텍스트)와 `metadata`(메타데이터)를 포함

### 메타데이터 필터링

```python
# 특정 페이지의 문서만 대상으로 검색
query = "AI 관련 정책은?"
results = vectorstore.similarity_search(query, k=3, filter={"page": 2})

print(f"질문: {query}")
print(f"필터: page == 2\n")
for i, doc in enumerate(results):
    print(f"[{i+1}] (페이지 {doc.metadata.get('page')}) {doc.page_content[:100]}...")
    print()

# 필터 없이 검색하면 다양한 페이지에서 결과가 나옴
results_no_filter = vectorstore.similarity_search(query, k=3)
print("필터 없이 검색한 결과 페이지:", [doc.metadata.get("page") for doc in results_no_filter])
```

**필터링 동작 원리**
1. `filter={"page": 2}` 조건에 맞는 문서만 먼저 골라냄 (정확한 매칭)
2. 골라낸 문서 중에서 질문과 가장 유사한 k개 반환 (벡터 검색)

### 유사도 점수와 함께 검색

```python
# 유사도 점수와 함께 검색
query = "오픈AI의 최신 모델은?"
results = vectorstore.similarity_search_with_score(query, k=3)

print(f"질문: {query}\n")
for doc, score in results:
    print(f"[거리: {score:.4f}] (페이지 {doc.metadata.get('page')}) {doc.page_content[:80]}...")
    print()
```

**유사도 점수 이해**

> Chroma의 기본 설정에서 `similarity_search_with_score`는 **유클리드 거리(L2 distance)** 를 반환한다. 값이 **작을수록 유사**하다. (Chroma 설정에 따라 코사인 거리 등 다른 메트릭을 반환할 수도 있다.)

| L2 거리 | 의미 |
|:---:|:---:|
| 0.0 | 완전히 동일 |
| 작은 값 | 유사 |
| 큰 값 | 무관 |

### 기존 벡터 스토어 연결

```python
# 기존 벡터 스토어에 연결 (임베딩 다시 안 함)
existing_store = Chroma(
    embedding_function=embeddings,
    collection_name=COLLECTION_NAME,
    persist_directory=PERSIST_DIR,
)

# 바로 검색 가능
results = existing_store.similarity_search("구글의 AI 관련 소식은?", k=3)
for doc in results:
    print(doc.page_content[:150])
    print()
```

**from_documents vs 생성자**
- `from_documents()`: 문서를 임베딩하고 저장
- `Chroma()`: 이미 저장된 벡터 스토어에 연결만 함

**데이터 영속성**

> Chroma는 `persist_directory`를 지정하면 데이터가 자동으로 디스크에 저장된다. 예전 버전에서는 `.persist()`를 명시적으로 호출해야 했지만, 현재는 불필요하다. 인터넷 예제에서 `.persist()` 호출이 보이더라도 무시해도 된다.

### 임베딩 모델 일관성 주의

> **주의: 임베딩 모델을 바꾸면 벡터 DB를 재구축해야 한다.** 예를 들어 `text-embedding-3-small`로 저장한 벡터 DB에 `text-embedding-3-large`로 검색하면, 벡터 차원도 다르고 좌표 공간 자체가 달라서 검색 결과가 엉망이 된다. 모델을 변경하면 모든 문서를 새 모델로 다시 임베딩하여 저장해야 한다. 실무에서 "검색 품질이 갑자기 나빠졌다"의 원인 중 하나가 임베딩 모델 불일치이므로, 어떤 모델로 저장했는지 반드시 기록해두자.

---

## 7. Retriever

### 기본 개념

**Retriever란?**
- 벡터 스토어를 LangChain의 체인(Chain)과 연결하기 위한 표준 인터페이스
- `similarity_search()`로 직접 검색할 수도 있지만, 체인에 연결하려면 Retriever가 필요
- 체인은 `Retriever.invoke(질문) → 문서 리스트` 형태의 통일된 인터페이스를 기대

**왜 Retriever가 필요한가?**
- LangChain의 표준 인터페이스를 따르기 때문에 체인과 쉽게 통합 가능
- 다양한 검색 방식(벡터, 키워드, 하이브리드)을 동일한 방식으로 사용 가능
- 검색 방식만 교체하면 체인 코드는 그대로 사용 가능

### Retriever 생성 및 사용

```python
# Retriever로 변환하여 사용
retriever = vectorstore.as_retriever(search_kwargs={"k": 2})

docs = retriever.invoke("AI 투자 규모는 어느 정도야?")

for doc in docs:
    print(doc.page_content[:150])
    print()
```

**파라미터**
- `search_kwargs`: 검색 옵션 딕셔너리
  - `k`: 반환할 문서 개수
  - `score_threshold`: 최소 유사도 점수 (이 값 이상만 반환)
  - `filter`: 메타데이터 필터링

**Retriever vs similarity_search**

| | similarity_search | Retriever |
|---|---|---|
| **사용법** | `vectorstore.similarity_search(query, k=3)` | `retriever.invoke(query)` |
| **체인 통합** | 어려움 | 쉬움 (표준 인터페이스) |
| **검색 방식 교체** | 코드 수정 필요 | 한 줄만 변경 |

### 체인과의 통합 (나중에 배울 내용)

```python
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI

llm = ChatOpenAI()

# Retriever를 체인에 바로 연결 가능
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=retriever  # 통일된 인터페이스
)

# 질문하면 자동으로: 검색 → 문맥 포함 → LLM 응답
answer = qa_chain.invoke("AI 투자 규모는?")
```

---

## 8. 실습: PDF 문서 벡터 검색 파이프라인

### 요구사항

- SPRi AI Brief 9월호 PDF를 벡터 DB에 저장
- collection_name은 `spri_exercise`로 변경
- 각 질문당 상위 4개 결과를 출력
- 질문: 지니 3, 시그라프 2025, 몰모액트 관련 내용

### 구현 코드

```python
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb

COLLECTION_NAME = "spri_exercise"  # 컬렉션 이름 (RDB의 테이블에 해당)
PERSIST_DIR = "./chroma_db"  # 저장 폴더 경로 (RDB의 데이터베이스에 해당)

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

# 문서 로드 → 분할
loader = PyPDFLoader("data/SPRi AI Brief_9월호_산업동향_0909_F.pdf")
docs = loader.load()

splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(docs)

print(f"총 {len(chunks)}개 청크를 벡터 DB에 저장합니다...")

# 기존 컬렉션이 있으면 삭제 (중복 방지)
client = chromadb.PersistentClient(path=PERSIST_DIR)
if COLLECTION_NAME in [c.name for c in client.list_collections()]:
    client.delete_collection(COLLECTION_NAME)

# 벡터 스토어 생성 + 문서 저장
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    collection_name=COLLECTION_NAME,
    persist_directory=PERSIST_DIR,
)

print("저장 완료!")

# 질문 리스트를 반복문으로 처리
queries = [
    "월드 모델로 가상 환경을 생성하는 기술은?",
    "컴퓨터 그래픽 분야의 AI 연구 성과는?",
    "3차원 공간에서 행동을 추론하는 AI 모델은?",
]

for query in queries:
    results = vectorstore.similarity_search(query, k=4)
    
    print(f"질문: {query}\n")
    for i, doc in enumerate(results, 1):
        print(f"--- 결과 {i} (페이지 {doc.metadata.get('page')}) ---")
        print(doc.page_content[:150])
        print()
    print("="*60)
    print()
```

**핵심 포인트**
- 각 질문마다 `similarity_search()` 호출
- `k=4`로 상위 4개 결과 반환
- `enumerate(results, 1)`로 1부터 번호 매김
- 구분선으로 각 질문 결과를 명확히 구분

---

## 9. 핵심 개념 정리

### 벡터 DB 구성 요소

```
문서 (Document)
    ├── 벡터 (Vector) - 임베딩 모델이 생성한 좌표값
    ├── 원본 텍스트 (page_content) - LLM에 전달할 내용
    └── 메타데이터 (metadata) - 필터링용 이름표
```

### 데이터 흐름

```
[저장]
PDF 로드 → 청킹 → 임베딩 → 벡터 DB 저장 (인덱스 구축)

[검색]
질문 → 임베딩 → ANN 검색 → 상위 k개 반환 → LLM에 전달
```

### Chroma 주요 메서드

| 메서드 | 역할 | 반환값 |
|--------|------|--------|
| `from_documents()` | 문서를 임베딩하고 저장 | Chroma 객체 |
| `similarity_search()` | 유사도 검색 | Document 리스트 |
| `similarity_search_with_score()` | 유사도 + 점수 | (Document, score) 튜플 리스트 |
| `as_retriever()` | Retriever로 변환 | Retriever 객체 |

### 검색 옵션

```python
# 기본 검색
vectorstore.similarity_search(query, k=3)

# 메타데이터 필터링
vectorstore.similarity_search(query, k=3, filter={"page": 2})

# 유사도 점수 포함
vectorstore.similarity_search_with_score(query, k=3)

# Retriever 사용
retriever = vectorstore.as_retriever(search_kwargs={"k": 3, "filter": {"page": 2}})
retriever.invoke(query)
```

### 임베딩 모델과 차원

**OpenAI 임베딩 모델**
- `text-embedding-3-small`: 1536차원
- `text-embedding-3-large`: 3072차원
- `text-embedding-ada-002`: 1536차원 (구 모델)

**중요 원칙**
- 저장할 때 사용한 임베딩 모델과 검색할 때 사용하는 모델이 **반드시 동일**해야 함
- 모델이 다르면 벡터 차원이 다르거나 좌표 공간이 달라 검색 결과가 엉망이 됨
- 모델 변경 시 전체 문서를 다시 임베딩하여 재저장 필요

### 벡터 DB 선택 가이드

| 상황 | 추천 벡터 DB |
|------|-------------|
| 로컬 개발, 프로토타입 | Chroma, FAISS |
| 기존 PostgreSQL 사용 중 | pgvector |
| 대규모 프로덕션 | Pinecone, Weaviate |
| 오픈소스 + 대규모 | Milvus, Qdrant |

---

## 10. 다음 학습 방향

- **RAG (Retrieval-Augmented Generation)**: Retriever와 LLM을 체인으로 연결
- **하이브리드 검색**: 벡터 검색 + 키워드 검색 결합
- **Re-ranking**: 검색 결과의 순서를 재조정하여 정확도 향상
- **메타데이터 설계**: 효율적인 필터링을 위한 메타데이터 구조 설계