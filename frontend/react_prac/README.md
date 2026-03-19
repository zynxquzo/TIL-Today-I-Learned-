# FastAPI + React 게시판 실습

FastAPI 백엔드와 React 프론트엔드를 연결한 JWT 인증 기반 게시판 프로젝트

## 기술 스택

**Backend**
- FastAPI, SQLAlchemy, PostgreSQL
- JWT 인증, bcrypt 암호화
- uvicorn

**Frontend**
- React, React Router v6
- Zustand (상태관리)
- axios, TailwindCSS

## 주요 기능

- 회원가입 / 로그인 (JWT)
- 게시글 CRUD
- 본인 글만 삭제 가능
- 로그인 상태에 따른 UI 변경
- Protected Route 구현

## 실행 방법

### 백엔드

```bash
# PostgreSQL에서 DB 생성
CREATE DATABASE post;

# 프로젝트 설정
uv init post-backend
cd post-backend
uv add "fastapi[standard]" sqlalchemy psycopg2-binary PyJWT bcrypt

# main.py에서 DB 비밀번호 수정 후 실행
uv run fastapi dev
```

### 프론트엔드

```bash
npm create vite@7 my-react-app -- --template react
cd my-react-app
npm install tailwindcss @tailwindcss/vite axios react-router-dom@6 zustand
npm run dev
```

## API 엔드포인트

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/auth/signup` | 회원가입 | X |
| POST | `/auth/login` | 로그인 | X |
| GET | `/auth/me` | 내 정보 조회 | O |
| GET | `/posts` | 글 목록 | X |
| GET | `/posts/:id` | 글 상세 | X |
| POST | `/posts` | 글 작성 | O |
| DELETE | `/posts/:id` | 글 삭제 | O |

## 프론트엔드 구조

### 라우팅

| 경로 | 페이지 | 보호 |
|------|--------|------|
| `/` | 글 목록 | - |
| `/posts/:id` | 글 상세 | - |
| `/posts/new` | 글 작성 | ProtectedRoute |
| `/login` | 로그인 | - |
| `/signup` | 회원가입 | - |

### 상태관리 (Zustand)

```javascript
// useAuthStore.js
{
  user: null,
  token: null,
  login(email, password),    // 로그인 + 유저정보 조회
  logout(),                  // 토큰 삭제 + 상태 초기화
  checkAuth()                // 앱 시작 시 토큰 복구
}
```

### 주요 구현

- **axios 인터셉터**: localStorage 토큰을 자동으로 헤더에 추가
- **ProtectedRoute**: 비로그인 시 로그인 페이지로 리다이렉트
- **조건부 렌더링**: 로그인 상태/본인 글 여부에 따라 버튼 표시