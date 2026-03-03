// 1번. 문자열을 인자로 전달해서 "안녕하세요, [문자열]님!"을 출력하는 함수를 구현한다.
// 함수명: greet (선언식), greetArrow (화살표)
console.log("1번 문제");
// 정의 코드 작성
function greet(name) {
    return `안녕하세요, ${name}님!`;
}

const greetArrow = (name) => `안녕하세요, ${name}님!`

console.log(greet("김철수"));
console.log(greetArrow("이영희"));
console.log("-----------------");

// 2번. 숫자 하나를 인자로 전달해서 제곱한 데이터를 반환(return)하는 함수를 구현한다.
// 함수명: square (선언식), squareArrow (화살표)
console.log("2번 문제");
// 정의 코드 작성
function square(number) {
    return number ** 2;
}

const squareArrow = (number) => number ** 2;

console.log(square(5));      // 25
console.log(squareArrow(8)); // 64
console.log("-----------------");

// 3번. 1 이상의 숫자 하나를 인자로 전달해서 1부터 인자 데이터까지 출력하는 함수를 구현한다. 
// 함수명: printFromOne (선언식), printFromOneArrow (화살표)
console.log("3번 문제");
// 정의 코드 작성
function printFromOne(number) {
    for (let i = 1; i <= number; i++) {
        console.log(i);
    }
}

const printFromOneArrow = (number) => {
    for (let i = 1; i <= number; i++) {
        console.log(i);
        
    }
}
printFromOne(5);
console.log("---");
printFromOneArrow(3);
console.log("-----------------");

// 4번. 두 데이터를 인자로 전달해서 더 큰 수를 반환한다. 
// 함수명: max (선언식), maxArrow (화살표)
console.log("4번 문제");
// 정의 코드 작성
function max(a, b) {
    if (a > b) {
        return a;
    } else {
        return b;
    }
}

const maxArrow = (a,b) => (a > b ? a : b)
console.log(max(5, 10));        // 10
console.log(maxArrow(8, 1));    // 8
console.log(maxArrow("a", "b")); // b
console.log("-----------------");

// 5번. 숫자 하나를 인자로 전달해서 숫자에 해당하는 등급을 반환한다.
// (90이상: "A", 80이상: "B", 70이상: "C", 그 외: "D")
// 함수명: getGrade (선언식), getGradeArrow (화살표)
console.log("5번 문제");
// 정의 코드 작성
function getGrade(score) {
    if (score >= 90) {
        return 'A';
    } else if (score >= 80) {
        return 'B';
    } else if (score >= 70) {
        return 'C';
    } else {
        return 'D';
    }
}

const getGradeArrow = (score) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    return 'D'
}
console.log(getGrade(95));      // A
console.log(getGradeArrow(78)); // C
console.log("-----------------");

// 6번. 두 숫자를 인자로 전달해서 두 숫자 사이의 합을 반환한다. 
// 함수명: sumBetween (선언식), sumBetweenArrow (화살표)
console.log("6번 문제");
// 정의 코드 작성
function sumBetween(a, b) {
    let big;
    let small;
    if (a > b) {
        big = a;
        small = b;
    } else {
        big = b;
        small = a;
    }
    let sum = 0;
    for (let i = small; i <= big; i++) {
        sum += i;
    }
    return sum
}

const sumBetweenArrow = (a, b) => {
    let big;
    let small;
    if (a > b) {
        big = a;
        small = b;
    } else {
        big = b;
        small = a;
    }
    let sum = 0;
    for (let i = small; i <= big; i++) {
        sum += i;
    }
    return sum
}
console.log(sumBetween(5, 10));      // 45
console.log(sumBetweenArrow(90, 100)); // 1045
console.log("-----------------");

// 7번. 전달되는 인자의 개수에 상관없이 모든 숫자의 합을 반환한다.
// 함수명: sumAll (선언식), sumAllArrow (화살표)
console.log("7번 문제");
// 정의 코드 작성
function sumAll(...numbers) {
    console.log(numbers);
    let total = 0

    for (let i = 0; i < numbers.length; i++) {
        total += numbers[i]
    }
    return total
}
function sumAll(...numbers) {
    console.log(numbers);
    let total = 0;
    for ( let el of numbers) {
        total += el;
    }
    return total;
}

function sumAll(...numbers) {
    console.log(numbers);
    let total = 0;
    numbers.forEach((el) => (total += el));
    return total;
}

const sumAllArrow = (...numbers) => {
    let total = 0;
    numbers.forEach((el) => (total += el));
    return total;
}


console.log(sumAll(1, 2, 3));              // 6
console.log(sumAllArrow(1, 2, 3, 4, 5));   // 15
console.log("-----------------");