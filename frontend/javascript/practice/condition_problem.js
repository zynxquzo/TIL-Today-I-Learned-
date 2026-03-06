// 1번. 변수 score에 85를 할당한다. score가 80 이상이면 "합격입니다"를 출력한다.
console.log("1번 문제");
const score = 85;
if (score >= 85) {
    console.log('합격입니다');
}
console.log("-----------------");

// 2번. 변수 age에 18을 할당한다. age가 20 이상이면 "성인입니다"를 출력하고, 그렇지 않으면 "미성년자입니다"를 출력한다.
console.log("2번 문제");
const age = 18;
if (age >= 20) {
    console.log('성인입니다');
} else {
    console.log('미성년자입니다');
}
console.log("-----------------");

// 3번. 변수 number에 -5를 할당한다. number가 0보다 크면 "양수", 0보다 작으면 "음수", 0이면 "0"을 출력한다.
console.log("3번 문제");
const number = -5;
if (number > 0) {
    console.log('양수');
} else if (number < 0) {
    console.log('음수');
} else {
    console.log('0');
}
console.log("-----------------");

// 4번. 변수 memberLevel에 "gold"를 할당한다. memberLevel이 "gold" 또는 "platinum"이면 "VIP 혜택을 받을 수 있습니다"를 출력하고, 그렇지 않으면 "일반 혜택만 가능합니다"를 출력한다.
console.log("4번 문제");
const memberLevel = 'gold';
if (memberLevel === 'gold' || memberLevel === 'platinum') {
    console.log('VIP 혜택을 받을 수 있습니다');
} else {
    console.log('일반 혜택만 가능합니다');
}
console.log("-----------------");

// 5번. 변수 userAge는 25, 변수 isStudent는 true로 할당한다. userAge가 20 이상이면서 isStudent가 true이면 "성인 학생입니다"를, 그렇지 않으면 "성인입니다"를 출력한다. 20 미만이면 "미성년자입니다"를 출력한다.
console.log("5번 문제");
const userAge = 25;
const isStudent = true;

if (userAge >= 20) {
    if (isStudent) {
        console.log('성인 학생입니다');
    } else {
        console.log('성인입니다');
    }
} else {
    console.log('미성년자입니다');
}
console.log("-----------------");

// 6번. 변수 temperature는 28, 변수 humidity는 60으로 할당한다. temperature가 25 이상이고 humidity가 70 이상이면 "더운 날씨입니다", humidity가 70 미만이면 "따뜻한 날씨입니다"를 출력한다. 25 미만이면 "시원한 날씨입니다"를 출력한다.
console.log("6번 문제");
const temperature = 28;
humidity = 60;

if (temperature >= 25) {
    if (humidity >= 70) {
        console.log('더운 날씨입니다');
    } else {
        console.log('따뜻한 날씨입니다');
    }
} else {
    console.log('시원한 날씨입니다');
}
console.log("-----------------");

// 7번. 변수 point에 1500을 할당한다. 삼항 연산자를 사용하여 point가 1000 이상이면 "VIP", 아니면 "일반"을 result에 할당하고 출력한다.
console.log("7번 문제");
const point = 1500;

const result = point >= 1000 ? 'VIP' : '일반'
console.log(`${result}`)
console.log("-----------------");

// 8번. 변수 purchaseAmount에 150000을 할당한다. 100000 이상이면 10% 할인된 금액을, 아니면 원래 금액을 finalPrice에 할당한 후 템플릿 리터럴로 구매 금액과 최종 금액을 출력한다. (삼항 연산자 활용 가능)
console.log("8번 문제");
const purchaseAmount = 150000;

const finalPrice = purchaseAmount >= 100000 ? purchaseAmount * 0.9 : purchaseAmount
console.log(`구매금액: ${purchaseAmount}원, 최종금액: ${finalPrice}원`)
console.log("-----------------");

// 9번. 변수 userType은 "premium", userPoints는 2500, isActive는 true로 할당한다. isActive가 false면 "비활성 계정", true인 경우 등급과 포인트 조건에 따라 VIP/프리미엄/일반/신규 등급을 출력한다.
console.log("9번 문제");
const userType = 'premium';
const userPoints = 2500;
const isActive = true;

if (! isActive) {
    console.log('비활성 계정');
} else {
    if (userType === 'premium') {
        if (userPoints > 2000) {
            console.log('VIP');
        } else {
            console.log('premium');
        }
    } else {
        if (userPoints >= 1000) {
            console.log('일반');  
        } else {
            console.log('신규');
        }
    }
}
console.log("-----------------");

// 10번. 변수 isRaining에 true를 할당한다. 삼항 연산자를 사용하여 true이면 "우산을 챙기세요", 아니면 "날씨가 맑습니다"를 result에 할당하고 출력한다.
console.log("10번 문제");
const isRaining = true;

const weatherMessage = isRaining ? '우산을 챙기세요' : '날씨가 맑습니다'
console.log(`${weatherMessage}`)
console.log("-----------------");