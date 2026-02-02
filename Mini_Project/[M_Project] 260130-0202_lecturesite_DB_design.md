# 인터넷 강의 사이트 데이터베이스 설계 TIL

**Date**: 2026.01.30 ~ 2026.02.02
**Project**: 온라인 강의 플랫폼 데이터베이스 설계

---

## 프로젝트 개요

인터넷 강의 사이트(온라인 학습 플랫폼)에 필요한 데이터베이스를 설계하고, RESTful API 엔드포인트를 정의하는 미니 프로젝트를 진행했다.

### 주요 기능
- 강좌 및 강의 관리
- 강사 정보 및 수강평
- 수강 신청 및 수강 관리
- 커뮤니티 (게시판, 댓글)
- 마이페이지 (수강 중인 강좌, 관심 강좌/강사)
- 통합 검색

---

## ERD 설계

### 주요 테이블

- **강사 (Instructor)**: 강사 정보 관리
- **강좌 (Course)**: 강좌 정보 및 강사 연결
- **강의 (Lecture)**: 강좌 내 개별 강의
- **수강생 (Student)**: 수강생 정보
- **수강 (Enrollment)**: 수강생-강좌 수강 관계
- **게시판 (Freeboard)**: 자유 게시판
- **댓글 (Comment)**: 게시글 댓글
- **수강평 (Review)**: 강좌 리뷰
- **관심 강좌 (Favorite Course)**: 찜한 강좌
- **관심 강사 (Favorite Instructor)**: 팔로우한 강사
- **결제 정보 (Payment)**: 결제 내역

### 주요 관계

- 강사 ↔ 강좌: 1:N
- 강좌 ↔ 강의: 1:N
- 수강생 ↔ 수강 ↔ 강좌: N:M (수강 테이블로 연결)
- 게시판 ↔ 댓글: 1:N
- 강좌 ↔ 수강평: 1:N
- 수강생 ↔ 관심 강좌: N:M
- 수강생 ↔ 관심 강사: N:M

---

## RESTful API 설계

### 1. 강좌 관련 API

| Method | URL | 기능 | 응답 예시 |
|--------|-----|------|-----------|
| GET | `/courses` | 강좌 목록 조회 | 전체 강좌 목록 |
| GET | `/courses/{id}/lectures` | 강의 목록 & 강좌 상세 | 특정 강좌의 강의 목록 |
| GET | `/courses?sort=popular&limit=4` | 인기 강좌 일부 | 인기순 강좌 4개 |

**강좌 목록 응답 예시:**
```json
[
  {
    "courseId": 100,
    "courseName": "수능 국어 문학 올인원",
    "description": "현대시부터 고전소설까지 완벽 분석",
    "startDate": "2026-01-10",
    "endDate": "2026-06-30",
    "instructor": {
      "instructorId": 1,
      "name": "김국어",
      "subject": "국어"
    }
  }
]
```

### 2. 강사 관련 API

| Method | URL | 기능 |
|--------|-----|------|
| GET | `/instructors` | 강사진 목록 조회 |
| GET | `/instructors/{id}/courses` | 특정 강사의 강좌 목록 |
| GET | `/instructors/{id}/reviews` | 특정 강사의 수강평 모음 |
| GET | `/instructors?sort=recommend&limit=3` | 강사 목록 일부 |

**강사 목록 응답 예시:**
```json
[
  {
    "instructorId": 1,
    "name": "김국어",
    "gender": "여성",
    "subject": "국어"
  }
]
```

### 3. 게시판 관련 API

| Method | URL | 기능 |
|--------|-----|------|
| GET | `/freeboard` | 게시글 목록 조회 |
| GET | `/freeboard/{id}/comment` | 게시글 상세 & 댓글 조회 |

**게시글 상세 응답 예시:**
```json
{
  "post": {
    "postId": 10,
    "author": "열공러",
    "content": "고전 시가 해석이 너무 어려워요. 팁 좀 주세요.",
    "createdAt": "2026-01-30 14:00:00"
  },
  "comments": [
    {
      "commentId": 55,
      "author": "김국어",
      "content": "제 강의 3강을 참고해보세요!",
      "createdAt": "2026-01-30 15:00:00"
    }
  ]
}
```

### 4. 검색 API

| Method | URL | 기능 |
|--------|-----|------|
| GET | `/search?keyword=국어` | 통합 검색 (강사, 강좌) |

**검색 결과 응답 예시:**
```json
{
  "keyword": "국어",
  "instructors": [
    {
      "instructorId": 1,
      "name": "김국어",
      "subject": "국어"
    }
  ],
  "courses": [
    {
      "courseId": 100,
      "courseName": "수능 국어 문학 올인원",
      "instructorName": "김국어"
    }
  ]
}
```

### 5. 마이페이지 API

| Method | URL | 기능 |
|--------|-----|------|
| GET | `/me/courses/enroll` | 내가 신청한 강좌 목록 |
| GET | `/me/courses/favorite` | 관심 강좌 (찜) 목록 |
| GET | `/me/instructors/favorite` | 관심 강사 (팔로우) 목록 |
| GET | `/me/freeboard` | 내가 쓴 글 목록 |
| GET | `/me/comment` | 내가 쓴 댓글 목록 |

**수강 중인 강좌 응답 예시:**
```json
[
  {
    "enrollmentId": 1234,
    "enrolledAt": "2026-01-20",
    "course": {
      "courseId": 100,
      "courseName": "수능 국어 문학 올인원",
      "instructorName": "김국어"
    }
  }
]
```

### 6. 메인페이지 API

| Method | URL | 기능 |
|--------|-----|------|
| GET | `/main/instructors` | 강사 목록으로 이동 |
| GET | `/main/courses` | 강좌 목록으로 이동 |
| GET | `/main/search` | 검색창 |
| GET | `/main/me` | 마이페이지 |

---

## 설계 시 고민했던 점

### 1. **리소스 중심 URL 설계**
- RESTful 원칙에 따라 명사형 리소스를 URL에 사용
- 계층 구조를 명확히 표현 (예: `/courses/{id}/lectures`)
- 동사 대신 HTTP 메서드로 행위를 표현

### 2. **중첩 리소스 vs 쿼리 파라미터**
- 특정 강사의 강좌: `/instructors/{id}/courses` 
- 강좌 상태 필터링: `/instructors/{id}/courses?status=ongoing` 
- 계층 관계가 명확한 경우 중첩 리소스 사용
- 필터링/정렬은 쿼리 파라미터 활용

### 3. **마이페이지 리소스 네이밍**
- `/me`를 사용하여 현재 로그인한 사용자의 리소스 표현
- 수강생ID를 URL에 노출하지 않아 보안성 향상
- 직관적이고 일관성 있는 API 구조

### 4. **통합 검색 설계**
- 여러 리소스(강사, 강좌)를 한 번에 검색
- `/search?keyword=국어` 형태로 단일 엔드포인트 제공
- 응답에서 검색 결과를 카테고리별로 분류

### 5. **N:M 관계 처리**
- 수강생 ↔ 강좌: `수강(Enrollment)` 테이블로 연결
- 수강생 ↔ 관심 강좌: `관심 강좌(Favorite Course)` 테이블로 연결
- 수강생 ↔ 관심 강사: `관심 강사(Favorite Instructor)` 테이블로 연결
- 중간 테이블에 추가 정보(신청일, 등록일 등) 저장

---

## 배운 점

### RESTful API 설계 원칙
1. **리소스 중심 사고**: URL은 동사가 아닌 명사로 구성
2. **HTTP 메서드 활용**: GET, POST, PUT, DELETE로 행위 표현
3. **계층 구조 표현**: 슬래시(/)로 리소스 간 관계 명확히
4. **일관성 유지**: 복수형 명사 사용 (`/courses`, `/instructors`)

### 데이터베이스 설계
1. **정규화**: 데이터 중복을 최소화하고 테이블 분리
2. **외래키 관계**: 테이블 간 참조 무결성 보장
3. **N:M 관계**: 중간 테이블을 통한 다대다 관계 해결
4. **NULL 허용 여부**: 비즈니스 로직에 따른 제약 조건 설정

### JSON 응답 설계
1. **중첩 구조**: 관련 데이터를 그룹화하여 가독성 향상
2. **일관된 키 이름**: 한글/영문 혼용 시 일관성 유지 필요
3. **필요한 데이터만**: 각 화면에 필요한 최소한의 데이터만 반환

---

## 다음 단계

### SQL 쿼리 작성
- 각 API 엔드포인트에 대응하는 SQL SELECT 문 작성
- JOIN을 활용한 효율적인 데이터 조회
- 인덱스 설계를 고려한 쿼리 최적화
---

## 회고
인터넷 강의 사이트의 데이터베이스 설계와 RESTful API 엔드포인트를 정의했다. 

ERD를 설계하면서 엔티티 간의 관계를 명확히 하는 것이 얼마나 중요한지 깨달았다. 특히 N:M 관계를 중간 테이블로 풀어내는 과정에서 수강, 관심 강좌, 관심 강사 등의 테이블이 필요하다는 것을 알게 되었다.

RESTful API를 설계하면서는 리소스 중심의 URL 설계가 얼마나 직관적인지 느꼈다. `/me`라는 엔드포인트를 사용해 현재 사용자의 리소스를 표현하는 방식이 특히 인상적이었다.

다음 단계로 SQL 쿼리를 작성하면서 실제로 이 설계가 효율적으로 동작하는지 검증해볼 예정이다. 설계한 구조가 실제 쿼리로 구현되는 과정을 통해 더 깊이 이해할 수 있을 것 같다.


---

## ERD 다이어그램

![ERD](https://github.com/user-attachments/assets/0321ae41-7bf3-4ed0-9c41-fe6f89e76af4)


# 인터넷 강의 사이트 데이터베이스 설계 TIL

**Date**: 2026.01.30 ~ 2026.02.02  
**Project**: 온라인 강의 플랫폼 데이터베이스 설계

---

## 프로젝트 개요

인터넷 강의 사이트(온라인 학습 플랫폼)에 필요한 데이터베이스를 설계하고, RESTful API 엔드포인트를 정의하는 미니 프로젝트를 진행했다.

### 주요 기능
- 강좌 및 강의 관리
- 강사 정보 및 수강평
- 수강 신청 및 수강 관리
- 커뮤니티 (게시판, 댓글)
- 마이페이지 (수강 중인 강좌, 관심 강좌/강사)
- 통합 검색

---

## ERD 설계

### 주요 테이블

- **강사 (Instructor)**: 강사 정보 관리
- **강좌 (Course)**: 강좌 정보 및 강사 연결
- **강의 (Lecture)**: 강좌 내 개별 강의
- **수강생 (Student)**: 수강생 정보
- **수강 (Enrollment)**: 수강생-강좌 수강 관계
- **게시판 (Freeboard)**: 자유 게시판
- **댓글 (Comment)**: 게시글 댓글
- **수강평 (Review)**: 강좌 리뷰
- **관심 강좌 (Favorite Course)**: 찜한 강좌
- **관심 강사 (Favorite Instructor)**: 팔로우한 강사
- **결제 정보 (Payment)**: 결제 내역

### 주요 관계

- 강사 ↔ 강좌: 1:N
- 강좌 ↔ 강의: 1:N
- 수강생 ↔ 수강 ↔ 강좌: N:M (수강 테이블로 연결)
- 게시판 ↔ 댓글: 1:N
- 강좌 ↔ 수강평: 1:N
- 수강생 ↔ 관심 강좌: N:M
- 수강생 ↔ 관심 강사: N:M

---

## RESTful API 설계

### 1. 강좌 관련 API

| Method | URL | 기능 | 응답 예시 |
|--------|-----|------|-----------|
| GET | `/courses` | 강좌 목록 조회 | 전체 강좌 목록 |
| GET | `/courses/{id}/lectures` | 강의 목록 & 강좌 상세 | 특정 강좌의 강의 목록 |
| GET | `/courses?sort=popular&limit=4` | 인기 강좌 일부 | 인기순 강좌 4개 |

**강좌 목록 응답 예시:**
```json
[
  {
    "courseId": 100,
    "courseName": "수능 국어 문학 올인원",
    "description": "현대시부터 고전소설까지 완벽 분석",
    "startDate": "2026-01-10",
    "endDate": "2026-06-30",
    "instructor": {
      "instructorId": 1,
      "name": "김국어",
      "subject": "국어"
    }
  }
]
```

### 2. 강사 관련 API

| Method | URL | 기능 |
|--------|-----|------|
| GET | `/instructors` | 강사진 목록 조회 |
| GET | `/instructors/{id}/courses` | 특정 강사의 강좌 목록 |
| GET | `/instructors/{id}/reviews` | 특정 강사의 수강평 모음 |
| GET | `/instructors?sort=recommend&limit=3` | 강사 목록 일부 |

**강사 목록 응답 예시:**
```json
[
  {
    "instructorId": 1,
    "name": "김국어",
    "gender": "여성",
    "subject": "국어"
  }
]
```

### 3. 게시판 관련 API

| Method | URL | 기능 |
|--------|-----|------|
| GET | `/freeboard` | 게시글 목록 조회 |
| GET | `/freeboard/{id}/comment` | 게시글 상세 & 댓글 조회 |

**게시글 상세 응답 예시:**
```json
{
  "post": {
    "postId": 10,
    "author": "열공러",
    "content": "고전 시가 해석이 너무 어려워요. 팁 좀 주세요.",
    "createdAt": "2026-01-30 14:00:00"
  },
  "comments": [
    {
      "commentId": 55,
      "author": "김국어",
      "content": "제 강의 3강을 참고해보세요!",
      "createdAt": "2026-01-30 15:00:00"
    }
  ]
}
```

### 4. 검색 API

| Method | URL | 기능 |
|--------|-----|------|
| GET | `/search?keyword=국어` | 통합 검색 (강사, 강좌) |

**검색 결과 응답 예시:**
```json
{
  "keyword": "국어",
  "instructors": [
    {
      "instructorId": 1,
      "name": "김국어",
      "subject": "국어"
    }
  ],
  "courses": [
    {
      "courseId": 100,
      "courseName": "수능 국어 문학 올인원",
      "instructorName": "김국어"
    }
  ]
}
```

### 5. 마이페이지 API

| Method | URL | 기능 |
|--------|-----|------|
| GET | `/me/courses/enroll` | 내가 신청한 강좌 목록 |
| GET | `/me/courses/favorite` | 관심 강좌 (찜) 목록 |
| GET | `/me/instructors/favorite` | 관심 강사 (팔로우) 목록 |
| GET | `/me/freeboard` | 내가 쓴 글 목록 |
| GET | `/me/comment` | 내가 쓴 댓글 목록 |

**수강 중인 강좌 응답 예시:**
```json
[
  {
    "enrollmentId": 1234,
    "enrolledAt": "2026-01-20",
    "course": {
      "courseId": 100,
      "courseName": "수능 국어 문학 올인원",
      "instructorName": "김국어"
    }
  }
]
```

### 6. 메인페이지 API

| Method | URL | 기능 |
|--------|-----|------|
| GET | `/main/instructors` | 강사 목록으로 이동 |
| GET | `/main/courses` | 강좌 목록으로 이동 |
| GET | `/main/search` | 검색창 |
| GET | `/main/me` | 마이페이지 |

---

## 설계 시 고민했던 점

### 1. **리소스 중심 URL 설계**
- RESTful 원칙에 따라 명사형 리소스를 URL에 사용
- 계층 구조를 명확히 표현 (예: `/courses/{id}/lectures`)
- 동사 대신 HTTP 메서드로 행위를 표현

### 2. **중첩 리소스 vs 쿼리 파라미터**
- 특정 강사의 강좌: `/instructors/{id}/courses` 
- 강좌 상태 필터링: `/instructors/{id}/courses?status=ongoing` 
- 계층 관계가 명확한 경우 중첩 리소스 사용
- 필터링/정렬은 쿼리 파라미터 활용

### 3. **마이페이지 리소스 네이밍**
- `/me`를 사용하여 현재 로그인한 사용자의 리소스 표현
- 수강생ID를 URL에 노출하지 않아 보안성 향상
- 직관적이고 일관성 있는 API 구조

### 4. **통합 검색 설계**
- 여러 리소스(강사, 강좌)를 한 번에 검색
- `/search?keyword=국어` 형태로 단일 엔드포인트 제공
- 응답에서 검색 결과를 카테고리별로 분류

### 5. **N:M 관계 처리**
- 수강생 ↔ 강좌: `수강(Enrollment)` 테이블로 연결
- 수강생 ↔ 관심 강좌: `관심 강좌(Favorite Course)` 테이블로 연결
- 수강생 ↔ 관심 강사: `관심 강사(Favorite Instructor)` 테이블로 연결
- 중간 테이블에 추가 정보(신청일, 등록일 등) 저장

---

## 배운 점

### RESTful API 설계 원칙
1. **리소스 중심 사고**: URL은 동사가 아닌 명사로 구성
2. **HTTP 메서드 활용**: GET, POST, PUT, DELETE로 행위 표현
3. **계층 구조 표현**: 슬래시(/)로 리소스 간 관계 명확히
4. **일관성 유지**: 복수형 명사 사용 (`/courses`, `/instructors`)

### 데이터베이스 설계
1. **정규화**: 데이터 중복을 최소화하고 테이블 분리
2. **외래키 관계**: 테이블 간 참조 무결성 보장
3. **N:M 관계**: 중간 테이블을 통한 다대다 관계 해결
4. **NULL 허용 여부**: 비즈니스 로직에 따른 제약 조건 설정

### JSON 응답 설계
1. **중첩 구조**: 관련 데이터를 그룹화하여 가독성 향상
2. **일관된 키 이름**: 한글/영문 혼용 시 일관성 유지 필요
3. **필요한 데이터만**: 각 화면에 필요한 최소한의 데이터만 반환

---

## 다음 단계

### SQL 쿼리 작성
- 각 API 엔드포인트에 대응하는 SQL SELECT 문 작성
- JOIN을 활용한 효율적인 데이터 조회
- 인덱스 설계를 고려한 쿼리 최적화
---

## 회고
인터넷 강의 사이트의 데이터베이스 설계와 RESTful API 엔드포인트를 정의했다. 

ERD를 설계하면서 엔티티 간의 관계를 명확히 하는 것이 얼마나 중요한지 깨달았다. 특히 N:M 관계를 중간 테이블로 풀어내는 과정에서 수강, 관심 강좌, 관심 강사 등의 테이블이 필요하다는 것을 알게 되었다.

RESTful API를 설계하면서는 리소스 중심의 URL 설계가 얼마나 직관적인지 느꼈다. `/me`라는 엔드포인트를 사용해 현재 사용자의 리소스를 표현하는 방식이 특히 인상적이었다.

다음 단계로 SQL 쿼리를 작성하면서 실제로 이 설계가 효율적으로 동작하는지 검증해볼 예정이다. 설계한 구조가 실제 쿼리로 구현되는 과정을 통해 더 깊이 이해할 수 있을 것 같다.


---

## ERD 다이어그램

![ERD](https://github.com/user-attachments/assets/0321ae41-7bf3-4ed0-9c41-fe6f89e76af4)
---

## 2026.02.02 - SQL 쿼리 작성

### 작업 내용
1월 30일에 설계한 ERD와 RESTful API를 기반으로 각 API 엔드포인트에 필요한 SQL SELECT 문을 작성했다.

### 주요 쿼리 예시

**강좌 목록 조회**
```sql
SELECT 
    c.강좌ID AS courseId,
    c.강좌명 AS courseName,
    c.강좌설명 AS description,
    c.개설일 AS startDate,
    c.종료일 AS endDate,
    i.강사ID AS instructorId,
    i.강사이름 AS name,
    i.과목명 AS subject
FROM 강좌 c
JOIN 강사 i ON c.강사ID = i.강사ID
ORDER BY c.개설일 DESC;
```

**마이페이지 - 수강 중인 강좌**
```sql
SELECT 
    e.수강신청ID AS enrollmentId,
    e.신청일 AS enrolledAt,
    c.강좌ID AS courseId,
    c.강좌명 AS courseName,
    i.강사이름 AS instructorName
FROM 수강 e
JOIN 강좌 c ON e.강좌ID = c.강좌ID
JOIN 강사 i ON c.강사ID = i.강사ID
WHERE e.수강생ID = ?
ORDER BY e.신청일 DESC;
```

**통합 검색**
```sql
-- 강사 검색
SELECT 
    i.강사ID AS instructorId,
    i.강사이름 AS name,
    i.과목명 AS subject
FROM 강사 i
WHERE i.강사이름 LIKE CONCAT('%', ?, '%')
   OR i.과목명 LIKE CONCAT('%', ?, '%');

-- 강좌 검색
SELECT 
    c.강좌ID AS courseId,
    c.강좌명 AS courseName,
    i.강사이름 AS instructorName
FROM 강좌 c
JOIN 강사 i ON c.강사ID = i.강사ID
WHERE c.강좌명 LIKE CONCAT('%', ?, '%')
   OR c.강좌설명 LIKE CONCAT('%', ?, '%');
```

### 인덱스 설계

JOIN 성능 향상을 위해 외래키 컬럼에 인덱스를 추가했다.

```sql
-- 외래키 인덱스
CREATE INDEX idx_course_instructor ON 강좌(강사ID);
CREATE INDEX idx_lecture_course ON 강의(강좌ID);
CREATE INDEX idx_enrollment_student ON 수강(수강생ID);
CREATE INDEX idx_enrollment_course ON 수강(강좌ID);
CREATE INDEX idx_review_course ON 수강평(강좌ID);
CREATE INDEX idx_review_student ON 수강평(수강생ID);
CREATE INDEX idx_comment_post ON 댓글(게시글ID);
CREATE INDEX idx_favorite_course_student ON 관심강좌(수강생ID);
CREATE INDEX idx_favorite_course_course ON 관심강좌(강좌ID);
```

### 새롭게 배운 점

#### 1. 파라미터 바인딩과 SQL 인젝션 방지
- SQL 쿼리에서 `?`는 파라미터 바인딩을 위한 플레이스홀더
- 사용자 입력값을 직접 쿼리에 넣지 않고 바인딩하여 SQL 인젝션 공격 방지
- 같은 쿼리를 다른 값으로 재사용 가능

#### 2. DISTINCT로 JOIN 중복 카운팅 방지
- 여러 테이블을 JOIN하면 같은 데이터가 중복으로 나타날 수 있음
- `COUNT(DISTINCT column)`으로 중복 제거 후 정확한 집계 가능

```sql
-- 강사별 강좌 수, 수강생 수 정확히 카운트
SELECT 
    i.강사이름,
    COUNT(DISTINCT c.강좌ID) AS courseCount,
    COUNT(DISTINCT e.수강신청ID) AS enrollmentCount
FROM 강사 i
LEFT JOIN 강좌 c ON i.강사ID = c.강사ID
LEFT JOIN 수강 e ON c.강좌ID = e.강좌ID
GROUP BY i.강사이름;
```

#### 3. 쿼리 분리의 장점
- 복잡한 데이터 구조는 쿼리를 분리하는 것이 효율적
- 예: 강좌 정보와 강의 목록을 별도 쿼리로 조회
- 데이터 중복 없이 깔끔한 응답 구조 생성 가능

#### 4. GROUP BY 사용법
- 집계 함수(COUNT, SUM 등)를 사용할 때 필수
- SELECT에서 집계 함수가 아닌 모든 컬럼은 GROUP BY에 포함해야 함
- 데이터를 그룹으로 묶어 각 그룹별로 집계 계산

#### 5. LEFT JOIN vs JOIN(INNER JOIN)
- JOIN: 양쪽 테이블에 모두 데이터가 있는 경우만 조회
- LEFT JOIN: 왼쪽 테이블 기준으로 오른쪽 테이블 데이터가 없어도 조회
- 게시판/댓글처럼 작성자가 강사 또는 수강생일 수 있는 경우 LEFT JOIN 활용

### 고민했던 점

#### 쿼리 통합 vs 분리
강좌 정보와 강의 목록을 하나의 쿼리로 가져올지, 분리할지 고민했다. LEFT JOIN으로 통합하면 강의가 없을 때 강좌 정보가 NULL이 되거나, 강의 수만큼 강좌 정보가 중복되는 문제가 있었다. 결국 쿼리를 분리하는 것이 데이터 구조가 명확하고 효율적이라고 결론 내렸다.
