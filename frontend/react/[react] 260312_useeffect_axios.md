# [TIL] React: useEffect와 Axios를 활용한 데이터 페칭

## 1. useEffect + Axios 기본

### 1. 설치 및 기본 사용

**설치**
```bash
npm install axios
```

**기본 패턴**
```jsx
import { useState, useEffect } from "react";
import axios from "axios";

const UserList = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const response = await axios.get(
        "https://jsonplaceholder.typicode.com/users"
      );
      setUsers(response.data);
    };

    fetchUsers();
  }, []); // 빈 배열: 처음 1번만 API 호출

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
};
```

**실행 흐름**
```
컴포넌트 렌더링 → useEffect 실행 → API 호출 → 
받은 데이터를 State에 저장 → 리렌더링
```

### 2. useEffect에서 async 사용 방법

**❌ 잘못된 방식**
```jsx
// useEffect 콜백에 직접 async를 붙이면 안 됨
useEffect(async () => {
  const response = await axios.get("/api/data");
  setData(response.data);
}, []);
```

**✅ 올바른 방식**
```jsx
// 내부에 async 함수를 만들어서 호출
useEffect(() => {
  const fetchData = async () => {
    const response = await axios.get("/api/data");
    setData(response.data);
  };

  fetchData();
}, []);
```

**이유**: useEffect는 return 값으로 정리 함수만 받을 수 있는데, async 함수는 항상 Promise를 반환하기 때문

---

## 2. 로딩 상태 관리

### 기본 로딩 패턴

```jsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchMovies = async () => {
    const response = await axios.get(
      "https://api.themoviedb.org/3/movie/now_playing?language=ko-KR",
      config
    );
    setMovies(response.data.results);
    setLoading(false); // 데이터 받은 후 로딩 종료
  };

  fetchMovies();
}, []);

if (loading) {
  return <div>영화 목록을 불러오는 중...</div>;
}

return (
  <div>
    {/* 영화 목록 표시 */}
  </div>
);
```

**핵심**: API 호출 전에 `loading = true`, 완료 후 `setLoading(false)`

---

## 3. 에러 처리

### try/catch/finally 패턴

```jsx
const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchUsers = async () => {
    try {
      const response = await axios.get(
        "https://jsonplaceholder.typicode.com/users"
      );
      setUsers(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); // 성공/실패 상관없이 로딩 종료
    }
  };

  fetchUsers();
}, []);

if (loading) return <p>로딩 중...</p>;
if (error) return <p>에러 발생: {error}</p>;

return (
  <ul>
    {users.map((user) => (
      <li key={user.id}>{user.name}</li>
    ))}
  </ul>
);
```

**finally를 사용하는 이유**
- try 블록에만 `setLoading(false)`를 넣으면 에러 발생 시 실행되지 않음
- finally는 성공/실패 여부와 관계없이 항상 실행됨

---

## 4. 옵셔널 체이닝 (`?.`)

### 안전한 데이터 접근

**문제 상황**
```jsx
// ❌ API 응답 전에는 user가 null이므로 에러 발생
const [user, setUser] = useState(null);

return <p>이름: {user.name}</p>; // TypeError!
```

**해결 방법**
```jsx
// ✅ 옵셔널 체이닝 사용
const [user, setUser] = useState(null);

useEffect(() => {
  const fetchUser = async () => {
    const response = await axios.get(
      "https://jsonplaceholder.typicode.com/users/1"
    );
    setUser(response.data);
  };

  fetchUser();
}, []);

return (
  <div>
    <p>이름: {user?.name}</p>
    <p>이메일: {user?.email}</p>
    <p>도시: {user?.address?.city}</p>
    <p>회사: {user?.company?.name}</p>
  </div>
);
```

**동작 원리**
- `user`가 `null`인 동안(API 응답 전): `user?.name`이 `undefined` 반환 → 에러 없음
- API 응답 후: `setUser`로 State 업데이트 → 리렌더링 → 데이터 표시

---

## 5. 의존성 배열 활용

### 특정 값이 변경될 때 API 재호출

```jsx
const [userId, setUserId] = useState(1);
const [posts, setPosts] = useState([]);

useEffect(() => {
  const fetchPosts = async () => {
    setLoading(true);
    const response = await axios.get(
      `https://jsonplaceholder.typicode.com/posts?userId=${userId}`
    );
    setPosts(response.data);
    setLoading(false);
  };

  fetchPosts();
}, [userId]); // userId가 변경될 때마다 실행

return (
  <div>
    <select 
      value={userId} 
      onChange={(e) => setUserId(Number(e.target.value))}
    >
      <option value={1}>사용자 1</option>
      <option value={2}>사용자 2</option>
      <option value={3}>사용자 3</option>
    </select>
    
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  </div>
);
```

**실행 흐름**
```
사용자가 select 변경 → setUserId 호출 → userId 변경 → 
useEffect 감지 → API 재호출 → 새로운 데이터 표시
```

---

## 6. 정리 함수 (Cleanup Function)

### 타이머 정리 예시

**❌ 정리 함수 없는 경우**
```jsx
const BadTimer = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timerId = setInterval(() => {
      console.log("타이머 실행 중...");
      setSeconds((prev) => prev + 1);
    }, 1000);
    // 정리 함수 없음 → 컴포넌트 사라져도 타이머 계속 실행
  }, []);

  return <p>{seconds}초 경과</p>;
};
```

**✅ 정리 함수 있는 경우**
```jsx
const GoodTimer = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timerId = setInterval(() => {
      console.log("타이머 실행 중...");
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      console.log("타이머 정리!");
      clearInterval(timerId); // 컴포넌트 언마운트 시 타이머 해제
    };
  }, []);

  return <p>{seconds}초 경과</p>;
};
```

**정리 함수가 실행되는 시점**
- 컴포넌트가 화면에서 사라질 때 (언마운트)
- 의존성 배열의 값이 변경되어 useEffect가 다시 실행되기 직전

---

## 7. 무한 루프 방지

### 잘못된 의존성 배열 설정

**❌ 무한 루프 발생**
```jsx
const [posts, setPosts] = useState([]);

useEffect(() => {
  const fetchPosts = async () => {
    const response = await axios.get("https://api.com/posts");
    setPosts(response.data); // posts 변경
  };

  fetchPosts();
}, [posts]); // posts가 변경되면 다시 실행 → 무한 반복!
```

**✅ 올바른 방식**
```jsx
useEffect(() => {
  const fetchPosts = async () => {
    const response = await axios.get("https://api.com/posts");
    setPosts(response.data);
  };

  fetchPosts();
}, []); // 빈 배열: 처음 1번만 실행
```

**주의사항**: useEffect 안에서 변경하는 State를 의존성 배열에 넣지 않기

---

## 8. 객체/배열을 의존성 배열에 넣을 때 주의점

### 참조 비교 문제

```jsx
// JavaScript의 참조 비교
console.log({ name: "철수" } === { name: "철수" }); // false
console.log([1, 2, 3] === [1, 2, 3]); // false
```

**❌ 잘못된 방식**
```jsx
const App = () => {
  const [count, setCount] = useState(0);
  
  const options = { limit: 10, offset: 0 }; // 렌더링마다 새 객체 생성

  useEffect(() => {
    console.log("API 호출!", options);
  }, [options]); // 매번 새 객체이므로 매번 실행됨

  return <button onClick={() => setCount(count + 1)}>+1</button>;
};
```

**✅ 올바른 방식**
```jsx
const App = () => {
  const [count, setCount] = useState(0);
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    console.log("API 호출!", { limit, offset });
  }, [limit, offset]); // 원시값은 값으로 비교되므로 실제 변경 시만 실행

  return <button onClick={() => setCount(count + 1)}>+1</button>;
};
```

**원칙**: 의존성 배열에는 가능하면 **문자열, 숫자, boolean** 같은 원시값을 넣기

---

## 9. StrictMode와 useEffect

### useEffect가 2번 실행되는 이유

```jsx
// main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**StrictMode의 동작**
- 개발 모드에서 useEffect를 **일부러 2번 실행**
- 마운트 → 정리 함수 실행 → 다시 마운트 순서로 실행
- 정리 함수가 제대로 작성되었는지 확인해줌

**중요**: 프로덕션(배포) 환경에서는 1번만 실행되므로, 개발 중에만 나타나는 현상

---

## 10. 실습 문제 해결 패턴

### 1. document.title 변경하기

```jsx
const [name, setName] = useState("");

useEffect(() => {
  document.title = name ? `안녕, ${name}!` : "React App";
}, [name]);

return (
  <input
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="이름"
  />
);
```

**핵심**: 삼항 연산자로 조건부 title 설정

### 2. 고양이 이미지 가져오기

```jsx
const [cats, setCats] = useState([]);

useEffect(() => {
  fetchCats();
}, []);

const fetchCats = async () => {
  const response = await axios.get(
    "https://api.thecatapi.com/v1/images/search?limit=5"
  );
  setCats(response.data);
};

return (
  <div>
    <button onClick={fetchCats}>다른 고양이 보기</button>
    <div>
      {cats.map((cat) => (
        <img 
          key={cat.id} 
          src={cat.url} 
          alt="고양이" 
          className="w-52 m-2.5"
        />
      ))}
    </div>
  </div>
);
```

**핵심**: 
- 함수를 useEffect 밖으로 빼내면 버튼에서도 재사용 가능
- useEffect 없이도 버튼 클릭으로 API 재호출 가능

### 3. TMDB 영화 목록 표시

```jsx
const [movies, setMovies] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchMovies = async () => {
    const config = {
      headers: {
        Authorization: "Bearer YOUR_TMDB_API_TOKEN",
      },
    };

    const response = await axios.get(
      "https://api.themoviedb.org/3/movie/now_playing?language=ko-KR",
      config
    );
    setMovies(response.data.results);
    setLoading(false);
  };

  fetchMovies();
}, []);

if (loading) {
  return <div>영화 목록을 불러오는 중...</div>;
}

return (
  <div className="flex flex-wrap">
    {movies.map((movie) => (
      <div key={movie.id} className="m-2.5">
        <img 
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt={movie.title}
          className="w-52"
        />
        <h3 className="font-bold text-center">{movie.title}</h3>
      </div>
    ))}
  </div>
);
```

**핵심**: 
- config 객체로 헤더 설정
- `response.data.results`로 영화 배열 접근
- Tailwind로 Flexbox 레이아웃 구성

### 4. 할 일 목록 (사용자별 조회)

```jsx
const [todos, setTodos] = useState([]);
const [userId, setUserId] = useState(1);

useEffect(() => {
  const fetchTodos = async () => {
    setLoading(true);
    const response = await axios.get(
      `https://jsonplaceholder.typicode.com/todos?userId=${userId}`
    );
    setTodos(response.data);
    setLoading(false);
  };

  fetchTodos();
}, [userId]); // userId 변경 시 재호출

return (
  <div>
    <select 
      value={userId} 
      onChange={(e) => setUserId(e.target.value)}
    >
      <option value={1}>사용자 1</option>
      <option value={2}>사용자 2</option>
      {/* ... */}
    </select>

    <h3>완료된 항목</h3>
    <ul>
      {todos
        .filter((todo) => todo.completed)
        .map((todo) => (
          <li key={todo.id} className="line-through text-gray-500">
            {todo.title}
          </li>
        ))}
    </ul>

    <h3>미완료 항목</h3>
    <ul>
      {todos
        .filter((todo) => !todo.completed)
        .map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
    </ul>
  </div>
);
```

**핵심**: 
- select의 value와 onChange로 Controlled Component 구현
- filter로 완료/미완료 항목 구분

### 5. 영화 검색

```jsx
const [movies, setMovies] = useState([]);
const [searchTerm, setSearchTerm] = useState("batman"); // 초기 검색어
const [inputValue, setInputValue] = useState("");

useEffect(() => {
  const fetchMovies = async () => {
    setLoading(true);
    const config = {
      headers: {
        Authorization: "Bearer YOUR_TOKEN",
      },
    };

    const response = await axios.get(
      `https://api.themoviedb.org/3/search/movie?query=${searchTerm}&language=ko-KR`,
      config
    );
    setMovies(response.data.results);
    setLoading(false);
  };

  fetchMovies();
}, [searchTerm]); // searchTerm 변경 시 재호출

const handleSearch = () => {
  if (inputValue.trim()) {
    setSearchTerm(inputValue);
  }
};

return (
  <div>
    <input
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onKeyPress={(e) => e.key === "Enter" && handleSearch()}
      placeholder="영화 제목을 입력하세요"
    />
    <button onClick={handleSearch}>검색</button>
    
    {/* 영화 목록 표시 */}
  </div>
);
```

**핵심**: 
- `searchTerm`: 실제 검색에 사용 (useEffect 의존성)
- `inputValue`: input 창의 현재 값
- Enter 키와 버튼 클릭 모두 지원

### 6. 상품 정렬

```jsx
const [products, setProducts] = useState([]);
const [sortBy, setSortBy] = useState("id");
const [order, setOrder] = useState("asc");

useEffect(() => {
  const fetchProducts = async () => {
    setLoading(true);
    const response = await axios.get(
      `https://dummyjson.com/products?sortBy=${sortBy}&order=${order}`
    );
    setProducts(response.data.products);
    setLoading(false);
  };

  fetchProducts();
}, [sortBy, order]); // sortBy 또는 order 변경 시 재호출

const handleSort = (newSortBy, newOrder) => {
  setSortBy(newSortBy);
  setOrder(newOrder);
};

return (
  <div>
    <button onClick={() => handleSort("id", "asc")}>
      ID 오름차순
    </button>
    <button onClick={() => handleSort("id", "desc")}>
      ID 내림차순
    </button>
    <button onClick={() => handleSort("price", "asc")}>
      가격 오름차순
    </button>
    <button onClick={() => handleSort("price", "desc")}>
      가격 내림차순
    </button>
    
    {products.map((product) => (
      <div key={product.id}>
        <h3>{product.title}</h3>
        <p>ID: {product.id}</p>
        <p>가격: ${product.price}</p>
        <p>평점: ⭐ {product.rating}</p>
      </div>
    ))}
  </div>
);
```

**핵심**: 
- 여러 state를 조합하여 API URL 구성
- 화살표 함수로 인자 전달

### 7. 페이지네이션

```jsx
const [posts, setPosts] = useState([]);
const [skip, setSkip] = useState(0);

const limit = 10;
const totalPosts = 251;
const totalPages = Math.ceil(totalPosts / limit); // 26
const currentPage = Math.floor(skip / limit) + 1; // 현재 페이지

useEffect(() => {
  const fetchPosts = async () => {
    setLoading(true);
    const response = await axios.get(
      `https://dummyjson.com/posts?limit=${limit}&skip=${skip}`
    );
    setPosts(response.data.posts);
    setLoading(false);
  };

  fetchPosts();
}, [skip]);

const goToFirst = () => setSkip(0);

const goToPrev = () => {
  if (skip === 0) {
    alert("첫 페이지입니다");
  } else {
    setSkip(skip - limit);
  }
};

const goToNext = () => {
  if (skip + limit >= totalPosts) {
    alert("마지막 페이지입니다");
  } else {
    setSkip(skip + limit);
  }
};

const goToLast = () => setSkip((totalPages - 1) * limit);

return (
  <div>
    <button onClick={goToFirst}>처음으로</button>
    <button onClick={goToPrev}>이전</button>
    <span>{currentPage} / {totalPages} 페이지</span>
    <button onClick={goToNext}>다음</button>
    <button onClick={goToLast}>마지막으로</button>
    
    {posts.map((post) => (
      <div key={post.id}>
        <h3>[{post.id}] {post.title}</h3>
        <p>{post.body}</p>
      </div>
    ))}
  </div>
);
```

**핵심 계산**:
- `totalPages = Math.ceil(251 / 10) = 26`
- `currentPage = Math.floor(skip / 10) + 1`
- `skip = (페이지번호 - 1) * 10`

**Math.floor를 쓰는 이유**:
```
skip = 0~9   → 0 / 10 = 0.x → floor(0.x) = 0 → 1페이지
skip = 10~19 → 10 / 10 = 1.x → floor(1.x) = 1 → 2페이지
skip = 20~29 → 20 / 10 = 2.x → floor(2.x) = 2 → 3페이지
```
내림을 사용해야 "현재 몇 번째 구간(묶음)에 있는지"를 정확히 계산 가능

---

## 11. 핵심 개념 정리

### useEffect 의존성 배열

| 패턴 | 실행 시점 | 용도 |
|------|----------|------|
| `[]` | 마운트 시 1번 | 초기 데이터 로딩 |
| `[userId]` | userId 변경 시 | 특정 값 변경에 따른 재조회 |
| `[sortBy, order]` | 둘 중 하나 변경 시 | 여러 조건 변경에 따른 재조회 |
| 생략 | 매 렌더링마다 | 거의 사용 안 함 (무한 루프 위험) |

### API 호출 패턴

| 상황 | 패턴 |
|------|------|
| 단순 조회 | `useEffect(() => { fetchData(); }, []);` |
| 조건부 재조회 | `useEffect(() => { fetchData(); }, [condition]);` |
| 버튼 클릭 재조회 | 함수를 밖으로 빼고 `onClick={fetchData}` |
| 검색 | input state와 검색어 state 분리 |
| 정렬 | sortBy, order state로 URL 동적 구성 |
| 페이지네이션 | skip/offset state로 구간 계산 |

### 에러 처리 흐름

```
try {
  API 호출
  데이터 저장
} catch (err) {
  에러 메시지 저장
} finally {
  로딩 상태 종료  ← 성공/실패 상관없이 실행
}
```

### 주요 Math 함수

| 함수 | 설명 | 예시 |
|------|------|------|
| `Math.ceil()` | 올림 | `Math.ceil(25.1) = 26` (총 페이지 수) |
| `Math.floor()` | 내림 | `Math.floor(15 / 10) = 1` (현재 구간) |
| `Math.round()` | 반올림 | 페이지네이션에는 부적합 |

### 데이터 흐름

```
사용자 입력/선택
    ↓
State 변경 (setXxx)
    ↓
useEffect 감지 (의존성 배열)
    ↓
API 호출 (axios.get)
    ↓
응답 데이터를 State에 저장
    ↓
컴포넌트 리렌더링
    ↓
화면 업데이트
```