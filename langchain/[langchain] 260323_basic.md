# [TIL] LangChain: 기초와 LCEL 파이프라인

## 1. LangChain 소개

### LangChain이란?

**정의**
- LLM(대형 언어 모델)을 활용한 애플리케이션을 쉽게 만들 수 있게 해주는 Python 프레임워크
- 다양한 LLM 제공자(OpenAI, Google, 로컬 모델 등)를 통일된 인터페이스로 사용할 수 있다
- 프롬프트 관리, 체인 구성, 메모리, Tool 사용 등 LLM 앱에 필요한 기능을 제공한다

**LLM 앱 개발의 흐름**
```
1. 단순 API 호출 — OpenAI API 직접 호출하여 챗봇 만들기
2. 체인 구성 — 프롬프트 + 모델 + 파서 연결
3. 메모리/Tool 추가 — 대화 기억, 외부 도구(검색, DB 등) 사용
4. RAG — 자체 문서 검색하여 LLM에 맥락 제공
5. Agent — LLM이 스스로 판단하여 여러 도구 조합
```

LangChain은 2~5단계를 쉽게 구현할 수 있게 해주는 프레임워크

### LangChain 생태계

| 패키지 | 역할 | 설명 |
|--------|------|------|
| `langchain-core` | 핵심 | 기본 인터페이스, LCEL, 메시지 타입 등 |
| `langchain` | 체인/메모리 | 체인 구성, 메모리, 에이전트 등 고수준 기능 |
| `langchain-openai` | OpenAI 연동 | ChatOpenAI, OpenAI Embeddings 등 |
| `langchain-google-genai` | Google 연동 | ChatGoogleGenerativeAI 등 |
| `langchain-community` | 커뮤니티 통합 | 다양한 서드파티 Tool, 벡터 DB 등 |
| `langgraph` | Agent 프레임워크 | 상태 기반 Agent 구축 |

**패키지 의존성 구조**
```
langchain-core (핵심)
    ├── langchain (체인/메모리)
    ├── langchain-openai (모델 연동)
    ├── langchain-google-genai (모델 연동)
    ├── langchain-community (커뮤니티)
    └── langgraph (Agent)
```

### 왜 LangChain을 사용하는가?

| 기능 | 직접 구현 | LangChain |
|------|-----------|----------|
| 프롬프트 템플릿 | 문자열 포맷팅으로 직접 관리 | `ChatPromptTemplate` |
| 모델 교체 | API별로 코드 재작성 | 한 줄 변경 (`ChatOpenAI` → `ChatGoogleGenerativeAI`) |
| 대화 메모리 | 히스토리 리스트 직접 관리 | `RunnableWithMessageHistory` |
| Tool 사용 | JSON 스키마 직접 작성 + 파싱 | `@tool` 데코레이터 |
| RAG | 임베딩/검색/주입 모두 직접 구현 | `Retriever` + 체인 |
| 체인 연결 | 함수 호출 순서 직접 관리 | `|` 파이프라인 |

**핵심**: 단순한 한 번의 호출이라면 직접 호출이 더 간단하지만, 기능이 추가될수록 LangChain의 가치가 커진다.

---

## 2. 환경 설정

### 패키지 설치

**가상환경 생성 + 패키지 설치**
```bash
uv init
uv add langchain langchain-openai langchain-google-genai langchain-community python-dotenv ipykernel
```

**ipynb 실행 설정**
- 매 파일마다 kernel 설정 필요
- 노트북 열기 → 우상단 Select Kernel → python environments → 프로젝트명 선택
- 프로젝트명이 보이지 않으면 VSCode 재시작

### API 키 설정

**`.env` 파일 생성**
```
OPENAI_API_KEY=sk-...
```

**환경변수 불러오기**
```python
from dotenv import load_dotenv

load_dotenv()
```

### LangSmith 설정

**LangSmith란?**
- LangChain 공식 디버깅/모니터링 플랫폼
- 체인의 실행 과정을 시각적으로 추적(트레이싱)할 수 있음
- `print()` 디버깅보다 훨씬 효율적

**왜 LangSmith를 쓰는가?**

| 전통적 디버깅 | LLM 앱 디버깅 |
|--------------|--------------|
| 에러 메시지로 원인 파악 | 에러 없이 "이상한 답변"이 나옴 |
| 입력 → 출력이 결정적 | 같은 입력도 다른 출력 가능 |
| 중간 변수를 print로 확인 | 체인 내부 프롬프트/응답을 봐야 함 |

**설정 방법**

1. https://smith.langchain.com 접속
2. 구글/GitHub 계정으로 가입 (무료)
3. Settings → API Keys → Create API Key
4. `.env`에 추가:

```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_...
LANGCHAIN_PROJECT=프로젝트명
```

**LangSmith 트레이스에서 볼 수 있는 정보**

| 정보 | 설명 | 활용 |
|------|------|------|
| 실행 흐름 | 프롬프트 → LLM → 파서 각 단계의 입출력 | 체인이 의도대로 연결됐는지 확인 |
| 실제 프롬프트 | LLM에 전달된 최종 프롬프트 전문 | 변수 주입이 제대로 됐는지 확인 |
| 토큰 사용량 | 각 호출별 input/output 토큰 수 | 비용 추적 및 최적화 |
| 소요 시간 | 각 단계별 레이턴시 | 병목 구간 파악 |
| 에러 위치 | 체인 중간 에러 발생 시 정확한 단계 | 디버깅 시간 단축 |

---

## 3. 직접 호출 vs LangChain 비교

### OpenAI API 직접 호출

```python
from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "너는 친절한 한국어 번역가야."},
        {"role": "user", "content": "Hello, how are you?"},
    ],
)

print(response.choices[0].message.content)
```

### LangChain으로 호출

```python
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

llm = ChatOpenAI(model="gpt-4o-mini")

messages = [
    SystemMessage(content="너는 친절한 한국어 번역가야."),
    HumanMessage(content="Hello, how are you?"),
]

response = llm.invoke(messages)
print(response.content)
```

**`invoke()` 메서드**
- LangChain의 핵심 메서드
- 모든 구성 요소(LLM, 프롬프트, 파서, 체인 등)는 **Runnable** 인터페이스를 구현
- `invoke()`는 이 인터페이스의 기본 실행 메서드
- **LangChain에서 무언가를 실행할 때는 `invoke()`를 쓴다**고 기억하면 됨

---

## 4. ChatModel

### 기본 사용

**ChatModel이란?**
- LangChain에서 LLM을 사용하기 위한 객체
- 메시지 리스트를 입력받아 AI 응답 메시지를 반환

**메시지 타입**

| 메시지 타입 | 역할 | 설명 |
|-------------|------|------|
| `SystemMessage` | system | LLM의 역할과 행동을 설정 |
| `HumanMessage` | user | 사용자의 입력 |
| `AIMessage` | assistant | LLM의 응답 |

**예제**
```python
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

messages = [
    SystemMessage(content="너는 Python 전문가야."),
    HumanMessage(content="리스트 컴프리헨션이 뭐야?"),
]

response = llm.invoke(messages)
print(response.content)
```

### LLM 모델 전환

**LangChain의 추상화 덕분에 모델 교체가 한 줄이면 됨**

```python
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

llm_openai = ChatOpenAI(model="gpt-4o-mini", temperature=0)
llm_google = ChatGoogleGenerativeAI(model="gemini-2.5-flash-lite", temperature=0)

messages = [HumanMessage(content="Python의 장점 3가지를 알려줘")]

print("=== OpenAI ===")
print(llm_openai.invoke(messages).content)

print("\n=== Google ===")
print(llm_google.invoke(messages).content)
```

---

## 5. PromptTemplate

### 기본 개념

**역할**
- 프롬프트를 템플릿화하여 변수를 동적으로 주입할 수 있게 함
- 반복적인 프롬프트 작성을 줄이고, 재사용성을 높임

**기본 사용**
```python
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_messages([
    ("system", "너는 {role} 전문가야. 모든 답변은 한국어로 해줘."),
    ("human", "{question}"),
])

# 변수를 주입하여 메시지 생성
messages = prompt.invoke({
    "role": "Python",
    "question": "데코레이터가 뭐야?",
})

print(messages)
```

**핵심 포인트**
- `{role}`, `{question}` 같은 중괄호 부분이 변수
- `invoke()`로 실제 값을 넣으면 완성된 메시지 리스트가 만들어짐
- 이 템플릿을 LLM과 연결하면 체인이 됨

---

## 6. OutputParser

### 기본 개념

**역할**
- LLM의 응답을 원하는 형태로 변환
- `llm.invoke()`의 반환값은 `AIMessage` 객체
- `StrOutputParser`는 여기서 `content` 문자열만 깔끔하게 꺼내줌

**기본 사용**
```python
from langchain_core.output_parsers import StrOutputParser

parser = StrOutputParser()

# AIMessage에서 content 문자열만 추출
result = parser.invoke(response)
print(result)
```

---

## 7. LCEL 파이프라인 (LangChain Expression Language)

### 기본 개념

**LCEL이란?**
- `|` 연산자로 프롬프트, 모델, 파서를 연결하여 체인을 구성
- 데이터가 왼쪽에서 오른쪽으로 흘러감

**데이터 흐름**
```
입력 → PromptTemplate → ChatModel → OutputParser → 출력
```

### 기본 파이프라인

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

prompt = ChatPromptTemplate.from_messages([
    ("system", "너는 {role} 전문가야."),
    ("human", "{question}"),
])

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = StrOutputParser()

# LCEL 파이프라인
chain = prompt | llm | parser

result = chain.invoke({
    "role": "Python",
    "question": "리스트와 튜플의 차이가 뭐야?",
})

print(result)
```

**동작 원리**
1. `prompt` — 변수를 받아 메시지 리스트를 만듦
2. `llm` — 메시지를 받아 AI 응답을 생성
3. `parser` — AI 응답에서 문자열만 추출

이 체인에 `invoke()`를 호출하면 데이터가 순서대로 흘러가며, 최종 결과물(문자열)이 반환됨

### Prompt Chaining 패턴

**개념**
- 하나의 체인 출력을 다음 체인의 입력으로 연결하는 패턴
- LCEL의 `|` 파이프라인이 곧 Prompt Chaining
- 복잡한 작업을 작은 단계로 나누어 처리 가능

**RunnableLambda 활용**
```python
from langchain_core.runnables import RunnableLambda

# 1단계: 주제에 대한 설명 생성
prompt1 = ChatPromptTemplate.from_messages([
    ("system", "너는 기술 블로거야. 주어진 주제에 대해 간단히 설명해줘."),
    ("human", "{topic}"),
])

# 2단계: 설명을 초보자용으로 쉽게 변환
prompt2 = ChatPromptTemplate.from_messages([
    ("system", "너는 초보자를 위한 튜터야. 다음 설명을 초등학생도 이해할 수 있게 바꿔줘."),
    ("human", "{text}"),
])

chain1 = prompt1 | llm | parser
chain2 = prompt2 | llm | parser

# RunnableLambda로 체인 연결
combined_chain = chain1 | RunnableLambda(lambda x: {"text": x}) | chain2

result = combined_chain.invoke({"topic": "REST API"})
print(result)
```

**RunnableLambda를 쓰는 이유**
- `chain1`의 출력은 `str`
- `chain2`의 입력은 `{"text": ...}` 딕셔너리
- 타입 변환 어댑터 역할을 함

### RunnablePassthrough

**주요 Runnable 유틸리티**

| Runnable | 역할 | 사용 시점 |
|----------|------|-----------|
| `RunnablePassthrough` | 입력을 그대로 전달 | 입력 데이터를 유지하면서 추가 처리 |
| `RunnablePassthrough.assign()` | 입력에 새 필드 추가 | 기존 입력에 계산된 값 추가 |
| `RunnableLambda` | 커스텀 함수 적용 | 타입 변환, 복잡한 로직 |

**RunnablePassthrough.assign() 예제**
```python
from langchain_core.runnables import RunnablePassthrough

# 고정 컨텍스트를 자동으로 붙이기
context = "FastAPI는 Python 기반의 고성능 웹 프레임워크이다."

prompt = ChatPromptTemplate.from_messages([
    ("system", "다음 context를 참고하여 답변해줘:\n{context}"),
    ("human", "{question}"),
])

chain = (
    RunnablePassthrough.assign(context=lambda x: context)
    | prompt
    | llm
    | parser
)

# 사용자는 question만 전달하면 됨
result = chain.invoke({"question": "FastAPI가 뭐야?"})
print(result)
```

**동작 흐름**
```
{"question": "FastAPI가 뭐야?"} 
→ RunnablePassthrough.assign(context=...) 
→ {"question": "FastAPI가 뭐야?", "context": "FastAPI는..."}
→ prompt (변수 주입)
→ llm
→ parser
```

---

## 8. 비용 모니터링

### with_config를 통한 토큰 추적

```python
from langchain_core.callbacks import StdOutCallbackHandler

chain = prompt | llm | parser

result = chain.invoke(
    {"role": "Python", "question": "클래스가 뭐야?"},
    config={"callbacks": [StdOutCallbackHandler()]}
)
```

**출력되는 정보**
- LLM 호출 시작/종료
- 프롬프트 생성 과정
- 토큰 사용량 (input/output)

---

## 9. LLM API 에러 핸들링

### 기본 에러 처리

```python
from langchain_core.exceptions import OutputParserException

try:
    result = chain.invoke({"role": "Python", "question": "튜플이 뭐야?"})
    print(result)
except OutputParserException as e:
    print(f"파싱 에러: {e}")
except Exception as e:
    print(f"일반 에러: {e}")
```

### Retry 메커니즘

```python
from langchain_core.runnables import RunnableRetry

# 최대 3번까지 재시도
chain_with_retry = RunnableRetry(
    chain,
    max_attempt_number=3,
    wait_exponential_jitter=True  # 지수 백오프
)

result = chain_with_retry.invoke({
    "role": "Python",
    "question": "제너레이터가 뭐야?"
})
```

---

## 10. LLM 응답 캐싱

### InMemoryCache 활용

```python
from langchain_core.caches import InMemoryCache
from langchain_core.globals import set_llm_cache

# 캐시 활성화
set_llm_cache(InMemoryCache())

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# 첫 호출 - API 호출 발생
result1 = llm.invoke("Python의 장점은?")

# 두 번째 호출 - 캐시에서 가져옴 (빠름)
result2 = llm.invoke("Python의 장점은?")
```

**장점**
- 동일한 질문에 대한 반복 호출 시 비용 절감
- 응답 속도 향상
- temperature=0일 때 가장 효과적

---

## 11. 비결정성 관리

### temperature 파라미터

**temperature란?**
- LLM 응답의 무작위성을 조절하는 파라미터
- 0에 가까울수록 결정적, 1에 가까울수록 창의적

| temperature | 특징 | 사용 시점 |
|-------------|------|-----------|
| 0 | 가장 확률 높은 토큰 선택, 일관된 응답 | 번역, 요약, 분류 등 정확성이 중요할 때 |
| 0.7 | 적당한 창의성 | 일반적인 대화, 콘텐츠 생성 |
| 1.0 이상 | 매우 다양한 응답 | 브레인스토밍, 창의적 글쓰기 |

**예제**
```python
llm_deterministic = ChatOpenAI(model="gpt-4o-mini", temperature=0)
llm_creative = ChatOpenAI(model="gpt-4o-mini", temperature=0.9)

# 같은 질문에 대해 일관된 답변
for i in range(3):
    print(llm_deterministic.invoke("Python이 뭐야?").content)
    print("---")

# 같은 질문에 대해 다양한 답변
for i in range(3):
    print(llm_creative.invoke("Python이 뭐야?").content)
    print("---")
```

### seed 파라미터

```python
llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.7,
    seed=42  # 고정 시드
)

# 같은 seed + temperature면 재현 가능한 결과
result1 = llm.invoke("짧은 시를 써줘")
result2 = llm.invoke("짧은 시를 써줘")
```

---

## 12. batch와 stream

### 주요 실행 메서드

| 메서드 | 입력 | 출력 | 비동기 버전 |
|--------|------|------|------------|
| `invoke()` | 하나 | 하나 | `ainvoke()` |
| `batch()` | 리스트 | 리스트 | `abatch()` |
| `stream()` | 하나 | 이터레이터 (chunk) | `astream()` |

### batch - 여러 입력 동시 처리

```python
prompt = ChatPromptTemplate.from_messages([
    ("system", "한 문장으로 답해줘."),
    ("human", "{question}"),
])

chain = prompt | llm | StrOutputParser()

# invoke를 3번 반복하는 대신, batch로 한 번에 처리
results = chain.batch([
    {"question": "Python이 뭐야?"},
    {"question": "JavaScript가 뭐야?"},
    {"question": "Rust가 뭐야?"},
])

for r in results:
    print(r)
    print()
```

**동시 실행 수 제한**
```python
# 동시에 최대 2개씩만 실행
results = chain.batch(
    [
        {"question": "Go가 뭐야?"},
        {"question": "Swift가 뭐야?"},
        {"question": "Kotlin이 뭐야?"},
        {"question": "C++이 뭐야?"},
    ],
    config={"max_concurrency": 2},
)
```

**장점**
- 내부적으로 병렬 실행되므로 하나씩 `invoke()`를 반복하는 것보다 빠름
- API rate limit이 있을 때 `max_concurrency`로 조절 가능

### stream - 실시간 스트리밍

```python
# stream - 토큰 단위로 응답을 받음
for chunk in chain.stream({"question": "Python의 장점 3가지를 알려줘"}):
    print(chunk, end="", flush=True)

print()  # 줄바꿈
```

**특징**
- ChatGPT처럼 응답이 한 글자씩 나타나게 함
- 긴 응답을 기다리지 않고 바로바로 출력 가능
- UX가 좋아짐
- 각 chunk는 토큰 단위의 문자열 조각

### astream - 비동기 스트리밍

```python
# astream - 비동기 스트리밍 (FastAPI, 비동기 환경에서 사용)
async for chunk in chain.astream({"question": "FastAPI가 뭐야?"}):
    print(chunk, end="", flush=True)

print()
```

**일반 스크립트에서 사용 시**
```python
import asyncio

async def main():
    async for chunk in chain.astream({"question": "FastAPI가 뭐야?"}):
        print(chunk, end="", flush=True)

asyncio.run(main())
```

**Jupyter 노트북에서는**
- 이벤트 루프가 이미 실행 중이라 `async for`를 셀에서 바로 사용 가능

---

## 13. 실습 예제

### 1. 말투 변환기 체인

**요구사항**
- 같은 문장을 다양한 말투로 변환
- 입력: `"이 기능은 다음 주까지 구현이 어려울 것 같습니다."`
- 변환할 말투: `["해적", "조선시대 임금", "츤데레 애니메이션 캐릭터"]`

**구현**
```python
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = StrOutputParser()

original_text = "이 기능은 다음 주까지 구현이 어려울 것 같습니다."

roles = {
    "해적": "너는 험한 바다에서 살아가는 바다의 사나이 해적이야.",
    "조선시대 임금": "너는 인자한 조선시대의 임금이야. ~하노라, ~이니라 같은 말투를 쓰는 사람이야.",
    "츤데레 애니메이션 캐릭터": "너는 겉보기에는 차갑지만 누구보다 너를 생각하는 속은 따뜻한 츤데레 애니메이션 캐릭터야."
}

for role_name, role_desc in roles.items():
    prompt = ChatPromptTemplate.from_messages([
        ("system", f"{role_desc} 주어진 문장을 너의 말투로 바꿔서 말해줘."),
        ("human", "{question}"),
    ])
    
    chain = prompt | llm | parser
    result = chain.invoke({"question": original_text})
    
    print(f"【{role_name}】")
    print(result)
    print()
```

### 2. 감정분석기 체인 (few-shot)

**요구사항**
- 텍스트의 감정을 분석
- few-shot 예시를 프롬프트에 포함하여 출력 형식 일관되게 유지

**구현**
```python
prompt = ChatPromptTemplate.from_messages([
    ("system", """너는 감정 분석 전문가야. 다음 형식으로 분석해줘:

예시 1)
입력: 이 제품 정말 최고예요! 강력 추천합니다.
분석:
- 감정: 긍정
- 강도: 강함
- 근거: "최고", "강력 추천"과 같은 강한 긍정 표현 사용

예시 2)
입력: 그냥 그래요. 나쁘진 않네요.
분석:
- 감정: 중립
- 강도: 약함
- 근거: "그냥 그래요", "나쁘진 않네요"와 같은 중립적 표현

이제 다음 텍스트를 분석해줘."""),
    ("human", "{text}"),
])

chain = prompt | llm | parser

texts = [
    "이 제품 정말 최악이에요. 다시는 안 살 겁니다.",
    "괜찮은 것 같아요. 가격 대비 무난합니다.",
    "완전 대박! 기대 이상이에요!",
]

for text in texts:
    print(f"입력: {text}")
    result = chain.invoke({"text": text})
    print(result)
    print()
```

### 3. 번역기 체인

**요구사항**
- 구글 번역기처럼 입력 언어와 출력 언어를 지정
- 같은 체인으로 다양한 언어 쌍 처리

**구현**
```python
prompt = ChatPromptTemplate.from_messages([
    ("system", """너는 번역 전문가야. 다음 규칙을 지켜서 문장을 {original_language}에서 {target_language}로 번역해줘.
- 최종 번역된 문장만 출력해.
- 직역하지 말고 해당 언어에 맞는 자연스러운 표현을 선택해줘."""),
    ("human", "{text}")
])

chain = prompt | llm | parser

text = "오늘 날씨가 참 좋다. 산책하고 싶어."

# 한→영
result = chain.invoke({
    "original_language": "한국어", 
    "target_language": "영어", 
    "text": text
})
print(f"한→영: {result}")

# 영→일
result = chain.invoke({
    "original_language": "영어", 
    "target_language": "일본어", 
    "text": "The weather is really nice today. I want to go for a walk."
})
print(f"영→일: {result}")
```

### 4. QA 체인 (RunnablePassthrough 활용)

**요구사항**
- `RunnablePassthrough.assign()`을 사용하여 고정된 배경지식을 자동으로 붙여주기
- 배경지식: `"FastAPI는 Python 기반의 고성능 웹 프레임워크이다. Starlette과 Pydantic을 기반으로 하며, 자동 API 문서 생성과 타입 검증을 지원한다."`
- 사용자는 `{"question": "..."}` 만 넘기면 context가 자동으로 붙어야 함

**구현**
```python
from langchain_core.runnables import RunnablePassthrough

prompt = ChatPromptTemplate.from_messages([
    ("system", """다음 <context>에 맞춰서 질문에 대답해줘.
<context>에 없는 내용은 "제공된 정보에 없습니다"로 대답해.

<context>
{context}
</context>
"""),
    ("human", "{question}"),
])

data = "FastAPI는 Python 기반의 고성능 웹 프레임워크이다. Starlette과 Pydantic을 기반으로 하며, 자동 API 문서 생성과 타입 검증을 지원한다."

context_chain = (
    RunnablePassthrough.assign(context=lambda x: data)
    | prompt 
    | llm 
    | parser
)

# 사용자는 question만 전달
result = context_chain.invoke({"question": "FastAPI는 뭘 기반으로 만들어졌어?"})
print(result)

result = context_chain.invoke({"question": "FastAPI가 자동으로 해주는 게 뭐야?"})
print(result)

result = context_chain.invoke({"question": "Django에 대해서 설명해줘"})
print(result)  # "제공된 정보에 없습니다" 출력
```

---

## 14. 핵심 개념 정리

### LCEL 파이프라인 구성 요소

```
입력 데이터
    ↓
ChatPromptTemplate (변수 주입 → 메시지 리스트)
    ↓
ChatModel (메시지 → AI 응답)
    ↓
OutputParser (AI 응답 → 원하는 형식)
    ↓
출력 결과
```

### Runnable 인터페이스 주요 메서드

| 메서드 | 역할 | 사용 시점 |
|--------|------|-----------|
| `invoke()` | 단일 입력 처리 | 기본 실행 |
| `batch()` | 여러 입력 병렬 처리 | 대량 처리 |
| `stream()` | 실시간 스트리밍 | UX 개선 |
| `ainvoke()` | 비동기 단일 실행 | FastAPI 등 비동기 환경 |
| `astream()` | 비동기 스트리밍 | 비동기 환경 + 스트리밍 |

### 유틸리티 Runnable

| Runnable | 역할 | 예시 |
|----------|------|------|
| `RunnablePassthrough` | 입력을 그대로 전달 | 데이터 유지 |
| `RunnablePassthrough.assign()` | 입력에 새 필드 추가 | 고정 컨텍스트 자동 주입 |
| `RunnableLambda` | 커스텀 함수 적용 | 타입 변환, 복잡한 로직 |

### LLM 파라미터

| 파라미터 | 역할 | 추천값 |
|----------|------|--------|
| `temperature` | 응답 무작위성 조절 | 0 (정확성), 0.7 (균형), 1+ (창의성) |
| `seed` | 재현 가능한 결과 | 고정값 (42 등) |
| `max_tokens` | 최대 출력 토큰 수 | 작업에 맞게 조절 |

### 체인 구성 패턴

```python
# 기본 체인
chain = prompt | llm | parser

# Prompt Chaining
chain = chain1 | RunnableLambda(lambda x: {"text": x}) | chain2

# 컨텍스트 자동 주입
chain = RunnablePassthrough.assign(context=lambda x: data) | prompt | llm | parser

# Retry 메커니즘
chain_with_retry = RunnableRetry(chain, max_attempt_number=3)
```

### 데이터 흐름 예시

```
사용자 입력: {"role": "Python", "question": "리스트가 뭐야?"}
    ↓
ChatPromptTemplate.invoke()
    ↓
메시지 리스트 생성: [SystemMessage(...), HumanMessage(...)]
    ↓
ChatModel.invoke()
    ↓
AIMessage 객체 반환
    ↓
StrOutputParser.invoke()
    ↓
문자열 추출
    ↓
최종 출력: "리스트는 순서가 있는 가변 컬렉션입니다..."
```