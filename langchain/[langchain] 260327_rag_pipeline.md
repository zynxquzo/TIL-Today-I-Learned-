# [TIL] LangChain: RAG 파이프라인과 고도화 기법

## 1. RAG 파이프라인 개요

### RAG(Retrieval-Augmented Generation)란?

**정의**
- 외부 문서를 검색(Retrieve)하여 LLM에 맥락(Context)을 제공하고, 이를 바탕으로 답변을 생성(Generate)하는 기술
- LLM의 한계(최신 정보 부족, 특정 도메인 지식 부족)를 문서 검색으로 보완
- 환각(Hallucination)을 줄이고 사실에 기반한 답변 생성 가능

**RAG의 필요성**

| LLM만 사용 | RAG 사용 |
|-----------|----------|
| 학습 데이터에 없는 정보는 모름 | 최신 문서나 사내 문서도 참조 가능 |
| 근거 없는 답변 생성 가능 (환각) | 검색된 문서를 근거로 답변 |
| 모든 지식을 모델에 포함 필요 | 필요한 지식만 문서로 제공 |

**전체 파이프라인 흐름**
```
문서 로드 → 청킹(분할) → 임베딩 → 벡터 DB 저장
                                ↓
질문 → 임베딩 → 벡터 검색 → 관련 문서 추출 → 프롬프트 주입 → LLM 응답
```

---

## 2. 문서 로더 (Document Loaders)

### 다양한 문서 형식 지원

**주요 로더**

| 로더 | 지원 형식 | 사용 예시 |
|------|----------|----------|
| `PyPDFLoader` | PDF | `PyPDFLoader("file.pdf")` |
| `TextLoader` | 텍스트, 마크다운 | `TextLoader("file.md", encoding="utf-8")` |
| `UnstructuredMarkdownLoader` | 마크다운 (구조 파싱) | `UnstructuredMarkdownLoader("file.md")` |
| `DirectoryLoader` | 디렉토리 전체 | `DirectoryLoader("path/", glob="*.md")` |

### PDF 문서 로드

```python
from langchain_community.document_loaders import PyPDFLoader

loader = PyPDFLoader("data/SPRi AI Brief_9월호_산업동향_0909_F.pdf")
docs = loader.load()

print(f"총 {len(docs)}개 페이지")
print(f"첫 페이지 내용: {docs[0].page_content[:200]}")
print(f"메타데이터: {docs[0].metadata}")
```

**메타데이터 구조**
- `source`: 파일 경로
- `page`: 페이지 번호 (PDF)

### 마크다운 문서 로드

**단일 파일 로드**
```python
from langchain_community.document_loaders import TextLoader

loader = TextLoader("data/company_rules/IT지원규정.md", encoding="utf-8")
docs = loader.load()
```

**디렉토리 전체 로드**
```python
from langchain_community.document_loaders import DirectoryLoader, TextLoader

loader = DirectoryLoader(
    "data/company_rules/",
    glob="*.md",  # 모든 .md 파일
    loader_cls=TextLoader,
    loader_kwargs={"encoding": "utf-8"}
)
docs = loader.load()
```

**주의사항**
- 마크다운 로드 시 반드시 `encoding="utf-8"` 지정 (한글 깨짐 방지)
- `UnstructuredMarkdownLoader`는 `unstructured` 패키지 설치 필요
- 간단한 용도는 `TextLoader`로 충분

---

## 3. 텍스트 분할 (Text Splitting)

### 왜 청킹이 필요한가?

**문제점**
- 긴 문서를 통째로 임베딩하면 의미가 희석됨
- LLM 컨텍스트 윈도우 제한
- 검색 정확도 저하

**해결책**
- 문서를 작은 청크(chunk)로 분할
- 각 청크를 독립적으로 임베딩 및 검색
- 관련성 높은 청크만 LLM에 전달

### RecursiveCharacterTextSplitter

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,      # 청크 하나당 최대 글자 수
    chunk_overlap=50,    # 청크 간 겹치는 글자 수
)

chunks = splitter.split_documents(docs)
print(f"총 {len(chunks)}개 청크 생성")
```

**파라미터 설명**

| 파라미터 | 역할 | 권장값 |
|----------|------|--------|
| `chunk_size` | 청크 하나의 최대 크기 | 500~1000 (문서 특성에 따라) |
| `chunk_overlap` | 청크 간 겹치는 부분 | chunk_size의 10% 정도 |

**chunk_overlap가 필요한 이유**
- 문장이 청크 경계에서 잘리는 것을 방지
- 앞뒤 문맥이 연결되어 의미 보존

---

## 4. 벡터 스토어 (Vector Store)

### Chroma DB 사용

**Chroma란?**
- 오픈소스 벡터 데이터베이스
- 로컬에서 간단하게 사용 가능
- 영속성 지원 (디스크에 저장)

### 벡터 DB 구축

```python
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
import chromadb

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

COLLECTION_NAME = "spri_ai_brief"
PERSIST_DIR = "./chroma_db"

# 기존 컬렉션 삭제 (중복 방지)
client = chromadb.PersistentClient(path=PERSIST_DIR)
existing_names = [c.name for c in client.list_collections()]
if COLLECTION_NAME in existing_names:
    client.delete_collection(COLLECTION_NAME)

# 벡터 스토어 생성 + 문서 저장
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    collection_name=COLLECTION_NAME,
    client=client,
)
```

**핵심 포인트**
- `client` 객체를 공유하여 일관된 경로 사용
- 기존 컬렉션이 있으면 삭제하여 중복 방지
- `from_documents()` 메서드가 임베딩과 저장을 한 번에 처리

### 임베딩(Embedding)이란?

**개념**
- 텍스트를 고차원 벡터(숫자 배열)로 변환
- 의미가 비슷한 텍스트는 벡터 공간에서 가까이 위치
- 벡터 간 거리로 유사도 측정 가능

**OpenAI 임베딩 모델**
```python
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
```

---

## 5. Retriever (검색기)

### 기본 Retriever

```python
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

# 검색
docs = retriever.invoke("오픈AI의 차세대 모델에 대해 알려줘")

for doc in docs:
    print(f"페이지 {doc.metadata.get('page')}: {doc.page_content[:200]}...")
```

**파라미터**
- `k`: 검색할 문서 개수 (기본값: 4)
- 값이 클수록 더 많은 컨텍스트 제공, 하지만 노이즈도 증가

### MultiQueryRetriever

**개념**
- 하나의 질문을 LLM이 여러 관점의 질문으로 변환
- 각 질문으로 검색 후 결과 통합
- 검색 품질 향상

```python
from langchain_classic.retrievers.multi_query import MultiQueryRetriever
import logging

# 로그 설정 (생성된 쿼리 확인용)
logging.basicConfig()
logging.getLogger("langchain_classic.retrievers.multi_query").setLevel(logging.INFO)

multi_retriever = MultiQueryRetriever.from_llm(
    retriever=retriever,
    llm=llm,
)

docs = multi_retriever.invoke("AI 안전성 논의")
```

**동작 과정**
1. 원본 질문: "AI 안전성 논의"
2. LLM이 변환:
   - "AI 윤리와 관련된 최근 이슈는?"
   - "AI 규제 동향은 어떻게 되나요?"
   - "AI 안전 표준이 있나요?"
3. 3개 질문으로 각각 검색
4. 결과 통합 (중복 제거)

### BM25 Retriever

**개념**
- 키워드 기반 검색 (전통적인 검색 방식)
- 벡터 검색과 달리 정확한 단어 매칭에 강함
- 고유명사, 전문용어 검색에 유리

```python
from langchain_community.retrievers import BM25Retriever

bm25_retriever = BM25Retriever.from_documents(chunks)
bm25_retriever.k = 3

docs = bm25_retriever.invoke("GPT-5")
```

### EnsembleRetriever (하이브리드 검색)

**개념**
- 벡터 검색 + 키워드 검색 결합
- 두 방식의 장점 활용

```python
from langchain.retrievers import EnsembleRetriever

ensemble_retriever = EnsembleRetriever(
    retrievers=[retriever, bm25_retriever],
    weights=[0.5, 0.5],  # 벡터:키워드 = 5:5
)

docs = ensemble_retriever.invoke("구글 AI 소식")
```

**가중치 조정**
- `[0.7, 0.3]`: 벡터 검색 중심 (의미 유사도 중시)
- `[0.3, 0.7]`: 키워드 검색 중심 (정확한 단어 매칭 중시)
- `[0.5, 0.5]`: 균형

---

## 6. RAG Chain 구성

### 기본 RAG Chain

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

def format_docs(docs):
    """검색된 문서를 하나의 텍스트로 합침"""
    return "\n\n".join(doc.page_content for doc in docs)

prompt = ChatPromptTemplate.from_messages([
    ("system", """너는 AI 산업 동향 전문가야. 아래 검색된 문서를 참고하여 질문에 답변해줘.
검색 결과에 없는 내용은 "해당 정보를 찾을 수 없습니다"라고 답변해.

[검색된 문서]
{context}"""),
    ("human", "{question}"),
])

# 단계별 실행
question = "오픈AI의 차세대 모델에 대해 설명해줘"

# 1. 검색
docs = retriever.invoke(question)

# 2. 문서 포매팅
context = format_docs(docs)

# 3. LLM 응답 생성
chain = prompt | llm | StrOutputParser()
response = chain.invoke({"context": context, "question": question})

print(response)
```

### LCEL로 RAG Chain 연결

```python
from langchain_core.runnables import RunnablePassthrough

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# 한 번에 실행
response = rag_chain.invoke("오픈AI의 차세대 모델에 대해 설명해줘")
```

**데이터 흐름**
```
question → {"context": 검색된 문서, "question": 질문}
         → prompt (변수 주입)
         → llm (답변 생성)
         → parser (문자열 추출)
         → 최종 답변
```

---

## 7. Citation (출처 표시) 패턴

### 왜 Citation이 중요한가?

**문제점**
- RAG 답변의 신뢰도를 사용자가 직접 확인하기 어려움
- 어떤 문서를 참조했는지 알 수 없음

**해결책**
- 답변에 출처 번호 표시 ([1], [2] 형식)
- 참조 문서 목록 함께 제공

### Citation RAG 구현

```python
citation_prompt = ChatPromptTemplate.from_messages([
    ("system", """너는 AI 산업 동향 전문가야. 아래 검색된 문서를 참고하여 질문에 답변해줘.

규칙:
1. 답변의 각 문장 끝에 출처 번호를 [1], [2] 형태로 표시해
2. 검색 결과에 없는 내용은 절대 만들어내지 마
3. 답변할 수 없으면 "해당 정보를 찾을 수 없습니다"라고 답변해

[검색된 문서]
{context}"""),
    ("human", "{question}"),
])

def format_docs_with_index(docs):
    """문서에 번호를 붙여 포매팅"""
    return "\n\n".join(
        f"[{i+1}] (페이지 {doc.metadata.get('page', '?')}) {doc.page_content}"
        for i, doc in enumerate(docs)
    )

def citation_rag(question: str):
    docs = retriever.invoke(question)
    context = format_docs_with_index(docs)
    answer = (citation_prompt | llm | StrOutputParser()).invoke(
        {"context": context, "question": question}
    )
    return answer, docs

# 실행
answer, source_docs = citation_rag("구글이 발표한 AI 관련 소식을 정리해줘")

print("=== 답변 (출처 포함) ===")
print(answer)

print("\n=== 참조 문서 ===")
for i, doc in enumerate(source_docs):
    print(f"[{i+1}] (페이지 {doc.metadata.get('page', '?')})")
    print(f"    {doc.page_content[:200]}...")
```

---

## 8. SQL Chain (자연어로 DB 조회)

### 개념

**문제점**
- 비개발자는 SQL을 작성할 수 없음
- 복잡한 쿼리는 작성이 어려움

**해결책**
- 자연어 질문을 SQL로 변환
- SQL 실행 후 결과를 자연어로 설명

### SQL Chain 구현

```python
from langchain_community.utilities import SQLDatabase
from langchain_classic.chains import create_sql_query_chain
from langchain_community.tools.sql_database.tool import QuerySQLDatabaseTool
import os

# PostgreSQL 연결
db = SQLDatabase.from_uri(
    os.getenv("DATABASE_URL"),
    include_tables=["products"],  # 허용할 테이블만 명시
)

# SQL 쿼리 생성 체인
sql_chain = create_sql_query_chain(llm, db)

# SQL 실행 도구
execute_query = QuerySQLDatabaseTool(db=db)

# 자연어 응답 프롬프트
answer_prompt = ChatPromptTemplate.from_messages([
    ("system", """주어진 SQL 쿼리와 실행 결과를 바탕으로 사용자의 질문에 자연어로 답변해줘.
답변에 SQL 쿼리를 포함하지 마."""),
    ("human", """질문: {question}
SQL 쿼리: {query}
실행 결과: {result}"""),
])

# 실행
question = "카테고리별 상품 수를 알려줘"

# 1) 자연어 → SQL
sql_query = sql_chain.invoke({"question": question})
sql_query = sql_query.strip().removeprefix("SQLQuery:").strip()

# 2) SQL 실행
result = execute_query.invoke(sql_query)

# 3) 자연어 응답
answer_chain = answer_prompt | llm | StrOutputParser()
response = answer_chain.invoke({
    "question": question, 
    "query": sql_query, 
    "result": result
})

print(response)
```

**보안 고려사항**
- `include_tables`로 접근 가능한 테이블 제한
- 민감한 테이블(개인정보, 인사 정보 등) 노출 방지

---

## 9. 실습: 사내 규정 RAG 파이프라인

### 요구사항
- 마크다운 문서 5개 로드
- 벡터 스토어에 저장
- RAG 체인으로 질문 답변

### 전체 구현

```python
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import chromadb
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

COLLECTION_NAME = "company_rules"
PERSIST_DIR = "./chroma_db"

# 1. 문서 로드
loader = DirectoryLoader(
    "data/company_rules/",
    glob="*.md",
    loader_cls=TextLoader,
    loader_kwargs={"encoding": "utf-8"}
)
docs = loader.load()

# 2. 청킹
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(docs)

# 3. 벡터 DB 저장
client = chromadb.PersistentClient(path=PERSIST_DIR)
if COLLECTION_NAME in [c.name for c in client.list_collections()]:
    client.delete_collection(COLLECTION_NAME)

vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    collection_name=COLLECTION_NAME,
    client=client,
)

# 4. RAG Chain 구성
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

prompt = ChatPromptTemplate.from_messages([
    ("system", """너는 사내 규정을 꿰뚫고 있는 사내 규정 전문가야. 
아래 검색된 문서를 참고하여 질문에 답변해줘.
검색 결과에 없는 내용은 "해당 정보를 찾을 수 없습니다"라고 답변해.

[검색된 문서]
{context}"""),
    ("human", "{question}"),
])

chain = prompt | llm | StrOutputParser()

# 5. 테스트
questions = [
    "연차는 며칠이야?",
    "USB 꽂아서 파일 옮겨도 돼?",
    "결혼하면 회사에서 뭘 해줘?",
]

for idx, question in enumerate(questions, 1):
    print(f"\n{'='*60}")
    print(f"질문 {idx}: {question}")
    print('='*60)
    
    docs = retriever.invoke(question)
    context = format_docs(docs)
    response = chain.invoke({"context": context, "question": question})
    
    print(f"\n답변:\n{response}")
    
    print(f"\n=== 참조된 문서 ({len(docs)}개) ===")
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get('source', '?').split('/')[-1]
        print(f"[{i}] {source}")
        print(f"    내용: {doc.page_content[:150]}...\n")
```

### k값 실험

**세 번째 질문 분석**
- "결혼하면 회사에서 뭘 해줘?"
- 인사규정(경조휴가) + 경비처리규정(축의금) 두 문서 필요
- k=2면 한쪽 정보 누락 가능
- k=3 이상 권장

```python
# k 값 비교
for k_value in [2, 3, 5]:
    retriever = vectorstore.as_retriever(search_kwargs={"k": k_value})
    # ... 테스트
```

---

## 10. 핵심 개념 정리

### RAG 파이프라인 전체 흐름

```
[사전 준비 단계]
문서 로드 (Loader)
    ↓
청킹 (Splitter)
    ↓
임베딩 + 벡터 DB 저장 (Embeddings + VectorStore)

[실행 단계]
질문
    ↓
Retriever (검색)
    ↓
관련 문서 추출
    ↓
Prompt에 문서 주입
    ↓
LLM 응답 생성
    ↓
OutputParser
    ↓
최종 답변
```

### 주요 구성 요소

| 구성 요소 | 역할 | 구현체 예시 |
|----------|------|------------|
| **Loader** | 문서 로드 | `PyPDFLoader`, `TextLoader`, `DirectoryLoader` |
| **Splitter** | 텍스트 분할 | `RecursiveCharacterTextSplitter` |
| **Embeddings** | 텍스트 → 벡터 변환 | `OpenAIEmbeddings` |
| **VectorStore** | 벡터 저장/검색 | `Chroma` |
| **Retriever** | 검색 전략 | `as_retriever()`, `MultiQueryRetriever`, `EnsembleRetriever` |

### Retriever 전략 비교

| Retriever | 검색 방식 | 장점 | 단점 |
|-----------|----------|------|------|
| **기본 Retriever** | 벡터 유사도 | 의미 기반 검색 | 고유명사에 약함 |
| **MultiQueryRetriever** | 멀티 쿼리 → 벡터 검색 | 검색 품질 향상 | LLM 호출 비용 증가 |
| **BM25Retriever** | 키워드 매칭 | 정확한 단어 검색 | 의미 이해 부족 |
| **EnsembleRetriever** | 벡터 + 키워드 하이브리드 | 두 방식 장점 결합 | 파라미터 튜닝 필요 |

### 주요 파라미터

| 파라미터 | 역할 | 권장값 |
|----------|------|--------|
| `chunk_size` | 청크 크기 | 500~1000 (문서 특성에 따라) |
| `chunk_overlap` | 청크 겹침 | chunk_size의 10% |
| `k` | 검색 문서 수 | 3~5 (질문 복잡도에 따라) |
| `weights` (Ensemble) | 벡터:키워드 비율 | [0.5, 0.5] (균형) |

### 패턴별 사용 시점

| 패턴 | 사용 시점 | 예시 |
|------|-----------|------|
| **기본 RAG** | 단순 문서 검색 + 답변 | 제품 매뉴얼 QA |
| **Citation RAG** | 답변 신뢰도 중요 | 법률 자문, 의료 정보 |
| **MultiQuery RAG** | 모호한 질문 처리 | 광범위한 주제 검색 |
| **SQL Chain** | DB 데이터 자연어 조회 | 매출 분석, 재고 확인 |

### 문서 로더 선택 가이드

| 파일 형식 | 추천 로더 | 주의사항 |
|----------|----------|----------|
| PDF | `PyPDFLoader` | 페이지 메타데이터 자동 포함 |
| 마크다운 (단순) | `TextLoader` | `encoding="utf-8"` 필수 |
| 마크다운 (구조 파싱) | `UnstructuredMarkdownLoader` | `unstructured` 패키지 필요 |
| 여러 파일 | `DirectoryLoader` | `glob` 패턴으로 필터링 |

---

## 11. 트러블슈팅

### 문제 1: 한글 깨짐

**증상**
```
UnicodeDecodeError: 'charmap' codec can't decode byte...
```

**해결**
```python
loader = TextLoader("file.md", encoding="utf-8")
```

### 문제 2: 벡터 DB 중복 저장

**증상**
- 같은 문서가 계속 추가됨
- 검색 결과에 중복 출현

**해결**
```python
# 기존 컬렉션 삭제
client = chromadb.PersistentClient(path=PERSIST_DIR)
if COLLECTION_NAME in [c.name for c in client.list_collections()]:
    client.delete_collection(COLLECTION_NAME)
```

### 문제 3: ModuleNotFoundError: unstructured

**증상**
```
ModuleNotFoundError: No module named 'unstructured'
```

**해결책 1: 패키지 설치**
```bash
pip install unstructured markdown
```

**해결책 2: TextLoader 사용 (추천)**
```python
# UnstructuredMarkdownLoader 대신
loader = DirectoryLoader(
    "path/",
    glob="*.md",
    loader_cls=TextLoader,
    loader_kwargs={"encoding": "utf-8"}
)
```

### 문제 4: 검색 결과가 부정확함

**원인**
- `k` 값이 너무 작음
- `chunk_size`가 너무 크거나 작음

**해결**
```python
# k 값 조정
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

# chunk_size 조정
splitter = RecursiveCharacterTextSplitter(
    chunk_size=300,  # 더 작게
    chunk_overlap=50,
)
```

---

## 12. 추가 학습 방향

### RAG 고도화 기법
- **Reranking**: 검색된 문서를 재정렬하여 품질 향상
- **Self-Query**: 질문을 분석하여 메타데이터 필터링
- **Parent Document Retriever**: 작은 청크로 검색, 큰 청크로 컨텍스트 제공
- **Contextual Compression**: 검색된 문서에서 관련 부분만 추출

### 프로덕션 고려사항
- 벡터 DB 선택 (Chroma, Pinecone, Weaviate, Qdrant)
- 임베딩 모델 선택 (비용, 성능, 언어 지원)
- 캐싱 전략 (동일 질문 반복 시 검색 생략)
- 모니터링 (검색 품질, 응답 시간, 비용)