// 1번. 변수 letters에 "A", "B" 배열을 할당하고 출력한다. "Z"를 추가하여 출력한 뒤, 다시 맨 뒤 원소를 제거하고 제거된 원소와 남은 배열을 각각 출력한다.
console.log("1번 문제");
let letters = ['A', 'B'];
console.log(letters);

letters.push('Z')
console.log(letters);

let removed = letters.pop()
console.log(removed);
console.log(letters);

console.log("-----------------");

// 2번. 변수 numbers에 1, 2, 3 배열을 할당한다. 반복문을 활용해 각 원소에 2를 곱한 값을 담은 새로운 배열 newNumbers를 만들어 출력한다.
console.log("2번 문제");
let numbers = [1, 2, 3];
let newNumbers =[];

for (let i = 0; i < numbers.length; i++) {
    newNumbers.push(numbers[i] * 2);
}
console.log(newNumbers);

console.log("-----------------");

// 3번. 변수 numbers2에 1, 2, 3, 4, 5 배열을 할당한다. 반복문을 활용해 짝수만 담은 새로운 배열 newNumbers2를 만들어 출력한다.
console.log("3번 문제");
let numbers2 = [1, 2, 3, 4, 5];
let newNumbers2 = [];

for (let i = 0; i < numbers2.length; i++) {
    if (numbers2[i] % 2 ===0) {
        newNumbers2.push(numbers2[i])
    }
} 
console.log(newNumbers2)
console.log("-----------------");

// 4번. 변수 person에 name: "이민수", age: 35, city: "부산" 객체를 할당한다. Object 메서드를 활용해 객체의 모든 키(keys), 모든 값(values), 모든 쌍(entries)을 각각 배열로 출력한다.
console.log("4번 문제");
let person = {
    name: '이민수',
    age: 35,
    city: '부산',
}

console.log(Object.keys(person));
console.log(Object.values(person));
console.log(Object.entries(person));


console.log("-----------------");

// 5번. 변수 student에 name: "학생", grades: ["A", "B", "C"] 객체를 할당한다. 객체 내부의 grades 배열에 "D"를 추가하고 전체 객체를 출력한다.
console.log("5번 문제");
let student = {
    name: '학생',
    grades: ['A', 'B', 'C']
}

student.grades.push('D');
console.log(student);

console.log("-----------------");

// 6번. 주어진 memoList 배열에서 반복문을 활용하여 isDone이 false인 객체들만 찾아 출력한다.
const memoList = [
  { content: "오늘 할 일", isDone: false },
  { content: "오늘 할 일 2", isDone: true },
  { content: "오늘 할 일 3", isDone: false },
];
console.log("6번 문제");
for (let memo of memoList) {
    if (memo.isDone === false) {
        console.log(memo);
    }
}

memoList.forEach(memo => {
    if (memo.isDone === false) {
        console.log(memo);
    }
})
console.log("-----------------");

// 7번. 주어진 userList 배열에서 반복문을 활용하여 age가 24세 이상인 데이터의 name만 추출하여 출력한다.
const userList = [
  { name: "김철수", age: 20 },
  { name: "이순신", age: 23 },
  { name: "장영실", age: 24 },
  { name: "홍길동", age: 25 },
];
console.log("7번 문제");
for (let user of userList) {
    if (user.age >= 24) {
        console.log(user.name);
        
    }
}

userList.forEach(user => {
    if (user.age >= 24) {
        console.log(user.name);
        
    }
})
console.log("-----------------");