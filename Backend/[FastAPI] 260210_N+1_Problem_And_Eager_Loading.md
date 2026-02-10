# [TIL] FastAPI: N+1 문제 해결 (Lazy Loading vs Eager Loading)

## 1. N+1 문제란?

**N+1 문제**는 ORM 사용 시 발생하는 대표적인 성능 문제로, 연관 데이터를 조회할 때 불필요하게 많은 쿼리가 실행되는 현상을 의미합니다.

### 1. 문제 발생 시나리오

```python
# 게시글 목록 조회 (1개 쿼리)
posts = db.scalars(select(Post)).all()

# 각 게시글의 태그 접근 (N개 쿼리 추가 발생)
for post in posts:
    print(post.tags)  # 각 post마다 태그 조회 쿼리 실행
```

**쿼리 개수:**
- 1개: Post 조회
- N개: 각 Post의 tags 조회
- **총 N+1개 쿼리**

게시글이 100개라면 101개의 쿼리가 실행되어 성능 저하를 일으킵니다.

### 2. 왜 발생하는가?

SQLAlchemy는 기본적으로 **지연 로딩(Lazy Loading)** 전략을 사용합니다. 연관 데이터는 실제로 접근할 때 비로소 조회되기 때문에 반복문에서 각각의 관계 데이터에 접근할 때마다 추가 쿼리가 발생합니다.

---

## 2. Lazy Loading vs Eager Loading

### 1. Lazy Loading (지연 로딩) - 기본 전략

**정의:** 연관 데이터를 실제로 접근하는 시점에 조회하는 방식

```python
post = db.get(Post, 1)  # Post만 조회
print(post.title)       # 쿼리 없음

print(post.tags)        # 이 시점에 tags 조회 쿼리 실행
```

**장점:**
- 불필요한 데이터 조회 방지
- 초기 로딩 속도 빠름

**단점:**
- N+1 문제 발생 위험
- 여러 객체를 순회할 때 성능 저하

### 2. Eager Loading (즉시 로딩)

**정의:** 부모 객체 조회 시 연관 데이터를 미리 함께 조회하는 방식

```python
stmt = select(Post).options(
    selectinload(Post.tags)
)
posts = db.scalars(stmt).all()  # Post와 tags를 한 번에 조회

for post in posts:
    print(post.tags)  # 추가 쿼리 없음
```

**장점:**
- N+1 문제 해결
- 전체적인 쿼리 개수 최소화

**단점:**
- 불필요한 데이터까지 로딩할 수 있음
- JOIN 사용 시 중복 행 발생 가능

---

## 3. Eager Loading 구현 방법

### 1. joinedload - 단일 객체 로딩

**사용 시기:** N:1 관계에서 단일 객체를 로딩할 때

```python
from sqlalchemy.orm import joinedload

# Comment → Post (N:1)
stmt = select(Comment).options(
    joinedload(Comment.post)
)
comments = db.scalars(stmt).all()
```

**실행 쿼리:**
```sql
SELECT 
    comments.id, 
    comments.content, 
    comments.post_id,
    posts.id,
    posts.title,
    posts.content
FROM comments
LEFT OUTER JOIN posts ON posts.id = comments.post_id
```

**특징:**
- 1개의 쿼리로 Comment와 Post를 모두 조회
- LEFT OUTER JOIN 사용
- 단일 객체 관계에서 중복 행 발생하지 않음

### 2. selectinload - 컬렉션 로딩

**사용 시기:** 1:N 또는 M:N 관계에서 리스트(컬렉션)를 로딩할 때

```python
from sqlalchemy.orm import selectinload

# Post → Comments (1:N)
stmt = select(Post).options(
    selectinload(Post.comments)
)
posts = db.scalars(stmt).all()
```

**실행 쿼리:**
```sql
-- 쿼리 1: Post 조회
SELECT posts.id, posts.title, posts.content 
FROM posts

-- 쿼리 2: Comments 일괄 조회
SELECT comments.post_id, comments.id, comments.content  
FROM comments
WHERE comments.post_id IN (1, 2, 3, 4, 5, 6)
```

**특징:**
- 2개의 쿼리로 분리 (메인 쿼리 + IN 절 쿼리)
- JOIN으로 인한 중복 행 발생 방지
- 다수의 관계 데이터를 효율적으로 조회

### 3. joinedload vs selectinload 선택 기준

| 로딩 대상 | 권장 방법 | 이유 |
|-----------|-----------|------|
| **단일 객체** (`post: Mapped["Post"]`) | `joinedload` | JOIN으로 1개 쿼리로 해결, 중복 행 없음 |
| **컬렉션** (`comments: Mapped[list["Comment"]]`) | `selectinload` | JOIN 시 부모 행 중복 방지, IN 절로 일괄 조회 |

**핵심 원칙:**
- **1:N이냐 N:1이냐가 중요한 게 아니라**
- **"단일 객체냐, 리스트냐"가 중요**

```python
# ✅ 올바른 사용
stmt = select(Comment).options(
    joinedload(Comment.post)  # N:1이지만 "단일 객체"라서 JOIN
)

stmt = select(Post).options(
    selectinload(Post.comments)  # 1:N이고 "컬렉션"이라서 SELECT IN
)
```

---

## 4. 실습: N+1 문제 발견 및 해결

### 1. 문제 발견

#### 문제가 있는 코드

```python
# post_repository.py
def find_all(self, db: Session):
    stmt = select(Post)
    return db.scalars(stmt).all()  # Post만 조회
```

```python
# schemas/post.py
class PostListWithTagsResponse(PostListResponse):
    tags: list[TagResponse]  # Tag 관계 데이터 포함
```

**결과:** 
- PostListWithTagsResponse가 tags를 포함하므로 각 Post마다 tags 조회 쿼리 발생
- 게시글 10개 → 11개 쿼리 실행 (1 + 10)

### 2. 해결 - M:N 관계 Eager Loading

```python
# post_repository.py
from sqlalchemy.orm import selectinload, joinedload

def find_all_with_tags(self, db: Session):
    stmt = select(Post).options(
        selectinload(Post.post_tags).joinedload(PostTag.tag)
    )
    return db.scalars(stmt).all()
```

**실행 쿼리:**
```sql
-- 쿼리 1: Post 조회
SELECT posts.id, posts.title, posts.content FROM posts

-- 쿼리 2: PostTags 일괄 조회 + Tag JOIN
SELECT post_tags.post_id, post_tags.id, post_tags.tag_id,
       tags.id, tags.name
FROM post_tags
LEFT OUTER JOIN tags ON tags.id = post_tags.tag_id
WHERE post_tags.post_id IN (1, 2, 3, 4, 5, 6)
```

**결과:**
- 총 2개의 쿼리로 Post, PostTag, Tag 모두 조회
- N+1 문제 해결

### 3. 체이닝을 통한 중첩 관계 로딩

M:N 관계는 중간 테이블을 거쳐야 하므로 **체이닝**이 필요합니다.

```python
# Post → PostTag → Tag 순서로 로딩
selectinload(Post.post_tags).joinedload(PostTag.tag)
```

**단계별 설명:**
1. `selectinload(Post.post_tags)`: Post와 연결된 PostTag들을 IN 절로 조회
2. `.joinedload(PostTag.tag)`: 각 PostTag의 Tag를 JOIN으로 함께 조회

### 4. Service 레이어 수정

```python
# post_service.py
class PostService:
    def read_posts(self, db: Session):
        # N+1 발생 코드
        # return post_repository.find_all(db)
        
        # N+1 해결 코드
        return post_repository.find_all_with_tags(db)
```

---

## 5. JOIN 쿼리 이해하기

### 1. Comment → Post JOIN 결과

**샘플 데이터:**

**posts 테이블:**
| id | title | content |
|----|-------|---------|
| 1 | 첫 게시글 | 안녕하세요 |
| 2 | 두번째 글 | 반갑습니다 |

**comments 테이블:**
| id | content | post_id |
|----|---------|---------|
| 1 | 좋은 글이네요 | 1 |
| 2 | 감사합니다 | 1 |
| 3 | 잘 봤어요 | 2 |

**JOIN 쿼리:**
```sql
SELECT comments.*, posts.*
FROM comments
LEFT OUTER JOIN posts ON posts.id = comments.post_id
```

**결과 테이블:**
| comments.id | comments.content | comments.post_id | posts.id | posts.title | posts.content |
|-------------|------------------|------------------|----------|-------------|---------------|
| 1 | 좋은 글이네요 | 1 | 1 | 첫 게시글 | 안녕하세요 |
| 2 | 감사합니다 | 1 | 1 | 첫 게시글 | 안녕하세요 |
| 3 | 잘 봤어요 | 2 | 2 | 두번째 글 | 반갑습니다 |

**핵심:**
- Post 정보가 반복되어 보이지만 이건 **중복이 아님**
- 각 Comment마다 자신의 Post 정보를 가진 것
- Comment가 주체이므로 **Comment 행 수만큼만 결과 반환**

### 2. Post → Comments JOIN의 문제점

**반대로 Post → Comments를 JOIN하면:**
```sql
SELECT posts.*, comments.*
FROM posts
LEFT JOIN comments ON comments.post_id = posts.id
```

**결과:**
| posts.id | posts.title | comments.id | comments.content |
|----------|-------------|-------------|------------------|
| 1 | 첫 게시글 | 1 | 좋은 글이네요 |
| 1 | 첫 게시글 | 2 | 감사합니다 |

**문제:**
- Post(id=1)이 2번 중복 출력됨
- Comment 개수만큼 Post 행이 증가
- **이래서 1:N 관계는 selectinload를 사용**

---

## 6. N+1 문제 체크리스트

### 1. 문제 발생 조건

Response 스키마가 관계 데이터를 포함하는지 확인:

```python
# N+1 발생
class PostListResponse(BaseModel):
    id: int
    title: str
    tags: list[TagResponse]  # 관계 데이터 포함
    comments: list[CommentResponse]  # 관계 데이터 포함

# 문제 없음
class PostListResponse(BaseModel):
    id: int
    title: str  # 자체 컬럼만 사용
```

### 2. 해결 여부 확인

Repository에서 Eager Loading을 사용했는지 확인:

```python
# N+1 발생
def find_all(self, db: Session):
    return db.scalars(select(Post)).all()

# 해결
def find_all(self, db: Session):
    stmt = select(Post).options(
        selectinload(Post.comments),
        selectinload(Post.post_tags).joinedload(PostTag.tag)
    )
    return db.scalars(stmt).all()
```

### 3. 실전 점검 항목

| 항목 | 확인 사항 |
|------|----------|
| **Schema** | Response에 관계 데이터(list, 객체) 포함? |
| **Repository** | `options()`로 Eager Loading 설정? |
| **Relationship** | 단일 객체? → `joinedload` / 리스트? → `selectinload` |

---

## 7. 핵심 개념 정리

### 1. N+1 문제

| 항목 | 내용 |
|------|------|
| **정의** | 1개 조회 쿼리 + N개 연관 데이터 쿼리 = 총 N+1개 |
| **원인** | Lazy Loading + 반복문에서 관계 데이터 접근 |
| **해결** | Eager Loading (joinedload, selectinload) |

### 2. Loading 전략 비교

| 전략 | 시점 | 장점 | 단점 |
|------|------|------|------|
| **Lazy Loading** | 접근 시점 | 불필요한 로딩 방지 | N+1 문제 발생 |
| **Eager Loading** | 조회 시점 | N+1 해결, 쿼리 최소화 | 불필요한 데이터 로딩 가능 |

### 3. Eager Loading 메서드

| 메서드 | 사용 대상 | 쿼리 방식 | 특징 |
|--------|-----------|-----------|------|
| `joinedload` | 단일 객체 | LEFT OUTER JOIN | 1개 쿼리, 중복 없음 |
| `selectinload` | 컬렉션 (list) | SELECT ... IN | 2개 쿼리, 중복 방지 |

### 4. 관계 유형별 권장 방법

```python
# N:1 (단일 객체)
joinedload(Comment.post)

# 1:N (컬렉션)
selectinload(Post.comments)

# M:N (컬렉션, 중간 테이블 거침)
selectinload(Post.post_tags).joinedload(PostTag.tag)
```

---

## 8. 학습 포인트 (Key Takeaways)

### 1. N+1 문제 인식

- ORM 사용 시 항상 발생 가능한 성능 이슈
- 개발 단계에서 SQL 로그를 확인하여 조기 발견
- Response 스키마에 관계 데이터가 포함되면 의심

### 2. 적절한 Loading 전략 선택

- **기본은 Lazy Loading**: 필요한 곳에만 Eager Loading 적용
- 단일 객체 → `joinedload`
- 컬렉션 → `selectinload`
- 중첩 관계 → 체이닝 (`.joinedload()` 연결)

### 3. 성능 최적화

- 불필요한 Eager Loading은 오히려 성능 저하
- 실제 사용하는 관계만 로딩
- 상황에 따라 별도 Repository 메서드 분리 (`find_all` vs `find_all_with_tags`)

### 4. 계층별 책임

- **Repository**: 데이터 조회 전략 결정 (Eager Loading 설정)
- **Service**: Repository 메서드 선택 (상황에 맞는 메서드 호출)
- **Schema**: 응답 데이터 형식 정의 (관계 데이터 포함 여부)

### 5. 디버깅 팁

```python
# SQLAlchemy 로그 활성화
import logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

실행되는 쿼리를 확인하여 N+1 문제 발견 및 검증 가능

---

## 9. 실무 적용 예시

### 1. 상황별 전략

#### Case 1: 목록 조회 (간단)
```python
# tags 없이 title만 보여주는 목록
class PostListResponse(BaseModel):
    id: int
    title: str

# Repository: Eager Loading 불필요
def find_all(self, db: Session):
    return db.scalars(select(Post)).all()
```

#### Case 2: 목록 조회 (상세)
```python
# tags 포함 목록
class PostListWithTagsResponse(BaseModel):
    id: int
    title: str
    tags: list[TagResponse]

# Repository: Eager Loading 필수
def find_all_with_tags(self, db: Session):
    stmt = select(Post).options(
        selectinload(Post.post_tags).joinedload(PostTag.tag)
    )
    return db.scalars(stmt).all()
```

#### Case 3: 상세 조회
```python
# 댓글, 태그 모두 포함
class PostDetailResponse(BaseModel):
    id: int
    title: str
    content: str
    comments: list[CommentResponse]
    tags: list[TagResponse]

# Repository: 모든 관계 Eager Loading
def find_by_id_with_details(self, db: Session, id: int):
    stmt = select(Post).options(
        selectinload(Post.comments),
        selectinload(Post.post_tags).joinedload(PostTag.tag)
    ).where(Post.id == id)
    return db.scalar(stmt)
```

### 2. 코드 개선 Before/After

**Before (N+1 발생):**
```python
# Repository
def find_all(self, db: Session):
    stmt = select(Post)
    return db.scalars(stmt).all()

# 실행 쿼리: 11개 (게시글 10개 가정)
# 1개: SELECT * FROM posts
# 10개: SELECT * FROM post_tags WHERE post_id = ?
```

**After (해결):**
```python
# Repository
def find_all_with_tags(self, db: Session):
    stmt = select(Post).options(
        selectinload(Post.post_tags).joinedload(PostTag.tag)
    )
    return db.scalars(stmt).all()

# 실행 쿼리: 2개
# 1개: SELECT * FROM posts
# 1개: SELECT * FROM post_tags JOIN tags WHERE post_id IN (...)
```

**성능 개선:**
- 쿼리 개수: 11개 → 2개 (약 82% 감소)
- 응답 시간: 대폭 단축
- DB 부하: 최소화

---

## 10. 정리

### 1. 오늘의 학습 흐름

```
N+1 문제 발견 
  → Lazy Loading 이해 
  → Eager Loading 학습 
  → joinedload vs selectinload 
  → 실습 코드 적용 
  → 성능 개선 확인
```

### 2. 핵심 기억 사항

1. **N+1 문제는 ORM의 대표적인 성능 이슈**
2. **Response 스키마에 관계 데이터가 있으면 의심**
3. **단일 객체는 joinedload, 컬렉션은 selectinload**
4. **실제 사용하는 관계만 Eager Loading**
5. **SQL 로그로 쿼리 개수 확인 필수**