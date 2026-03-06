// 1번. for 반복문을 활용해서 0부터 4까지의 숫자를 출력한다.
console.log("1번 문제");
for (let i = 0; i <= 4; i++) {
    console.log(i);   
}
console.log("-----------------");

// 2번. 변수 N에 6을 할당한다. for 반복문을 활용해서 1부터 N까지의 숫자를 출력한다.
console.log("2번 문제");
let N = 6;

for (let i = 1; i <= 6; i++) {
    console.log(i);
}
console.log("-----------------");

// 3번. for 반복문을 활용해서 1부터 10까지 반복 출력하되, 5가 되면 break로 반복을 중단한다.
console.log("3번 문제");
for (let i = 1; i <= 10; i++) {
    if (i === 5) {
        break;
    }
    console.log(i);
    
}
console.log("-----------------");

// 4번. for 반복문을 활용해서 1부터 6까지 반복 출력하되, 3일 때는 continue로 반복을 건너뛴다.
console.log("4번 문제");
for (let i = 1; i <= 6; i++) {
    if (i === 3) {
        continue;
    }
    console.log(i);
    
}
console.log("-----------------");

// 5번. for 반복문을 활용해서 10부터 1까지의 숫자를 역순으로 출력한다.
console.log("5번 문제");
for (let i = 10; i > 0; i--) {
    console.log(i);
}
console.log("-----------------");
// 6번. for 반복문을 활용해서 1부터 10까지 반복 출력하되, 홀수(나머지가 1)이면 건너뛰고 짝수(나머지가 0)이면 출력한다.
console.log("6번 문제");
for (let i = 1; i <= 10; i++) {
    if (i % 2 === 0) {
    console.log(i);
    }
}
console.log("-----------------");

// 7번. 구구단 2단부터 9단까지 출력한다.
console.log("7번 문제");
for (let i = 2; i <= 9; i++) {
    console.log(`${i}단`);
    for (let j = 1; j <= 9; j++) {
        console.log(`${i} * ${j} = ${i * j}`);
    }
}
console.log("-----------------");