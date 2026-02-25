# [TIL] CSS: 기초 문법, 박스 모델, 레이아웃 스타일링

## 1. CSS 기초

### 1. CSS란?

Cascading Style Sheets의 약자. HTML 요소에 스타일(색상, 크기, 레이아웃 등)을 적용하여 웹 페이지를 꾸미는 언어다.

- **Cascading**: 스타일이 위에서 아래로 흐르듯 적용되며, 우선순위에 따라 스타일이 덮어씌워진다
- **Style Sheets**: 디자인 규칙을 정의하는 문서

### 2. CSS 적용 방법

```html
<!-- 1. 외부 스타일시트 (권장) -->
<link rel="stylesheet" href="style.css">

<!-- 2. 내부 스타일시트 -->
<style>
  h1 { color: blue; }
</style>

<!-- 3. 인라인 스타일 (비권장) -->
<h1 style="color: blue;">제목</h1>
```

**외부 스타일시트**를 사용하는 것이 가장 좋다. 코드 재사용성과 유지보수성이 높아진다.

### 3. CSS 기본 구조

```css
선택자 {
  속성: 값;
  속성: 값;
}
```

```css
h1 {
  color: white;
  background-color: #ffc72e;
  padding: 12px;
}
```

- **선택자(Selector)**: 스타일을 적용할 HTML 요소
- **속성(Property)**: 변경하고 싶은 스타일 종류
- **값(Value)**: 속성에 적용할 구체적인 값
- **선언 블록**: `{ }` 안의 모든 스타일 규칙

---

## 2. 선택자(Selector)

### 1. 기본 선택자

```css
/* 태그 선택자: 모든 h1 요소 선택 */
h1 {
  font-size: 1.5rem;
}

/* 클래스 선택자: class="card"인 요소 선택 */
.card {
  background-color: white;
}

/* ID 선택자: id="header"인 요소 선택 (한 페이지에 하나만) */
#header {
  margin: 0;
}

/* 전체 선택자: 모든 요소 선택 */
* {
  margin: 0;
  padding: 0;
}
```

### 2. 복합 선택자

```css
/* 자손 선택자: .card 안의 모든 div */
.card div {
  padding: 15px;
}

/* 자식 선택자: .card의 바로 아래 자식 div만 */
.card > div {
  padding: 15px;
}

/* 그룹 선택자: 여러 요소에 같은 스타일 */
h1, h2, h3 {
  font-weight: bold;
}
```

### 3. 선택자 우선순위

인라인 스타일 > ID 선택자 > 클래스 선택자 > 태그 선택자

같은 우선순위면 나중에 작성된 스타일이 적용된다.

---

## 3. 색상 표현

### 1. 색상 지정 방법

```css
/* 1. 색상 이름 */
color: white;
background-color: gray;

/* 2. HEX 코드 (가장 많이 사용) */
background-color: #ffc72e;  /* 황금색 */
color: #808080;             /* 회색 */
background-color: #eeeeee;  /* 밝은 회색 */

/* 3. RGB */
background-color: rgb(238, 238, 238);

/* 4. RGBA (투명도 추가) */
box-shadow: 0 5px 5px rgba(0, 0, 0, 0.05);
```

**HEX 코드**가 가장 널리 사용된다. 간결하고 정확하다.

### 2. 자주 사용하는 색상 코드

| 색상 | HEX 코드 | 용도 |
|---|---|---|
| 흰색 | `#ffffff` 또는 `#fff` | 배경, 텍스트 |
| 검은색 | `#000000` 또는 `#000` | 텍스트 |
| 회색 | `#808080` | 보조 텍스트 |
| 밝은 회색 | `#eeeeee` | 배경 |
| 진한 회색 | `#f7f7f7` | 경계선 |

---

## 4. 박스 모델(Box Model)

### 1. 박스 모델이란?

모든 HTML 요소는 박스 형태로 구성되며, 4가지 영역으로 나뉜다.

```
┌─────────────── margin (외부 여백) ───────────────┐
│ ┌───────────── border (테두리) ────────────────┐ │
│ │ ┌─────────── padding (내부 여백) ──────────┐ │ │
│ │ │                                          │ │ │
│ │ │          content (실제 내용)             │ │ │
│ │ │                                          │ │ │
│ │ └──────────────────────────────────────────┘ │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 2. margin과 padding

```css
/* margin: 요소 외부의 여백 (다른 요소와의 간격) */
.card {
  margin: 20px 130px;  /* 위아래 20px, 좌우 130px */
}

footer {
  margin-top: 40px;    /* 위쪽만 40px */
}

/* padding: 요소 내부의 여백 (콘텐츠와 테두리 사이) */
.card {
  padding: 0 15px;     /* 위아래 0, 좌우 15px */
}

.card-title {
  padding: 16px 5px 8px;  /* 위 16px, 좌우 5px, 아래 8px */
}

.card-date {
  padding: 0 5px 25px;    /* 위 0, 좌우 5px, 아래 25px */
}
```

### 3. 여백 축약 표현

```css
/* 4개 값: 상 우 하 좌 (시계방향) */
padding: 10px 20px 30px 40px;

/* 3개 값: 상 좌우 하 */
padding: 16px 5px 8px;

/* 2개 값: 상하 좌우 */
padding: 20px 130px;

/* 1개 값: 모든 방향 */
padding: 15px;
```

### 4. border (테두리)

```css
/* 개별 속성 */
border-width: 1px;
border-style: solid;
border-color: #f7f7f7;

/* 축약 표현 (권장) */
border: 1px solid #f7f7f7;

/* 특정 방향만 */
border-bottom: 1px solid #f7f7f7;
```

---

## 5. 텍스트 스타일링

### 1. 글꼴 관련

```css
/* 글자 크기 */
h1 {
  font-size: 1.5rem;     /* 상대 단위 (권장) */
}

footer {
  font-size: 0.7rem;     /* 기본 크기의 70% */
}

/* 글자 두께 */
.card-title {
  font-weight: bold;     /* 또는 700 */
}

/* 글자 정렬 */
h1 {
  text-align: center;    /* left, right, center, justify */
}

.card-date {
  text-align: right;
}
```

### 2. 크기 단위

| 단위 | 설명 | 사용 예 |
|---|---|---|
| `px` | 고정 픽셀 | `font-size: 16px` |
| `rem` | 루트 요소 기준 상대 크기 (권장) | `font-size: 1.5rem` |
| `em` | 부모 요소 기준 상대 크기 | `font-size: 1.2em` |
| `%` | 부모 요소 대비 백분율 | `width: 50%` |

**rem 사용을 권장한다.** 반응형 디자인에 유리하고 일관성 있는 크기 조절이 가능하다.

---

## 6. 레이아웃 스타일링

### 1. 배경색

```css
body {
  background-color: #eeeeee;
}

.card {
  background-color: white;
}

h1 {
  background-color: #ffc72e;
}
```

### 2. 모서리 둥글게 (border-radius)

```css
.card {
  border-radius: 5px;  /* 모든 모서리를 5px만큼 둥글게 */
}

/* 개별 모서리 조절도 가능 */
border-radius: 10px 5px 10px 5px;  /* 좌상 우상 우하 좌하 */
```

### 3. 그림자 효과 (box-shadow)

```css
.card {
  box-shadow: 0 5px 5px rgba(0, 0, 0, 0.05);
}
```

**box-shadow 구조**: `수평위치 수직위치 흐림정도 색상`
- `0`: 수평으로 이동 없음
- `5px`: 아래로 5px
- `5px`: 흐림 정도 5px
- `rgba(0,0,0,0.05)`: 5% 투명도의 검은색

### 4. body의 기본 margin 제거

```css
body {
  margin: 0;  /* 브라우저 기본 여백 제거 */
}

h1 {
  margin: 0;  /* 기본 상하 여백 제거 */
}
```

브라우저는 기본적으로 body, h1 등에 여백을 적용한다. 디자인 의도대로 만들려면 이를 초기화해야 한다.

---

## 7. 실습: 메모장 카드 레이아웃

### 1. HTML 구조

```html
<header><h1>나만의 메모장</h1></header>

<div class="card">
  <div class="card-title">장보기 목록</div>
  <div class="card-content">계란, 닭가슴살, 대파, 양파</div>
  <div class="card-date">2099-12-31</div>
</div>

<div class="card">
  <div class="card-title">주말 계획</div>
  <div class="card-content">토요일 오전 휴식, 일요일 오전 러닝</div>
  <div class="card-date">2099-12-31</div>
</div>

<footer>간단한 메모 웹 페이지</footer>
```

### 2. CSS 스타일링

```css
/* 전체 배경 */
body {
  background-color: #eeeeee;
  margin: 0;
}

/* 헤더 */
h1 {
  font-size: 1.5rem;
  color: white;
  background-color: #ffc72e;
  padding: 12px;
  text-align: center;
  margin: 0;
}

/* 카드 공통 스타일 */
.card {
  background-color: white;
  border-radius: 5px;
  margin: 20px 130px;
  padding: 0 15px;
  box-shadow: 0 5px 5px rgba(0,0,0,0.05);
}

/* 카드 제목 */
.card-title {
  padding: 16px 5px 8px;
  font-weight: bold;
  border-bottom: 1px solid #f7f7f7;
}

/* 카드 내용 */
.card-content {
  padding: 15px 5px;
  font-size: 0.8rem;
  color: #808080;
}

/* 카드 날짜 */
.card-date {
  text-align: right;
  font-size: 0.7rem;
  color: #808080;
  padding: 0 5px 25px;
}

/* 푸터 */
footer {
  font-size: 0.7rem;
  color: #808080;
  text-align: center;
  margin-top: 40px;
}
```

### 3. 구현 결과

![메모장 완성 화면](https://github.com/user-attachments/assets/b51315ec-e60c-4a76-a785-89defbdfed2d)

**구현 특징:**
- 황금색 헤더와 밝은 회색 배경으로 시각적 계층 구분
- 흰색 카드에 미세한 그림자와 둥근 모서리로 깔끔한 느낌
- 회색 텍스트로 부수적인 정보(날짜, 푸터) 표현
- 일관된 padding과 margin으로 정돈된 레이아웃

---

## 8. 핵심 개념 정리

### 1. CSS 속성 요약

| 속성 | 설명 | 예시 |
|---|---|---|
| `color` | 텍스트 색상 | `color: #808080;` |
| `background-color` | 배경 색상 | `background-color: white;` |
| `font-size` | 글자 크기 | `font-size: 1.5rem;` |
| `font-weight` | 글자 두께 | `font-weight: bold;` |
| `text-align` | 텍스트 정렬 | `text-align: center;` |
| `margin` | 외부 여백 | `margin: 20px 130px;` |
| `padding` | 내부 여백 | `padding: 15px 5px;` |
| `border` | 테두리 | `border: 1px solid #f7f7f7;` |
| `border-radius` | 모서리 둥글게 | `border-radius: 5px;` |
| `box-shadow` | 그림자 효과 | `box-shadow: 0 5px 5px rgba(0,0,0,0.05);` |

### 2. 단위 비교

| 단위 | 특징 | 권장 용도 |
|---|---|---|
| `px` | 절대 단위, 고정 크기 | border, 작은 여백 |
| `rem` | 루트 기준 상대 단위 | font-size, 여백 |
| `%` | 부모 기준 백분율 | width, height |
| `rgba()` | 투명도 포함 색상 | 그림자, 반투명 배경 |

---

## 9. 학습 포인트 (Key Takeaways)

### 1. 외부 CSS 파일을 사용하자

HTML과 CSS를 분리하면 코드 관리가 쉽고, 여러 페이지에서 같은 스타일을 재사용할 수 있다. `<link rel="stylesheet" href="style.css">`로 연결한다.

### 2. 클래스 선택자를 적극 활용하자

ID는 한 페이지에 하나만 존재해야 하므로 재사용이 어렵다. 반면 클래스(`.card`, `.card-title`)는 여러 요소에 적용 가능하여 유연하다.

### 3. 박스 모델을 이해하자

요소의 실제 크기는 `width + padding + border + margin`이다. padding과 margin의 차이를 명확히 이해하고, 목적에 맞게 사용해야 레이아웃이 의도대로 나온다.

### 4. rem 단위로 일관성을 확보하자

`px`보다 `rem`을 사용하면 반응형 디자인에 유리하고, 전체 크기 조절이 용이하다. `1rem = 16px`이 기본값이다.

### 5. 브라우저 기본 스타일을 초기화하자

body, h1 등은 브라우저가 기본 margin/padding을 적용한다. `margin: 0`으로 초기화해야 정확한 레이아웃 구현이 가능하다.

### 6. 색상과 여백으로 시각적 계층을 만들자

같은 회색이라도 `#808080`, `#f7f7f7`, `#eeeeee`처럼 명도 차이를 두면 정보의 중요도를 시각적으로 구분할 수 있다. box-shadow도 깊이감을 준다.