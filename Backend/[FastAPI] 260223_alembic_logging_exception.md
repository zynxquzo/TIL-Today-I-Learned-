# [TIL] FastAPI: Alembic, Logging, 커스텀 예외 처리

## 1. Alembic

### 1. Alembic이란?

SQLAlchemy를 위한 DB 마이그레이션 도구. 모델 변경 사항을 자동으로 감지해서 마이그레이션 파일을 생성하고, 기존 데이터를 유지하면서 DB 구조를 변경할 수 있다. 이전 버전으로 롤백도 가능하다.

**마이그레이션**: DB 구조(스키마)를 한 상태에서 다른 상태로 변경하는 작업, 또는 그 변경 작업을 코드로 기록한 것

### 2. 설치 및 초기 설정

```bash
uv add alembic
uv run alembic init alembic  # 프로젝트 루트에서 실행
```

실행 후 생성되는 구조:

```
fastapi_basic/
├── alembic/
│   ├── versions/     # 마이그레이션 파일들이 쌓이는 폴더
│   ├── env.py        # Alembic 설정 (수정 필요)
│   ├── script.py.mako
│   └── README
├── alembic.ini       # Alembic 설정 파일 (수정 필요)
└── ...
```

### 3. 설정 파일 수정

- `alembic.ini`: `sqlalchemy.url`을 비워둔다 (env.py에서 동적으로 설정)

```ini
sqlalchemy.url =
```

- `alembic/env.py`: 모델 메타데이터와 DB URL 연결

```python
import os
from dotenv import load_dotenv
from mysite4 import models

load_dotenv()

# target_metadata 설정
target_metadata = models.Base.metadata

# run_migrations_online() 함수 수정
def run_migrations_online() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = os.getenv("DATABASE_URL")  # .env에서 주입

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
```

설정 확인:

```bash
uv run alembic current  # 에러 없이 실행되면 성공
```

### 4. 기존 테이블이 이미 있을 때 (첫 Alembic 도입)

`create_all()`로 이미 테이블을 만들어둔 상태라면, 현재 DB 상태를 기준점으로 잡는 초기 마이그레이션을 만들어야 한다.

```bash
uv run alembic revision --autogenerate -m "init"  # 마이그레이션 파일 생성
uv run alembic stamp head  # 실제 실행 없이 "적용 완료" 표시만 남김
```

- `stamp head`: 마이그레이션을 실행하지 않고 최신 버전으로 표시만 해둔다. 이미 테이블이 존재하기 때문

### 5. DB 변경 후 마이그레이션 적용하기

```bash
# 1. 모델 수정 (Python 코드)
# 2. 마이그레이션 파일 자동 생성
uv run alembic revision --autogenerate -m "add nickname to users"
# 3. 실제 DB에 적용
uv run alembic upgrade head
```

기존 데이터는 그대로 유지되면서 새 컬럼만 추가된다.

### 6. 롤백하기

```bash
uv run alembic downgrade -1         # 한 단계 이전으로
uv run alembic downgrade a1b2c3d4   # 특정 revision ID로 되돌리기
uv run alembic history              # 마이그레이션 히스토리 확인
```

### 7. 앞으로의 작업 흐름

**DB가 이미 존재하는 경우 (최초 1회)**:
1. `uv run alembic revision --autogenerate -m "init"`
2. `uv run alembic stamp head`

**이후 반복되는 흐름**:
1. 모델 수정 (Python 코드)
2. `uv run alembic revision --autogenerate -m "변경 설명"`
3. `uv run alembic upgrade head`

### 8. main.py에서 create_all 제거

Alembic을 도입하면 `main.py`에서 `create_all()`을 제거해야 한다.

```python
# main.py
# models.Base.metadata.create_all(bind=engine)  # 제거 또는 주석처리
```

---

## 2. Logging

### 1. 로깅이란?

프로그램이 실행되는 동안 일어나는 일들을 기록하는 것. 장애 원인 파악, 사용자 문의 대응, 보안 추적, 성능 모니터링, 디버깅 등에 사용된다.

### 2. 로그 레벨

| 레벨 | 용도 | 예시 |
|---|---|---|
| `DEBUG` | 개발 중 상세 정보 | `logger.debug("SQL 쿼리 결과: ...")` |
| `INFO` | 정상 동작 기록 | `logger.info("로그인 성공: user_id=1")` |
| `WARNING` | 주의가 필요한 상황 | `logger.warning("로그인 실패: 잘못된 비밀번호")` |
| `ERROR` | 에러 발생 | `logger.error("DB 연결 실패")` |
| `CRITICAL` | 치명적 오류 | `logger.critical("서버 시작 불가")` |

로그 레벨을 설정하면 **그 레벨 이상의 로그만 출력**된다.

```python
# INFO로 설정하면 INFO, WARNING, ERROR, CRITICAL만 출력 (DEBUG는 출력 안 됨)
root_logger.setLevel(logging.INFO)
```

### 3. 로깅 설정 파일 만들기

프로젝트 루트에 `logging_config.py`를 만든다.

```python
# logging_config.py
import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)-8s %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # 1. 콘솔 핸들러
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    # 2. 파일 핸들러 (RotatingFileHandler)
    file_handler = RotatingFileHandler(
        filename="app.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)

    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("watchfiles").setLevel(logging.WARNING)
```

포맷 변수 의미:
- `%(asctime)s` - 로그 발생 시간
- `%(levelname)-8s` - 로그 레벨 (8칸 좌측 정렬)
- `%(name)s` - 로거 이름 (모듈 경로)
- `%(message)s` - 실제 로그 메시지

### 4. RotatingFileHandler

일반 `FileHandler`는 로그 파일이 끝없이 커진다. `RotatingFileHandler`는 파일이 지정된 크기에 도달하면 자동으로 새 파일로 전환한다.

```
app.log       ← 현재 로그 (최대 10MB)
app.log.1     ← 이전 로그
app.log.2     ← ...
app.log.5     ← 가장 오래된 로그 (이후 자동 삭제)
```

`backupCount=5`이면 최대 5개의 백업 파일을 유지한다.

### 5. main.py에서 로깅 초기화

```python
# main.py
from logging_config import setup_logging

setup_logging()  # 앱 시작 시 로깅 활성화

app = FastAPI()
```

### 6. 서비스 레이어에 로깅 추가하기

```python
# mysite4/services/auth_service.py
import logging

logger = logging.getLogger(__name__)  # 파일 상단에 한 번만 선언

class AuthService:
    def signup(self, db, data):
        logger.info(f"회원가입 시도: {data.email}")

        if existing_user:
            logger.warning(f"회원가입 실패 - 이메일 중복: {data.email}")
            raise DuplicateException("이미 등록된 이메일입니다.")

        logger.info(f"회원가입 성공: user_id={new_user.id}, email={data.email}")
        return new_user
```

- `logging.getLogger(__name__)`: 모듈 경로를 로거 이름으로 사용 → 어느 파일에서 찍힌 로그인지 바로 확인 가능

로그 레벨 활용 기준:
- 정상 동작 기록 → `logger.info()`
- 사용자 실수, 권한 없음 등 주의 상황 → `logger.warning()`
- 예상치 못한 서버 에러 → `logger.error()`

### 7. .gitignore에 로그 파일 추가

콘솔 로그는 서버가 꺼지면 사라지지만 파일 로그는 남는다. 단, 로그 파일은 Git에 올리지 않는다.

```
# .gitignore
*.log
```

---

## 3. 커스텀 예외 처리

### 1. 기존 코드의 문제점

```python
# 기존 서비스 레이어
from fastapi import HTTPException, status

class Post2Service:
    def read_post_by_id(self, db, id):
        post = post2_repository.find_by_id(db, id)
        if not post:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "존재하지 않는 게시글입니다.")
```

**문제 1: 서비스 레이어가 HTTP를 알고 있다**

```
이상적인 계층 분리:
  Router     → HTTP 요청/응답 처리 (상태 코드, 응답 형식)
  Service    → 비즈니스 로직만 담당 (HTTP를 몰라야 함)
  Repository → DB 접근만 담당
```

서비스는 "게시글이 없다"는 사실만 알면 되는데, HTTP 상태 코드(404, 403, 409)까지 직접 다루고 있다.

**문제 2: 에러 응답 형식이 제각각**

`HTTPException`은 `{"detail": "..."}` 형식으로 응답하지만, Pydantic 검증 실패 시에는 전혀 다른 형식(배열)으로 응답한다. 프론트엔드 입장에서 처리하기 어렵다.

**문제 3: 에러 코드가 여러 곳에 중복**

"존재하지 않는 리소스" 처리가 여러 서비스 파일에 중복되어 있다.

### 2. 커스텀 예외 클래스 만들기

```python
# mysite4/exceptions.py

class AppException(Exception):
    """앱 전체 예외의 부모 클래스"""
    status_code: int = 500

    def __init__(self, detail: str):
        self.detail = detail

class NotFoundException(AppException):
    status_code = 404

class DuplicateException(AppException):
    status_code = 409

class UnauthorizedException(AppException):
    status_code = 401

class ForbiddenException(AppException):
    status_code = 403
```

- `AppException`을 부모로 두면 하나의 핸들러로 모든 자식 예외를 처리할 수 있다.

### 3. 에러 응답 스키마 정의

```python
# mysite4/schemas/error.py
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    detail: str

    model_config = {"json_schema_extra": {"examples": [{"detail": "에러 메시지"}]}}
```

### 4. 전역 예외 핸들러 등록하기

```python
# mysite4/exception_handlers.py
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from mysite4.exceptions import AppException
import logging

logger = logging.getLogger("mysite4")

def register_exception_handlers(app: FastAPI):

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.warning(f"Business Exception: {exc.detail} (Path: {request.url.path})")
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        logger.info(f"Validation Failed: {request.url.path}")
        errors = exc.errors()
        first_error = errors[0]
        field = " → ".join(str(loc) for loc in first_error["loc"])
        message = first_error["msg"]
        return JSONResponse(
            status_code=422,
            content={"detail": f"{field}: {message}"},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unexpected Error: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "서버 내부 오류가 발생했습니다."}
        )
```

- `exc_info=True`: 에러 발생까지의 스택 트레이스(함수 호출 기록)를 로그에 모두 출력한다. 어느 파일 몇 번째 줄에서 터졌는지 바로 확인 가능

### 5. main.py에 핸들러 등록

```python
# main.py
from mysite4.exception_handlers import register_exception_handlers

app = FastAPI()
register_exception_handlers(app)  # 라우터 등록 전에 먼저 실행
app.include_router(...)
```

### 6. 서비스 레이어 리팩토링

```python
# 수정 전
from fastapi import HTTPException, status
raise HTTPException(status.HTTP_404_NOT_FOUND, "존재하지 않는 게시글입니다.")

# 수정 후
from mysite4.exceptions import NotFoundException
raise NotFoundException("존재하지 않는 게시글입니다.")
```

### 7. 동작 흐름

```
서비스에서 raise NotFoundException("존재하지 않는 게시글입니다.")
    ↓
NotFoundException은 AppException의 자식이므로, app_exception_handler()가 실행됨
    ↓
exc.status_code = 404, exc.detail = "존재하지 않는 게시글입니다."
    ↓
클라이언트에 JSON 응답: {"detail": "존재하지 않는 게시글입니다."} (404)
```

### 8. Pydantic ValidationError 처리

FastAPI가 기본으로 만들어주는 422 응답은 배열 형식이라 파싱하기 번거롭다. 커스텀 핸들러로 첫 번째 에러만 뽑아서 간결하게 응답한다.

```python
@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    first_error = errors[0]
    field = " → ".join(str(loc) for loc in first_error["loc"])
    message = first_error["msg"]
    return JSONResponse(
        status_code=422,
        content={"detail": f"{field}: {message}"},
    )
```

---

## 4. 핵심 개념 정리

### 1. Alembic 요약

| 명령어 | 설명 |
|---|---|
| `alembic revision --autogenerate -m "설명"` | 변경사항 자동 감지 후 마이그레이션 파일 생성 |
| `alembic upgrade head` | 최신 마이그레이션 적용 |
| `alembic downgrade -1` | 한 단계 롤백 |
| `alembic stamp head` | 실행 없이 최신 버전 표시만 남김 |
| `alembic history` | 마이그레이션 히스토리 확인 |

### 2. Logging 요약

- `logging.getLogger(__name__)` → 모듈별 로거 생성
- `RotatingFileHandler` → 파일 크기 제한 + 자동 백업
- `exc_info=True` → 스택 트레이스 출력 (500 에러 디버깅 필수)

### 3. 커스텀 예외 처리 요약

```
기존: 서비스에서 HTTPException(404) 직접 raise
  → 서비스가 HTTP를 알게 됨 (계층 오염)

개선: 서비스에서 NotFoundException raise
  → 전역 핸들러가 HTTP 응답으로 변환
  → 에러 응답 형식이 통일됨
  → 서비스는 비즈니스 로직에만 집중
```

---

## 5. 학습 포인트 (Key Takeaways)

### 1. Alembic으로 마이그레이션 관리

- `create_all()`은 개발 초기에만 편리하고 운영 환경에서는 위험하다. Alembic을 쓰면 기존 데이터를 유지하면서 스키마를 안전하게 바꿀 수 있다.
- 이미 DB가 있다면 `stamp head`로 현재 상태를 기준점으로 잡고 시작한다.

### 2. 로깅은 계층별로 의미 있게

- `INFO`: 정상 흐름 (회원가입 시도, 성공 등)
- `WARNING`: 사용자 실수나 권한 문제 (이메일 중복, 권한 없음 등)
- `ERROR + exc_info=True`: 예상치 못한 서버 에러 (스택 트레이스 포함)

### 3. 커스텀 예외로 계층을 깔끔하게 분리

- 서비스 레이어는 HTTP를 몰라야 한다. 비즈니스 예외(`NotFoundException`, `ForbiddenException`)만 raise하고, HTTP 변환은 전역 핸들러에 맡긴다.
- 부모 클래스(`AppException`) 하나로 모든 커스텀 예외를 핸들러 하나에서 처리할 수 있다.