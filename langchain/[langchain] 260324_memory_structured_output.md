# [TIL] LangChain: Memory & Structured Output

## 1. Memory (대화 기억)

### Memory란?

**정의**

* LLM이 이전 대화 내용을 기억하도록 만들어주는 기능
* 단순 요청 기반이 아닌 **상태(state)를 가지는 애플리케이션**을 만들기 위한 핵심 요소

---

### 왜 Memory가 필요한가?

**LLM 기본 동작**

```
입력 → 출력 (stateless)
```

문제:

* 이전 대화를 기억하지 못함
* 매 요청마다 context를 직접 넣어야 함

---

### Memory 적용 후

```
이전 대화 + 현재 입력 → LLM → 응답
```

👉 LLM이 “대화 흐름”을 이해하게 됨

---

### Memory가 필요한 대표 상황

| 상황     | 설명           |
| ------ | ------------ |
| 챗봇     | 사용자 정보 기억    |
| 상담 시스템 | 이전 질문 기반 응답  |
| 추천 시스템 | 사용자 취향 축적    |
| AI 비서  | 지속적인 컨텍스트 유지 |

---

### LangChain에서의 Memory 구조

```
사용자 입력
    ↓
MessageHistory 저장
    ↓
기존 대화 + 현재 질문 → LLM
    ↓
응답 생성
    ↓
응답도 다시 저장
```

---

## 2. MessageHistory

### MessageHistory란?

**정의**

* 대화 기록을 저장하는 객체
* LangChain Memory의 핵심 저장소

---

### InMemoryChatMessageHistory

```python
from langchain_core.chat_history import InMemoryChatMessageHistory
```

**특징**

| 항목    | 설명              |
| ----- | --------------- |
| 저장 위치 | RAM             |
| 지속성   | 없음 (서버 종료 시 삭제) |
| 속도    | 빠름              |
| 용도    | 테스트, 실습         |

---

### MessageHistory 내부 구조

```
[
    HumanMessage(...),
    AIMessage(...),
    HumanMessage(...),
    AIMessage(...),
]
```

👉 메시지 리스트 형태로 누적

---

### 한계

* 서버 재시작 시 데이터 유실
* 사용자 수 증가 시 확장성 부족

👉 실서비스에서는 DB/Redis 필요

---

## 3. RunnableWithMessageHistory

### 개념

**정의**

* 기존 체인에 Memory 기능을 붙여주는 래퍼

---

### 핵심 구조

```python
RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="question"
)
```

---

### 주요 구성 요소

| 요소                  | 역할              |
| ------------------- | --------------- |
| chain               | 기존 LCEL 체인      |
| get_session_history | session별 저장소 반환 |
| session_id          | 사용자 구분          |
| input_messages_key  | 입력 필드 지정        |

---

### session_id의 역할

```python
config={"configurable": {"session_id": "user1"}}
```

👉 사용자별로 독립된 대화 유지

---

### 동작 흐름

```
invoke()
    ↓
session_id 확인
    ↓
history 불러오기
    ↓
history + 입력 → LLM
    ↓
응답 생성
    ↓
history에 저장
```

---

### 예제

```python
store = {}

def get_session_history(session_id):
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]
```

---

## 4. Memory 적용 체인

### 기본 체인

```python
chain = prompt | llm | parser
```

---

### Memory 적용

```python
chain_with_memory = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="question",
)
```

---

### 실행

```python
chain_with_memory.invoke(
    {"question": "내 이름은 재연이야"},
    config={"configurable": {"session_id": "user1"}},
)

chain_with_memory.invoke(
    {"question": "내 이름이 뭐야?"},
    config={"configurable": {"session_id": "user1"}},
)
```

---

### 핵심 포인트

* Memory는 체인을 변경하지 않고 “감싸서” 추가
* 기존 LCEL 구조 그대로 유지 가능

---

## 5. Structured Output

### Structured Output이란?

**정의**

* LLM의 응답을 JSON 또는 객체 형태로 강제하는 방식

---

### 기존 방식 문제점

```python
"이 제품은 좋은 것 같아요."
```

문제:

* 문자열 → 파싱 필요
* 형식 불안정
* 자동 처리 어려움

---

### Structured Output 적용

```
LLM → JSON → Python 객체
```

---

## 6. Pydantic 기반 스키마 정의

### 기본 구조

```python
from pydantic import BaseModel

class Sentiment(BaseModel):
    sentiment: str
    reason: str
```

---

### 역할

| 요소        | 역할 |
| --------- | -- |
| sentiment | 감정 |
| reason    | 근거 |

---

### 장점

* 타입 안정성
* 자동 검증
* 코드와 직접 연결

---

## 7. with_structured_output()

### 개념

```python
structured_llm = llm.with_structured_output(Sentiment)
```

---

### 동작 원리

```
입력
    ↓
LLM (schema 기반 응답 생성)
    ↓
JSON 출력
    ↓
Pydantic 파싱
    ↓
Python 객체 반환
```

---

### 예제

```python
result = structured_llm.invoke("이 영화 진짜 재미있다!")

print(result.sentiment)
print(result.reason)
```

---

### 내부 특징

* 프롬프트에 schema가 자동 포함됨
* 모델이 형식을 맞추도록 유도됨

---

### 주의사항

| 항목         | 설명             |
| ---------- | -------------- |
| schema 복잡도 | 높을수록 실패 가능     |
| 모델 성능      | 낮으면 형식 깨질 수 있음 |
| 검증 실패      | 에러 발생 가능       |

---

## 8. Prompt + Structured Output

### 구조

```python
chain = prompt | structured_llm
```

---

### 예제

```python
prompt = ChatPromptTemplate.from_messages([
    ("system", "감정을 분석해줘"),
    ("human", "{text}"),
])

chain = prompt | structured_llm

result = chain.invoke({"text": "오늘 너무 우울하다"})
```

---

### 흐름

```
입력
→ PromptTemplate
→ LLM (Structured)
→ 객체 반환
```

---

## 9. Memory + Structured Output 결합

### 개념

```
Memory → 대화 유지
Structured Output → 데이터화
```

---

### 구조

```python
chain = prompt | structured_llm

chain_with_memory = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="text",
)
```

---

### 활용 흐름

```
사용자 입력
    ↓
이전 대화 포함
    ↓
LLM 호출
    ↓
구조화된 결과 반환
    ↓
데이터 활용 (DB 저장 등)
```

---

### 실전 활용 예시

| 서비스      | 활용           |
| -------- | ------------ |
| 감정 분석 챗봇 | 사용자 감정 추적    |
| 상담 시스템   | 상태 변화 분석     |
| 추천 시스템   | 사용자 상태 기반 추천 |

---

## 10. batch와 stream

### 주요 실행 메서드

| 메서드    | 설명       |
| ------ | -------- |
| invoke | 단일 실행    |
| batch  | 여러 입력 처리 |
| stream | 실시간 출력   |

---

### batch 예제

```python
results = chain.batch([
    {"text": "행복해"},
    {"text": "우울해"},
    {"text": "그냥 그래"},
])
```

---

### stream 예제

```python
for chunk in chain.stream({"text": "위로해줘"}):
    print(chunk, end="", flush=True)
```

---

## 11. 실습 예제

### 1. Memory 챗봇

```python
chain_with_memory.invoke(
    {"question": "내 이름은 재연이야"},
    config={"configurable": {"session_id": "user1"}},
)
```

---

### 2. 감정 분석기

```python
structured_llm.invoke("오늘 너무 행복하다")
```

---

### 3. Memory + 감정 추적

```python
chain_with_memory.invoke(
    {"text": "오늘 힘들다"},
    config={"configurable": {"session_id": "user1"}},
)
```

---

## 12. 핵심 개념 정리

### Memory 흐름

```
입력 → history → LLM → 응답 → history 저장
```

---

### Structured Output 흐름

```
입력 → LLM → JSON → 객체
```

---

### 전체 구조

```
사용자 입력
    ↓
Memory (대화 유지)
    ↓
PromptTemplate
    ↓
LLM (Structured Output)
    ↓
Python 객체
    ↓
서비스 로직 활용
```

---

### 핵심 구성 요소

| 요소                         | 역할        |
| -------------------------- | --------- |
| Memory                     | 대화 유지     |
| MessageHistory             | 저장소       |
| RunnableWithMessageHistory | Memory 연결 |
| Pydantic                   | 스키마 정의    |
| Structured Output          | 데이터화      |

---

## 13. 핵심 포인트

* Memory는 “대화형 서비스”의 필수 요소
* Structured Output은 “데이터 처리”의 핵심
* 둘을 결합해야 실제 서비스 구현 가능

---

## 14. 한 줄 정리

* Memory: 상태를 가진 AI
* Structured Output: 활용 가능한 데이터

👉 둘을 결합하면 **서비스 수준의 LLM 애플리케이션**이 된다 🚀
