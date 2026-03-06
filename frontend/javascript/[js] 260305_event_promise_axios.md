# [TIL] JavaScript: 이벤트, Promise, Axios

## 1. 이벤트(Event)

### 1. 이벤트의 개념

이벤트는 **웹 페이지에서 발생하는 특정 사건에 대한 신호**다. 사용자의 클릭, 키 입력, 마우스 이동 등 다양한 상호작용을 감지하여 처리할 수 있다.

### 2. 주요 이벤트 종류

| 카테고리 | 이벤트 | 설명 |
|---|---|---|
| 마우스 | `click`, `dblclick`, `mousemove`, `mouseover`, `mouseout` | 마우스 관련 동작 |
| 키보드 | `keydown`, `keyup` | 키보드 입력 |
| 입력 | `input`, `change`, `focus`, `blur` | 폼 요소 상태 변화 |
| 폼 | `submit` | 폼 제출 |
| 문서 | `scroll`, `resize` | 문서/창 크기 변화 |

---

## 2. 이벤트 핸들러 등록

### 1. HTML 인라인 이벤트 속성

HTML 요소에 직접 이벤트 핸들러를 지정하는 방법이다.

```html
<button onclick="handleClick()">클릭하세요</button>
<script>
  function handleClick() {
    alert("버튼 클릭됨");
  }
</script>
```

**특징:**
- 구조(HTML)와 동작(JS)이 결합되어 있음
- Vanilla JavaScript에서는 권장하지 않음
- React에서는 권장되는 방법

### 2. JavaScript 이벤트 속성

JavaScript 코드에서 요소의 이벤트 속성에 핸들러를 할당하는 방법이다.

```javascript
const button = document.querySelector("#my-button");
button.onclick = function () {
  alert("버튼 클릭됨");
};
```

**특징:**
- 하나의 이벤트 속성에 하나의 핸들러만 등록 가능

### 3. addEventListener() - 권장 방법

가장 유연하고 강력한 이벤트 핸들러 등록 방법이다.

```javascript
element.addEventListener(type, handler, options);
```

**예시:**

```javascript
const button = document.querySelector("#my-button");

button.addEventListener("click", function (event) {
  console.log("버튼 클릭됨");
});
```

**장점:**
- 하나의 이벤트에 여러 핸들러 등록 가능
- 구조와 동작을 분리할 수 있음
- Vanilla JavaScript에서 가장 권장되는 방법

---

## 3. 이벤트 핸들러 제거

### removeEventListener()

등록된 이벤트 핸들러를 제거할 때 사용한다.

```javascript
element.removeEventListener(type, handler, options);
```

**예시:**

```javascript
function handleClick(event) {
  console.log("버튼 클릭됨");
}

const button = document.querySelector("#my-button");

// 이벤트 등록
button.addEventListener("click", handleClick);

// 이벤트 제거
button.removeEventListener("click", handleClick);
```

**주의:** 제거하려면 등록할 때 사용한 함수를 참조해야 한다. 익명 함수는 제거할 수 없다.

---

## 4. 이벤트 전파 (Event Propagation)

### 1. 이벤트 전파의 개념

이벤트가 발생하면 해당 요소에서만 처리되지 않고, 최상위 노드부터 이벤트가 발생한 노드를 거쳐 다시 최상위 노드로 전파된다.

### 2. 이벤트 전파 3단계

1. **캡처링 단계**: 최상위 요소에서 이벤트가 발생한 요소로 내려가는 과정
2. **타겟 단계**: 이벤트가 발생한 요소에서 이벤트가 처리되는 과정
3. **버블링 단계**: 이벤트가 발생한 요소에서 최상위 요소로 올라가는 과정

---

## 5. 이벤트 버블링 (Event Bubbling)

### 1. 버블링의 개념

이벤트가 발생한 요소에서 최상위 요소로 올라가는 과정이다.

**전파 순서:**
이벤트가 발생한 요소 → `div` → `<body>` → `<html>` → `document` → `window`

### 2. event.target vs event.currentTarget

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="parent" style="padding: 20px; background: #eee;">
      최상위 div (parent)
      <div id="child" style="padding: 20px; background: #ccc;">
        상위 div (child)
        <button id="button">클릭</button>
      </div>
    </div>

    <script>
      const parent = document.querySelector("#parent");
      const child = document.querySelector("#child");
      const button = document.querySelector("#button");

      function logEvent(event) {
        console.log(`[${event.currentTarget.id}] 핸들러 실행`);
        console.log(`- event.target:`, event.target.id);        // 처음 클릭된 요소
        console.log(`- event.currentTarget:`, event.currentTarget.id); // 현재 핸들러가 걸린 요소
        console.log("----------------------------");
      }

      parent.addEventListener("click", logEvent);
      child.addEventListener("click", logEvent);
      button.addEventListener("click", logEvent);
    </script>
  </body>
</html>
```

**차이점:**
- `event.target`: 최초로 이벤트가 발생한 지점 (클릭된 실제 요소)
- `event.currentTarget`: 리스너가 직접 걸려 있는 지점 (addEventListener를 호출한 요소)

### 3. 이벤트 위임 (Event Delegation)

여러 자식 요소에 각각 이벤트 핸들러를 등록하는 대신, 부모 요소에 하나의 이벤트 핸들러를 등록하는 방법이다.

**예시:**

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      li { cursor: pointer; }
      .completed { text-decoration: line-through; }
    </style>
  </head>
  <body>
    <ul id="listContainer">
      <li>Item 1</li>
      <li>Item 2</li>
      <li>Item 3</li>
    </ul>
    <script>
      const listContainer = document.querySelector("#listContainer");

      listContainer.addEventListener("click", (event) => {
        if (event.target.tagName.toLowerCase() === "li") {
          event.target.classList.toggle("completed");
        }
      });
    </script>
  </body>
</html>
```

**장점:**
- 여러 개의 이벤트 핸들러 대신 하나만 등록하여 성능 향상
- 동적으로 추가되는 요소에도 자동으로 이벤트 적용
- React에서는 이벤트 위임이 기본적으로 적용되어 있음

---

## 6. 이벤트 캡처링 (Event Capturing)

### 1. 캡처링의 개념

최상위 요소에서 이벤트가 발생한 요소로 내려가는 과정이다.

**전파 순서:**
`window` → `document` → `<html>` → `<body>` → `div` → ... → 이벤트가 발생한 요소

### 2. 캡처링 활성화

`addEventListener`의 세 번째 매개변수를 `{capture: true}`로 설정하면 캡처링 단계에서 이벤트를 처리한다.

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="parent">
      <div id="child">
        <button id="button">클릭</button>
      </div>
    </div>
    <script>
      const parent = document.querySelector("#parent");
      const child = document.querySelector("#child");
      const button = document.querySelector("#button");

      // 캡처링 단계에서 이벤트 처리
      parent.addEventListener(
        "click",
        () => { console.log("최상위 div 캡처링"); },
        { capture: true }
      );

      child.addEventListener(
        "click",
        () => { console.log("상위 div 캡처링"); },
        { capture: true }
      );

      button.addEventListener("click", () => {
        console.log("버튼 클릭");
      });

      // 버튼 클릭 시 출력:
      // "최상위 div 캡처링"
      // "상위 div 캡처링"
      // "버튼 클릭"
    </script>
  </body>
</html>
```

**특징:**
- 별도의 옵션이 필요하므로 기본적으로는 발생하지 않음

---

## 7. 이벤트 전파 차단

### event.stopPropagation()

이벤트가 상위 요소로 전파(버블링, 캡처링)되는 것을 막는 메서드다.

```html
<!DOCTYPE html>
<html>
  <body>
    <div id="parent">
      <div id="child">
        <button id="button">클릭</button>
      </div>
    </div>
    <script>
      const parent = document.querySelector("#parent");
      const child = document.querySelector("#child");
      const button = document.querySelector("#button");

      parent.addEventListener("click", () => {
        console.log("최상위 div 클릭");
      });

      child.addEventListener("click", (event) => {
        console.log("상위 div 클릭");
        event.stopPropagation(); // 부모 요소로의 이벤트 전파를 막음
      });

      button.addEventListener("click", () => {
        console.log("버튼 클릭");
      });

      // 버튼 클릭 시 출력:
      // "버튼 클릭"
      // "상위 div 클릭"
    </script>
  </body>
</html>
```

**사용 시나리오:**
- 중첩된 요소에서 자식 요소의 이벤트가 부모 요소에 영향을 주지 않도록 할 때

---

## 8. Promise

### 1. Promise의 개념

Promise는 **비동기 작업의 결과를 담는 객체**다. 쉽게 말해, "나중에 결과를 알려줄게"라는 약속이다.

**사용 시나리오:**
- 서버 요청
- 파일 읽기
- 시간이 걸리는 작업

### 2. Promise의 3가지 상태

- **대기(Pending)**: 작업이 아직 진행 중
- **이행(Fulfilled)**: 작업이 성공적으로 완료됨
- **거부(Rejected)**: 작업이 실패함

---

## 9. Promise 생성

### 1. 기본 구조

```javascript
const promise = new Promise((resolve, reject) => {
  // 비동기 작업 수행
  // 성공하면 resolve(결과)
  // 실패하면 reject(에러)
});
```

### 2. 성공하는 Promise

```javascript
const promise = new Promise((resolve, reject) => {
  resolve("성공!");
});

console.log(promise); // Promise { '성공!' }
```

### 3. 실패하는 Promise

```javascript
const promise = new Promise((resolve, reject) => {
  reject("실패!");
});

console.log(promise); // Promise { <rejected> '실패!' }
```

---

## 10. Promise 결과 사용

### 1. .then() - 성공 처리

```javascript
const promise = new Promise((resolve, reject) => {
  resolve("성공 데이터");
});

promise.then((result) => {
  console.log(result); // "성공 데이터"
});
```

### 2. .catch() - 실패 처리

```javascript
const promise = new Promise((resolve, reject) => {
  reject("에러 발생");
});

promise.catch((error) => {
  console.log(error); // "에러 발생"
});
```

### 3. .then()과 .catch() 함께 사용

```javascript
const promise = new Promise((resolve, reject) => {
  resolve("성공!");
});

promise
  .then((result) => {
    console.log("성공:", result);
  })
  .catch((error) => {
    console.log("실패:", error);
  });
```

---

## 11. Promise 실용 예시

### 1. 시간이 걸리는 작업 시뮬레이션

```javascript
const order = new Promise((resolve, reject) => {
  console.log("주문 접수!");

  setTimeout(() => {
    resolve("치킨");
  }, 2000); // 2초 후 완료
});

console.log("다른 일 하는 중...");

order.then((food) => {
  console.log(`${food} 도착!`);
});

// 출력:
// "주문 접수!"
// "다른 일 하는 중..."
// "치킨 도착!"  ← 2초 후 출력
```

### 2. Promise를 반환하는 함수

```javascript
function fetchFood(menu) {
  return new Promise((resolve, reject) => {
    if (menu === "치킨") {
      resolve("치킨 준비 완료!");
    } else {
      reject("해당 메뉴는 품절입니다.");
    }
  });
}

// 성공하는 경우
fetchFood("치킨")
  .then((result) => {
    console.log(result); // "치킨 준비 완료!"
  })
  .catch((error) => {
    console.log(error);
  });

// 실패하는 경우
fetchFood("피자")
  .then((result) => {
    console.log(result);
  })
  .catch((error) => {
    console.log(error); // "해당 메뉴는 품절입니다."
  });
```

---

## 12. .then() 체이닝

### 1. 순차적 작업 연결

`.then()` 안에서 값을 `return`하면 다음 `.then()`에서 받아서 사용할 수 있다.

```javascript
function getNumber() {
  return new Promise((resolve, reject) => {
    resolve(1);
  });
}

getNumber()
  .then((num) => {
    console.log(num); // 1
    return num + 1;
  })
  .then((num) => {
    console.log(num); // 2
    return num + 1;
  })
  .then((num) => {
    console.log(num); // 3
  });

// 출력:
// 1
// 2
// 3
```

---

## 13. Promise와 async/await

### 1. 비교

`.then()`/`.catch()` 대신 `async/await`로 더 간결하게 작성할 수 있다. 같은 동작을 하지만 코드가 위에서 아래로 읽혀서 **더 직관적**이다.

**`.then()` 방식:**

```javascript
fetchFood("치킨")
  .then((result) => {
    console.log(result);
  })
  .catch((error) => {
    console.log(error);
  });
```

**`async/await` 방식 (같은 동작):**

```javascript
async function order() {
  try {
    const result = await fetchFood("치킨");
    console.log(result);
  } catch (error) {
    console.log(error);
  }
}

order();
```

### 2. Axios와의 관계

Axios 같은 라이브러리가 반환하는 것도 Promise다. 그래서 `await axios.get()`처럼 사용할 수 있다.

---

## 14. Promise.all()

### 1. 개념

여러 개의 비동기 작업을 **동시에** 실행하고, **모두 완료되면** 결과를 받는다.

```javascript
Promise.all([promise1, promise2, promise3])
  .then((results) => {
    // results = [결과1, 결과2, 결과3]
  });
```

### 2. 예시

```javascript
function getUser(id) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`유저${id}`);
    }, 1000);
  });
}

Promise.all([getUser(1), getUser(2), getUser(3)])
  .then((users) => {
    console.log(users);
  });

// 출력 (1초 후):
// ["유저1", "유저2", "유저3"]
```

**특징:**
- 하나씩 순서대로 실행하면 3초 걸리지만, `Promise.all()`은 동시에 실행하므로 **1초**면 완료

### 3. 하나라도 실패하면?

`Promise.all()`은 하나라도 실패하면 **전체가 실패** 처리된다.

```javascript
Promise.all([
  Promise.resolve("성공1"),
  Promise.reject("실패!"),
  Promise.resolve("성공3"),
])
  .then((results) => {
    console.log(results); // 실행되지 않음
  })
  .catch((error) => {
    console.log(error); // "실패!"
  });
```

---

## 15. Axios

### 1. Axios의 개념

**외부 서버와 데이터를 주고받기 위한 HTTP 통신 라이브러리**다.

**특징:**
- 웹 브라우저에서 다른 서버의 데이터를 가져오거나 보낼 때 사용
- 비동기 방식으로 동작하여 서버 응답을 기다리는 동안 다른 작업 수행 가능

### 2. 설치

```bash
npm install axios
```

**package.json 추가 설정:**

```json
{
  "type": "module"
}
```

---

## 16. Axios 기본 구조

### async/await 방식

```javascript
import axios from "axios";

const getPosts = async (url) => {
  try {
    const response = await axios.get(url);
    console.log(response.data);
  } catch (error) {
    console.error(error.message);
  }
};

getPosts(`https://jsonplaceholder.typicode.com/posts/1`);
```

---

## 17. JavaScript의 async/await

### Python과의 비교

```python
# Python
async def get_data():
    result = await fetch_data()
    print(result)
```

```javascript
// JavaScript
async function getData() {
  const result = await fetchData();
  console.log(result);
}
```

**개념:**
- `async`: 함수 앞에 붙여서 비동기 함수로 선언
- `await`: 비동기 작업의 결과가 올 때까지 기다림

---

## 18. Axios 응답 객체

### 응답 객체 구조

```javascript
async function getUsers() {
  const response = await axios.get(
    "https://jsonplaceholder.typicode.com/users"
  );

  console.log(response.data);   // 서버가 보내준 실제 데이터
  console.log(response.status); // HTTP 상태 코드 (200, 404 등)
}

getUsers();
```

---

## 19. 에러 처리

### try/catch 사용

서버 요청은 **항상 성공하지 않는다** (네트워크 오류, 서버 오류 등). `try/catch`를 사용하여 에러 상황을 처리한다.

```javascript
import axios from "axios";

async function getUser() {
  try {
    const response = await axios.get(
      "https://jsonplaceholder.typicode.com/users/1"
    );
    console.log(response.data);
  } catch (error) {
    console.error("에러 발생:", error.message);
  }
}

getUser();
```

---

## 20. Query Params (쿼리 파라미터)

### 1. 개념

URL 뒤에 `?key=value` 형태로 붙는 검색/필터 조건이다. `params` 옵션을 사용하면 자동으로 URL에 붙여준다.

### 2. 사용 방법

```javascript
// params 없이 직접 작성
axios.get("https://example.com/posts?userId=1&page=2");

// params 옵션 사용 (같은 결과)
const config = {
  params: {
    userId: 1,
    page: 2,
  },
};

axios.get("https://example.com/posts", config);
```

### 3. 예시

```javascript
import axios from "axios";

async function getUserPosts(userId) {
  const config = {
    params: {
      userId: userId,
    },
  };

  const response = await axios.get(
    "https://jsonplaceholder.typicode.com/posts",
    config
  );
  console.log(response.data);
}

getUserPosts(1); // userId가 1인 게시글만 가져옴
```

---

## 21. Headers (헤더)

### 1. 개념

서버에 **추가 정보**를 전달할 때 사용한다. 주로 인증 토큰(로그인 정보)을 보낼 때 사용한다.

### 2. GET 요청에 헤더 추가

```javascript
import axios from "axios";

async function getProtectedData() {
  const config = {
    headers: {
      Authorization: "Bearer abc123token",
    },
  };

  const response = await axios.get("https://example.com/api/data", config);
  console.log(response.data);
}
```

### 3. POST 요청에 헤더 추가

POST는 두 번째 인자가 `보낼 데이터`, 세 번째 인자가 `옵션(headers 등)`이다.

```javascript
import axios from "axios";

async function createPost() {
  const newPost = {
    title: "새 게시글",
    body: "내용입니다.",
  };

  const config = {
    headers: {
      Authorization: "Bearer abc123token",
    },
  };

  const response = await axios.post(
    "https://example.com/api/posts",
    newPost,
    config
  );
  console.log(response.data);
}
```

---

## 22. params와 headers 함께 사용

```javascript
const config = {
  params: {
    page: 1,
  },
  headers: {
    Authorization: "Bearer abc123token",
  },
};

axios.get("https://example.com/api/posts", config);
```

---

## 23. 핵심 개념 정리

### 1. 이벤트 핸들러 등록 방법 비교

| 방법 | 장점 | 단점 | 권장 환경 |
|---|---|---|---|
| HTML 인라인 | 간단함 | 구조와 동작 분리 안 됨 | React |
| JS 이벤트 속성 | 구조와 동작 분리 | 하나의 핸들러만 등록 가능 | - |
| `addEventListener()` | 여러 핸들러 등록 가능 | 코드가 약간 더 김 | Vanilla JS |

### 2. Promise vs async/await

| 방식 | 장점 | 단점 |
|---|---|---|
| `.then()`/`.catch()` | Promise 체이닝 명확 | 콜백 지옥 가능성 |
| `async/await` | 코드가 직관적 | try/catch 필요 |

**권장:** async/await 방식이 더 읽기 쉽고 유지보수하기 좋다.

### 3. 이벤트 전파

```
캡처링 단계 (↓)
window → document → html → body → div → button

타겟 단계
button (이벤트 처리)

버블링 단계 (↑)
button → div → body → html → document → window
```

---

## 24. 학습 포인트 (Key Takeaways)

### 1. 이벤트 위임을 적극 활용하자

여러 자식 요소에 이벤트를 등록할 때는 부모 요소에 하나만 등록하는 것이 효율적이다.

```javascript
// ❌ 비효율적
items.forEach(item => {
  item.addEventListener("click", handler);
});

// ✅ 효율적
parentElement.addEventListener("click", (e) => {
  if (e.target.matches(".item")) {
    handler(e);
  }
});
```

### 2. async/await는 항상 try/catch와 함께

```javascript
// ✅ 좋은 예
async function fetchData() {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("에러:", error.message);
  }
}

// ❌ 나쁜 예 (에러 처리 없음)
async function fetchData() {
  const response = await axios.get(url);
  return response.data;
}
```

### 3. Promise.all()로 병렬 처리하기

여러 개의 독립적인 비동기 작업은 `Promise.all()`로 동시에 실행하여 성능을 향상시킨다.

```javascript
// ❌ 순차 실행 (6초 소요)
const user = await getUser(1);      // 2초
const posts = await getPosts(1);    // 2초
const comments = await getComments(1); // 2초

// ✅ 병렬 실행 (2초 소요)
const [user, posts, comments] = await Promise.all([
  getUser(1),
  getPosts(1),
  getComments(1)
]);
```

### 4. event.stopPropagation()은 신중하게 사용

이벤트 전파를 차단하면 예상치 못한 부작용이 발생할 수 있다. 정말 필요한 경우에만 사용한다.

### 5. Axios config 객체 활용

params와 headers를 하나의 config 객체로 관리하면 코드가 깔끔해진다.

```javascript
const config = {
  params: { page: 1, limit: 10 },
  headers: { Authorization: `Bearer ${token}` },
};

const response = await axios.get(url, config);
```

### 6. Promise 체이닝 vs Promise.all()

**순차 처리가 필요할 때:**
```javascript
getData()
  .then(processData)
  .then(saveData)
  .then(notify);
```

**병렬 처리가 가능할 때:**
```javascript
Promise.all([getData1(), getData2(), getData3()])
  .then(allData => process(allData));
```

### 7. 실무에서 자주 사용하는 패턴

```javascript
// 패턴 1: API 호출 후 상태 업데이트
async function loadPosts() {
  try {
    const response = await axios.get("/api/posts");
    setPosts(response.data);
  } catch (error) {
    setError(error.message);
  }
}

// 패턴 2: 조건부 API 호출
async function search(keyword) {
  if (!keyword) return;
  
  const config = {
    params: { q: keyword }
  };
  
  const response = await axios.get("/api/search", config);
  return response.data;
}

// 패턴 3: 여러 API 동시 호출
async function loadDashboard() {
  const [users, posts, stats] = await Promise.all([
    axios.get("/api/users"),
    axios.get("/api/posts"),
    axios.get("/api/stats")
  ]);
  
  return {
    users: users.data,
    posts: posts.data,
    stats: stats.data
  };
}
```