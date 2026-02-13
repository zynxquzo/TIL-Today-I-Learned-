# [TIL] FastAPI: 비동기 처리와 SSE (Server-Sent Events)

## 1. 동시성 처리 방식

서버에 100명이 동시에 요청을 보내고, 각 요청의 DB 조회에 100ms가 걸리는 상황

### 1. 동기 서버의 한계

```
요청 1 → DB 100ms → 응답  (100ms)
요청 2 → DB 100ms → 응답  (200ms)
요청 3 → DB 100ms → 응답  (300ms)
...
요청 100 → DB 100ms → 응답 (10,000ms = 10초!)
```

→ 100번째 사용자는 10초를 기다려야 함
→ DB 응답을 기다리는 동안 서버는 아무것도 안 하고 대기

### 2. 해결 방법 1: 스레드 (`def`)

**스레드란?**
- 프로그램 안에서 독립적으로 실행되는 작업 단위
- 하나의 프로세스에 여러 스레드를 만들어 동시에 다른 일 수행 가능

**스레드 풀 구조**
```
스레드 풀:
┌──────────────────────────────┐
│  Thread 1: 요청A 실행         │
│  Thread 2: 요청B 실행         │
│  Thread 3: 요청C 실행         │
│  Thread 4: (대기 중...)       │
│  ...                         │
│  Thread 40: (대기 중...)      │  ← 기본 40개
└──────────────────────────────┘
```

**동작 방식**
```
Thread 1 → 요청 1 → DB 100ms → 응답
Thread 2 → 요청 2 → DB 100ms → 응답  ← 동시에!
Thread 3 → 요청 3 → DB 100ms → 응답  ← 동시에!
...
Thread 40 → 요청 40 → DB 100ms → 응답  ← 동시에!
```

→ 40개 요청을 동시에 처리 (100ms에 40개 완료)
→ 나머지 60개는 스레드가 비면 순차 대기

**장점**: 기존 동기 코드 그대로 사용 가능
**단점**: 스레드 수에 한계 (기본 40개), 스레드마다 메모리 소비

### 3. 해결 방법 2: 이벤트 루프 (`async def`)

**동작 방식**
```
요청 1 → DB 쿼리 보냄 (await) → 기다리지 않고 →
요청 2 → DB 쿼리 보냄 (await) → 기다리지 않고 →
요청 3 → DB 쿼리 보냄 (await) → 기다리지 않고 →
...
요청 100 → DB 쿼리 보냄 (await) →

→ 요청 1의 DB 응답 도착! → 응답 전송
→ 요청 2의 DB 응답 도착! → 응답 전송
...
```

→ 100개 요청의 DB 쿼리를 거의 동시에 보냄
→ **스레드 1개로 100개 동시 처리 가능!**

**장점**: 스레드 1개로 수천 개 동시 처리, 메모리 효율적
**단점**: 코드에 `await`를 써야 하고, blocking 코드 사용 불가

---

## 2. FastAPI의 `def` vs `async def`

### 1. 실행 방식 차이

|  | `def` | `async def` |
|---|---|---|
| 실행 위치 | 스레드 풀 (자동) | 이벤트 루프 (직접) |
| blocking 코드 | OK | **NG** (서버 멈춤) |
| `await` 사용 | 불가 | 가능 |
| 적합한 상황 | 동기 라이브러리 사용 시 | 비동기 라이브러리 사용 시 |

### 2. 중요 규칙

> **`async def`로 선언했으면 안에서 쓰는 모든 I/O도 async여야 한다!**

```python
# ❌ 잘못된 예시
async def wrong_example():
    time.sleep(1)  # blocking! 서버 전체가 멈춤
    
# ✅ 올바른 예시
async def correct_example():
    await asyncio.sleep(1)  # non-blocking
```

**변경 필요 사항**
- `time.sleep()` → `asyncio.sleep()`
- `requests.get()` → `httpx.AsyncClient`
- sync DB 세션 → async DB 세션

---

## 3. 커넥션 풀 (Connection Pool)

### 1. 문제 상황

```
요청 → DB 연결 (50ms) → 쿼리 (5ms) → 연결 해제 → 응답
요청 → DB 연결 (50ms) → 쿼리 (5ms) → 연결 해제 → 응답
```

→ 연결/해제 오버헤드가 쿼리보다 10배 크다

### 2. 커넥션 풀 구조

```
┌─────────────────────────────────┐
│  연결1: (사용중 - 요청A)          │
│  연결2: (사용중 - 요청B)          │
│  연결3: (대기중)                  │
│  연결4: (대기중)                  │
│  연결5: (대기중)                  │  ← 기본 5개 유지
└─────────────────────────────────┘
```

**동작 흐름**
```
요청 → 풀에서 연결 빌려옴 (0ms) → 쿼리 → 연결 반납 → 응답
```

→ 미리 만들어둔 연결을 재사용해서 빠르다!

### 3. SQLAlchemy 설정

```python
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_size=5,        # 풀에 유지할 연결 수 (기본 5)
    max_overflow=10,    # pool_size 초과 시 추가 생성 가능한 수
    pool_timeout=30,    # 연결 대기 최대 시간 (초)
    pool_recycle=1800,  # 연결 재활용 주기 (초)
)
```

**커넥션 풀 동작**
1. 서버 시작 → pool_size(5)개의 연결 미리 생성
2. 요청 처리 → 풀에서 연결 빌림 → 쿼리 → 반납
3. pool_size 초과 → max_overflow까지 임시 연결 추가 생성 (최대 15개)
4. 15개 초과 → pool_timeout(30초) 대기 → 안 되면 에러

---

## 4. 비동기 SQLAlchemy 설정

### 1. 드라이버 변경

```python
# Sync
SYNC_DATABASE_URL = "postgresql://user:pass@localhost/db"

# Async (asyncpg 드라이버 사용)
ASYNC_DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/db"
```

### 2. Async 세션 생성

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Async 엔진 생성
async_engine = create_async_engine(ASYNC_DATABASE_URL, echo=True)

# Async 세션 생성기
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine, 
    class_=AsyncSession, 
    expire_on_commit=False  # async에서는 필수!
)

# Async DB 세션 의존성
async def get_async_db():
    async with AsyncSessionLocal() as session:
        yield session
```

---

## 5. Async에서 Lazy Loading 문제

### 1. 문제 상황

**Lazy Loading이란?**
- 관계된 데이터를 실제로 접근할 때 자동으로 DB에서 가져오는 것
- 예: `post.comments`에 접근할 때 자동으로 comments 쿼리 실행

**동기 환경에서는 OK**
```python
# Sync
post = db.get(Post, 1)
print(post.comments)  # ← 이 순간 자동으로 DB 쿼리 (Lazy Loading)
```

**비동기 환경에서는 에러!**
```python
# Async
post = await db.get(Post, 1)
print(post.comments)  # ← 에러! MissingGreenlet
```

### 2. 에러 원인

```python
post = await db.get(Post, 1)
print(post.comments)  # ← 문제!
```

**이유**
1. `post.comments`는 그냥 속성 접근 (동기 코드)
2. 실제로는 DB 쿼리를 날려야 함 (비동기 작업 필요)
3. `await`을 쓸 수 없는 상황에서 비동기 작업 시도 → 에러!

### 3. 해결: Eager Loading

```python
# 쿼리 시점에 comments를 함께 가져옴
stmt = select(Post).where(Post.id == post_id).options(
    selectinload(Post.comments),
    selectinload(Post.post_tags).joinedload(PostTag.tag),
)
result = await db.scalars(stmt)
post = result.one()

print(post.comments)  # ← 이미 메모리에 있어서 추가 쿼리 없음. OK!
```

---

## 6. UPDATE 시 Lazy Loading 문제

### 1. 에러 발생 예시

```python
@router.put("/{post_id}/lazy")
async def update_post_lazy(post_id: int, data: PostCreate, db: AsyncSession):
    post = await db.get(Post, post_id)
    post.title = data.title
    post.content = data.content
    await db.commit()
    
    return post  # ← 문제 발생
```

**무슨 일이 일어나는가?**
1. Post를 가져옴 (comments, tags는 안 가져옴)
2. 제목, 내용 수정
3. DB에 저장
4. `return post` ← FastAPI가 `PostDetailResponse`로 변환 시도
5. 스키마에 `comments`, `tags` 필드가 있으니 접근 시도
6. **에러!** Lazy loading 시도 → 비동기에서 불가능

### 2. 해결 방법

```python
@router.put("/{post_id}/selectin")
async def update_post_selectin(post_id: int, data: PostCreate, db: AsyncSession):
    post = await db.get(Post, post_id)
    post.title = data.title
    post.content = data.content
    await db.commit()
    
    # 핵심: 다시 조회하면서 필요한 거 다 가져오기
    stmt = select(Post).where(Post.id == post_id).options(
        selectinload(Post.comments),
        selectinload(Post.post_tags).joinedload(PostTag.tag),
    )
    result = await db.scalars(stmt)
    post = result.one()
    
    return post  # ← OK!
```

**동작 방식**
1. Post를 가져옴
2. 제목, 내용 수정
3. DB에 저장
4. **Post를 다시 조회하면서 `comments`, `tags` 미리 가져옴**
5. 이제 `post.comments`, `post.tags`가 메모리에 있음
6. `return post` ← 추가 쿼리 없이 응답 가능

---

## 7. 동기 → 비동기 전환 시 주의사항

### 1. 코루틴(Coroutine) 이해

- 비동기 함수(`async def`)를 호출하면 생성되는 객체
- `await`으로 실행해야 실제 결과를 얻을 수 있음

```python
# 비동기 함수 정의
async def fetch_data():
    return "data"

# 호출하면 코루틴 객체 생성
coro = fetch_data()  
print(type(coro))  # <class 'coroutine'>

# await으로 실제 실행
result = await coro  # 이제 "data"를 얻음
```

### 2. 라우터만 비동기로 바꾸면?

```python
# 라우터 (비동기)
@router.post("/signup")
async def signup(data: UserCreate, db: AsyncSession):
    return await auth_service.signup(db, data)  # await 사용
    
# 서비스 (동기 - 안 바꿈)
def signup(self, db: Session, data: UserCreate):  # async 아님!
    existing_user = user_repository.find_by_email(db, data.email)
    # ...
```

**에러 발생**
```
TypeError: object User cannot be awaited
```

**이유**
1. `await`은 코루틴 객체만 받을 수 있음
2. 동기 함수(`def`)는 코루틴이 아니라 일반 값을 바로 반환
3. 일반 값에 `await`을 쓰려고 하니까 에러!

### 3. 올바른 전환

```
async 라우터
  ↓ await (코루틴 필요)
async 서비스  ← 코루틴 반환
  ↓ await (코루틴 필요)
async 리포지토리  ← 코루틴 반환
  ↓ await
AsyncSession  ← 비동기 DB 작업
```

**전체 레이어 수정 예시**

```python
# 라우터
async def signup(data: UserCreate, db: AsyncSession = Depends(get_async_db)):
    return await auth_service.signup(db, data)

# 서비스
async def signup(self, db: AsyncSession, data: UserCreate):
    async with db.begin():
        existing_user = await user_repository.find_by_email(db, data.email)
        # ...
        await user_repository.save(db, new_user)
    await db.refresh(new_user)
    return new_user

# 리포지토리
async def find_by_email(db: AsyncSession, email: str):
    stmt = select(User).where(User.email == email)
    result = await db.scalars(stmt)
    return result.first()

async def save(db: AsyncSession, user: User):
    db.add(user)
    await db.flush()
```

### 4. 핵심 원칙

> **한 단계라도 동기면 체인이 끊어진다!**
> 
> `await`은 "기다려줘"가 아니라 "코루틴 실행해줘"라는 의미

---

## 8. SSE (Server-Sent Events)

### 1. SSE란?

서버가 클라이언트에게 실시간으로 데이터를 밀어주는(push) HTTP 기반 프로토콜

**일반 API**
```
클라이언트 → 요청 → 서버가 처리 → 응답 한 번에 전달 → 연결 종료
```

**SSE**
```
클라이언트 → 요청 → 서버가 연결을 유지하면서 데이터를 여러 번 전송 → 완료 후 종료
```

### 2. 사용 사례

- **LLM 스트리밍**: ChatGPT처럼 글자가 하나씩 나타나는 것
- **실시간 알림**: 새 메시지, 주문 상태 변경
- **라이브 피드**: 주식 시세, 스포츠 경기 점수

### 3. WebSocket과의 차이

| | SSE | WebSocket |
|---|---|---|
| 방향 | 서버 → 클라이언트 (단방향) | 클라이언트 ↔ 서버 (양방향) |
| 프로토콜 | HTTP | 별도 프로토콜 |
| 재연결 | 브라우저가 자동 처리 | 수동 구현 필요 |
| 적합한 상황 | 서버가 일방적으로 보낼 때 | 실시간 채팅, 게임 |

### 4. SSE 프로토콜 형식

**최소 형식**: `data: 내용\n\n`
**Content-Type**: 반드시 `text/event-stream`

```
data: 첫 번째 메시지

data: 두 번째 메시지

```

- `data:` 뒤에 전달할 내용
- 빈 줄(`\n\n`)이 하나의 이벤트 끝을 의미

### 5. 일반 API vs SSE 비교

**일반 API**
```
클라이언트: "안녕하세요라고 말해줘"
                    ↓
서버: (전체 응답을 다 만들 때까지 대기... 3초)
                    ↓
서버: "안녕하세요! 저는 AI 어시스턴트입니다." (한 번에 전달)
```

→ 사용자는 3초 동안 아무것도 보이지 않다가 한꺼번에 결과 받음

**SSE**
```
클라이언트: "안녕하세요라고 말해줘"
                    ↓
서버: "안" → "녕" → "하" → "세" → "요" → "!" → ... (토큰 단위로 즉시 전달)
```

→ 사용자는 첫 글자부터 바로 보이기 시작

---

## 9. FastAPI에서 SSE 구현

### 1. 기본 구조

```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/sse", tags=["SSE"])

@router.get("/countdown")
def sse_countdown():
    def generate():
        for i in range(5, 0, -1):
            yield f"data: {i}\n\n"
            time.sleep(1)
        yield "data: 발사!\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

**동작 원리**
- `StreamingResponse`는 generator를 순회하면서 `yield`된 값을 클라이언트에게 하나씩 전송
- `yield`는 제너레이터로, 값을 하나씩 꺼내 보여주는 역할

### 2. Fake LLM 스트리밍

```python
@router.get("/fake-llm")
def fake_llm_stream():
    fake_response = "안녕하세요! 저는 AI 어시스턴트입니다."
    tokens = list(fake_response)  # 한 글자씩 토큰으로 분리

    def generate():
        for token in tokens:
            yield f"data: {token}\n\n"
            time.sleep(0.05)
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

### 3. 실제 OpenAI API 스트리밍

**일반 응답 (비교용)**
```python
@router.get("/chat-normal")
def openai_chat_normal(message: str = "안녕하세요"):
    response = client.responses.create(
        model="gpt-4o-mini",
        instructions="2문장 이내로 대답해줘.",
        input=[{"role": "user", "content": message}],
    )
    return {"message": response.output_text}
```

→ 전체 응답이 한 번에 도착

**스트리밍 응답**
```python
@router.get("/chat")
def openai_chat(message: str = "안녕하세요"):
    stream = client.responses.create(
        model="gpt-4o-mini",
        instructions="2문장 이내로 대답해줘.",
        input=[{"role": "user", "content": message}],
        stream=True,  # 스트리밍 활성화
    )

    def generate():
        for event in stream:
            if event.type == "response.output_text.delta":
                yield f"data: {event.delta}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

→ GPT가 생성하는 답변이 토큰 단위로 실시간 도착

---

## 10. 핵심 개념 정리

### 1. 비동기를 사용해야 하는 경우

✅ **I/O 집약적 작업**
- 네트워크 요청 (API 호출)
- 데이터베이스 쿼리
- 파일 읽기/쓰기

❌ **CPU 집약적 작업**
- 복잡한 계산
- 영상/이미지 처리

### 2. 비동기 코드 작성 규칙

| 규칙 | 내용 |
|------|------|
| **I/O 통일** | `async def`로 선언하면 모든 I/O도 async |
| **Lazy Loading 금지** | Eager Loading 필수 |
| **전체 레이어 전환** | 라우터 + 서비스 + 리포지토리 모두 `async def` |

```python
# ❌ 잘못된 예시
post = await db.get(Post, 1)
return post  # comments 접근 시 에러

# ✅ 올바른 예시
stmt = select(Post).options(selectinload(Post.comments))
post = await db.scalars(stmt).one()
return post
```

### 3. 커넥션 풀 최적화

```python
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_size=5,        # 기본 연결 수
    max_overflow=10,    # 추가 생성 가능한 수
    pool_timeout=30,    # 대기 시간
)
```

- `pool_size`: 트래픽에 맞게 조정
- 너무 작으면: 대기 시간 증가
- 너무 크면: 메모리 낭비, DB 부하

### 4. SSE 활용

**언제 사용?**
- LLM 응답 스트리밍
- 실시간 알림/피드
- 서버에서 클라이언트로 단방향 전송

**핵심 코드**
```python
def generate():
    for chunk in data:
        yield f"data: {chunk}\n\n"

return StreamingResponse(generate(), media_type="text/event-stream")
```

---

## 11. 학습 포인트 (Key Takeaways)

### 1. 동시성 처리의 두 가지 방식

- **스레드**: 진짜 동시 실행, CPU 집약적 작업에 적합
- **이벤트 루프**: 빠른 전환을 통한 동시성, I/O 집약적 작업에 적합

### 2. 비동기의 핵심

- `await`은 "기다려줘"가 아니라 "코루틴 실행해줘"
- 한 단계라도 동기면 체인이 끊어짐
- Lazy Loading 불가능 → Eager Loading 필수

### 3. SSE의 강점

- HTTP 기반이라 별도 프로토콜 불필요
- 자동 재연결 지원
- 서버 → 클라이언트 단방향 전송에 최적화