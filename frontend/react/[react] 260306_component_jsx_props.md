# [TIL] React: 컴포넌트(Component), JSX, Props

## 1. 컴포넌트(Component)

### 1. 컴포넌트의 개념

컴포넌트는 **재사용 가능한 UI 블록**이다. 하나의 페이지는 여러 개의 컴포넌트를 조합해서 만들어낸다.

**특징:**
- 재사용성 : 동일한 컴포넌트를 여러 곳에서 반복 사용 가능
- 독립성 : 각 컴포넌트는 독립적으로 동작하며 별도의 데이터를 보유
- 계층 구조 : 컴포넌트 안에 다른 컴포넌트를 포함할 수 있음

### 2. 컴포넌트 작성 규칙

- 파일명과 컴포넌트명은 **파스칼 케이스(PascalCase)** 로 작성한다
- 하나의 파일에 하나의 컴포넌트만 정의한다
- 확장자는 `.jsx` 를 사용한다
- 컴포넌트명이 소문자로 시작하면 HTML 태그로 인식되어 오류가 발생한다

```jsx
// ✅ 올바른 컴포넌트명
const MyButton = () => { ... }
const UserProfile = () => { ... }

// ❌ 잘못된 컴포넌트명 (소문자 시작)
const myButton = () => { ... }
const userProfile = () => { ... }
```

### 3. 컴포넌트 작성 형태

실무에서는 **화살표 함수** 형태를 가장 많이 사용한다.

```jsx
// 1. 함수 선언문
export default function MyButton() {
  return <button>버튼</button>;
}

// 2. 화살표 함수 + 별도 내보내기 (가장 일반적)
const MyButton = () => {
  return <button>버튼</button>;
};
export default MyButton;

// 3. 화살표 함수 (단축형)
const MyButton = () => <button>버튼</button>;
export default MyButton;
```

### 4. rafce 스니펫

VSCode에서 `rafce` 입력 시 자동으로 화살표 함수 컴포넌트가 생성된다.
(**r**eact **a**rrow **f**unction **c**omponent **e**xport 의 약자)

```jsx
import React from "react";

const MyButton = () => {
  return <div>MyButton</div>;
};

export default MyButton;
```

> `import React from "react"` 는 React 17 이후 생략 가능하다.

---

## 2. JSX

### 1. JSX란?

JavaScript 안에서 HTML처럼 UI를 작성할 수 있는 문법이다. 실제로는 JavaScript이기 때문에 HTML과 다른 규칙이 적용된다.

### 2. JSX 주요 규칙

**1) 하나의 루트 요소만 반환**

```jsx
// ❌ 오류
return (
  <h1>제목</h1>
  <p>내용</p>
);

// ✅ Fragment로 감싸기
return (
  <>
    <h1>제목</h1>
    <p>내용</p>
  </>
);
```

**2) 모든 태그는 닫아야 한다**

```jsx
// ❌ 오류
<img src="...">
<input type="text">

// ✅ 자기닫힘 태그 사용
<img src="..." />
<input type="text" />
```

**3) return 다음 줄바꿈 주의**

```jsx
// ❌ 오류 (JavaScript가 자동으로 return; 처리)
return
  <div>내용</div>

// ✅ 괄호로 감싸기
return (
  <div>내용</div>
);
```

### 3. HTML과 다른 JSX 속성명

`class`, `for` 는 JavaScript 예약어이기 때문에 JSX에서는 다른 이름을 사용한다.

| HTML | JSX | 이유 |
|---|---|---|
| `class` | `className` | `class` 는 JS 클래스 문법 예약어 |
| `for` | `htmlFor` | `for` 는 JS 반복문 예약어 |
| `onclick` | `onClick` | JSX는 camelCase 사용 |

```jsx
// ❌ HTML 방식
<div class="container">
<label for="username">

// ✅ JSX 방식
<div className="container">
<label htmlFor="username">
```

### 4. JSX 보간법 `{}`

JSX 안에서 JavaScript 표현식을 사용할 때 중괄호 `{}` 를 사용한다.

```jsx
const name = "홍길동";
const age = 20;

return (
  <>
    <p>이름: {name}</p>
    <p>나이: {age}</p>
    <p>성인 여부: {age >= 18 ? "성인" : "미성년자"}</p>
    <p>내년 나이: {age + 1}</p>
  </>
);
```

---

## 3. 컴포넌트 중첩 (Nested Component)

컴포넌트 내부에 다른 컴포넌트를 포함하는 방식이다. 데이터는 **부모 → 자식** 방향으로만 흐른다.

```
App
└── Restaurant
    ├── RestaurantHeader  ← name props 받음
    └── MenuList          ← menus props 받음
```

```jsx
// Restaurant.jsx (부모)
import RestaurantHeader from "./RestaurantHeader";
import MenuList from "./MenuList";

const Restaurant = () => {
  const restaurantName = "새싹 분식";
  const menus = [
    { name: "떡볶이", price: 4000 },
    { name: "순대", price: 3500 },
  ];

  return (
    <div>
      <RestaurantHeader name={restaurantName} />
      <MenuList menus={menus} />
    </div>
  );
};
```

---

## 4. Props

### 1. Props란?

부모 컴포넌트가 자식 컴포넌트에게 전달하는 데이터를 저장한 **읽기 전용 객체**다.

- 부모 : Props를 **전달**한다
- 자식 : Props를 **받아서 사용**한다
- Props는 절대 직접 수정하면 안 된다 (**Read-Only**)

### 2. Props 전달하고 받기

```jsx
// 부모 컴포넌트
<UserCard name="철수" age={25} job="개발자" />

// 자식 컴포넌트 - props 객체로 받기
const UserCard = (props) => {
  return (
    <div>
      <p>{props.name}</p>
      <p>{props.age}</p>
      <p>{props.job}</p>
    </div>
  );
};
```

### 3. Props 구조 분해 할당

실무에서는 구조 분해 할당 방식을 더 많이 사용한다.

```jsx
// props 객체로 받기
const UserCard = (props) => {
  return <p>{props.name}</p>;
};

// 구조 분해 할당으로 받기 (더 간결)
const UserCard = ({ name, age, job }) => {
  return <p>{name}</p>;
};
```

### 4. 객체 Props 전달

Props가 많을 때는 객체로 묶어서 전달하면 더 깔끔하다.

```jsx
// 부모 컴포넌트
const book = {
  title: "리액트를 다루는 기술",
  author: "김리액트",
  price: 32000,
};

<BookCard book={book} />

// 자식 컴포넌트
const BookCard = ({ book }) => {
  return (
    <>
      <p>제목: {book.title}</p>
      <p>저자: {book.author}</p>
      <p>가격: {book.price.toLocaleString()}원</p>
    </>
  );
};
```

### 5. Props 기본값

Props가 전달되지 않았을 때 사용할 기본값을 설정할 수 있다.

```jsx
const UserProfile = ({ name = "익명", age = 0 }) => {
  return (
    <div>
      <p>{name}</p>
      <p>{age}</p>
    </div>
  );
};

// 사용
<UserProfile name="철수" age={25} />  // 철수, 25
<UserProfile name="영희" />           // 영희, 0 (age 기본값)
<UserProfile />                       // 익명, 0 (모두 기본값)
```

### 6. Props 수정 금지

```jsx
// ❌ 잘못된 코드 (Props 직접 수정)
const UserProfile = ({ name }) => {
  name = "다른 이름";  // 금지!
  return <div>{name}</div>;
};

// ✅ 올바른 코드 (새 변수 생성)
const UserProfile = ({ name }) => {
  const displayName = name + "님";
  return <div>{displayName}</div>;
};
```

---

## 5. 핵심 개념 정리

### JSX 변환 체크리스트

| 항목 | HTML | JSX |
|---|---|---|
| 클래스 | `class` | `className` |
| 레이블 | `for` | `htmlFor` |
| 단일 태그 | `<img>`, `<input>` | `<img />`, `<input />` |
| 루트 요소 | 여러 개 가능 | 반드시 하나 (Fragment 사용) |

### Props 전달 방식 비교

```jsx
// 개별 전달
<BookCard title="리액트" author="김리액트" price={32000} />

// 객체로 전달 (Props가 많을 때 권장)
const book = { title: "리액트", author: "김리액트", price: 32000 };
<BookCard book={book} />
```

### 단방향 데이터 흐름

React에서 데이터는 항상 **부모 → 자식** 방향으로만 흐른다. 이를 **단방향 데이터 흐름**이라고 한다.

```
App (데이터 소유)
 └── 자식 컴포넌트 (데이터 표시만 담당)
      └── 손자 컴포넌트 (데이터 표시만 담당)
```