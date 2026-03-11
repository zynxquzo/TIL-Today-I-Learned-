# [TIL] React: 이벤트 핸들링과 State 관리

## 1. 이벤트 핸들링

### 1. React에서의 이벤트 처리

React에서는 HTML 인라인 이벤트 속성(`onClick`, `onChange` 등)을 사용하여 이벤트를 처리한다. `addEventListener` 메서드는 사용하지 않는다.

**기존 JavaScript vs React**
```jsx
// 기존 JavaScript 방식
const button = document.querySelector("button");
button.addEventListener("click", () => {
  alert("클릭!");
});

// React 방식
const App = () => {
  const handleClick = () => {
    alert("클릭!");
  };
  return <button onClick={handleClick}>버튼</button>;
};
```

### 2. 이벤트 핸들러 전달 방식

**파라미터가 없을 때**

함수 참조만 전달하고, `()` 없이 함수 이름만 작성한다.
```jsx
const handleClick = () => {
  alert("클릭!");
};

<button onClick={handleClick}>버튼</button>
```

**파라미터가 있을 때**

화살표 함수로 감싸서 호출한다. 감싸지 않으면 렌더링 시점에 즉시 실행된다.
```jsx
const handleClick = (buttonName) => {
  alert(`${buttonName} 클릭`);
};

<button onClick={() => handleClick("1번 버튼")}>1번 버튼</button>
```

**event 객체 사용**

핸들러 함수의 첫 번째 파라미터로 `event`를 받아 사용한다.
```jsx
const handleChange = (event) => {
  console.log(event.target.value);
};

<input type="text" onChange={handleChange} />
```

### 3. 주요 이벤트 종류

**onClick - 클릭 이벤트**
```jsx
<button onClick={() => handleClick("버튼")}>클릭</button>
```

**onChange - 입력 이벤트**

React에서는 `onChange`가 키 입력마다 즉시 발생한다.
```jsx
<input type="text" onChange={(e) => console.log(e.target.value)} />
```

**onSubmit - 폼 제출 이벤트**

`event.preventDefault()`로 기본 동작(페이지 새로고침)을 막는다.
```jsx
const handleSubmit = (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  console.log(formData.get("email"));
};

<form onSubmit={handleSubmit}>
  <input type="email" name="email" />
  <button type="submit">제출</button>
</form>
```

---

## 2. State

### 1. State란?

컴포넌트 내부에서 변화하는 데이터를 관리하는 값이다. State가 변경되면 컴포넌트가 자동으로 리렌더링된다.

**일반 변수와의 차이**
```jsx
// ❌ 일반 변수 - 화면 업데이트 안 됨
let number = 0;
const handleClick = () => {
  number = number + 1;  // 값은 증가하지만 화면에 반영 안 됨
};

// ✅ State - 화면 자동 업데이트
const [count, setCount] = useState(0);
const handleClick = () => {
  setCount(count + 1);  // 화면에 자동 반영
};
```

### 2. useState 기본 사용법
```jsx
const [상태값, 상태변경함수] = useState(초기값);
```

**숫자 State**
```jsx
const [count, setCount] = useState(0);

const increaseCount = () => {
  setCount(count + 1);
};

<button onClick={increaseCount}>+1</button>
<p>카운트: {count}</p>
```

**문자열 State**
```jsx
const [name, setName] = useState("");

<input 
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
<p>안녕하세요 {name}님!</p>
```

**Boolean State (토글)**
```jsx
const [isOn, setIsOn] = useState(false);

const handleToggle = () => {
  setIsOn(!isOn);
};

<p>상태: {isOn ? "ON" : "OFF"}</p>
<button onClick={handleToggle}>토글</button>
```

### 3. 객체 State

객체를 State로 관리할 때는 반드시 새 객체를 만들어서 전달해야 한다.

**Spread 연산자로 객체 업데이트**
```jsx
const [user, setUser] = useState({
  name: "현우",
  age: 22
});

const handleBirthday = () => {
  setUser({ ...user, age: user.age + 1 });
};

<p>이름: {user.name}</p>
<p>나이: {user.age}</p>
<button onClick={handleBirthday}>생일 축하!</button>
```

**여러 필드를 하나의 객체로 관리**
```jsx
const [form, setForm] = useState({
  name: "",
  email: "",
  age: ""
});

const handleChange = (e) => {
  setForm({ ...form, [e.target.name]: e.target.value });
};

<input name="name" value={form.name} onChange={handleChange} />
<input name="email" value={form.email} onChange={handleChange} />
<input name="age" value={form.age} onChange={handleChange} />
```

### 4. 배열 State

배열을 State로 관리할 때도 새 배열을 만들어서 전달해야 한다.

**배열에 항목 추가**
```jsx
const [todos, setTodos] = useState(["리액트 공부", "점심 먹기"]);
const [input, setInput] = useState("");

const handleAdd = () => {
  if (input.trim() === "") return;
  setTodos([...todos, input]);
  setInput("");
};

<input value={input} onChange={(e) => setInput(e.target.value)} />
<button onClick={handleAdd}>추가</button>
<ul>
  {todos.map((todo, index) => (
    <li key={index}>{todo}</li>
  ))}
</ul>
```

**배열에서 항목 삭제 (filter)**
```jsx
const handleDelete = (id) => {
  setTodos(todos.filter((todo) => todo.id !== id));
};
```

**배열 항목 수정 (map)**
```jsx
const handleToggleLike = (id) => {
  setTodos(todos.map((todo) => 
    todo.id === id 
      ? {...todo, liked: !todo.liked}
      : todo
  ));
};
```

---

## 3. Controlled Component

### 1. Controlled Component란?

input의 값을 State로 제어하는 컴포넌트이다. `value`와 `onChange`를 함께 사용한다.
```jsx
const [input, setInput] = useState("");

<input
  value={input}                              // State 값 표시
  onChange={(e) => setInput(e.target.value)} // State 업데이트
/>
```

### 2. 장점

- 입력값을 프로그래밍으로 제어 가능
- 실시간 검증 및 변환 가능
- 폼 제출 후 입력창 초기화 쉬움

**실시간 검증 예시**
```jsx
const [email, setEmail] = useState("");
const isValid = email.includes("@");

<input value={email} onChange={(e) => setEmail(e.target.value)} />
{!isValid && email.length > 0 && (
  <p style={{color: 'red'}}>이메일 형식이 올바르지 않습니다</p>
)}
```

---

## 4. Form 처리 패턴

### 1. 기본 Form 제출
```jsx
const handleSubmit = (e) => {
  e.preventDefault();  // 페이지 새로고침 방지
  alert(`ID: ${id}, PW: ${password}`);
};

<form onSubmit={handleSubmit}>
  <input type="text" />
  <button type="submit">제출</button>
</form>
```

### 2. Enter 키 지원

`<form>` 태그를 사용하면 브라우저가 자동으로 Enter 키를 처리한다.
```jsx
<form onSubmit={handleSubmit}>
  <input />  {/* Enter 키 입력 → handleSubmit 실행 */}
  <button type="submit">추가</button>
</form>
```

### 3. 통합 핸들러 패턴

하나의 `handleChange` 함수로 여러 input을 처리한다.
```jsx
const [form, setForm] = useState({ id: "", password: "", email: "" });

const handleChange = (e) => {
  setForm({ ...form, [e.target.name]: e.target.value });
};

<input name="id" value={form.id} onChange={handleChange} />
<input name="password" value={form.password} onChange={handleChange} />
<input name="email" value={form.email} onChange={handleChange} />
```

---

## 5. 컴포넌트 분리와 Props

### 1. Props로 State 전달

부모 컴포넌트에서 State를 관리하고, 자식 컴포넌트에 Props로 전달한다.

**부모 컴포넌트**
```jsx
const MessageContainer = () => {
  const [message, setMessage] = useState("");

  return (
    <div>
      <MessageInput message={message} setMessage={setMessage} />
      <MessageDisplay message={message} />
    </div>
  );
};
```

**자식 컴포넌트 (입력)**
```jsx
const MessageInput = ({ message, setMessage }) => {
  return (
    <input
      value={message}
      onChange={(e) => setMessage(e.target.value)}
    />
  );
};
```

**자식 컴포넌트 (표시)**
```jsx
const MessageDisplay = ({ message }) => {
  return <p>{message || "메시지가 없습니다"}</p>;
};
```

### 2. 함수를 Props로 전달

부모의 함수를 자식에게 전달하여 State를 업데이트한다.
```jsx
// 부모
const FavoriteFood = () => {
  const [foods, setFoods] = useState([]);
  
  const handleAdd = (foodText) => {
    setFoods([...foods, {id: Date.now(), text: foodText}]);
  };

  return (
    <div>
      <FoodInput onAdd={handleAdd} />
      <FoodList foods={foods} />
    </div>
  );
};

// 자식
const FoodInput = ({ onAdd }) => {
  const [input, setInput] = useState("");
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd(input);  // 부모 함수 호출
    setInput("");
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
};
```

---

## 6. 핵심 개념 정리

### 이벤트 핸들링

| 이벤트 | 용도 | 주의사항 |
|--------|------|---------|
| `onClick` | 클릭 | 파라미터 있으면 화살표 함수로 감싸기 |
| `onChange` | 입력 | `value`와 함께 사용 (Controlled) |
| `onSubmit` | 폼 제출 | `e.preventDefault()` 필수 |

### State 업데이트 규칙

| 타입 | 업데이트 방법 | 예시 |
|------|--------------|------|
| 숫자/문자열 | 직접 변경 | `setState(newValue)` |
| 객체 | Spread 연산자 | `setState({...state, key: value})` |
| 배열 (추가) | Spread 연산자 | `setState([...state, newItem])` |
| 배열 (삭제) | filter | `setState(state.filter(item => item.id !== id))` |
| 배열 (수정) | map | `setState(state.map(item => ...))` |

### 데이터 흐름
```
부모 컴포넌트 (State 소유)
 ├── Props 전달 → 자식 컴포넌트
 ├── 함수 전달 → 자식이 State 업데이트
 └── State 변경 → 자동 리렌더링
```