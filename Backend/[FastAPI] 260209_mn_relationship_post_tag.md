# [TIL] FastAPI: M:N 관계 구현 (Post-Tag 연관 모델)

## 1. M:N 관계란?

**M:N(Many-to-Many) 관계**는 두 엔티티가 서로 여러 개의 관계를 맺을 수 있는 구조를 의미합니다. 예를 들어 하나의 게시글(Post)은 여러 개의 태그(Tag)를 가질 수 있고, 하나의 태그는 여러 게시글에 사용될 수 있습니다.

관계형 데이터베이스에서는 M:N 관계를 직접 형성할 수 없기 때문에 **중간 테이블(연관 테이블)**이 반드시 필요합니다.

### 1.1 M:N 관계 구현 방식

SQLAlchemy에서 M:N 관계를 구현하는 방법은 크게 두 가지입니다.

#### (1) Table() 객체를 활용한 단순 M:N

`Table()` 함수를 사용하면 클래스를 정의하지 않고도 중간 테이블을 만들 수 있습니다.

```python
post_tag = Table(
    "post_tag",
    Base.metadata,
    Column("post_id", ForeignKey("posts.id"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id"), primary_key=True),
)
```

**사용을 지양하는 이유:**
- 컬럼 확장 불가: 등록 시각, 등록 사용자 등 추가 정보를 넣을 수 없음
- 비즈니스 로직 부재: 파이썬 클래스가 아니므로 메서드 추가 불가능
- 쿼리 제어 어려움: 중간 테이블이 숨겨져 있어 복잡한 조회 시 불투명

#### (2) 연결 모델 (Association Model) ✅ 권장

중간 테이블을 독립된 엔티티로 작성하는 방식입니다. 일반 1:N 관계처럼 작성할 수 있어 확장성이 뛰어납니다.

```
Post (1) ←→ (N) PostTag (N) ←→ (1) Tag
```

---

## 2. 실습: Post-Tag M:N 관계 구현

### 2.1 Tag 모델 정의

```python
# models/tag.py
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    post_tags: Mapped[list["PostTag"]] = relationship(back_populates="tag")
```

**핵심 포인트:**
- `unique=True`: 태그 이름 중복 방지
- `post_tags`: PostTag와의 1:N 관계 정의

### 2.2 PostTag 연결 모델 정의

```python
# models/post_tag.py
from datetime import datetime
from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class PostTag(Base):
    __tablename__ = "post_tags"
    id: Mapped[int] = mapped_column(primary_key=True)
    
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id"))
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"))

    # 확장 데이터: 등록일 추가
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    post: Mapped["Post"] = relationship(back_populates="post_tags")
    tag: Mapped["Tag"] = relationship(back_populates="post_tags")
```

**핵심 포인트:**
- 독립된 `id` 사용 (또는 `post_id`, `tag_id` 복합키 사용 가능)
- `created_at`: 연결 모델의 장점 - 추가 컬럼 자유롭게 확장 가능
- `server_default=func.now()`: DB 레벨에서 기본값 설정

### 2.3 Post 모델 수정 - Association Proxy 활용

```python
# models/post.py
from sqlalchemy.ext.associationproxy import association_proxy, AssociationProxy

class Post(Base):
    __tablename__ = "posts"
    
    # ... 기존 컬럼 생략

    post_tags: Mapped[list["PostTag"]] = relationship(
        back_populates="post", cascade="all, delete-orphan"
    )
    
    # Association Proxy: post.tags로 Tag 객체에 직접 접근 가능
    tags: AssociationProxy[list["Tag"]] = association_proxy("post_tags", "tag")
```

**Association Proxy의 역할:**
- `post.post_tags[0].tag` 대신 `post.tags[0]`로 간편하게 접근
- 중간 테이블을 거치지 않고 논리적으로 직접 연결된 것처럼 사용

---

## 3. Tag CRUD 구현

### 3.1 Tag Repository

```python
# repositories/tag_repository.py
from sqlalchemy import select
from sqlalchemy.orm import Session
from mysite4.models.tag import Tag

class TagRepository:
    def save(self, db: Session, tag: Tag):
        db.add(tag)
        return tag

    def find_all(self, db: Session):
        return db.scalars(select(Tag)).all()

    def find_by_name(self, db: Session, name: str):
        return db.scalar(select(Tag).where(Tag.name == name))
```

**핵심 포인트:**
- `scalar()`: 단일 결과 조회 (없으면 None 반환)
- `scalars().all()`: 여러 객체 리스트 조회

### 3.2 Tag Service - 중복 검증 로직

```python
# services/tag_service.py
from sqlalchemy.orm import Session
from fastapi import HTTPException
from mysite4.models.tag import Tag
from mysite4.schemas.tag import TagCreate

class TagService:
    def create_tag(self, db: Session, data: TagCreate):
        with db.begin():
            # 1. 중복 확인
            existing_tag = tag_repository.find_by_name(db, data.name)
            if existing_tag:
                raise HTTPException(status_code=400, detail="이미 존재하는 태그 이름입니다.")

            # 2. 태그 생성 및 저장
            new_tag = Tag(name=data.name)
            tag_repository.save(db, new_tag)

        db.refresh(new_tag)
        return new_tag
```

**핵심 포인트:**
- `with db.begin()`: 트랜잭션 자동 관리 (성공 시 commit, 실패 시 rollback)
- 중복 검증은 Service 계층의 비즈니스 로직

---

## 4. PostTag 연결 구현

### 4.1 PostTag Repository

```python
# repositories/post_tag_repository.py
from sqlalchemy import select
from sqlalchemy.orm import Session
from mysite4.models.post_tag import PostTag

class PostTagRepository:
    def save(self, db: Session, post_tag: PostTag):
        db.add(post_tag)
        return post_tag

    def exists(self, db: Session, post_id: int, tag_id: int):
        stmt = select(PostTag).where(
            PostTag.post_id == post_id, PostTag.tag_id == tag_id
        )
        return db.scalar(stmt) is not None
```

**핵심 포인트:**
- `exists()`: 중복 연결 방지를 위한 검증 메서드

### 4.2 기존 게시글에 태그 추가 - Service

```python
# services/post_service.py
def add_tag_to_post(self, db: Session, post_id: int, tag_name: str):
    with db.begin():
        # 1. 대상 게시글 조회
        post = self.read_post_by_id(db, post_id)

        # 2. 태그 조회 (없으면 생성)
        tag = tag_repository.find_by_name(db, tag_name)
        if not tag:
            tag = tag_repository.save(db, Tag(name=tag_name))
            db.flush()  # ID 확보를 위해 flush 호출

        # 3. 중복 연결 확인
        if post_tag_repository.exists(db, post.id, tag.id):
            raise HTTPException(status_code=400, detail="이미 등록된 태그입니다.")

        # 4. 연결 객체 생성 및 저장
        new_link = PostTag(post=post, tag=tag)
        post_tag_repository.save(db, new_link)

    return post
```

**핵심 포인트:**
- `db.flush()`: commit 없이 DB로 데이터 전달하여 ID 확보 (트랜잭션은 유지)
- **OrElseGet 패턴**: 태그가 없으면 생성, 있으면 기존 것 사용

### 4.3 Router 구현

```python
# routers/post_router.py
@router.post("/{post_id}/tags/{tag_name}", status_code=status.HTTP_201_CREATED)
def add_tag_to_post(post_id: int, tag_name: str, db: Session = Depends(get_db)):
    post_service.add_tag_to_post(db, post_id, tag_name)
    return {"message": f"Successfully added tag '{tag_name}' to post {post_id}"}
```

---

## 5. 태그와 함께 게시글 생성

### 5.1 스키마 정의

```python
# schemas/post.py
class PostCreateWithTags(PostCreate):
    tags: list[str] = []  # ["Python", "FastAPI"] 형태
```

### 5.2 Service - Cascade 활용

```python
# services/post_service.py
def create_post_with_tags(self, db: Session, data: PostCreateWithTags):
    new_post = Post(title=data.title, content=data.content)

    with db.begin():
        for name in data.tags:
            # 기존 태그 검색
            tag = tag_repository.find_by_name(db, name)
            
            # 없으면 생성
            if not tag:
                tag = Tag(name=name)
                tag_repository.save(db, tag)
                db.flush()

            # 연결 모델 생성 및 추가
            post_tag_link = PostTag(post=new_post, tag=tag)
            new_post.post_tags.append(post_tag_link)

        # 게시글 저장 (Cascade 덕분에 PostTag도 함께 저장됨)
        post_repository.save(db, new_post)

    db.refresh(new_post)
    return new_post
```

**핵심 포인트:**
- `cascade="all, delete-orphan"` 덕분에 `post.post_tags.append()`만으로 연결 저장
- `post_tag_repository.save()` 없이도 자동 저장됨
- Association Proxy 사용 시: `new_post.tags.append(tag)` 가능 (추가 컬럼 없을 때)

---

## 6. 태그 삭제

### 6.1 Service - Association Proxy 활용 삭제

```python
# services/post_service.py
def remove_tag_from_post(self, db: Session, post_id: int, tag_name: str):
    with db.begin():
        # 1. 게시글 조회
        post = post_repository.find_by_id(db, post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        # 2. 태그 조회
        tag = tag_repository.find_by_name(db, tag_name)
        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        # 3. 관계 존재 확인 및 삭제
        if tag not in post.tags:
            raise HTTPException(status_code=400, detail="태그가 연결되어 있지 않습니다.")
        
        # Association Proxy를 통해 삭제
        # delete-orphan 설정 덕분에 PostTag 레코드가 DB에서 실제로 삭제됨
        post.tags.remove(tag)
    
    return {"message": f"Tag '{tag_name}' removed from post {post_id}"}
```

**핵심 포인트:**
- `post.tags.remove(tag)`: Association Proxy를 통한 간편한 삭제
- `cascade="all, delete-orphan"` 설정으로 PostTag 레코드 자동 삭제
- 리스트에서 제거만 해도 DB에서 완전히 삭제됨 (고아 객체 제거)

### 6.2 대안: 명시적 PostTag 삭제

```python
# repositories/post_tag_repository.py
def find_link(self, db: Session, post_id: int, tag_id: int):
    return db.scalar(
        select(PostTag).where(PostTag.post_id == post_id, PostTag.tag_id == tag_id)
    )

# services/post_service.py
def remove_tag_link(self, db: Session, post_id: int, tag_id: int):
    link = post_tag_repository.find_link(db, post_id, tag_id)
    
    if link:
        with db.begin():
            db.delete(link)  # 중간 테이블 레코드 직접 삭제
```

### 6.3 태그 전체 갈아끼우기

```python
def update_post_tags(self, db: Session, post: Post, new_tags: list[Tag]):
    # 기존 리스트를 새 리스트로 교체
    # delete-orphan 설정으로 기존 PostTag들 자동 삭제
    post.tags = new_tags
    db.commit()
```

---

## 7. 조회 시 연관 데이터 포함

### 7.1 스키마 수정

```python
# schemas/post.py
from mysite4.schemas.tag import TagResponse

class PostDetailResponse(BaseModel):
    id: int
    title: str
    content: str
    
    comments: list[CommentResponse] = []
    tags: list[TagResponse] = []  # Association Proxy 'tags' 활용

    model_config = ConfigDict(from_attributes=True)
```

**핵심 포인트:**
- `from_attributes=True`: SQLAlchemy 모델 → Pydantic 자동 변환
- `post.tags`가 Association Proxy이므로 Tag 객체 리스트 자동 매핑

---

## 8. 핵심 개념 정리

### 8.1 db.flush() vs db.commit()

| 메서드 | 역할 | 트랜잭션 상태 |
|--------|------|--------------|
| `db.flush()` | 세션 → DB 전달 (ID 확보) | 유지 (미확정) |
| `db.commit()` | 트랜잭션 최종 확정 | 종료 (확정) |

**사용 예:**
```python
tag = Tag(name=name)
db.add(tag)
db.flush()  # tag.id가 할당됨 (아직 commit 전)
print(tag.id)  # 사용 가능
# ... 추가 작업
db.commit()  # 최종 확정
```

### 8.2 Cascade 옵션

```python
post_tags: Mapped[list["PostTag"]] = relationship(
    back_populates="post", 
    cascade="all, delete-orphan"
)
```

| 옵션 | 설명 |
|------|------|
| `all` | 부모 저장/삭제 시 자식도 함께 처리 |
| `delete-orphan` | 관계가 끊어진 자식 객체 자동 삭제 |

**효과:**
- `post.post_tags.append(post_tag)` → PostTag 자동 저장
- `post.tags.remove(tag)` → PostTag 자동 삭제
- `db.delete(post)` → 연결된 모든 PostTag 자동 삭제

### 8.3 Association Proxy의 장점

**Without Association Proxy:**
```python
for pt in post.post_tags:
    print(pt.tag.name)  # 2단계 접근
```

**With Association Proxy:**
```python
for tag in post.tags:
    print(tag.name)  # 1단계 직접 접근
```

**제약사항:**
- 추가 컬럼이 있는 경우 명시적 PostTag 생성 필요
- 예: 사용자가 입력한 `priority` 등의 정보가 있다면 `PostTag(post=post, tag=tag, priority=5)` 형태로 명시

---

## 9. 학습 포인트 (Key Takeaways)

### 9.1 M:N 관계 구현
- 관계형 DB에서는 중간 테이블 필수
- **연결 모델** 방식이 확장성과 유지보수성 우수
- PostTag 같은 연결 모델에 추가 컬럼 자유롭게 확장 가능

### 9.2 데이터베이스 작업
- `db.flush()`: ID 확보용 (트랜잭션 유지)
- `db.commit()`: 최종 확정
- `with db.begin()`: 자동 트랜잭션 관리

### 9.3 SQLAlchemy 고급 기능
- **Association Proxy**: 중간 테이블을 건너뛴 논리적 접근
- **Cascade**: 부모-자식 간 자동 영속성 전이
- `delete-orphan`: 관계 끊어진 객체 자동 정리

### 9.4 비즈니스 로직 패턴
- **OrElseGet**: 없으면 생성, 있으면 조회 (find or create)
- 중복 검증: Service 계층에서 처리
- Repository는 순수 데이터 접근만 담당

### 9.5 계층별 책임
- **Repository**: 데이터 CRUD, 존재 여부 확인
- **Service**: 비즈니스 로직, 트랜잭션 관리, 예외 처리
- **Router**: HTTP 요청/응답 매핑
- **Schema**: API 데이터 형식 정의 및 검증

### 9.6 실무 적용
- M:N 관계는 연결 모델로 구현하여 확장성 확보
- Association Proxy로 코드 간결성 향상
- Cascade 옵션으로 연관 객체 관리 자동화
- flush()를 활용한 ID 확보 후 추가 로직 처리

---

## 10. 데이터 흐름 요약

### 10.1 태그와 함께 게시글 생성
```
Client (JSON) 
  → Schema (PostCreateWithTags) 
  → Service (태그 검색/생성 + PostTag 연결) 
  → Model (Post, Tag, PostTag) 
  → Database (저장)
  → refresh() 
  → Schema (PostDetailResponse) 
  → Client (JSON)
```

### 10.2 기존 게시글에 태그 추가
```
Client (post_id, tag_name) 
  → Service (게시글 조회 + 태그 find or create + 중복 검증) 
  → PostTag 생성 
  → Database (저장) 
  → Client (성공 메시지)
```

### 10.3 태그 삭제
```
Client (post_id, tag_name) 
  → Service (post.tags.remove(tag)) 
  → Cascade (PostTag 자동 삭제) 
  → Database (delete) 
  → Client (성공 메시지)
```