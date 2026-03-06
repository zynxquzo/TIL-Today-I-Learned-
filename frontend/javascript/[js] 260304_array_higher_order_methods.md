# [TIL] JavaScript: 배열 고차 메서드 (Array Higher-Order Methods)

## 1. 배열 고차 메서드란?

### 1. 고차 메서드의 개념

배열 고차 메서드는 **함수를 인자로 받아** 배열의 각 요소를 처리하는 메서드다. 반복문을 사용하지 않고도 배열을 효율적으로 다룰 수 있어 코드가 간결하고 읽기 쉬워진다.

- **선언적 프로그래밍**: 어떻게(how)가 아닌 무엇을(what) 할지에 집중
- **불변성**: 원본 배열을 변경하지 않고 새로운 배열 반환 (일부 메서드 제외)
- **체이닝**: 여러 메서드를 연결해서 사용 가능

### 2. 왜 고차 메서드를 사용할까?

```javascript
// 기존 방식 (반복문)
const numbers = [1, 2, 3, 4, 5];
const doubled = [];
for (let i = 0; i < numbers.length; i++) {
    doubled.push(numbers[i] * 2);
}

// 고차 메서드 (map)
const doubled = numbers.map(num => num * 2);
```

**고차 메서드가 더 간결하고 의도가 명확하다.**

---

## 2. forEach - 배열 순회

### 1. 기본 사용법
```javascript
const numbers = [1, 2, 3];
numbers.forEach((num) => {
    console.log(num);
});
// 출력: 1, 2, 3

// 인덱스도 함께 사용
numbers.forEach((num, index) => {
    console.log(`${index}: ${num}`);
});
// 출력: 0: 1, 1: 2, 2: 3
```

### 2. 객체 배열 순회
```javascript
const memoList = [
    { content: "오늘 할 일", isDone: false },
    { content: "오늘 할 일 2", isDone: true },
    { content: "오늘 할 일 3", isDone: false }
];

// 미완료 항목만 출력
memoList.forEach((memo) => {
    if (!memo.isDone) {
        console.log(memo);
    }
});
```

### 3. forEach의 3가지 매개변수
```javascript
const arr = ['A', 'B', 'C'];

arr.forEach((element, index, array) => {
    console.log(`요소: ${element}, 인덱스: ${index}, 배열: ${array}`);
});
// 요소: A, 인덱스: 0, 배열: A,B,C
// 요소: B, 인덱스: 1, 배열: A,B,C
// 요소: C, 인덱스: 2, 배열: A,B,C
```

**forEach는 반환값이 없다.** 단순히 각 요소에 대해 작업을 수행할 때 사용한다.

---

## 3. map - 배열 변환

### 1. 기본 사용법
```javascript
// 각 숫자에 2를 곱한 새 배열 생성
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map((num) => num * 2);
console.log(doubled);  // [2, 4, 6, 8, 10]

// 원본 배열은 변경되지 않음
console.log(numbers);  // [1, 2, 3, 4, 5]
```

### 2. 객체에서 특정 속성 추출
```javascript
const users = [
    { name: "김철수", age: 20 },
    { name: "이영희", age: 25 },
    { name: "박민수", age: 30 }
];

// 이름만 추출
const names = users.map((user) => user.name);
console.log(names);  // ["김철수", "이영희", "박민수"]
```

### 3. 복잡한 변환
```javascript
const words = ["apple", "banana", "cherry"];

// 대문자로 변환하고 길이 추가
const transformed = words.map((word) => ({
    original: word,
    upper: word.toUpperCase(),
    length: word.length
}));

console.log(transformed);
// [
//   { original: "apple", upper: "APPLE", length: 5 },
//   { original: "banana", upper: "BANANA", length: 6 },
//   { original: "cherry", upper: "CHERRY", length: 6 }
// ]
```

### 4. 조건부 변환
```javascript
const members = [
    { name: "강호동", point: 120 },
    { name: "유재석", point: 80 },
    { name: "신동엽", point: 150 }
];

// 회원 등급 추가
const memberLabels = members.map((member) => 
    `${member.name}(${member.point >= 100 ? "정회원" : "준회원"})`
);

console.log(memberLabels);
// ["강호동(정회원)", "유재석(준회원)", "신동엽(정회원)"]
```

**map은 항상 새로운 배열을 반환한다.** 원본 배열의 길이와 같은 길이의 배열이 생성된다.

---

## 4. filter - 조건부 필터링

### 1. 기본 사용법
```javascript
// 짝수만 필터링
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const evenNumbers = numbers.filter((num) => num % 2 === 0);
console.log(evenNumbers);  // [2, 4, 6, 8, 10]
```

### 2. 객체 배열 필터링
```javascript
const people = [
    { name: "김철수", age: 25 },
    { name: "이영희", age: 30 },
    { name: "박민수", age: 18 }
];

// 20세 이상만 필터링
const adults = people.filter((person) => person.age >= 20);
console.log(adults);
// [
//   { name: "김철수", age: 25 },
//   { name: "이영희", age: 30 }
// ]
```

### 3. 여러 조건 필터링
```javascript
const movies = [
    { title: "Inception", rating: 8.8, genre: "Sci-Fi" },
    { title: "The Shawshank Redemption", rating: 9.3, genre: "Drama" },
    { title: "The Godfather", rating: 9.2, genre: "Crime" },
    { title: "Parasite", rating: 8.6, genre: "Drama" }
];

// 평점 9.0 이상이면서 Drama 장르
const topDramas = movies.filter((movie) => 
    movie.rating >= 9.0 && movie.genre === "Drama"
);

console.log(topDramas);
// [{ title: "The Shawshank Redemption", rating: 9.3, genre: "Drama" }]
```

### 4. 문자열 길이로 필터링
```javascript
const words = ["apple", "banana", "cherry", "date", "elderberry"];

// 5글자 이상만 필터링
const longWords = words.filter((word) => word.length >= 5);
console.log(longWords);  // ["apple", "banana", "cherry", "elderberry"]
```

**filter는 조건을 만족하는 요소만 포함된 새 배열을 반환한다.** 원본 배열보다 길이가 같거나 짧다.

---

## 5. reduce - 누적 계산

### 1. 기본 사용법
```javascript
// 배열의 모든 요소 합계
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((acc, num) => acc + num, 0);
console.log(sum);  // 15

// 동작 과정:
// acc = 0, num = 1 → 0 + 1 = 1
// acc = 1, num = 2 → 1 + 2 = 3
// acc = 3, num = 3 → 3 + 3 = 6
// acc = 6, num = 4 → 6 + 4 = 10
// acc = 10, num = 5 → 10 + 5 = 15
```

### 2. 장바구니 총액 계산
```javascript
const cart = [
    { name: "사과", quantity: 2, price: 1000 },
    { name: "바나나", quantity: 3, price: 1500 },
    { name: "포도", quantity: 1, price: 5000 }
];

const totalPrice = cart.reduce((sum, item) => {
    return sum + (item.quantity * item.price);
}, 0);

console.log(totalPrice);  // 11500
// 계산: (2 * 1000) + (3 * 1500) + (1 * 5000) = 11500
```

### 3. 최댓값/최솟값 찾기
```javascript
const numbers = [15, 8, 23, 4, 42, 16];

// 최댓값
const max = numbers.reduce((max, num) => num > max ? num : max);
console.log(max);  // 42

// 최솟값
const min = numbers.reduce((min, num) => num < min ? num : min);
console.log(min);  // 4
```

### 4. 객체로 그룹화
```javascript
const fruits = ["apple", "banana", "apple", "cherry", "banana", "apple"];

// 각 과일의 개수 세기
const count = fruits.reduce((acc, fruit) => {
    acc[fruit] = (acc[fruit] || 0) + 1;
    return acc;
}, {});

console.log(count);
// { apple: 3, banana: 2, cherry: 1 }
```

**reduce의 두 번째 매개변수(초기값)는 필수다.** 초기값을 생략하면 예상치 못한 동작이 발생할 수 있다.

---

## 6. find - 첫 번째 요소 찾기

### 1. 기본 사용법
```javascript
const numbers = [5, 12, 8, 130, 44];

// 10보다 큰 첫 번째 숫자
const found = numbers.find((num) => num > 10);
console.log(found);  // 12
```

### 2. 객체 찾기
```javascript
const movies = [
    { title: "Inception", rating: 8.8, genre: "Sci-Fi" },
    { title: "The Shawshank Redemption", rating: 9.3, genre: "Drama" },
    { title: "The Godfather", rating: 9.2, genre: "Crime" },
    { title: "Parasite", rating: 8.6, genre: "Drama" }
];

// 평점 9.0 이상이면서 Drama인 첫 번째 영화
const bestMovie = movies.find((movie) => 
    movie.rating >= 9.0 && movie.genre === "Drama"
);

console.log(bestMovie);
// { title: "The Shawshank Redemption", rating: 9.3, genre: "Drama" }
```

### 3. 찾지 못했을 때
```javascript
const users = [
    { id: 1, name: "김철수" },
    { id: 2, name: "이영희" }
];

const user = users.find((u) => u.id === 999);
console.log(user);  // undefined

// 안전하게 사용하기
if (user) {
    console.log(user.name);
} else {
    console.log("사용자를 찾을 수 없습니다.");
}
```

**find는 조건을 만족하는 첫 번째 요소만 반환한다.** 찾지 못하면 undefined를 반환한다.

---

## 7. sort - 배열 정렬

### 1. 문자열 정렬
```javascript
const fruits = ["banana", "apple", "cherry"];

// 가나다순 정렬
fruits.sort();
console.log(fruits);  // ["apple", "banana", "cherry"]

// 한글도 정렬 가능
const names = ["홍길동", "김철수", "이영희"];
names.sort();
console.log(names);  // ["김철수", "이영희", "홍길동"]
```

### 2. 숫자 정렬
```javascript
const numbers = [10, 5, 40, 25, 1000, 1];

// ❌ 잘못된 방법 (문자열로 정렬됨)
numbers.sort();
console.log(numbers);  // [1, 10, 1000, 25, 40, 5]

// ✅ 올바른 방법
numbers.sort((a, b) => a - b);  // 오름차순
console.log(numbers);  // [1, 5, 10, 25, 40, 1000]

numbers.sort((a, b) => b - a);  // 내림차순
console.log(numbers);  // [1000, 40, 25, 10, 5, 1]
```

### 3. 객체 배열 정렬
```javascript
const students = [
    { name: "김철수", score: 85 },
    { name: "이영희", score: 92 },
    { name: "박민수", score: 78 }
];

// 점수 높은 순으로 정렬
students.sort((a, b) => b.score - a.score);
console.log(students);
// [
//   { name: "이영희", score: 92 },
//   { name: "김철수", score: 85 },
//   { name: "박민수", score: 78 }
// ]
```

**sort는 원본 배열을 직접 수정한다.** 원본을 보존하려면 복사본을 만들어서 정렬한다.

```javascript
const original = [3, 1, 2];
const sorted = [...original].sort((a, b) => a - b);
console.log(original);  // [3, 1, 2] (변경 없음)
console.log(sorted);    // [1, 2, 3]
```

---

## 8. 메서드 체이닝

### 1. 기본 체이닝
```javascript
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 짝수만 필터링 → 2배로 변환 → 합계 계산
const result = numbers
    .filter(num => num % 2 === 0)    // [2, 4, 6, 8, 10]
    .map(num => num * 2)              // [4, 8, 12, 16, 20]
    .reduce((sum, num) => sum + num, 0);  // 60

console.log(result);  // 60
```

### 2. 복잡한 데이터 처리
```javascript
const posts = [
    { id: 1, title: "공지: 정기 점검 안내", isNotice: true },
    { id: 2, title: "오늘 점심 뭐 먹지?", isNotice: false },
    { id: 3, title: "공지: 이용 약관 변경", isNotice: true },
    { id: 4, title: "리액트 공부 너무 재밌어요", isNotice: false },
    { id: 5, title: "공지: 이벤트 당첨자 발표", isNotice: true }
];

// 공지만 필터링 → 제목만 추출 → 가나다순 정렬
const notices = posts
    .filter(post => post.isNotice)
    .map(post => post.title)
    .sort();

console.log(notices);
// [
//   "공지: 이벤트 당첨자 발표",
//   "공지: 이용 약관 변경",
//   "공지: 정기 점검 안내"
// ]
```

### 3. 상품 데이터 처리
```javascript
const inventory = [
    { name: "키보드", price: 80000, stock: 5 },
    { name: "마우스", price: 30000, stock: 0 },
    { name: "모니터", price: 250000, stock: 2 },
    { name: "스피커", price: 50000, stock: 10 }
];

// 재고 있는 것만 → 가격순 정렬 → 상품명만 추출
const available = inventory
    .filter(item => item.stock > 0)
    .sort((a, b) => a.price - b.price)
    .map(item => item.name);

console.log(available);  // ["스피커", "키보드", "모니터"]
```

### 4. 주문 데이터 분석
```javascript
const orders = [
    { id: 1, total: 50000, status: "completed" },
    { id: 2, total: 30000, status: "pending" },
    { id: 3, total: 20000, status: "completed" },
    { id: 4, total: 15000, status: "cancelled" }
];

// 완료된 주문만 → 총액 계산
const completedTotal = orders
    .filter(order => order.status === "completed")
    .reduce((sum, order) => sum + order.total, 0);

console.log(completedTotal);  // 70000
```

**메서드 체이닝으로 복잡한 데이터 처리를 간결하게 표현할 수 있다.**

---

## 9. 기타 유용한 메서드

### 1. some - 하나라도 조건 만족하는지
```javascript
const numbers = [1, 2, 3, 4, 5];

// 짝수가 하나라도 있는지
const hasEven = numbers.some(num => num % 2 === 0);
console.log(hasEven);  // true

// 10보다 큰 숫자가 있는지
const hasLarge = numbers.some(num => num > 10);
console.log(hasLarge);  // false
```

### 2. every - 모두 조건 만족하는지
```javascript
const scores = [80, 85, 90, 95];

// 모두 80점 이상인지
const allPassed = scores.every(score => score >= 80);
console.log(allPassed);  // true

// 모두 90점 이상인지
const allExcellent = scores.every(score => score >= 90);
console.log(allExcellent);  // false
```

### 3. includes - 특정 값 포함 여부
```javascript
const fruits = ["apple", "banana", "cherry"];

console.log(fruits.includes("banana"));  // true
console.log(fruits.includes("grape"));   // false
```

### 4. indexOf - 요소의 위치 찾기
```javascript
const arr = ["A", "B", "C", "B"];

console.log(arr.indexOf("B"));    // 1 (첫 번째 "B"의 위치)
console.log(arr.indexOf("D"));    // -1 (없으면 -1 반환)
console.log(arr.lastIndexOf("B")); // 3 (마지막 "B"의 위치)
```

### 5. Set으로 중복 제거
```javascript
const tags = ["javascript", "react", "html", "javascript", "css", "react", "node"];

// 중복 제거
const uniqueTags = [...new Set(tags)];
console.log(uniqueTags);
// ["javascript", "react", "html", "css", "node"]
```

---

## 10. 핵심 개념 정리

### 1. 메서드 비교표

| 메서드 | 반환값 | 원본 변경 | 용도 |
|---|---|---|---|
| `forEach()` | undefined | ❌ | 각 요소에 작업 수행 |
| `map()` | 새 배열 | ❌ | 요소 변환 |
| `filter()` | 새 배열 | ❌ | 조건부 필터링 |
| `reduce()` | 단일 값 | ❌ | 누적 계산 |
| `find()` | 요소 또는 undefined | ❌ | 첫 번째 요소 찾기 |
| `sort()` | 정렬된 배열 | ✅ | 배열 정렬 |
| `some()` | boolean | ❌ | 하나라도 만족 |
| `every()` | boolean | ❌ | 모두 만족 |

### 2. 언제 어떤 메서드를 사용할까?

| 목적 | 메서드 | 예시 |
|---|---|---|
| 각 요소 처리만 하고 싶을 때 | `forEach` | 콘솔 출력, 알림 |
| 배열을 변환하고 싶을 때 | `map` | 대문자 변환, 가격에 세금 추가 |
| 조건에 맞는 요소만 추출 | `filter` | 성인만, 재고 있는 상품만 |
| 하나의 값으로 만들 때 | `reduce` | 합계, 평균, 최댓값 |
| 특정 요소를 찾을 때 | `find` | ID로 사용자 찾기 |
| 배열을 정렬할 때 | `sort` | 가격순, 이름순 |
| 조건 검사 | `some`, `every` | 재고 있는지, 모두 합격인지 |

### 3. for문 vs 고차 메서드

```javascript
const numbers = [1, 2, 3, 4, 5];

// for문 방식
const doubled1 = [];
for (let i = 0; i < numbers.length; i++) {
    doubled1.push(numbers[i] * 2);
}

// map 방식
const doubled2 = numbers.map(num => num * 2);
```

**고차 메서드의 장점:**
- 코드가 간결하다
- 의도가 명확하다
- 버그 발생 가능성이 낮다
- 체이닝으로 연결 가능

---

## 11. 학습 포인트 (Key Takeaways)

### 1. 원본 배열 보존

대부분의 고차 메서드는 원본 배열을 변경하지 않는다. **하지만 sort()는 예외**이므로 주의한다.

```javascript
const numbers = [3, 1, 2];

// 원본을 보존하려면 복사본 생성
const sorted = [...numbers].sort((a, b) => a - b);
```

### 2. 초기값은 항상 명시

reduce를 사용할 때는 **반드시 초기값을 지정**한다. 초기값이 없으면 예상치 못한 결과가 나올 수 있다.

```javascript
// ✅ 좋은 예
const sum = numbers.reduce((acc, num) => acc + num, 0);

// ❌ 나쁜 예
const sum = numbers.reduce((acc, num) => acc + num);
```

### 3. 메서드 체이닝 순서가 중요하다

필터링 → 변환 → 정렬 순서로 체이닝하면 효율적이다.

```javascript
// ✅ 효율적: 필터링으로 데이터 줄이고 → 변환
const result = data
    .filter(item => item.stock > 0)  // 데이터 줄이기
    .map(item => item.name);         // 필요한 것만 추출

// ❌ 비효율적: 모든 데이터 변환 후 → 필터링
const result = data
    .map(item => item.name)          // 모든 데이터 변환
    .filter(name => name.length > 0); // 일부만 사용
```

### 4. find vs filter

- **하나만** 찾을 때: `find()` 사용
- **여러 개** 찾을 때: `filter()` 사용

```javascript
// 첫 번째 성인만
const adult = users.find(user => user.age >= 20);

// 모든 성인
const adults = users.filter(user => user.age >= 20);
```

### 5. 숫자 정렬에는 비교 함수 필수

```javascript
// ❌ 잘못된 숫자 정렬 (문자열로 정렬됨)
[10, 5, 40].sort();  // [10, 40, 5]

// ✅ 올바른 숫자 정렬
[10, 5, 40].sort((a, b) => a - b);  // [5, 10, 40]
```

### 6. 실무에서 자주 사용하는 패턴

```javascript
// 패턴 1: 데이터 가공 후 렌더링
const productList = products
    .filter(p => p.stock > 0)
    .map(p => `${p.name}: ${p.price}원`);

// 패턴 2: 통계 계산
const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;

// 패턴 3: 조건부 검색
const result = items.find(item => item.id === searchId);

// 패턴 4: 정렬 후 상위 N개
const top3 = scores
    .sort((a, b) => b - a)
    .slice(0, 3);
```

### 7. 가독성을 위해 변수명을 명확하게

```javascript
// ❌ 나쁜 예
const x = arr.map(a => a.b);

// ✅ 좋은 예
const userNames = users.map(user => user.name);
```

### 8. 복잡한 로직은 단계별로 나누기

메서드 체이닝이 너무 길면 중간 결과를 변수에 저장한다.

```javascript
// 너무 긴 체이닝
const result = data.filter(...).map(...).sort(...).slice(...);

// 단계별로 나누기
const filtered = data.filter(...);
const transformed = filtered.map(...);
const sorted = transformed.sort(...);
const result = sorted.slice(...);
```