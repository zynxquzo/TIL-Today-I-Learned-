## React + FastAPI Todo 앱 만들기

- 지금까지는 외부 API에서 데이터를 가져왔다
- 이번에는 **직접 만든 FastAPI 서버**와 React를 연동하여 Todo 앱을 만들어 본다

---

## FastAPI 서버 구축

### 프로젝트 생성 및 패키지 설치

- React 프로젝트의 루트가 아닌 상위 디렉토리에서 실행한다
```bash
uv init todo-backend
cd todo-backend
uv add "fastapi[standard]" sqlalchemy psycopg2-binary
```

### DB 생성

- PostgreSQL에 `todo` 데이터베이스를 생성한다

### FastAPI 서버 코드 (main.py)
```python
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, Mapped, mapped_column, DeclarativeBase, sessionmaker

# --- DB 설정 ---
engine = create_engine("postgresql://postgres:{비밀번호}@localhost:5432/todo")
SessionLocal = sessionmaker(bind=engine)

class Base(DeclarativeBase):
    pass

# --- FastAPI 설정 ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- 모델 ---
class Todo(Base):
    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(primary_key=True)
    text: Mapped[str]
    done: Mapped[bool] = mapped_column(default=False)

Base.metadata.create_all(bind=engine)

# --- API ---
@app.get("/todos")
def get_todos(db: Session = Depends(get_db)):
    return db.scalars(select(Todo)).all()

@app.post("/todos")
def create_todo(data: dict, db: Session = Depends(get_db)):
    todo = Todo(text=data["text"])
    with db.begin():
        db.add(todo)
    db.refresh(todo)
    return todo

@app.put("/todos/{todo_id}")
def update_todo(todo_id: int, data: dict, db: Session = Depends(get_db)):
    with db.begin():
        todo = db.scalar(select(Todo).where(Todo.id == todo_id))
        todo.text = data["text"]
    db.refresh(todo)
    return todo

@app.put("/todos/{todo_id}/toggle")
def toggle_todo(todo_id: int, db: Session = Depends(get_db)):
    with db.begin():
        todo = db.scalar(select(Todo).where(Todo.id == todo_id))
        todo.done = not todo.done
    db.refresh(todo)
    return todo

@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    with db.begin():
        todo = db.scalar(select(Todo).where(Todo.id == todo_id))
        db.delete(todo)
    return {"message": "삭제 완료"}
```

### 서버 실행
```bash
uv run fastapi dev
```

- `http://localhost:8000/docs`에서 API 문서를 확인할 수 있다

---

## CORS (Cross-Origin Resource Sharing)

### 출처(Origin)란?

- **프로토콜 + 도메인 + 포트**를 합친 것

| URL | 출처 |
| --- | --- |
| `http://localhost:5173/about` | `http://localhost:5173` |
| `http://localhost:8000/todos` | `http://localhost:8000` |

- 위 두 URL은 포트가 다르므로 **서로 다른 출처이다**

### CORS가 필요한 이유

- 브라우저는 보안을 위해 **다른 출처로의 요청을 기본적으로 차단**한다 (Same-Origin Policy)
- React(`localhost:5173`)에서 FastAPI(`localhost:8000`)로 요청하면 출처가 다르므로 차단된다
- **서버(FastAPI)** 쪽에서 "이 출처에서 오는 요청은 허용한다"고 설정해야 한다

### CORS 설정 방법
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 출처 허용
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)
```

---

## React Todo 앱 구현

### 기본 구조
```jsx
import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000/todos";

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  // 할 일 목록 가져오기
  const fetchTodos = async () => {
    const response = await axios.get(API_URL);
    setTodos(response.data);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  // ...
};
```

### 1. 할 일 추가 기능
```jsx
const handleAddTodo = async (e) => {
  e.preventDefault();  // 폼 제출 시 페이지 새로고침 방지
  
  if (inputValue.trim()) {
    await axios.post(API_URL, { text: inputValue });
    setInputValue("");  // 입력창 비우기
    fetchTodos();  // 목록 새로고침
  }
};
```

**핵심 개념:**
- `e.preventDefault()`: form의 기본 동작(페이지 새로고침)을 막는다
- `axios.post(url, data)`: 서버에 데이터를 전송한다
- 서버가 `data["text"]` 형태로 받으므로 `{ text: "..." }` 형태로 전달해야 한다

### 2. 완료 상태 토글 기능
```jsx
const handleToggleTodo = async (e, todoId) => {
  e.stopPropagation();  // 이벤트 버블링 방지
  await axios.put(`${API_URL}/${todoId}/toggle`);
  fetchTodos();
};
```

**핵심 개념:**
- `e.stopPropagation()`: 이벤트가 부모 요소로 전파되는 것을 막는다
- 버튼 클릭 시 부모 요소의 클릭 이벤트가 실행되지 않도록 방지

### 3. 할 일 삭제 기능
```jsx
const handleDeleteTodo = async (e, todoId) => {
  e.stopPropagation();
  await axios.delete(`${API_URL}/${todoId}`);
  fetchTodos();
};
```

### 4. 할 일 수정 기능

#### 수정 모드 시작
```jsx
const handleStartEdit = (e, todo) => {
  e.stopPropagation();
  setEditingId(todo.id);  // 수정 중인 할 일 id 설정
  setEditText(todo.text);  // 현재 텍스트를 임시 저장
};
```

#### Enter 키로 수정 완료
```jsx
const handleUpdateTodo = async (e, todoId) => {
  if (e.key === "Enter") {  // Enter 키 감지
    if (editText.trim()) {
      await axios.put(`${API_URL}/${todoId}`, { text: editText });
      setEditingId(null);  // 수정 모드 해제
      setEditText("");  // 임시 텍스트 초기화
      fetchTodos();
    }
  }
};
```

**핵심 개념:**
- `e.key === "Enter"`: 눌린 키가 Enter인지 확인
- `editingId`: 현재 수정 중인 할 일의 id를 저장 (null이면 수정 중인 항목 없음)

### 5. 조건부 렌더링
```jsx
{editingId === todo.id ? (
  // 수정 모드: input 표시
  <input
    type="text"
    value={editText}
    onChange={(e) => setEditText(e.target.value)}
    onKeyPress={(e) => handleUpdateTodo(e, todo.id)}
    autoFocus
  />
) : (
  // 읽기 모드: 텍스트 표시
  <span onClick={(e) => handleStartEdit(e, todo)}>
    {todo.text}
  </span>
)}
```

**핵심 개념:**
- 삼항 연산자를 사용한 조건부 렌더링
- `editingId === todo.id`이면 input을, 아니면 span을 보여준다

---

## 이벤트 핸들러 패턴

### 패턴 1: React가 자동으로 이벤트 전달
```jsx
<form onSubmit={handleAddTodo}>
```

- React가 자동으로 `handleAddTodo(e)`를 호출
- 함수는 `(e)`를 매개변수로 받아야 함

### 패턴 2: 화살표 함수로 값 전달
```jsx
<span onClick={() => handleStartEdit(todo.id)}>
```

- 우리가 직접 원하는 값을 전달
- 함수는 전달한 값의 형태에 맞춰 매개변수를 받음

### 패턴 3: 이벤트 객체와 값 모두 전달
```jsx
<button onClick={(e) => handleDeleteTodo(e, todo.id)}>
```

- 이벤트 객체(e)와 추가 데이터를 함께 전달
- `stopPropagation()` 등 이벤트 제어가 필요할 때 사용

---

## 주요 개념 정리

### preventDefault()
- form의 기본 동작(페이지 새로고침)을 막는다
- 없으면 폼 제출 시 페이지가 새로고침되어 state가 초기화된다

### stopPropagation()
- 이벤트 버블링(자식→부모로 전파)을 중단한다
- 삭제 버튼 클릭 시 부모 요소의 클릭 이벤트가 실행되지 않도록 방지

### 삼항 연산자
```jsx
{조건 ? 참일때값 : 거짓일때값}
{todo.done ? '미완료' : '완료'}  // 완료 상태면 '미완료', 아니면 '완료'
```

### 논리 AND 연산자 (&&)
```jsx
{조건 && 실행할코드}
{e.key === "Enter" && handleSearch()}  // Enter 키면 검색 실행
```

---

## 완성된 코드
```jsx
import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:8000/todos";

const TodoList = () => {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const fetchTodos = async () => {
    const response = await axios.get(API_URL);
    setTodos(response.data);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  // --- 할 일 추가 기능 ---
  const handleAddTodo = async (e) => {
    e.preventDefault();
    
    if (inputValue.trim()) {
      await axios.post(API_URL, { text: inputValue });
      setInputValue("");
      fetchTodos();
    }
  };

  // --- 할 일 토글 기능 ---
  const handleToggleTodo = async (e, todoId) => {
    e.stopPropagation();
    await axios.put(`${API_URL}/${todoId}/toggle`);
    fetchTodos();
  };

  // --- 할 일 삭제 기능 ---
  const handleDeleteTodo = async (e, todoId) => {
    e.stopPropagation();
    await axios.delete(`${API_URL}/${todoId}`);
    fetchTodos();
  };

  // --- 수정 모드 시작 ---
  const handleStartEdit = (e, todo) => {
    e.stopPropagation();
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  // --- 수정 완료 (Enter 키) ---
  const handleUpdateTodo = async (e, todoId) => {
    if (e.key === "Enter") {
      if (editText.trim()) {
        await axios.put(`${API_URL}/${todoId}`, { text: editText });
        setEditingId(null);
        setEditText("");
        fetchTodos();
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">To Do List</h1>
      
      {/* --- 입력창과 추가 버튼 --- */}
      <form onSubmit={handleAddTodo} className="mb-6 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="할 일을 입력하세요"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          type="submit"
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          추가
        </button>
      </form>

      {/* --- 할 일 목록 --- */}
      <ul className="space-y-2">
        {todos.map((todo) => (
          <li 
            key={todo.id}
            className={`px-4 py-3 rounded-lg border transition-all flex justify-between items-center gap-2
              ${todo.done 
                ? 'line-through text-gray-400 bg-gray-50 border-gray-200' 
                : 'text-gray-800 bg-white border-gray-300'
              }`}
          >
            {editingId === todo.id ? (
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyPress={(e) => handleUpdateTodo(e, todo.id)}
                className="flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none"
                autoFocus
              />
            ) : (
              <span 
                onClick={(e) => handleStartEdit(e, todo)}
                className="flex-1 cursor-pointer"
              >
                {todo.text}
              </span>
            )}

            <button
              onClick={(e) => handleToggleTodo(e, todo.id)}
              className={`px-3 py-1 text-sm rounded transition-colors
                ${todo.done 
                  ? 'bg-gray-400 text-white hover:bg-gray-500' 
                  : 'bg-green-500 text-white hover:bg-green-600'
                }`}
            >
              {todo.done ? '미완료' : '완료'}
            </button>

            <button
              onClick={(e) => handleDeleteTodo(e, todo.id)}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoList;
```

---

## 학습 포인트

1. **FastAPI와 React 연동**: CORS 설정으로 다른 출처 간 통신 허용
2. **CRUD 구현**: Create(POST), Read(GET), Update(PUT), Delete(DELETE) 전체 구현
3. **이벤트 처리**: preventDefault, stopPropagation으로 이벤트 제어
4. **조건부 렌더링**: 삼항 연산자로 수정 모드와 읽기 모드 전환
5. **상태 관리**: 여러 개의 state를 조합하여 복잡한 UI 구현