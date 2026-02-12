# [TIL] FastAPI: 인증 기반 게시글 CRUD 구현 (Depends, 인가)

## 1. 인증 기반 게시글 시스템 개요

로그인한 사용자만 게시글을 작성할 수 있고, 본인이 작성한 게시글만 수정/삭제할 수 있는 시스템을 구현합니다.

### 1. API 설계

| Method | Path | 설명 | 인증 | 인가 |
|--------|------|------|------|------|
| POST | `/posts2` | 게시글 작성 | 필요 | - |
| GET | `/posts2` | 전체 목록 조회 | 불필요 | - |
| GET | `/posts2/{id}` | 상세 조회 | 불필요 | - |
| PUT | `/posts2/{id}` | 게시글 수정 | 필요 | 본인만 |
| DELETE | `/posts2/{id}` | 게시글 삭제 | 필요 | 본인만 |
| GET | `/me/posts` | 내가 쓴 글 조회 | 필요 | - |
| GET | `/users/{user_id}/posts` | 특정 유저의 글 조회 | 불필요 | - |

**핵심 개념:**
- **인증(Authentication)**: "누구인가?" → 로그인 여부 확인
- **인가(Authorization)**: "권한이 있는가?" → 본인 글인지 확인

---

## 2. 모델 설계 (User ↔ Post2 관계)

### 1. Post2 모델 정의

```python
# models/post2.py

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, ForeignKey
from database import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .user import User

class Post2(Base):
    __tablename__ = "posts2"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # 외래 키: 작성자 정보
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    # User와의 관계 설정 (N:1)
    user: Mapped["User"] = relationship(back_populates="posts2")
```

**관계 구조:**
```
User (1) ──────< (N) Post2
  │                    │
  └─ posts2           └─ user
     (역방향)              (정방향)
```

### 2. User 모델에 역방향 관계 추가

```python
# models/user.py

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .post2 import Post2

class User(Base):
    __tablename__ = "users"
    
    # ... 기존 필드들 ...
    
    # User가 작성한 Post2 목록 (1:N)
    posts2: Mapped[list["Post2"]] = relationship(back_populates="user")
```
---

## 3. 스키마 설계

### 요청/응답 스키마 정의

```python
# schemas/post2.py

from pydantic import BaseModel, ConfigDict
from mysite4.schemas.user import UserResponse

class Post2Create(BaseModel):
    """게시글 작성 요청"""
    title: str
    content: str
    # user_id는 없음! 토큰에서 자동으로 추출

class Post2ListResponse(BaseModel):
    """게시글 목록 응답 (간단한 정보)"""
    id: int
    title: str
    user: UserResponse  # 작성자 정보 포함

    model_config = ConfigDict(from_attributes=True)

class Post2DetailResponse(BaseModel):
    """게시글 상세 응답 (전체 정보)"""
    id: int
    title: str
    content: str
    user: UserResponse  # 작성자 정보 포함

    model_config = ConfigDict(from_attributes=True)
```

**핵심:**
- `Post2Create`에는 `user_id`가 없음
- 클라이언트는 "누가 쓴 글인지" 신경 쓸 필요 없음
- 서버가 토큰에서 자동으로 사용자 식별

---

## 4. 게시글 작성 (Create)

### 1. Repository

```python
# repositories/post2_repository.py

from sqlalchemy.orm import Session
from mysite4.models.post2 import Post2

class Post2Repository:
    def save(self, db: Session, new_post: Post2):
        db.add(new_post)
        return new_post

post2_repository = Post2Repository()
```

### 2. Service

```python
# services/post2_service.py

from sqlalchemy.orm import Session
from mysite4.repositories.post2_repository import post2_repository
from mysite4.models.post2 import Post2
from mysite4.schemas.post2 import Post2Create
from mysite4.models.user import User

class Post2Service:
    def create_post(self, db: Session, data: Post2Create, current_user: User):
        # 로그인한 유저를 자동으로 작성자로 설정
        new_post = Post2(
            title=data.title, 
            content=data.content, 
            user=current_user  # relationship 객체 할당
        )

        post2_repository.save(db, new_post)
        db.commit()
        db.refresh(new_post)
        return new_post

post2_service = Post2Service()
```

**중요: db.begin()을 사용하지 않는 이유**

```python
# ❌ 에러 발생!
def create_post(self, db: Session, data: Post2Create, current_user: User):
    with db.begin():  # A transaction is already begun
        post2_repository.save(db, new_post)

# ✅ 올바른 방법
def create_post(self, db: Session, data: Post2Create, current_user: User):
    post2_repository.save(db, new_post)
    db.commit()  # 수동 커밋
```

**이유:**
- `get_current_user`가 토큰 검증 시 이미 DB 트랜잭션 시작
- 중복 `begin()`은 에러 발생
- 이미 시작된 트랜잭션에서는 `commit()`만 사용

### 3. Router

```python
# routers/post2_router.py

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from database import get_db
from mysite4.services.post2_service import post2_service
from mysite4.schemas.post2 import Post2Create, Post2DetailResponse
from mysite4.dependencies import get_current_user
from mysite4.models.user import User

router = APIRouter(prefix="/posts2", tags=["posts2"])

@router.post("", response_model=Post2DetailResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    data: Post2Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # 인증 자동 처리
):
    return post2_service.create_post(db, data, current_user)
```

**흐름:**
```
1. 클라이언트 요청
   POST /posts2
   Header: Authorization: Bearer {token}
   Body: {"title": "제목", "content": "내용"}

2. FastAPI 처리
   ├─ Depends(get_current_user) 실행
   │  ├─ 토큰 추출 및 검증
   │  └─ User 객체 반환
   └─ create_post 함수 실행
      └─ current_user = User(id=1, email="...")

3. Service에서 게시글 생성
   new_post = Post2(title, content, user=current_user)
   └─ user_id가 자동으로 1로 설정됨
```

---

## 5. 게시글 조회 (Read)

### 1. Repository with Eager Loading

```python
# repositories/post2_repository.py

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from mysite4.models.post2 import Post2

class Post2Repository:
    # ... save() ...

    def find_all(self, db: Session):
        """전체 게시글 조회 (N+1 문제 방지)"""
        return db.scalars(
            select(Post2).options(joinedload(Post2.user))
        ).all()

    def find_by_id(self, db: Session, id: int):
        """ID로 게시글 조회 (N+1 문제 방지)"""
        return db.scalars(
            select(Post2)
            .options(joinedload(Post2.user))
            .where(Post2.id == id)
        ).first()
```

**joinedload의 역할:**
```python
# joinedload 없이 (N+1 문제 발생)
posts = db.query(Post2).all()  # 쿼리 1개
for post in posts:
    print(post.user.email)  # 각 post마다 쿼리 1개씩 추가!

# joinedload 사용 (N+1 해결)
posts = db.scalars(
    select(Post2).options(joinedload(Post2.user))
).all()  # 쿼리 1개로 모든 user 정보까지 조회
for post in posts:
    print(post.user.email)  # 추가 쿼리 없음!
```

**실행되는 SQL:**
```sql
SELECT posts2.id, posts2.title, posts2.content, posts2.user_id,
       users.id, users.email, users.created_at
FROM posts2
LEFT OUTER JOIN users ON users.id = posts2.user_id
```

### 2. Service

```python
# services/post2_service.py

class Post2Service:
    # ... create_post() ...

    def read_posts(self, db: Session):
        """전체 게시글 목록 조회"""
        return post2_repository.find_all(db)

    def read_post_by_id(self, db: Session, id: int):
        """게시글 상세 조회"""
        post = post2_repository.find_by_id(db, id)
        if not post:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, 
                "존재하지 않는 게시글입니다."
            )
        return post
```

### 3. Router

```python
# routers/post2_router.py

@router.get("", response_model=list[Post2ListResponse])
def read_posts(db: Session = Depends(get_db)):
    """전체 게시글 목록 조회 (인증 불필요)"""
    return post2_service.read_posts(db)

@router.get("/{id}", response_model=Post2DetailResponse)
def read_post(id: int, db: Session = Depends(get_db)):
    """게시글 상세 조회 (인증 불필요)"""
    return post2_service.read_post_by_id(db, id)
```

---

## 6. 게시글 수정/삭제 (Update/Delete) - 인가 구현

### 1. Repository

```python
# repositories/post2_repository.py

class Post2Repository:
    # ... 기존 메서드들 ...

    def update(self, db: Session, post: Post2, data: Post2Create):
        """게시글 수정"""
        post.title = data.title
        post.content = data.content
        return post

    def delete(self, db: Session, post: Post2):
        """게시글 삭제"""
        db.delete(post)
```

### 2. Service - Authorization 체크

```python
# services/post2_service.py

class Post2Service:
    # ... 기존 메서드들 ...

    def update_post(
        self, 
        db: Session, 
        id: int, 
        data: Post2Create, 
        current_user: User
    ):
        """게시글 수정 (본인만 가능)"""
        post = self.read_post_by_id(db, id)

        # 인가(Authorization): 작성자 본인만 수정 가능
        if post.user_id != current_user.id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, 
                "본인의 게시글만 수정할 수 있습니다."
            )

        updated_post = post2_repository.update(db, post, data)
        db.commit()
        db.refresh(updated_post)
        return updated_post

    def delete_post(self, db: Session, id: int, current_user: User):
        """게시글 삭제 (본인만 가능)"""
        post = self.read_post_by_id(db, id)

        # 인가(Authorization): 작성자 본인만 삭제 가능
        if post.user_id != current_user.id:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, 
                "본인의 게시글만 삭제할 수 있습니다."
            )

        post2_repository.delete(db, post)
        db.commit()
```

**인증 vs 인가:**

```python
# 인증(Authentication): "누구인가?"
current_user: User = Depends(get_current_user)
# → FastAPI가 자동 처리 (Depends)

# 인가(Authorization): "권한이 있는가?"
if post.user_id != current_user.id:
    raise HTTPException(403, "권한이 없습니다")
# → 비즈니스 로직에서 직접 처리 (Service)
```

### 3. Router

```python
# routers/post2_router.py

@router.put("/{id}", response_model=Post2DetailResponse)
def update_post(
    id: int,
    data: Post2Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # 인증 + 본인 확인
):
    """게시글 수정 (본인만 가능)"""
    return post2_service.update_post(db, id, data, current_user)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),  # 인증 + 본인 확인
):
    """게시글 삭제 (본인만 가능)"""
    post2_service.delete_post(db, id, current_user)
```

**403 vs 404 vs 401:**
```python
# 401 Unauthorized: 로그인 안 함 (인증 실패)
raise HTTPException(401, "로그인이 필요합니다")

# 403 Forbidden: 로그인했지만 권한 없음 (인가 실패)
raise HTTPException(403, "본인의 게시글만 수정할 수 있습니다")

# 404 Not Found: 리소스가 존재하지 않음
raise HTTPException(404, "존재하지 않는 게시글입니다")
```

---

## 7. 사용자별 게시글 조회

### 1. RESTful URL 설계

```
내 글 조회:
GET /me/posts
→ "내 정보"의 일부 → /me 하위

특정 유저의 글 조회:
GET /users/{user_id}/posts
→ "특정 유저 정보"의 일부 → /users/{id} 하위
```

**REST 관점:**
- `/me/posts`: "나"라는 리소스의 "게시글" 컬렉션
- `/users/{user_id}/posts`: "특정 유저" 리소스의 "게시글" 컬렉션

### 2. Repository

```python
# repositories/post2_repository.py

class Post2Repository:
    # ... 기존 메서드들 ...

    def find_by_user_id(self, db: Session, user_id: int):
        """특정 유저가 작성한 게시글 목록 조회"""
        return db.scalars(
            select(Post2)
            .options(joinedload(Post2.user))
            .where(Post2.user_id == user_id)
        ).all()
```

**조회 주체 vs 데이터 위치:**
- 조회 주체: User (누가 조회하는가?)
- 데이터 위치: Post2Repository (어떤 데이터인가?)
- → Post2Repository에 정의하는 것이 적절

### 3. User Service 생성

```python
# services/user_service.py

from sqlalchemy.orm import Session
from mysite4.repositories.post2_repository import post2_repository
from mysite4.models.user import User

class UserService:
    def read_my_posts(self, db: Session, current_user: User):
        """내가 작성한 게시글 목록 조회"""
        return post2_repository.find_by_user_id(db, current_user.id)

    def read_posts_by_user_id(self, db: Session, user_id: int):
        """특정 유저가 작성한 게시글 목록 조회"""
        return post2_repository.find_by_user_id(db, user_id)

user_service = UserService()
```

**계층 간 호출 관계:**
```
UserService
    ↓ (호출)
Post2Repository
    ↓ (쿼리)
Database
```

**왜 Post2Service가 아닌 UserService인가?**
- URL 구조: `/me/posts`, `/users/{id}/posts`
- 도메인 관점: "사용자의 게시글 목록"
- → User 도메인의 기능으로 보는 것이 자연스러움

### 4. User Router

```python
# routers/user_router.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from mysite4.schemas.user import UserResponse
from mysite4.schemas.post2 import Post2ListResponse
from mysite4.models.user import User
from mysite4.dependencies import get_current_user
from mysite4.services.user_service import user_service

router = APIRouter(tags=["Users"])

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """내 정보 조회"""
    return current_user

@router.get("/me/posts", response_model=list[Post2ListResponse])
def read_my_posts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """내가 작성한 게시글 목록 조회"""
    return user_service.read_posts_by_user_id(db, current_user.id)

@router.get("/users/{user_id}/posts", response_model=list[Post2ListResponse])
def read_posts_by_user(user_id: int, db: Session = Depends(get_db)):
    """특정 유저가 작성한 게시글 목록 조회"""
    return user_service.read_posts_by_user_id(db, user_id)
```

---

## 8. Dependencies (의존성 주입) 심화

### 1. get_current_user의 동작 원리

```python
# dependencies.py

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from mysite4.services.auth_service import auth_service
from mysite4.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),  # 의존성 1
    db: Session = Depends(get_db),        # 의존성 2
) -> User:
    return auth_service.get_current_user(db, token)
```

**실행 순서:**
```
1. 요청 수신
   POST /posts2
   Header: Authorization: Bearer eyJhbGci...

2. FastAPI가 Depends 해결
   ├─ Depends(oauth2_scheme) 실행
   │  └─ Authorization 헤더에서 토큰 추출
   │     token = "eyJhbGci..."
   │
   ├─ Depends(get_db) 실행
   │  └─ DB 세션 생성
   │     db = Session()
   │
   └─ get_current_user 실행
      └─ auth_service.get_current_user(db, token)
         ├─ JWT 디코드
         ├─ user_id 추출
         └─ DB에서 사용자 조회
            return User(id=1, email="...")

3. Router 함수 실행
   create_post(data, db, current_user=User(...))
```

### 2. OAuth2PasswordBearer의 역할

```python
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
```

**내부 동작:**
```python
# 단순화된 구현
class OAuth2PasswordBearer:
    def __call__(self, request: Request):
        # 1. Authorization 헤더 가져오기
        authorization = request.headers.get("Authorization")
        
        # 2. Bearer 형식 확인
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(401, "인증이 필요합니다")
        
        # 3. 토큰만 추출
        token = authorization.replace("Bearer ", "")
        
        return token
```

**tokenUrl의 역할:**
- Swagger UI에서 "Authorize" 버튼 활성화
- 실제 인증 로직과는 무관 (문서화 목적)

### 3. Depends의 장점

**코드 재사용:**
```python
# 여러 라우터에서 동일하게 사용
@router.post("/posts2")
def create_post(current_user: User = Depends(get_current_user)):
    ...

@router.put("/posts2/{id}")
def update_post(current_user: User = Depends(get_current_user)):
    ...

@router.delete("/posts2/{id}")
def delete_post(current_user: User = Depends(get_current_user)):
    ...
```

**테스트 용이성:**
```python
# 테스트 시 의존성 교체
def fake_current_user():
    return User(id=999, email="test@test.com")

app.dependency_overrides[get_current_user] = fake_current_user

# 실제 JWT 토큰 없이도 테스트 가능!
```

---

## 9. 전체 아키텍처 흐름

### 게시글 작성 전체 흐름

```
[클라이언트]                [Router]              [Service]           [Repository]        [DB]
     │                         │                      │                     │               │
     │  POST /posts2           │                      │                     │               │
     │  Authorization: Bearer  │                      │                     │               │
     │  {"title": "...", ...} │                      │                     │               │
     ├────────────────────────►│                      │                     │               │
     │                         │                      │                     │               │
     │                         │ Depends 해결         │                     │               │
     │                         │ ├─ oauth2_scheme     │                     │               │
     │                         │ │  (토큰 추출)       │                     │               │
     │                         │ ├─ get_db            │                     │               │
     │                         │ │  (세션 생성)       │                     │               │
     │                         │ └─ get_current_user  │                     │               │
     │                         │    └─ auth_service───┼─ 토큰 검증          │               │
     │                         │       (User 반환)    │ └─ DB 조회 ─────────┼──────────────►│
     │                         │                      │                     │               │
     │                         │ create_post 호출     │                     │               │
     │                         ├─────────────────────►│                     │               │
     │                         │                      │                     │               │
     │                         │                      │ Post2 생성          │               │
     │                         │                      │ (user=current_user) │               │
     │                         │                      │                     │               │
     │                         │                      │ save 호출           │               │
     │                         │                      ├────────────────────►│               │
     │                         │                      │                     │               │
     │                         │                      │                     │ INSERT        │
     │                         │                      │                     ├──────────────►│
     │                         │                      │                     │◄──────────────┤
     │                         │                      │                     │               │
     │                         │                      │ commit()            │               │
     │                         │                      │                     │               │
     │                         │ Post2 반환           │                     │               │
     │                         │◄─────────────────────┤                     │               │
     │                         │                      │                     │               │
     │  Post2DetailResponse    │                      │                     │               │
     │◄────────────────────────┤                      │                     │               │
     │  {id, title, user: ...} │                      │                     │               │
```

### 게시글 수정 (인가 체크 포함)

```
[클라이언트]                [Router]              [Service]                      [DB]
     │                         │                      │                           │
     │  PUT /posts2/1          │                      │                           │
     │  Authorization: Bearer  │                      │                           │
     │  {"title": "수정", ...} │                      │                           │
     ├────────────────────────►│                      │                           │
     │                         │                      │                           │
     │                         │ 1. 인증 (Depends)    │                           │
     │                         │    current_user 획득 │                           │
     │                         │                      │                           │
     │                         │ update_post 호출     │                           │
     │                         ├─────────────────────►│                           │
     │                         │                      │                           │
     │                         │                      │ 2. 게시글 조회            │
     │                         │                      ├──────────────────────────►│
     │                         │                      │◄──────────────────────────┤
     │                         │                      │  post = Post2(user_id=1)  │
     │                         │                      │                           │
     │                         │                      │ 3. 인가 체크              │
     │                         │                      │    if post.user_id !=     │
     │                         │                      │       current_user.id:    │
     │                         │                      │       raise 403            │
     │                         │                      │    ✓ 통과                 │
     │                         │                      │                           │
     │                         │                      │ 4. 수정 및 commit         │
     │                         │                      ├──────────────────────────►│
     │                         │                      │                           │
     │  수정된 Post2           │                      │                           │
     │◄────────────────────────┴──────────────────────┤                           │
```

---

## 10. 핵심 개념 정리

### 1. 인증 vs 인가

| 구분 | 영어 | 의미 | 처리 위치 | 예시 |
|------|------|------|----------|------|
| **인증** | Authentication | 누구인가? | Depends (FastAPI) | 로그인한 사용자인가? |
| **인가** | Authorization | 권한이 있는가? | Service (비즈니스 로직) | 본인의 게시글인가? |

```python
# 인증: FastAPI가 자동 처리
current_user: User = Depends(get_current_user)

# 인가: 개발자가 직접 구현
if post.user_id != current_user.id:
    raise HTTPException(403, "권한 없음")
```

### 2. relationship vs ForeignKey

| 구분 | 용도 | 타입 | 사용 시점 |
|------|------|------|----------|
| **ForeignKey** | DB 관계 정의 | int | 테이블 설계 |
| **relationship** | ORM 객체 탐색 | 객체 | 코드에서 조회 |

```python
# 모델 정의
class Post2(Base):
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))  # FK
    user: Mapped["User"] = relationship(back_populates="posts2")   # 관계

# 객체 생성
post = Post2(user_id=1)  # FK 값 사용

# 객체 조회 후 탐색
post = db.get(Post2, 1)
print(post.user.email)  # relationship으로 접근
```

### 3. N+1 문제와 Eager Loading

```python
# ❌ N+1 문제
posts = db.query(Post2).all()  # 1개 쿼리
for post in posts:
    print(post.user.email)  # N개 쿼리

# ✅ Eager Loading
posts = db.scalars(
    select(Post2).options(joinedload(Post2.user))
).all()  # 1개 쿼리로 모든 user 정보까지 조회
for post in posts:
    print(post.user.email)  # 추가 쿼리 없음
```

### 4. REST API 설계 원칙

```
리소스 기반 URL 설계:
✅ GET  /posts2           - 게시글 목록
✅ POST /posts2           - 게시글 작성
✅ GET  /posts2/{id}      - 게시글 상세
✅ PUT  /posts2/{id}      - 게시글 수정
✅ DELETE /posts2/{id}    - 게시글 삭제

✅ GET  /me/posts         - 내 게시글
✅ GET  /users/{id}/posts - 특정 유저의 게시글

❌ GET  /getMyPosts       - 동사 사용
❌ POST /createPost       - 동사 사용
```

---

## 11. 학습 포인트 (Key Takeaways)

### 1. Depends의 강력함

- 인증 로직을 한 곳에 정의하고 여러 곳에서 재사용
- 테스트 시 의존성 교체로 쉬운 모킹
- FastAPI가 자동으로 의존성 해결

### 2. 계층 간 책임 분리

```
Router: API 엔드포인트 정의, Depends 선언
  ↓
Service: 비즈니스 로직, 인가 체크
  ↓
Repository: DB 접근, 쿼리 실행
  ↓
Model: 데이터 구조 정의
```

### 3. 인증 vs 인가의 명확한 구분

- **인증**: "로그인한 사용자인가?" → FastAPI Depends
- **인가**: "이 작업을 할 권한이 있는가?" → Service 로직

### 4. N+1 문제 방지

- Response 스키마에 관계 데이터 포함 시 반드시 Eager Loading
- `joinedload()` 또는 `selectinload()` 사용

### 5. RESTful 설계

- 리소스 중심 URL 구조
- HTTP 메서드로 행위 표현
- 적절한 상태 코드 사용

### 6. 트랜잭션 관리

- `get_current_user` 후에는 `db.begin()` 사용 불가
- 이미 시작된 트랜잭션에서는 `db.commit()` 사용

