# [TIL] FastAPI: 관심사 분리 아키텍처(MVC 패턴)를 활용한 게시판 CRUD 리팩토링

## 1. 관심사 분리(Separation of Concerns)란?

**관심사 분리**는 프로그램을 서로 다른 역할과 책임을 가진 계층으로 나누는 소프트웨어 설계 원칙이다. 각 계층이 자신의 역할에만 집중하도록 분리하면 코드의 유지보수성, 재사용성, 테스트 용이성이 크게 향상된다.

* **핵심 개념**: "한 파일에 모든 로직을 넣지 말고, 역할별로 파일을 나누자"
* **장점**:
  * 코드 수정 시 영향 범위가 명확해짐 (예: DB 변경 시 Repository만 수정)
  * 각 계층을 독립적으로 테스트 가능
  * 같은 로직을 여러 곳에서 재사용 가능
* **MVC 패턴**: Model-View-Controller의 약자로, 이번 실습에서는 Router(Controller), Service, Repository 3계층 구조를 사용했다.

---

## 2. 계층별 역할 정리

### 2.1 Router (Controller 계층)

HTTP 요청과 응답을 처리하는 계층으로, **교통 정리** 역할을 담당한다.

* **역할**:
  * URL 경로 매핑 (`/posts-mvc`, `/{id}`)
  * HTTP 메서드 지정 (GET, POST, PUT, DELETE)
  * 상태 코드 설정 (201, 204, 404 등)
  * 요청 데이터를 Service에 전달
  * Service 결과를 HTTP 응답으로 변환
* **하지 않는 일**: 비즈니스 로직, 데이터 검증, DB 접근

```python
# post_router.py
@router.post("", response_model=PostDetailResponse, status_code=status.HTTP_201_CREATED)
def create_post(data: PostCreate):
    return post_service.create_post(data)  # Service에 위임만 함

@router.get("/{id}", response_model=PostDetailResponse)
def read_post(id: int):
    return post_service.read_post_by_id(id)
```

### 2.2 Service (Business Logic 계층)

비즈니스 규칙과 로직을 처리하는 계층으로, **판단과 검증**을 담당한다.

* **역할**:
  * 데이터 검증 (title, content 빈 값 체크)
  * 비즈니스 규칙 적용 (권한 확인, 욕설 필터링 등)
  * 여러 Repository를 조합하여 복잡한 로직 처리
  * 에러 발생 시점 결정 (404, 422 등)
* **하지 않는 일**: 직접적인 데이터베이스 접근, HTTP 관련 처리

```python
# post_service.py
def create_post(self, data: PostCreate):
    # 비즈니스 검증
    if data.title == "":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="title을 입력하세요",
        )
    
    if data.content == "":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="content을 입력하세요",
        )
    
    # Repository에 실제 저장 위임
    new_post = Post(title=data.title, content=data.content)
    return post_repository.save(new_post)

def read_post_by_id(self, id: int):
    post = post_repository.find_by_id(id)
    # 비즈니스 판단: 없으면 에러
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return post
```

### 2.3 Repository (Data Access 계층)

데이터 저장소와의 상호작용을 담당하는 계층으로, **데이터 CRUD**만 수행한다.

* **역할**:
  * 데이터베이스 CRUD 작업 (현재는 리스트 사용)
  * SQL 쿼리 실행 (실제 DB 연동 시)
  * 데이터 영속성 관리
* **하지 않는 일**: 비즈니스 로직, 검증, 에러 판단

```python
# post_repository.py
class PostRepository:
    def __init__(self):
        self.posts = []  # DB 대신 메모리 리스트
        self.post_id = 0
    
    def save(self, new_post: Post):
        self.post_id += 1
        new_post.id = self.post_id
        self.posts.append(new_post)
        return new_post  # 저장된 객체 반환
    
    def find_by_id(self, id: int):
        for post in self.posts:
            if post.id == id:
                return post
        return None  # 없으면 None (에러 안 냄!)
    
    def find_all(self):
        return self.posts
    
    def modify(self, id: int, data: PostCreate):
        for post in self.posts:
            if post.id == id:
                post.title = data.title
                post.content = data.content
                return post
        return None
    
    def delete(self, id: int):
        for index, post in enumerate(self.posts):
            if post.id == id:
                return self.posts.pop(index)
```

---

## 3. Schema의 역할

**Schema**는 데이터의 구조와 형식을 정의하고 자동으로 검증하는 역할을 한다.

* **데이터 검증**: Pydantic의 `BaseModel`을 상속받아 타입을 선언하면 자동으로 검증 수행
* **입출력 분리**: 입력용 스키마(`PostCreate`)와 출력용 스키마(`PostDetailResponse`, `PostListResponse`)를 분리
* **타입 안정성**: IDE의 자동완성 지원, 런타임 에러 방지

```python
# post.py - 스키마 정의
class Post:  # 도메인 모델 (실제 데이터 객체)
    def __init__(self, title, content):
        self.id = None
        self.title = title
        self.content = content

class PostCreate(BaseModel):  # 입력 스키마
    title: str
    content: str

class PostDetailResponse(BaseModel):  # 상세 조회 출력 스키마
    id: int
    title: str
    content: str

class PostListResponse(BaseModel):  # 목록 조회 출력 스키마 (content 제외)
    id: int
    title: str
```

### Schema 사용 예시

```python
# Router에서 입출력 스키마 지정
@router.post("", response_model=PostDetailResponse)
def create_post(data: PostCreate):  # 입력: PostCreate
    return post_service.create_post(data)  # 출력: PostDetailResponse

@router.get("", response_model=list[PostListResponse])
def read_posts():  # 출력: PostListResponse 리스트
    return post_service.read_posts()
```

**장점**:
* 클라이언트가 `id`를 임의로 지정하는 것 방지 (입력 스키마에 `id` 없음)
* 목록 조회 시 불필요한 `content` 필드 제외 (응답 크기 절감)
* FastAPI가 자동으로 JSON 변환 및 검증 수행

---

## 4. 데이터 흐름 (요청 → 응답)

### 4.1 호출 흐름 (누가 누구를 호출하나)

```
Router → Service → Repository
```

1. Router가 HTTP 요청을 받음
2. Router가 Service 메서드 호출
3. Service가 Repository 메서드 호출
4. Repository가 데이터 작업 수행

### 4.2 반환 흐름 (데이터가 어디로 가나)

```
Repository → Service → Router → 클라이언트
```

1. Repository가 데이터 반환
2. Service가 받아서 검증 후 반환
3. Router가 받아서 HTTP 응답으로 변환
4. 클라이언트에게 JSON 응답 전달

### 4.3 실제 실행 순서 (게시글 생성 예시)

```
1. 클라이언트: POST /posts-mvc {"title": "제목", "content": "내용"}
   ↓
2. Router: create_post(data) 실행 → Service 호출
   ↓
3. Service: create_post(data) 실행
   - title 검증 ✅
   - content 검증 ✅
   - Post 객체 생성
   - Repository 호출
   ↓
4. Repository: save(new_post) 실행
   - post_id 증가
   - posts 리스트에 추가
   - 객체 반환
   ↓
5. Service로 객체 반환
   ↓
6. Router로 객체 반환
   ↓
7. FastAPI가 JSON으로 자동 변환
   ↓
8. 클라이언트: {"id": 1, "title": "제목", "content": "내용"} 응답 받음
```

---

## 5. 싱글톤 패턴 적용

각 계층의 인스턴스를 **모듈 레벨에서 한 번만 생성**하여 전체 애플리케이션에서 공유한다.

```python
# post_repository.py
post_repository = PostRepository()  # 한 번만 생성

# post_service.py
post_service = PostService()  # 한 번만 생성
```

**장점**:
* 메모리 효율성 (요청마다 새 객체 생성 안 함)
* 상태 유지 (Repository의 `posts` 리스트 유지)
* 코드 재사용성 향상

**Python 모듈 시스템**: 모듈을 `import`할 때 한 번만 실행되므로, `post_repository = PostRepository()`는 프로그램 실행 중 딱 한 번만 수행된다.

---

## 6. CRUD 구현 비교

### 6.1 기존 방식 (단일 파일)

```python
# post_api.py - 모든 로직이 Router에
@router.post("")
def create_post(post_data: PostCreate):
    global post_id
    # 검증도 여기서
    if not post_data.title:
        return {"error": "제목 필수"}
    
    # 저장도 여기서
    post_id += 1
    new_post = Post(post_id, post_data.title, post_data.content)
    posts.append(new_post)
    return new_post
```

**문제점**:
* Router가 너무 많은 책임을 가짐
* 검증 로직을 다른 곳에서 재사용 불가
* DB를 MySQL로 바꾸려면 Router 전체 수정 필요

### 6.2 개선 방식 (관심사 분리)

```python
# Router: HTTP만 처리
@router.post("", response_model=PostDetailResponse, status_code=status.HTTP_201_CREATED)
def create_post(data: PostCreate):
    return post_service.create_post(data)

# Service: 비즈니스 로직
def create_post(self, data: PostCreate):
    if data.title == "":
        raise HTTPException(...)
    new_post = Post(title=data.title, content=data.content)
    return post_repository.save(new_post)

# Repository: 데이터 저장
def save(self, new_post: Post):
    self.post_id += 1
    new_post.id = self.post_id
    self.posts.append(new_post)
    return new_post
```

**장점**:
* 각 계층이 자신의 역할에만 집중
* DB 변경 시 Repository만 수정
* Service 로직을 CLI, 배치 작업 등에서도 재사용 가능

---

## 7. Repository와 Service의 차이점

| 구분 | Repository | Service |
|------|------------|---------|
| **역할** | 데이터 접근 | 비즈니스 로직 |
| **관심사** | "어떻게 찾을까?" | "없으면 어떻게 할까?" |
| **없을 때** | `None` 반환 | 상황에 따라 에러/기본값 |
| **에러 발생** | ❌ 에러 안 냄 | ✅ 비즈니스 판단으로 에러 |
| **재사용성** | 여러 Service에서 사용 | 특정 상황에 맞는 로직 |

### 예시: 게시글 조회

```python
# Repository: 찾기만 함
def find_by_id(self, id: int):
    for post in self.posts:
        if post.id == id:
            return post
    return None  # 판단 안 함

# Service: 판단함
def read_post_by_id(self, id: int):
    post = post_repository.find_by_id(id)
    if not post:  # 비즈니스 판단
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    return post
```

**핵심**: Repository는 데이터만 가져오고, Service는 그 결과를 받아 "이제 어떻게 할지" 판단한다.

---

## 8. 프로젝트 구조

```
mysite3/
├── schemas/
│   └── post.py              # 스키마 정의 (Post, PostCreate, Response 모델)
├── repositories/
│   └── post_repository.py   # 데이터 접근 계층
├── services/
│   └── post_service.py      # 비즈니스 로직 계층
├── routers/
│   └── post_router.py       # HTTP 요청/응답 처리 계층
main.py                      # FastAPI 앱 생성 및 라우터 등록
```

**계층별 의존성 방향**:
```
Router → Service → Repository
(import) (import)
```

Router는 Service만 알고, Service는 Repository만 안다. 역방향 의존성은 없다.

---

## 9. 학습 포인트 (Key Takeaways)

* **관심사 분리의 핵심**: 각 계층이 자신의 역할에만 집중하도록 분리하면 유지보수성과 재사용성이 향상된다.
* **Repository는 판단하지 않음**: 데이터가 없으면 `None`을 반환하고, Service가 비즈니스적으로 판단한다.
* **Service의 역할**: 검증, 권한 확인, 여러 Repository 조합 등 복잡한 비즈니스 로직을 처리한다.
* **Schema의 중요성**: 입력/출력 데이터 구조를 명확히 정의하면 자동 검증과 타입 안정성을 확보할 수 있다.
* **싱글톤 패턴**: 모듈 레벨에서 인스턴스를 한 번만 생성하여 메모리 효율성과 상태 유지를 동시에 달성한다.
* **데이터 흐름 이해**: Router → Service → Repository 순서로 호출되고, 반환값은 역순으로 전달된다.
* **계층별 테스트 용이성**: 각 계층을 독립적으로 테스트할 수 있어 버그 추적과 수정이 쉬워진다.

