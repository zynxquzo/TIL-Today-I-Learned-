제공해주신 TIL 파일의 **'5. Repository와 Service의 차이점'** 섹션을 삭제하고, 전체적인 흐름과 전문성을 유지하면서 내용을 재구성해 드립니다.

---

# [TIL] FastAPI: 데이터베이스 연동 및 MVC 아키텍처 실습

## 1. 관심사 분리(Separation of Concerns)란?

**관심사 분리**는 프로그램을 서로 다른 역할과 책임을 가진 계층으로 나누는 소프트웨어 설계 원칙입니다. 각 계층이 자신의 역할에만 집중하도록 분리하면 코드의 유지보수성, 재사용성, 테스트 용이성이 크게 향상됩니다.

* **핵심 개념**: "한 파일에 모든 로직을 넣지 말고, 역할별로 파일을 나누자"
* **장점**:
* 코드 수정 시 영향 범위가 명확해짐 (예: DB 변경 시 Repository만 수정)
* 각 계층을 독립적으로 테스트 가능
* 같은 로직을 여러 곳에서 재사용 가능



---

## 2. 계층별 역할 정리

### 2.1 Model (Database 계층)

**실제 데이터베이스 테이블을 정의**하는 계층으로, SQLAlchemy ORM을 사용합니다.

* **역할**: 테이블 구조 정의, DB-Python 객체 매핑, 테이블 간 관계 정의
* **하지 않는 일**: 비즈니스 로직 처리, API 응답 형식 정의

### 2.2 Schema (Data Transfer Object 계층)

**API 요청/응답 데이터의 형식을 정의**하는 계층으로, Pydantic을 사용합니다.

* **역할**: 클라이언트 데이터 검증(Request DTO), 응답 형식 정의(Response DTO)
* **특징**: `model_config = ConfigDict(from_attributes=True)` 설정을 통해 SQLAlchemy 모델 객체를 Pydantic에서 읽을 수 있습니다.

### 2.3 Repository (Data Access 계층)

데이터베이스와의 상호작용을 담당하며 **순수하게 데이터 CRUD(생성, 조회, 수정, 삭제)** 작업만 수행합니다.

* **역할**: SQL 쿼리 실행, 데이터 영속성 관리
* **원칙**: 데이터가 없으면 `None`을 반환할 뿐, 직접 에러(Exception)를 발생시키지 않습니다.

### 2.4 Service (Business Logic 계층)

비즈니스 규칙을 처리하는 계층으로, **애플리케이션의 핵심 판단과 검증**을 담당합니다.

* **역할**: 데이터 검증, 트랜잭션 관리(`commit`, `rollback`), 에러 발생 시점 결정
* **특징**: Repository에서 받은 결과를 바탕으로 비즈니스적 판단(예: 404 에러 발생 여부)을 내립니다.

### 2.5 Router (Controller 계층)

HTTP 요청과 응답을 처리하는 계층으로, 외부와의 통신 창구인 **교통 정리** 역할을 합니다.

* **역할**: URL 경로 매핑, 상태 코드 설정, 데이터베이스 세션 주입(Dependency Injection)

---

## 3. 데이터베이스 핵심 개념

### 3.1 세션(Session)과 트랜잭션(Transaction)

* **세션**: DB와 상호작용하는 작업 단위이자 객체의 변경 사항을 추적하는 '장바구니'입니다.
* **트랜잭션**: "모두 성공하거나 모두 실패"해야 하는 작업의 최소 단위(ACID 원칙)입니다.
* **메서드 활용**:
* `db.add()`: 객체를 세션에 추가
* `db.commit()`: 변경 사항을 DB에 최종 확정
* `db.rollback()`: 작업 취소



### 3.2 db.refresh()의 필요성

DB에서 자동 생성되는 값(예: `autoincrement` 된 `id`)을 Python 객체에 즉시 반영하기 위해 사용합니다.

1. `commit()` 직후 Python 객체는 아직 최신 정보를 모름
2. `refresh()` 실행 시 DB에서 최신 데이터를 다시 `SELECT`하여 객체 동기화

---

## 4. 데이터 흐름 및 프로젝트 구조

### 4.1 데이터 변환 과정

```
클라이언트(JSON) → Schema(Pydantic) → Service(로직 처리) → Model(SQLAlchemy) → Database(저장)
                                                                    ↓
클라이언트(JSON) ← Schema(응답) ← Service(결과 반환) ← Model(조회) ← Database(로드)

```

### 4.2 프로젝트 구조 (mysite4)

```
mysite4/
├── models/
│   └── post.py              # DB 테이블 정의 (SQLAlchemy)
├── schemas/
│   └── post.py              # API 데이터 형식 정의 (Pydantic)
├── repositories/
│   └── post_repository.py   # 데이터 접근 계층
├── services/
│   └── post_service.py      # 비즈니스 로직 + 트랜잭션 계층
├── routers/
│   └── post_router.py       # HTTP 요청/응답 처리 계층
├── database.py              # DB 연결 및 세션 관리
└── main.py                  # FastAPI 앱 생성 및 라우터 등록
```

**계층별 의존성 방향:**
```
Router → Service → Repository → Database
       ↓
     Schema ← Model
```

---

## 5. 학습 포인트 (Key Takeaways)

### 5.1 Model vs Schema
* **Model**: 데이터베이스 테이블 구조를 정의 (SQLAlchemy)
* **Schema**: API 입출력 데이터 형식을 정의 (Pydantic)
* 같은 테이블에 대해 여러 개의 Schema 사용 가능 (Create, List, Detail)

### 5.2 세션과 트랜잭션
* **세션**: 데이터베이스 작업을 추적하는 '장바구니'
* **트랜잭션**: 여러 작업을 하나의 단위로 묶어 All or Nothing 보장
* **db.commit()**: 변경사항을 DB에 확정
* **db.refresh()**: DB의 최신 데이터를 Python 객체에 동기화

### 5.3 계층별 책임
* **Router**: HTTP 요청/응답만 처리
* **Service**: 비즈니스 로직 + 트랜잭션 관리
* **Repository**: 데이터 CRUD만 수행 (판단하지 않음)
* **Model**: DB 테이블 정의
* **Schema**: API 데이터 형식 정의

### 8.4 데이터 흐름
```
JSON → Schema(입력) → Model(DB) → Schema(출력) → JSON
```

### 5.5 Repository의 원칙
* 데이터를 찾아서 반환만 함
* 없으면 None 반환 (에러 발생시키지 않음)
* Service가 비즈니스적으로 판단

### 5.6 Service의 역할
* Repository를 조합하여 비즈니스 로직 구현
* 트랜잭션 관리 (commit, rollback)
* 예외 처리 및 에러 발생 시점 결정

### 5.7 실무 적용
* 각 계층을 독립적으로 테스트 가능
* DB 변경 시 Repository만 수정
* 비즈니스 로직 변경 시 Service만 수정
* API 변경 시 Router와 Schema만 수정