# [TIL] JavaScript: 기초 문법, 조건문, 반복문, 함수, 배열, 객체

## 1. JavaScript 기초

### 1. JavaScript란?

웹 페이지에 동적인 기능을 추가하는 프로그래밍 언어다. HTML이 구조를, CSS가 디자인을 담당한다면, JavaScript는 동작과 상호작용을 담당한다.

- **동적 웹 페이지**: 사용자의 입력에 반응하고 콘텐츠를 변경할 수 있다
- **브라우저에서 실행**: 별도의 설치 없이 모든 웹 브라우저에서 작동한다
- **다양한 활용**: 웹 개발뿐만 아니라 서버(Node.js), 모바일 앱 개발에도 사용된다

### 2. JavaScript 실행 방법
```html
<!-- 1. 외부 스크립트 파일 (권장) -->
<script src="script.js"></script>

<!-- 2. 내부 스크립트 -->
<script>
  console.log("Hello, JavaScript!");
</script>

<!-- 3. 인라인 스크립트 (비권장) -->
<button onclick="alert('클릭!')">버튼</button>
```

**외부 스크립트 파일**을 사용하는 것이 가장 좋다. 코드 재사용성과 유지보수성이 높아진다.

### 3. 변수 선언
```javascript
// const: 상수 (재할당 불가, 권장)
const score = 85;
const age = 18;

// let: 변수 (재할당 가능)
let number = -5;
let N = 6;

// var: 옛날 방식 (사용 지양)
var oldStyle = "don't use";
```

**const를 기본으로 사용**하고, 값이 변경되어야 할 때만 let을 사용한다.

---

## 2. 조건문 (Conditional Statements)

### 1. if 문
```javascript
// 단일 조건
const score = 85;
if (score >= 80) {
    console.log('합격입니다');
}

// if-else 문
const age = 18;
if (age >= 20) {
    console.log('성인입니다');
} else {
    console.log('미성년자입니다');
}
```

### 2. if-else if-else 문
```javascript
const number = -5;
if (number > 0) {
    console.log('양수');
} else if (number < 0) {
    console.log('음수');
} else {
    console.log('0');
}
```

### 3. 논리 연산자
```javascript
// OR 연산자 (||): 둘 중 하나라도 true면 true
const memberLevel = 'gold';
if (memberLevel === 'gold' || memberLevel === 'platinum') {
    console.log('VIP 혜택을 받을 수 있습니다');
}

// AND 연산자 (&&): 둘 다 true여야 true
const userAge = 25;
const isStudent = true;
if (userAge >= 20 && isStudent) {
    console.log('성인 학생입니다');
}

// NOT 연산자 (!): true를 false로, false를 true로
const isActive = true;
if (!isActive) {
    console.log('비활성 계정');
}
```

### 4. 중첩 조건문
```javascript
const temperature = 28;
const humidity = 60;

if (temperature >= 25) {
    if (humidity >= 70) {
        console.log('더운 날씨입니다');
    } else {
        console.log('따뜻한 날씨입니다');
    }
} else {
    console.log('시원한 날씨입니다');
}
```

### 5. 삼항 연산자
```javascript
// 기본 구조: 조건 ? 참일 때 값 : 거짓일 때 값
const point = 1500;
const result = point >= 1000 ? 'VIP' : '일반';
console.log(result);  // VIP

// 실용 예제: 할인 계산
const purchaseAmount = 150000;
const finalPrice = purchaseAmount >= 100000 ? purchaseAmount * 0.9 : purchaseAmount;
console.log(`구매금액: ${purchaseAmount}원, 최종금액: ${finalPrice}원`);
// 구매금액: 150000원, 최종금액: 135000원

// 간단한 조건문
const isRaining = true;
const weatherMessage = isRaining ? '우산을 챙기세요' : '날씨가 맑습니다';
```

**삼항 연산자는 간단한 조건문에만 사용**한다. 복잡한 로직은 if-else가 더 읽기 쉽다.

---

## 3. 반복문 (Loops)

### 1. for 반복문 기본
```javascript
// 0부터 4까지 출력
for (let i = 0; i <= 4; i++) {
    console.log(i);
}
// 출력: 0, 1, 2, 3, 4

// 1부터 N까지 출력
const N = 6;
for (let i = 1; i <= N; i++) {
    console.log(i);
}
```

**for 문 구조**: `for (초기화; 조건; 증감) { 실행 코드 }`

### 2. break와 continue
```javascript
// break: 반복 중단
for (let i = 1; i <= 10; i++) {
    if (i === 5) {
        break;  // 5가 되면 반복 종료
    }
    console.log(i);
}
// 출력: 1, 2, 3, 4

// continue: 해당 회차 건너뛰기
for (let i = 1; i <= 6; i++) {
    if (i === 3) {
        continue;  // 3일 때만 건너뛰기
    }
    console.log(i);
}
// 출력: 1, 2, 4, 5, 6
```

### 3. 역순 반복
```javascript
// 10부터 1까지 역순 출력
for (let i = 10; i > 0; i--) {
    console.log(i);
}
```

### 4. 조건부 반복
```javascript
// 짝수만 출력 (1~10)
for (let i = 1; i <= 10; i++) {
    if (i % 2 === 0) {  // 나머지가 0이면 짝수
        console.log(i);
    }
}
// 출력: 2, 4, 6, 8, 10
```

### 5. 중첩 반복문 (구구단)
```javascript
// 2단부터 9단까지
for (let i = 2; i <= 9; i++) {
    console.log(`${i}단`);
    for (let j = 1; j <= 9; j++) {
        console.log(`${i} * ${j} = ${i * j}`);
    }
}
```

---

## 4. 함수 (Functions)

### 1. 함수 선언식
```javascript
// 기본 함수
function greet(name) {
    return `안녕하세요, ${name}님!`;
}

console.log(greet("김철수"));  // 안녕하세요, 김철수님!

// 계산 함수
function square(number) {
    return number ** 2;  // 거듭제곱 연산자
}

console.log(square(5));  // 25
```

### 2. 화살표 함수
```javascript
// 기본 화살표 함수
const greetArrow = (name) => `안녕하세요, ${name}님!`;

// 간결한 표현 (본문이 한 줄일 때 return 생략 가능)
const squareArrow = (number) => number ** 2;

// 여러 줄일 때는 중괄호와 return 필요
const printFromOneArrow = (number) => {
    for (let i = 1; i <= number; i++) {
        console.log(i);
    }
}
```

### 3. 조건문을 포함한 함수
```javascript
// if-else 사용
function max(a, b) {
    if (a > b) {
        return a;
    } else {
        return b;
    }
}

// 삼항 연산자 사용 (더 간결)
const maxArrow = (a, b) => (a > b ? a : b);

console.log(max(5, 10));      // 10
console.log(maxArrow(8, 1));  // 8
```

### 4. 다중 조건 함수
```javascript
// 성적 등급 반환
function getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    return 'D';
}

console.log(getGrade(95));  // A
console.log(getGrade(78));  // C
```

### 5. 반복문을 포함한 함수
```javascript
// 두 숫자 사이의 합
function sumBetween(a, b) {
    let big = a > b ? a : b;
    let small = a > b ? b : a;
    let sum = 0;
    
    for (let i = small; i <= big; i++) {
        sum += i;
    }
    return sum;
}

console.log(sumBetween(5, 10));  // 45 (5+6+7+8+9+10)
```

### 6. 가변 인자 함수 (Rest Parameters)
```javascript
// 개수에 상관없이 모든 인자의 합 계산
function sumAll(...numbers) {
    let total = 0;
    for (let el of numbers) {
        total += el;
    }
    return total;
}

// forEach 사용
const sumAllArrow = (...numbers) => {
    let total = 0;
    numbers.forEach((el) => (total += el));
    return total;
}

console.log(sumAll(1, 2, 3));           // 6
console.log(sumAllArrow(1, 2, 3, 4, 5)); // 15
```

---

## 5. 배열 (Array)

### 1. 배열 생성과 기본 메서드
```javascript
// 배열 생성
let letters = ['A', 'B'];
console.log(letters);  // ['A', 'B']

// 요소 추가 (맨 뒤)
letters.push('Z');
console.log(letters);  // ['A', 'B', 'Z']

// 요소 제거 (맨 뒤)
let removed = letters.pop();
console.log(removed);  // 'Z'
console.log(letters);  // ['A', 'B']
```

### 2. 배열 순회와 변환
```javascript
// 각 요소에 2를 곱한 새 배열 만들기
let numbers = [1, 2, 3];
let newNumbers = [];

for (let i = 0; i < numbers.length; i++) {
    newNumbers.push(numbers[i] * 2);
}
console.log(newNumbers);  // [2, 4, 6]
```

### 3. 조건부 필터링
```javascript
// 짝수만 추출
let numbers2 = [1, 2, 3, 4, 5];
let newNumbers2 = [];

for (let i = 0; i < numbers2.length; i++) {
    if (numbers2[i] % 2 === 0) {
        newNumbers2.push(numbers2[i]);
    }
}
console.log(newNumbers2);  // [2, 4]
```

### 4. for...of 반복문
```javascript
// 배열의 각 요소를 직접 순회
const userList = [
    { name: "김철수", age: 20 },
    { name: "이순신", age: 23 },
    { name: "장영실", age: 24 },
];

for (let user of userList) {
    if (user.age >= 24) {
        console.log(user.name);
    }
}
// 출력: 장영실
```

### 5. forEach 메서드
```javascript
// 배열의 각 요소에 대해 함수 실행
userList.forEach(user => {
    if (user.age >= 24) {
        console.log(user.name);
    }
});
```

---

## 6. 객체 (Object)

### 1. 객체 생성과 접근
```javascript
let person = {
    name: '이민수',
    age: 35,
    city: '부산'
};

console.log(person.name);  // 이민수
console.log(person['age']); // 35
```

### 2. Object 메서드
```javascript
// 모든 키 가져오기
console.log(Object.keys(person));
// ['name', 'age', 'city']

// 모든 값 가져오기
console.log(Object.values(person));
// ['이민수', 35, '부산']

// 모든 키-값 쌍 가져오기
console.log(Object.entries(person));
// [['name', '이민수'], ['age', 35], ['city', '부산']]
```

### 3. 중첩 객체와 배열
```javascript
// 객체 안에 배열 포함
let student = {
    name: '학생',
    grades: ['A', 'B', 'C']
};

// 배열에 요소 추가
student.grades.push('D');
console.log(student);
// { name: '학생', grades: ['A', 'B', 'C', 'D'] }
```

### 4. 객체 배열 순회
```javascript
// 객체로 구성된 배열
const memoList = [
    { content: "오늘 할 일", isDone: false },
    { content: "오늘 할 일 2", isDone: true },
    { content: "오늘 할 일 3", isDone: false }
];

// for...of로 순회
for (let memo of memoList) {
    if (memo.isDone === false) {
        console.log(memo);
    }
}

// forEach로 순회
memoList.forEach(memo => {
    if (memo.isDone === false) {
        console.log(memo);
    }
});
```

---

## 7. 템플릿 리터럴 (Template Literals)

### 1. 기본 사용법
```javascript
const name = "김철수";
const age = 25;

// 백틱(`)과 ${} 사용
console.log(`안녕하세요, ${name}님!`);
console.log(`나이: ${age}세`);

// 계산식도 가능
const price = 10000;
console.log(`총 금액: ${price * 2}원`);
```

### 2. 여러 줄 문자열
```javascript
// 백틱을 사용하면 여러 줄 가능
const message = `
첫 번째 줄
두 번째 줄
세 번째 줄
`;
```

---

## 8. 핵심 개념 정리

### 1. 조건문 요약

| 구문 | 사용 시기 | 예시 |
|---|---|---|
| `if` | 단일 조건 | `if (score >= 80) { ... }` |
| `if-else` | 두 가지 경우 | `if (age >= 20) { ... } else { ... }` |
| `if-else if-else` | 여러 조건 | `if (x > 0) { ... } else if (x < 0) { ... } else { ... }` |
| 삼항 연산자 | 간단한 조건 | `const result = x > 0 ? 'positive' : 'negative'` |

### 2. 반복문 요약

| 구문 | 설명 | 예시 |
|---|---|---|
| `for` | 정해진 횟수 반복 | `for (let i = 0; i < 5; i++) { ... }` |
| `for...of` | 배열 요소 순회 | `for (let item of arr) { ... }` |
| `break` | 반복 중단 | `if (i === 5) break;` |
| `continue` | 현재 회차 건너뛰기 | `if (i === 3) continue;` |

### 3. 함수 정의 방식

| 방식 | 문법 | 특징 |
|---|---|---|
| 함수 선언식 | `function name() { ... }` | 호이스팅 가능 |
| 화살표 함수 | `const name = () => { ... }` | 간결한 문법 |
| 한 줄 화살표 | `const name = (x) => x * 2` | return 생략 가능 |

### 4. 배열 메서드

| 메서드 | 설명 | 예시 |
|---|---|---|
| `push()` | 끝에 추가 | `arr.push('item')` |
| `pop()` | 끝에서 제거 | `arr.pop()` |
| `length` | 배열 길이 | `arr.length` |
| `forEach()` | 각 요소에 함수 실행 | `arr.forEach(item => {...})` |

### 5. 객체 메서드

| 메서드 | 반환값 | 예시 |
|---|---|---|
| `Object.keys()` | 키 배열 | `Object.keys(obj)` |
| `Object.values()` | 값 배열 | `Object.values(obj)` |
| `Object.entries()` | [키, 값] 배열 | `Object.entries(obj)` |

---

## 9. 학습 포인트 (Key Takeaways)

### 1. const를 기본으로, let은 필요할 때만

변수는 **const로 선언**하고, 값이 변경되어야 할 때만 let을 사용한다. 이렇게 하면 예기치 않은 값 변경을 방지할 수 있다.

### 2. 삼항 연산자는 간단할 때만

삼항 연산자는 한 줄로 끝나는 간단한 조건문에만 사용한다. 복잡한 로직은 if-else가 가독성이 더 좋다.
```javascript
// 좋은 예
const grade = score >= 80 ? 'pass' : 'fail';

// 나쁜 예 (중첩 삼항 연산자)
const result = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D';
```

### 3. 함수는 한 가지 일만 하도록

함수는 하나의 명확한 목적을 가져야 한다. 함수명으로 기능을 파악할 수 있어야 한다.
```javascript
// 좋은 예: 명확한 단일 기능
function getGrade(score) { ... }
function calculateSum(numbers) { ... }
```

### 4. for...of와 forEach 활용

배열을 순회할 때 인덱스가 필요 없다면 `for...of`나 `forEach`가 더 간결하고 읽기 쉽다.
```javascript
// 인덱스가 필요 없을 때
for (let user of userList) {
    console.log(user.name);
}

// 인덱스가 필요할 때
for (let i = 0; i < userList.length; i++) {
    console.log(i, userList[i].name);
}
```

### 5. 템플릿 리터럴로 가독성 높이기

문자열과 변수를 결합할 때는 `+` 연산자보다 템플릿 리터럴(백틱)이 훨씬 읽기 쉽다.
```javascript
// 나쁜 예
console.log("안녕하세요, " + name + "님! 나이는 " + age + "세입니다.");

// 좋은 예
console.log(`안녕하세요, ${name}님! 나이는 ${age}세입니다.`);
```

### 6. 객체와 배열의 조합을 이해하자

실무에서는 객체의 배열 형태를 자주 다룬다. 이 구조를 편하게 다룰 수 있어야 데이터 처리가 수월하다.
```javascript
const users = [
    { name: "김철수", age: 20 },
    { name: "이영희", age: 25 }
];

// 객체 배열 순회
users.forEach(user => {
    console.log(`${user.name}: ${user.age}세`);
});
```