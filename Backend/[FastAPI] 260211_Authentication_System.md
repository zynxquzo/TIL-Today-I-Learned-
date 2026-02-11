# [TIL] FastAPI: 인증 시스템 구현 (세션 vs 토큰, JWT)

## 1. 인증(Authentication)이란?

**인증**은 사용자가 누구인지 확인하는 과정으로, 웹 애플리케이션에서 사용자의 신원을 검증하고 이후 요청에서 사용자를 식별하는 메커니즘입니다.

### 1. 인증의 필요성

```python
# 인증 없는 시스템
@app.get("/profile")
def get_profile():
    # 누구의 프로필? 알 수 없음
    return {"error": "누구의 정보를 조회할까요?"}

# 인증 있는 시스템
@app.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    # 현재 로그인한 사용자의 프로필
    return {"email": current_user.email, "id": current_user.id}
```

**인증이 필요한 이유:**
- 사용자별 데이터 관리
- 권한에 따른 접근 제어
- 개인정보 보호
- 보안 강화

---

## 2. 세션 기반 인증 vs 토큰 기반 인증

### 1. 세션 기반 인증 (Session-based Authentication)

**정의:** 서버가 사용자의 인증 정보를 직접 저장하고 관리하는 방식

```python
# 로그인 시
def login(username, password):
    user = verify_user(username, password)
    
    # 서버에 세션 정보 저장
    session_id = generate_random_id()
    session_store[session_id] = {
        "user_id": user.id,
        "login_time": datetime.now()
    }
    
    # 세션 ID를 쿠키로 전달
    response.set_cookie("session_id", session_id)
```

**흐름:**
```
1. 로그인 → 서버에 세션 저장 → 세션 ID를 쿠키로 전달
2. 이후 요청 → 쿠키의 세션 ID로 서버 저장소 조회 → 사용자 식별
3. 로그아웃 → 서버에서 세션 삭제
```

**장점:**
- 서버에서 세션을 직접 관리하므로 즉시 무효화 가능
- 보안상 민감한 정보가 클라이언트에 노출되지 않음

**단점:**
- 서버가 모든 세션을 저장해야 함 (메모리/DB 부담)
- 서버 확장 시 세션 동기화 필요
- 마이크로서비스 아키텍처에 부적합

### 2. 토큰 기반 인증 (Token-based Authentication)

**정의:** 서버가 인증 정보를 암호화된 토큰으로 발급하고, 클라이언트가 이를 보관하는 방식

```python
# 로그인 시
def login(username, password):
    user = verify_user(username, password)
    
    # 토큰 생성 (서버는 저장하지 않음!)
    token = jwt.encode(
        {"user_id": user.id, "exp": expire_time},
        SECRET_KEY
    )
    
    # 토큰을 응답으로 전달
    return {"access_token": token}
```

**흐름:**
```
1. 로그인 → 토큰 생성 → 클라이언트에 전달
2. 이후 요청 → 헤더에 토큰 포함 → 서버에서 서명 검증 → 사용자 식별
3. 로그아웃 → 클라이언트에서 토큰 삭제 (서버는 관여하지 않음)
```

**장점:**
- 서버가 상태를 저장하지 않음 (Stateless)
- 확장성이 좋음 (여러 서버로 분산 가능)
- 마이크로서비스 아키텍처에 적합

**단점:**
- 토큰 만료 전까지 강제 로그아웃 어려움
- 토큰 크기가 세션 ID보다 큼
- 토큰이 탈취되면 만료까지 악용 가능

### 3. 비교표

| 항목 | 세션 기반 | 토큰 기반 |
|------|----------|----------|
| **저장 위치** | 서버 (메모리/DB) | 클라이언트 (로컬 스토리지/쿠키) |
| **상태 관리** | Stateful | Stateless |
| **확장성** | 낮음 (세션 동기화 필요) | 높음 (서버 간 공유 불필요) |
| **즉시 무효화** | 가능 | 어려움 (블랙리스트 필요) |
| **크기** | 작음 (세션 ID만) | 큼 (페이로드 포함) |
| **적합한 환경** | 전통적인 웹 앱 | SPA, 모바일 앱, MSA |

---

## 3. JWT (JSON Web Token)

### 1. JWT란?

**JWT**는 두 개체 간에 JSON 객체로 정보를 안전하게 전송하기 위한 웹 표준입니다.

**특징:**
- **자가 수용성(Self-contained)**: 토큰 자체에 모든 정보가 포함되어 있어 별도 조회 불필요
- **확장성(Scalability)**: 상태를 저장하지 않아 서버 확장이 용이
- **범용성**: JSON 기반으로 다양한 언어와 플랫폼에서 사용 가능

### 2. JWT 구조

JWT는 `.`으로 구분된 세 부분으로 구성됩니다.

```
header.payload.signature
eyJhbGci....(헤더).eyJ1c2Vy....(페이로드).SflKxwRJ....(서명)
```

#### 1) Header (헤더)

토큰 타입과 암호화 알고리즘을 명시합니다.

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

- `alg`: 서명 알고리즘 (HS256, RS256 등)
- `typ`: 토큰 타입 (JWT)

#### 2) Payload (페이로드)

토큰으로 관리할 데이터를 저장합니다.

```json
{
  "sub": "1",              // subject: 사용자 ID
  "email": "user@test.com",
  "exp": 1709123456,       // expiration: 만료 시간
  "iat": 1709120000        // issued at: 발급 시간
}
```

**주의사항:**
- 페이로드는 **Base64로 인코딩만** 되어 있음 (암호화 아님!)
- 민감한 정보(비밀번호, 카드번호)는 절대 저장하지 않음

#### 3) Signature (서명)

토큰의 위조를 방지하기 위한 서명입니다.

```javascript
HMAC-SHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  SECRET_KEY
)
```

**역할:**
- 토큰이 변조되지 않았음을 검증
- 서버만 아는 비밀키로 서명했으므로 신뢰 보장

### 3. JWT 생성 및 검증 과정

#### 생성 (로그인 시)

```python
import jwt
from datetime import datetime, timedelta

def create_access_token(user_id: int) -> str:
    # 1. 페이로드 구성
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(minutes=30)
    }
    
    # 2. 서명 및 인코딩
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    
    return token

# 결과: "eyJhbGci...abc123"
```

#### 검증 (API 요청 시)

```python
def verify_token(token: str):
    try:
        # 1. 서명 검증 및 디코딩
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        
        # 2. 페이로드에서 사용자 정보 추출
        user_id = payload.get("sub")
        
        return user_id
    except jwt.ExpiredSignatureError:
        # 토큰 만료
        raise HTTPException(status_code=401, detail="토큰이 만료되었습니다")
    except jwt.InvalidTokenError:
        # 서명 불일치 (위조된 토큰)
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다")
```

### 4. Access Token vs Refresh Token

보안 강화를 위해 두 가지 토큰을 함께 사용합니다.

| 토큰 종류 | 용도 | 유효 기간 | 저장 위치 |
|----------|------|----------|----------|
| **Access Token** | 실제 API 요청 시 사용 | 짧음 (15분~1시간) | 메모리/로컬 스토리지 |
| **Refresh Token** | Access Token 재발급 | 김 (1주~1개월) | HttpOnly 쿠키/DB |

**흐름:**
```
1. 로그인 → Access Token + Refresh Token 발급
2. API 요청 → Access Token 사용
3. Access Token 만료 → Refresh Token으로 재발급
4. Refresh Token도 만료 → 재로그인 필요
```

**장점:**
- Access Token 탈취 시 피해 최소화 (짧은 유효 기간)
- Refresh Token으로 사용자 경험 개선 (자동 재발급)

---

## 4. 비밀번호 해싱 (bcrypt)

### 1. 왜 해싱이 필요한가?

비밀번호를 평문으로 저장하면 DB 해킹 시 모든 사용자 정보가 노출됩니다.

```python
# ❌ 절대 금지!
user = User(email="user@test.com", password="mypassword123")

# ✅ 올바른 방법
hashed = bcrypt.hashpw("mypassword123".encode(), bcrypt.gensalt())
user = User(email="user@test.com", password=hashed.decode())
```

### 2. 해시 함수의 특징

**일방향 함수 (One-way Function):**
- 원본 → 해시: 가능
- 해시 → 원본: 불가능 (역산 불가)

```python
password = "mypassword123"
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
# 결과: "$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

# 이 해시값에서 원본 비밀번호를 알아낼 방법은 없음!
```

### 3. bcrypt의 동작 원리

#### Salt란?

**Salt**는 해시 생성 시 추가되는 랜덤 값으로, 같은 비밀번호라도 매번 다른 해시를 생성합니다.

```python
password = "mypassword123"

hash1 = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
# $2b$12$ABC...XYZ

hash2 = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
# $2b$12$DEF...UVW  (완전히 다름!)

# 하지만 둘 다 검증 성공
bcrypt.checkpw(password.encode(), hash1)  # True
bcrypt.checkpw(password.encode(), hash2)  # True
```

**Salt의 구조:**
```
$2b$12$N9qo8uLOickgx2ZMRZoMye
│ │  │ │ └─────────────────────┘
│ │  │ │         22자 (랜덤)
│ │  │ └─ $ (구분자)
│ │  └─── cost factor (연산 강도)
│ └────── $ (구분자)
└──────── 알고리즘 버전

전체 해시: 60자 (고정)
```

#### 비밀번호 검증 과정

```python
# 1. 회원가입 시
stored_hash = "$2b$12$ABC...XYZ"  # DB에 저장된 해시

# 2. 로그인 시
input_password = "mypassword123"

# 3. 검증 내부 동작
def checkpw_internal(password, stored_hash):
    # a. stored_hash에서 salt 추출
    salt = extract_salt(stored_hash)  # "$2b$12$ABC..."
    
    # b. 입력 비밀번호를 같은 salt로 해시화
    new_hash = hashpw(password, salt)
    
    # c. 두 해시 비교
    return new_hash == stored_hash

# 결과: True (비밀번호 일치!)
```

**핵심:**
- Salt가 해시 값에 포함되어 있어 공개되어도 안전
- 같은 salt로 해시하면 항상 같은 결과
- 역산은 수학적으로 불가능



## 5. FastAPI 인증 구현

### 1. 프로젝트 구조

```
mysite4/
├── dependencies.py              # 인증 의존성 (get_current_user)
├── models/
│   └── user.py                  # User 테이블 정의
├── repositories/
│   └── user_repository.py       # DB 접근 계층
├── schemas/
│   └── user.py                  # 요청/응답 스키마
├── services/
│   └── auth_service.py          # 비즈니스 로직
└── routers/
    └── auth_router.py           # API 엔드포인트
```

### 2. 환경 설정

#### 패키지 설치

```bash
uv add PyJWT bcrypt email-validator
```

- **PyJWT**: JWT 토큰 생성 및 검증
- **bcrypt**: 비밀번호 해싱
- **email-validator**: 이메일 형식 검증 (Pydantic의 `EmailStr`에 필요)

#### 환경 변수 설정

`.env` 파일:

```bash
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30
```

**Secret Key 생성:**
```bash
# 터미널에서 실행
openssl rand -hex 32
```

**환경 변수 설명:**
- `JWT_SECRET_KEY`: 토큰 서명용 비밀키 (절대 노출 금지!)
- `JWT_ALGORITHM`: 암호화 알고리즘 (HS256 권장)
- `JWT_EXPIRE_MINUTES`: 토큰 만료 시간 (분 단위)

### 3. 모델 정의

```python
# models/user.py

from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
```

**필드 설명:**
- `email`: 로그인 ID로 사용 (unique 제약)
- `password`: bcrypt 해시 값 저장 (200자로 충분)
- `created_at`: 가입 일시 (자동 생성)

### 4. 스키마 정의

```python
# schemas/user.py

from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr

# 회원가입 요청
class UserCreate(BaseModel):
    email: EmailStr  # 이메일 형식 자동 검증
    password: str

# 회원 정보 응답
class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# 로그인 요청
class UserLogin(BaseModel):
    email: str
    password: str

# 토큰 응답
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

**스키마 역할:**
- `UserCreate`: 회원가입 시 받을 데이터
- `UserResponse`: 민감한 정보(비밀번호) 제외하고 응답
- `UserLogin`: 로그인 시 받을 데이터
- `TokenResponse`: JWT 토큰 응답 형식

### 5. Repository 구현

```python
# repositories/user_repository.py

from sqlalchemy.orm import Session
from sqlalchemy import select
from mysite4.models.user import User

class UserRepository:
    def save(self, db: Session, user: User):
        """사용자 저장"""
        db.add(user)
        return user

    def find_by_email(self, db: Session, email: str):
        """이메일로 사용자 조회"""
        stmt = select(User).where(User.email == email)
        return db.scalars(stmt).first()

    def find_by_id(self, db: Session, user_id: int):
        """ID로 사용자 조회"""
        return db.get(User, user_id)

user_repository = UserRepository()
```

**Repository 패턴:**
- DB 접근 로직을 분리
- 재사용성과 테스트 용이성 향상

### 6. Service 구현 - 회원가입

```python
# services/auth_service.py

import os
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from dotenv import load_dotenv

from mysite4.repositories.user_repository import user_repository
from mysite4.models.user import User
from mysite4.schemas.user import UserCreate, UserLogin

load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "30"))

class AuthService:
    def _hash_password(self, password: str) -> str:
        """비밀번호를 bcrypt로 해싱한다."""
        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        return hashed.decode("utf-8")

    def signup(self, db: Session, data: UserCreate):
        """회원가입 처리"""
        with db.begin():
            # 1. 이메일 중복 검사
            existing_user = user_repository.find_by_email(db, data.email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="이미 등록된 이메일입니다.",
                )

            # 2. 비밀번호 해싱
            hashed_password = self._hash_password(data.password)

            # 3. 사용자 저장
            new_user = User(email=data.email, password=hashed_password)
            user_repository.save(db, new_user)

        db.refresh(new_user)
        return new_user

auth_service = AuthService()
```

**회원가입 흐름:**
```
1. 이메일 중복 확인
   └─ 중복이면 409 Conflict 에러
2. 비밀번호 해싱
   └─ bcrypt로 안전하게 변환
3. DB 저장
   └─ 평문 비밀번호는 절대 저장하지 않음
```

### 7. Service 구현 - 로그인

```python
# services/auth_service.py (계속)

class AuthService:
    def _verify_password(self, password: str, hashed: str) -> bool:
        """입력된 비밀번호와 해시된 비밀번호를 비교한다."""
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        
    def login(self, db: Session, data: UserLogin) -> str:
        """로그인 처리 및 JWT 토큰 발급"""
        # 1. 이메일로 사용자 조회
        user = user_repository.find_by_email(db, data.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="이메일 또는 비밀번호가 올바르지 않습니다.",
            )

        # 2. 비밀번호 검증
        if not self._verify_password(data.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="이메일 또는 비밀번호가 올바르지 않습니다.",
            )

        # 3. JWT 토큰 생성
        access_token = self._create_access_token(user.id)
        return access_token

    def _create_access_token(self, user_id: int) -> str:
        """JWT Access Token 생성"""
        expire = datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)
        payload = {
            "sub": str(user_id),  # subject: 사용자 식별자
            "exp": expire,        # expiration: 만료 시간
        }
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
```

**로그인 흐름:**
```
1. 이메일로 사용자 조회
   └─ 없으면 401 Unauthorized
2. 비밀번호 검증
   └─ bcrypt.checkpw()로 해시 비교
   └─ 틀리면 401 Unauthorized
3. JWT 토큰 생성
   └─ 사용자 ID와 만료 시간 포함
   └─ SECRET_KEY로 서명
```

**보안 고려사항:**
- 이메일/비밀번호 중 어떤 것이 틀렸는지 명시하지 않음
- 해커가 유효한 이메일을 추측하기 어렵게 함

### 8. Router 구현

```python
# routers/auth_router.py

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from database import get_db
from mysite4.services.auth_service import auth_service
from mysite4.schemas.user import (
    UserCreate,
    UserResponse,
    TokenResponse,
    UserLogin
)

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(data: UserCreate, db: Session = Depends(get_db)):
    """회원가입"""
    return auth_service.signup(db, data)

@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    """로그인 및 JWT 토큰 발급"""
    access_token = auth_service.login(db, data)
    return {"access_token": access_token}
```

**API 엔드포인트:**

| Method | Path | 설명 | 응답 |
|--------|------|------|------|
| POST | `/auth/signup` | 회원가입 | UserResponse (201) |
| POST | `/auth/login` | 로그인 | TokenResponse (200) |

### 9. main.py 등록

```python
# main.py

from fastapi import FastAPI
from mysite4.routers.auth_router import router as auth_router

app = FastAPI()

app.include_router(auth_router)
```

---

## 6. 전체 인증 흐름

### 1. 회원가입 Flow

```
[클라이언트]                [서버]                      [DB]
     │                        │                          │
     │  POST /auth/signup     │                          │
     │  {email, password}     │                          │
     ├───────────────────────>│                          │
     │                        │                          │
     │                        │  이메일 중복 확인         │
     │                        ├─────────────────────────>│
     │                        │<─────────────────────────┤
     │                        │                          │
     │                        │  비밀번호 해싱            │
     │                        │  (bcrypt)                │
     │                        │                          │
     │                        │  User 저장               │
     │                        ├─────────────────────────>│
     │                        │<─────────────────────────┤
     │                        │                          │
     │  UserResponse          │                          │
     │<───────────────────────┤                          │
     │  {id, email, ...}      │                          │
```

### 2. 로그인 Flow

```
[클라이언트]                [서버]                      [DB]
     │                        │                          │
     │  POST /auth/login      │                          │
     │  {email, password}     │                          │
     ├───────────────────────>│                          │
     │                        │                          │
     │                        │  이메일로 사용자 조회     │
     │                        ├─────────────────────────>│
     │                        │<─────────────────────────┤
     │                        │  user (hashed password)  │
     │                        │                          │
     │                        │  비밀번호 검증            │
     │                        │  bcrypt.checkpw()        │
     │                        │                          │
     │                        │  JWT 토큰 생성           │
     │                        │  jwt.encode()            │
     │                        │                          │
     │  TokenResponse         │                          │
     │<───────────────────────┤                          │
     │  {access_token: ...}   │                          │
     │                        │                          │
     │  로컬 스토리지에 저장   │                          │
     │  localStorage.setItem() │                          │
```

---

## 7. 토큰 저장 방식

### 1. 로컬 스토리지 (Local Storage)

```javascript
// 로그인 후 토큰 저장
fetch('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
})
.then(res => res.json())
.then(data => {
  localStorage.setItem('accessToken', data.access_token);
});

// API 요청 시 사용
fetch('/api/profile', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
});

// 로그아웃 시 삭제
localStorage.removeItem('accessToken');
```

**장점:**
- JavaScript로 직접 접근 가능
- 사용이 간편함

**단점:**
- XSS 공격에 취약 (악성 스크립트가 접근 가능)

### 2. HttpOnly 쿠키

```python
# 서버에서 쿠키로 설정
@router.post("/login")
def login(data: UserLogin, response: Response, db: Session = Depends(get_db)):
    access_token = auth_service.login(db, data)
    
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,      # JavaScript 접근 불가
        secure=True,        # HTTPS에서만 전송
        samesite="strict",  # CSRF 방지
        max_age=1800        # 30분
    )
    
    return {"message": "로그인 성공"}
```

**장점:**
- XSS 공격에 안전 (`httponly`)
- 자동으로 쿠키가 포함됨 (클라이언트 코드 불필요)

**단점:**
- CSRF 공격 대비 필요 (`samesite`)
- 쿠키 크기 제한 (4KB)

### 3. 권장 방식: Hybrid

```python
# Access Token: 메모리 (변수)
# Refresh Token: HttpOnly 쿠키

@router.post("/login")
def login(...):
    access_token = create_access_token(user_id, minutes=15)
    refresh_token = create_refresh_token(user_id, days=7)
    
    # Refresh Token은 쿠키로
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="strict"
    )
    
    # Access Token은 응답으로 (메모리에 저장)
    return {"access_token": access_token}
```

**장점:**
- Access Token 탈취 시 피해 최소 (짧은 만료 시간)
- Refresh Token은 안전하게 보관

---

## 8. JWT의 한계와 보완

### 1. JWT의 단점

#### 1) 토큰 강제 무효화 어려움

```python
# 문제 상황
user_logs_out()  # 클라이언트에서 토큰 삭제

# 하지만...
# - 토큰은 만료 전까지 여전히 유효
# - 서버에서 즉시 무효화할 방법 없음
# - 탈취된 토큰은 만료까지 악용 가능
```

**해결 방법: Token Blacklist**

```python
# Redis에 블랙리스트 저장
blacklist = set()

def logout(token: str):
    # 블랙리스트에 추가 (만료 시간까지만 보관)
    blacklist.add(token)

def verify_token(token: str):
    if token in blacklist:
        raise HTTPException(401, "로그아웃된 토큰입니다")
    
    payload = jwt.decode(token, SECRET_KEY)
    return payload
```

#### 2) 페이로드 정보 노출

```python
# JWT는 암호화가 아닌 Base64 인코딩
token = "eyJhbGci...eyJ1c2VyX2lk...abc123"
        # header  # payload      # signature

# 누구나 페이로드 확인 가능
import base64
payload = base64.b64decode("eyJ1c2VyX2lk...")
# {"user_id": 123, "email": "user@test.com"}
```

**주의사항:**
- 민감한 정보(비밀번호, 카드번호)는 절대 포함 금지
- 최소한의 식별 정보만 포함 (user_id, 만료 시간)

#### 3) 토큰 크기

```python
# 세션 ID: 약 32바이트
session_id = "a3f5k9m2n7p1q4r6s8t0"

# JWT: 약 200~500바이트
jwt_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMjMsImVtYWlsIjoidXNlckB0ZXN0LmNvbSIsImV4cCI6MTcwOTEyMzQ1Nn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
```

**대응:**
- 페이로드를 최소화
- 압축 알고리즘 사용 고려

### 2. 보완 전략

| 문제 | 해결 방법 |
|------|----------|
| **즉시 무효화 불가** | Blacklist (Redis) 또는 짧은 만료 시간 |
| **페이로드 노출** | 민감 정보 제외, 최소 데이터만 포함 |
| **토큰 크기** | 페이로드 최소화, 압축 |
| **탈취 위험** | HTTPS 사용, Refresh Token 분리 |

---

## 9. 실습 요약

### 1. 구현한 기능

```
✅ 회원가입 (/auth/signup)
   ├─ 이메일 중복 확인
   ├─ 비밀번호 bcrypt 해싱
   └─ DB 저장

✅ 로그인 (/auth/login)
   ├─ 이메일로 사용자 조회
   ├─ 비밀번호 검증 (bcrypt.checkpw)
   └─ JWT 토큰 발급
```

### 2. 사용한 기술

| 기술 | 역할 |
|------|------|
| **bcrypt** | 비밀번호 해싱 및 검증 |
| **PyJWT** | JWT 토큰 생성 및 검증 |
| **SQLAlchemy** | 사용자 데이터 관리 |
| **Pydantic** | 요청/응답 스키마 검증 |
| **FastAPI** | REST API 엔드포인트 |

### 3. 핵심 코드

```python
# 비밀번호 해싱
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

# 비밀번호 검증
is_valid = bcrypt.checkpw(password.encode(), hashed)

# JWT 생성
token = jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY)

# JWT 검증
payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
```

---

## 10. 핵심 개념 정리

### 1. 인증 방식 비교

```
세션 기반 인증
├─ 서버에 상태 저장 (Stateful)
├─ 즉시 무효화 가능
└─ 확장성 낮음

토큰 기반 인증
├─ 서버에 상태 없음 (Stateless)
├─ 확장성 높음
└─ 즉시 무효화 어려움
```

### 2. JWT 구조

```
Header.Payload.Signature
  │      │        │
  │      │        └─ 위조 방지 (SECRET_KEY)
  │      └────────── 사용자 정보 (Base64)
  └───────────────── 알고리즘 정보
```

### 3. bcrypt 보안 원리

```
비밀번호 입력
  ↓
Salt 생성 (랜덤)
  ↓
해싱 (4,096번 반복)
  ↓
Salt + 해시 저장 (DB)
  
로그인 시:
  ↓
저장된 해시에서 Salt 추출
  ↓
입력 비밀번호를 같은 Salt로 해싱
  ↓
두 해시 비교
```

### 4. 보안 체크리스트

```
✅ 비밀번호 평문 저장 금지
✅ bcrypt로 해싱 (SHA256 금지)
✅ SECRET_KEY 환경 변수 관리
✅ HTTPS 사용
✅ 짧은 Access Token 만료 시간
✅ Refresh Token 분리
✅ 민감 정보 페이로드 제외
```

---

## 11. 학습 포인트 (Key Takeaways)

### 1. 인증의 본질

- 인증은 "사용자가 누구인지" 확인하는 과정
- 웹 애플리케이션의 가장 기본이 되는 보안 메커니즘
- 세션 vs 토큰: 상황에 맞는 선택이 중요

### 2. 비밀번호 보안

- **절대 평문 저장 금지**
- bcrypt는 의도적으로 느림 = 보안
- Salt는 공개되어도 안전 (역산 불가능)
- 강력한 비밀번호 = 긴 크랙 시간

### 3. JWT의 이해

- 자가 수용성: 토큰 자체에 정보 포함
- Stateless: 서버 확장성 우수
- 서명으로 위조 방지
- 페이로드는 암호화 아님 (주의!)

### 4. 실무 고려사항

- Access Token + Refresh Token 분리
- HttpOnly 쿠키로 XSS 방지
- HTTPS로 전송 중 탈취 방지
- 짧은 만료 시간으로 피해 최소화

### 5. FastAPI 계층 구조

```
Router (API 엔드포인트)
  ↓
Service (비즈니스 로직)
  ↓
Repository (DB 접근)
  ↓
Model (데이터 구조)
```

각 계층의 책임을 명확히 분리하여 유지보수성 향상