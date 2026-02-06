# [TIL] FastAPI: 1:N 관계 구현 - 게시글과 댓글 CRUD

## 1. 1:N 관계란?

**1:N 관계**는 하나의 엔티티가 여러 개의 다른 엔티티와 연결되는 데이터베이스 관계를 의미한다.

- **핵심 개념**: "하나의 게시글(1)에 여러 개의 댓글(N)이 달린다"
- **실생활 예시**:
  - 게시글 1개 → 댓글 N개
  - 부서 1개 → 직원 N명
  - 카테고리 1개 → 상품 N개

### 1:N 관계의 구성 요소

```
Post (1) ─────< Comment (N)
부모(Parent)    자식(Child)
```

- **부모 테이블**: Post (1쪽)
- **자식 테이블**: Comment (N쪽)
- **외래키(Foreign Key)**: Comment 테이블의 `post_id`가 Post 테이블의 `id`를 참조

---

## 2. SQLAlchemy로 1:N 관계 정의하기

### 2.1 모델 정의

#### Post 모델 (부모)

```python
# models/post.py
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text
from database import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .comment import Comment

class Post(Base):
    __tablename__ = "posts"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    
    # 1:N 관계 설정 - "이 게시글의 댓글들"
    comments: Mapped[list["Comment"]] = relationship(
        "Comment", 
        back_populates="post", 
        cascade="all, delete-orphan"
    )
```

**주요 개념**:

- `relationship("Comment")`: Comment 모델과 관계 설정
- `back_populates="post"`: Comment의 `post` 속성과 양방향 연결
- `cascade="all, delete-orphan"`: 게시글 삭제 시 댓글도 함께 삭제
- `Mapped[list["Comment"]]`: 댓글 목록을 리스트로 관리

#### Comment 모델 (자식)

```python
# models/comment.py
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .post import Post

class Comment(Base):
    __tablename__ = "comments"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    content: Mapped[str] = mapped_column(String(200), nullable=False)
    
    # 외래키 설정: posts 테이블의 id를 참조
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"), nullable=False)
    
    # 관계 설정: "이 댓글이 속한 게시글"
    post: Mapped["Post"] = relationship("Post", back_populates="comments")
```

**주요 개념**:

- `ForeignKey("posts.id")`: posts 테이블의 id 컬럼 참조
- `post_id`: 실제 데이터베이스 컬럼 (정수값 저장)
- `post`: ORM 객체 접근용 (Post 객체 반환)
- `back_populates="comments"`: Post의 `comments` 속성과 양방향 연결

### 2.2 TYPE_CHECKING의 역할

```python
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .comment import Comment
```

**목적**: 순환 임포트(Circular Import) 문제 해결

- **문제 상황**: Post가 Comment를 import하고, Comment가 Post를 import하면 에러 발생
- **해결 방법**: `TYPE_CHECKING`은 타입 체크 시에만 `True`가 되고, 런타임에는 `False`
- **결과**: IDE는 타입을 인식하지만, 실제 실행 시에는 import하지 않음

---

## 3. relationship의 양방향 동기화

### 3.1 back_populates의 마법

```python
# Post 모델
comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="post")

# Comment 모델
post: Mapped["Post"] = relationship("Post", back_populates="comments")
```

**연결 구조**:

```
Post.comments ←─ back_populates ─→ Comment.post
```

### 3.2 자동 동기화 예시

#### 방법 1: Comment 쪽에서 설정

```python
post = Post(title="제목", content="내용")
comment = Comment(content="댓글")

# 댓글에 게시글 연결 (한쪽만 설정)
comment.post = post

# 자동 동기화! ✨
print(post.comments)  # [comment] - 자동으로 추가됨
print(comment.post_id)  # post.id - 자동으로 설정됨
```

#### 방법 2: Post 쪽에서 설정

```python
post = Post(title="제목", content="내용")
comment = Comment(content="댓글")

# 게시글에 댓글 추가 (한쪽만 설정)
post.comments.append(comment)

# 자동 동기화! ✨
print(comment.post)  # <Post 객체> - 자동으로 설정됨
print(comment.post_id)  # post.id - 자동으로 설정됨
```

### 3.3 실전 활용

```python
# Service에서 댓글 생성 시
def create_comment(self, db: Session, post_id: int, data: CommentCreate):
    post = post_service.read_post_by_id(db, post_id)
    
    # post=post만 설정하면 post_id는 자동으로 설정됨
    new_comment = Comment(
        content=data.content,
        post=post  # 이것만으로 post_id 자동 설정!
    )
    
    # 이 시점에서 이미:
    # - new_comment.post_id = post.id
    # - post.comments에 new_comment 추가됨
    
    comment_repository.save(db, new_comment)
    return new_comment
```

---

## 4. cascade 옵션 이해하기

### 4.1 cascade="all, delete-orphan"

```python
comments: Mapped[list["Comment"]] = relationship(
    "Comment", 
    back_populates="post", 
    cascade="all, delete-orphan"
)
```

**의미**:

- `all`: 부모의 모든 변경사항(추가, 수정, 삭제)을 자식에게 전파
- `delete-orphan`: 부모와 연결이 끊어진 자식(고아)도 자동 삭제

### 4.2 실제 동작 예시

```python
# 게시글 삭제
post = db.get(Post, 1)
db.delete(post)
db.commit()

# 실행되는 SQL:
# DELETE FROM comments WHERE post_id = 1  (먼저 댓글 삭제)
# DELETE FROM posts WHERE id = 1          (그 다음 게시글 삭제)
```

**장점**:

- 수동으로 댓글을 먼저 삭제할 필요 없음
- 데이터 무결성 자동 유지
- 외래키 제약조건 위반 방지

---

## 5. Schema 설계 - 입출력 분리

### 5.1 Comment Schema

```python
# schemas/comment.py
from pydantic import BaseModel, ConfigDict

# 입력 스키마 (생성/수정 시 사용)
class CommentCreate(BaseModel):
    content: str

# 출력 스키마 (응답 시 사용)
class CommentResponse(BaseModel):
    id: int
    content: str
    
    model_config = ConfigDict(from_attributes=True)
```

**설계 원칙**:

- `CommentCreate`: `post_id`를 포함하지 않음 (URL 경로로 받음)
- `CommentResponse`: `post_id`를 포함하지 않음 (필요없는 정보)
- `from_attributes=True`: SQLAlchemy 모델 → Pydantic 모델 자동 변환

### 5.2 Post Schema 수정

```python
# schemas/post.py
from pydantic import BaseModel, ConfigDict
from mysite4.schemas.comment import CommentResponse

class PostDetailResponse(BaseModel):
    id: int
    title: str
    content: str
    comments: list[CommentResponse] = []  # 댓글 목록 포함!
    
    model_config = ConfigDict(from_attributes=True)
```

**핵심 포인트**:

- `comments: list[CommentResponse]`: 게시글 조회 시 댓글도 함께 반환
- `= []`: 댓글이 없을 경우 빈 리스트 반환
- SQLAlchemy의 `relationship`이 자동으로 댓글 데이터를 채워줌

### 5.3 자동 변환 과정

```python
# DB에서 조회한 Post 객체
db_post = db.get(Post, 1)
# db_post.comments = [Comment(id=1, content="댓글1"), Comment(id=2, content="댓글2")]

# FastAPI가 자동으로 변환
response = PostDetailResponse.model_validate(db_post)

# 결과 JSON:
{
    "id": 1,
    "title": "제목",
    "content": "내용",
    "comments": [
        {"id": 1, "content": "댓글1"},
        {"id": 2, "content": "댓글2"}
    ]
}
```

---

## 6. Repository 계층 - 데이터 접근

### 6.1 Comment Repository

```python
# repositories/comment_repository.py
from sqlalchemy.orm import Session
from mysite4.models.comment import Comment

class CommentRepository:
    def save(self, db: Session, new_comment: Comment):
        db.add(new_comment)  # 세션에 추가 (아직 DB에 저장 안 됨)
        return new_comment
    
    def find_by_id(self, db: Session, comment_id: int):
        return db.get(Comment, comment_id)  # 기본키로 조회
    
    def delete(self, db: Session, comment: Comment):
        db.delete(comment)  # 삭제 대상으로 표시

comment_repository = CommentRepository()
```

**특징**:

- 에러를 발생시키지 않음 (Service에서 판단)
- `db.get()`: 기본키 조회 - 가장 빠른 방법
- `db.add()`, `db.delete()`: 세션에 작업 등록만 함 (커밋은 Service에서)

### 6.2 Post Repository (변경 없음)

```python
# repositories/post_repository.py
from sqlalchemy.orm import Session
from sqlalchemy import select
from mysite4.models.post import Post

class PostRepository:
    def save(self, db: Session, new_post: Post):
        db.add(new_post)
        return new_post
    
    def find_all(self, db: Session):
        stmt = select(Post)
        return db.scalars(stmt).all()
    
    def find_by_id(self, db: Session, id: int):
        return db.get(Post, id)
    
    def update(self, db: Session, post: Post, data: PostCreate):
        post.title = data.title
        post.content = data.content
        return post
    
    def delete(self, db: Session, post: Post):
        db.delete(post)

post_repository = PostRepository()
```

---

## 7. Service 계층 - 비즈니스 로직

### 7.1 댓글 생성

```python
# services/comment_service.py
from sqlalchemy.orm import Session
from mysite4.repositories.comment_repository import comment_repository
from mysite4.services.post_service import post_service
from mysite4.models.comment import Comment
from mysite4.schemas.comment import CommentCreate
from fastapi import HTTPException

class CommentService:
    def create_comment(self, db: Session, post_id: int, data: CommentCreate):
        with db.begin():
            # 1. 게시글 존재 검증
            post = post_service.read_post_by_id(db, post_id)
            # → 없으면 post_service에서 HTTPException 발생
            
            # 2. Comment 객체 생성
            new_comment = Comment(
                content=data.content,
                post=post  # relationship 활용
            )
            # 이 시점에서 new_comment.post_id = post.id 자동 설정됨
            
            # 3. Repository를 통해 저장
            comment_repository.save(db, new_comment)
        
        # 4. DB에서 최신 상태 갱신
        db.refresh(new_comment)
        return new_comment
```

**핵심 포인트**:

- `with db.begin()`: 트랜잭션 자동 관리 (성공 시 커밋, 실패 시 롤백)
- `post=post`: `post_id=post_id`보다 권장 (이미 post 객체가 있으므로)
- `db.refresh()`: DB의 자동 생성 값(id 등)을 객체에 반영

### 7.2 댓글 수정

```python
def update_comment(self, db: Session, post_id: int, comment_id: int, content: str):
    with db.begin():
        # 1. 댓글 조회
        comment = comment_repository.find_by_id(db, comment_id)
        
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        # 2. 소유권 검증 (중요!)
        if comment.post_id != post_id:
            raise HTTPException(
                status_code=400, 
                detail="Comment does not belong to this post"
            )
        
        # 3. 더티 체킹(Dirty Checking)으로 수정
        comment.content = content
        # ✨ repository.update() 호출 없이도 자동 UPDATE!
    
    db.refresh(comment)
    return comment
```

**더티 체킹(Dirty Checking)**:

- SQLAlchemy가 객체 변경을 감지해 자동으로 UPDATE 쿼리 생성
- `comment.content = content`만 해도 트랜잭션 종료 시 자동 저장
- 별도의 `update()` 메서드 호출 불필요

**소유권 검증의 중요성**:

```
URL: PUT /posts-db/1/comments/5
     ↑ post_id=1    ↑ comment_id=5

만약 댓글5가 게시글2에 속한다면?
→ 400 에러 발생 (잘못된 요청)
```

### 7.3 댓글 삭제

```python
def delete_comment(self, db: Session, post_id: int, comment_id: int):
    with db.begin():
        # 1. 댓글 조회
        comment = comment_repository.find_by_id(db, comment_id)
        
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        # 2. 소유권 검증
        if comment.post_id != post_id:
            raise HTTPException(
                status_code=400, 
                detail="Comment does not belong to this post"
            )
        
        # 3. Repository를 통해 삭제
        comment_repository.delete(db, comment)
    # with 블록 종료 시 자동 커밋

comment_service = CommentService()
```

---

## 8. Router 계층 - RESTful API 설계

### 8.1 RESTful URL 설계 원칙

**Nested Resource Pattern** (중첩 리소스 패턴):

```
/posts/{post_id}/comments        - 특정 게시글의 댓글 목록
/posts/{post_id}/comments/{id}   - 특정 게시글의 특정 댓글
```

**장점**:

- URL만 봐도 관계를 알 수 있음
- 게시글과 댓글의 종속 관계 명확
- 소유권 검증이 자연스러움

### 8.2 Router 구현

```python
# routers/post_router.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from database import get_db
from mysite4.services.comment_service import comment_service
from mysite4.schemas.comment import CommentCreate, CommentResponse

router = APIRouter(prefix="/posts-db", tags=["posts"])

# 댓글 생성
@router.post(
    "/{post_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    post_id: int, 
    data: CommentCreate, 
    db: Session = Depends(get_db)
):
    return comment_service.create_comment(db, post_id, data)

# 댓글 수정
@router.put(
    "/{post_id}/comments/{comment_id}", 
    response_model=CommentResponse
)
def update_comment(
    post_id: int, 
    comment_id: int, 
    data: CommentCreate, 
    db: Session = Depends(get_db)
):
    return comment_service.update_comment(
        db, post_id, comment_id, data.content
    )

# 댓글 삭제
@router.delete(
    "/{post_id}/comments/{comment_id}", 
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_comment(
    post_id: int, 
    comment_id: int, 
    db: Session = Depends(get_db)
):
    comment_service.delete_comment(db, post_id, comment_id)
    return None
```

**경로 변수 순서**:

- `post_id` → `comment_id` 순서 (부모 → 자식)
- URL 구조와 일치하도록 매개변수 배치

### 8.3 상태 코드 선택

- **201 Created**: 댓글 생성 성공
- **200 OK**: 댓글 수정 성공 (기본값)
- **204 No Content**: 댓글 삭제 성공 (응답 본문 없음)
- **404 Not Found**: 댓글 또는 게시글 없음
- **400 Bad Request**: 소유권 불일치

---

## 9. 데이터 흐름 완전 분석

### 9.1 댓글 생성 흐름

```
┌─────────────┐
│   클라이언트  │ POST /posts-db/1/comments
└──────┬──────┘ {"content": "좋은 글이네요"}
       ↓
┌──────────────────────────────────────────┐
│ Router: create_comment(post_id=1, data)  │
└──────┬───────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ Service: comment_service.create_comment  │
│  1. post_service.read_post_by_id(1)      │ ← 게시글 존재 검증
│     → SELECT * FROM posts WHERE id = 1   │
│  2. Comment(content="...", post=post)    │ ← 객체 생성
│     → post_id 자동 설정                   │
│  3. comment_repository.save(comment)     │
│     → db.add(comment)                    │
└──────┬───────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ with db.begin() 종료 → 자동 커밋          │
│ INSERT INTO comments                     │
│   (content, post_id)                     │
│ VALUES ('좋은 글이네요', 1)                │
└──────┬───────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ db.refresh(new_comment)                  │
│ → DB에서 생성된 id를 객체에 반영           │
└──────┬───────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ Router로 Comment 객체 반환                │
└──────┬───────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ FastAPI 자동 변환 (from_attributes=True) │
│ Comment 객체 → CommentResponse           │
└──────┬───────────────────────────────────┘
       ↓
┌─────────────┐
│   클라이언트  │ {"id": 1, "content": "좋은 글이네요"}
└─────────────┘
```

### 9.2 댓글 수정 흐름

```
PUT /posts-db/1/comments/5
{"content": "수정된 댓글"}

1. Router: update_comment(post_id=1, comment_id=5, data)
   ↓
2. Service: comment_service.update_comment
   ↓
3. Repository: find_by_id(5)
   → SELECT * FROM comments WHERE id = 5
   ↓
4. Service: 소유권 검증
   if comment.post_id != 1:
       raise HTTPException(400)
   ↓
5. Service: 더티 체킹
   comment.content = "수정된 댓글"
   ↓
6. with db.begin() 종료 → 자동 커밋
   → UPDATE comments SET content='수정된 댓글' WHERE id = 5
   ↓
7. db.refresh(comment)
   ↓
8. 응답: {"id": 5, "content": "수정된 댓글"}
```

### 9.3 게시글 삭제 시 댓글 자동 삭제

```
DELETE /posts-db/1

1. post_service.delete_post(1)
   ↓
2. post = post_repository.find_by_id(1)
   ↓
3. post_repository.delete(post)
   → db.delete(post)
   ↓
4. db.commit()
   ↓
5. cascade="all, delete-orphan" 작동!
   → DELETE FROM comments WHERE post_id = 1  (먼저)
   → DELETE FROM posts WHERE id = 1          (나중에)
```

---

## 10. 트랜잭션 관리

### 10.1 with db.begin() 사용 이유

```python
# ❌ 수동 관리 (비추천)
def create_comment(self, db: Session, post_id: int, data: CommentCreate):
    try:
        post = post_service.read_post_by_id(db, post_id)
        new_comment = Comment(content=data.content, post=post)
        comment_repository.save(db, new_comment)
        db.commit()  # 수동 커밋
    except Exception as e:
        db.rollback()  # 수동 롤백
        raise e
    
    db.refresh(new_comment)
    return new_comment

# ✅ 자동 관리 (추천)
def create_comment(self, db: Session, post_id: int, data: CommentCreate):
    with db.begin():  # 자동 커밋/롤백
        post = post_service.read_post_by_id(db, post_id)
        new_comment = Comment(content=data.content, post=post)
        comment_repository.save(db, new_comment)
    
    db.refresh(new_comment)
    return new_comment
```

### 10.2 트랜잭션 동작 방식

```python
with db.begin():
    # 작업 1
    # 작업 2
    # 작업 3
# 여기서 자동 커밋 또는 롤백

# 성공: 모든 작업 커밋
# 실패: 모든 작업 롤백 (원자성 보장)
```

**장점**:

- 코드 간결성
- 에러 처리 자동화
- 트랜잭션 누락 방지

### 10.3 db.refresh()를 밖에 두는 이유

```python
with db.begin():
    comment_repository.save(db, new_comment)
    # 이 시점: new_comment.id = None (아직 DB에 저장 안 됨)

# with 블록 종료 → 커밋 완료
db.refresh(new_comment)  # 이제 DB에서 id 가져옴
# 이 시점: new_comment.id = 1 (DB에서 생성된 값)
```

**이유**:

- `db.refresh()`는 커밋된 후에만 의미가 있음
- 트랜잭션 안에서 하면 아직 DB에 반영 안 된 상태

---

## 11. Pydantic의 from_attributes=True

### 11.1 동작 원리

```python
# schemas/comment.py
class CommentResponse(BaseModel):
    id: int
    content: str
    
    model_config = ConfigDict(from_attributes=True)
```

**from_attributes=True의 역할**:

- SQLAlchemy 모델 객체의 **속성(attributes)**에서 데이터를 읽어옴
- 딕셔너리가 아닌 객체도 Pydantic 모델로 변환 가능

### 11.2 변환 과정

```python
# SQLAlchemy 객체
db_comment = Comment(id=1, content="댓글")

# ✅ from_attributes=True 있을 때
response = CommentResponse.model_validate(db_comment)
# 성공! → {"id": 1, "content": "댓글"}

# ❌ from_attributes=True 없을 때
response = CommentResponse.model_validate(db_comment)
# ValidationError: Input should be a valid dictionary
```

### 11.3 FastAPI에서 자동 변환

```python
@router.post("/{post_id}/comments", response_model=CommentResponse)
def create_comment(...):
    # Comment 객체 반환
    return comment_service.create_comment(db, post_id, data)
    
# FastAPI가 자동으로:
# 1. Comment 객체를 받음
# 2. CommentResponse.model_validate(comment) 호출
# 3. JSON으로 변환하여 응답
```

---

## 12. 계층별 책임 정리

### 12.1 Comment 관련 계층

| 계층 | 파일 | 역할 | 하는 일 | 하지 않는 일 |
|------|------|------|---------|--------------|
| **Model** | `comment.py` | 데이터 구조 정의 | - 테이블 정의<br>- 관계 설정<br>- 외래키 설정 | 비즈니스 로직 |
| **Schema** | `comment.py` | 입출력 검증 | - 타입 검증<br>- 자동 변환 | 데이터 저장 |
| **Repository** | `comment_repository.py` | 데이터 접근 | - CRUD 수행<br>- 쿼리 실행 | 에러 판단 |
| **Service** | `comment_service.py` | 비즈니스 로직 | - 검증<br>- 트랜잭션 관리<br>- 소유권 확인 | HTTP 처리 |
| **Router** | `post_router.py` | HTTP 처리 | - URL 매핑<br>- 상태 코드 설정 | 비즈니스 로직 |

### 12.2 흐름 비교

#### 생성 (Create)

```
Router → Service (검증) → Repository (저장) → DB
```

#### 수정/삭제 (Update/Delete)

```
Router → Service (검증 + 소유권 확인) → Repository (수정/삭제) → DB
```

#### 조회 (Read)

```
게시글 조회 시 댓글도 함께:
Router → post_service → post_repository → DB
                              ↓
                    relationship이 자동으로
                    댓글 데이터도 로딩
```

---

## 13. 소유권 검증의 중요성

### 13.1 검증이 없다면?

```python
# ❌ 소유권 검증 없음
PUT /posts-db/1/comments/5
→ 게시글1의 댓글이 아닌데도 수정 가능
→ 보안 취약점!
```

### 13.2 검증 코드

```python
if comment.post_id != post_id:
    raise HTTPException(
        status_code=400, 
        detail="Comment does not belong to this post"
    )
```

**검증 시나리오**:

```
URL: PUT /posts-db/1/comments/5

경우 1: 댓글5가 게시글1에 속함
→ comment.post_id = 1
→ 1 != 1? False
→ 수정 진행 ✅

경우 2: 댓글5가 게시글2에 속함
→ comment.post_id = 2
→ 2 != 1? True
→ 400 에러 발생 ❌
```

### 13.3 실전 활용

```python
# URL 설계와 검증의 조화
POST   /posts-db/{post_id}/comments         ← post_id 검증
PUT    /posts-db/{post_id}/comments/{id}    ← post_id와 comment 소유권 검증
DELETE /posts-db/{post_id}/comments/{id}    ← post_id와 comment 소유권 검증
```

---

## 14. 프로젝트 구조

```
mysite4/
├── models/
│   ├── __init__.py
│   ├── post.py              # Post 모델 (부모)
│   └── comment.py           # Comment 모델 (자식)
├── schemas/
│   ├── post.py              # PostCreate, PostDetailResponse (댓글 포함)
│   └── comment.py           # CommentCreate, CommentResponse
├── repositories/
│   ├── post_repository.py   # Post CRUD
│   └── comment_repository.py # Comment CRUD
├── services/
│   ├── post_service.py      # Post 비즈니스 로직
│   └── comment_service.py   # Comment 비즈니스 로직 + 소유권 검증
└── routers/
    └── post_router.py       # Post + Comment REST API
```

**계층별 의존성**:

```
Router → Service → Repository → Model
         ↓
       Schema (입출력 검증)
```

---

## 15. 학습 포인트 (Key Takeaways)

### 15.1 1:N 관계 핵심

- **외래키**: Comment 테이블의 `post_id` 컬럼이 Post 테이블의 `id`를 참조
- **relationship**: 양방향 동기화로 한쪽만 설정해도 자동으로 양쪽 반영
- **back_populates**: Post.comments ↔ Comment.post 연결
- **cascade**: 부모 삭제 시 자식도 자동 삭제

### 15.2 SQLAlchemy 활용

- **더티 체킹**: 객체 속성만 변경해도 자동 UPDATE
- **from_attributes=True**: ORM 모델 → Pydantic 자동 변환
- **db.begin()**: 트랜잭션 자동 관리 (커밋/롤백)
- **db.refresh()**: DB의 자동 생성 값을 객체에 반영

### 15.3 설계 원칙

- **RESTful URL**: `/posts/{post_id}/comments/{comment_id}` (중첩 리소스)
- **소유권 검증**: URL의 post_id와 댓글의 실제 post_id 일치 확인
- **계층 분리**: Router(HTTP) → Service(검증) → Repository(DB)
- **책임 분리**: Repository는 판단하지 않고, Service가 비즈니스 판단

### 15.4 트랜잭션 관리

- **with db.begin()**: 성공 시 자동 커밋, 실패 시 자동 롤백
- **원자성 보장**: 트랜잭션 내 모든 작업은 전부 성공하거나 전부 실패
- **db.refresh() 위치**: 트랜잭션 밖에서 호출 (커밋 후 DB 값 반영)

### 15.5 실전 팁

- **relationship 활용**: `post=post`로 설정하면 `post_id` 자동 설정
- **cascade 활용**: 부모 삭제 시 자식 수동 삭제 불필요
- **소유권 검증 필수**: 다른 게시글의 댓글 수정/삭제 방지
