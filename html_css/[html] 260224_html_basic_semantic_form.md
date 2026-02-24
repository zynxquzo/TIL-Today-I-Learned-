# [TIL] HTML: 기초 문법, 시맨틱 태그, 폼(Form)

## 1. HTML 기초

### 1. HTML이란?

HyperText Markup Language의 약자. 웹 페이지의 구조와 콘텐츠를 정의하는 마크업 언어다.

- **하이퍼 텍스트(Hyper Text)**: 다른 문서나 웹 페이지로 연결하는 텍스트
- **마크업 언어(Markup Language)**: 태그(tag)를 사용해 문서를 구조화하고 내용을 표현하는 언어

### 2. HTML 문서 기본 구조

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
    <!-- 콘텐츠가 들어가는 영역 -->
  </body>
</html>
```

- `<!DOCTYPE html>`: 문서 형식이 HTML임을 선언
- `<html>`: HTML 문서 전체를 감싸는 루트 요소
- `<head>`: 메타데이터(제목, 스타일, 스크립트 등)를 포함하는 영역. 화면에 표시되지 않음
- `<body>`: 실제로 사용자에게 보여지는 콘텐츠 영역

### 3. 요소(Element) 구조

```html
<태그 속성="값">내용</태그>
```

- **태그**: 요소의 기능을 나타냄. 시작 태그 `<>` + 종료 태그 `</>`로 구성
- **속성**: 요소에 추가 정보를 제공하며, 시작 태그 안에 작성
- **내용**: 화면에 표시할 텍스트 또는 또 다른 요소

종료 태그가 없는 빈 태그도 존재한다. (`<br>`, `<img>`, `<input>` 등)

### 4. 주요 속성

| 속성 | 설명 |
|---|---|
| `id` | 요소에 고유한 식별자를 부여. 문서 내 중복 불가 |
| `class` | 여러 요소를 그룹화. 하나의 요소에 여러 클래스 지정 가능 |
| `style` | 요소에 인라인 스타일 직접 적용 |
| `src` | 이미지, 비디오 등 파일 경로 지정 |
| `href` | `<a>` 태그의 링크 이동 주소 지정 |

### 5. HTML 주석

```html
<!-- 주석은 웹 페이지에 표시되지 않는다 -->
```

- 주석 안에 또 다른 주석은 사용 불가
- 비밀번호 등 민감한 정보는 주석에 작성 금지 (개발자 도구로 확인 가능)

---

## 2. 자주 사용하는 태그

### 1. 텍스트 관련 태그

```html
<!-- 제목 태그 (h1이 가장 크고 h6이 가장 작음) -->
<h1>h1 제목</h1>
<h2>h2 제목</h2>
<h3>h3 제목</h3>

<!-- 단락 태그 -->
<p>이것은 단락입니다.</p>

<!-- 줄바꿈 태그 (종료 태그 없음) -->
<p>첫 번째 줄<br />두 번째 줄</p>

<!-- 수평선 태그 -->
<hr>
```

### 2. 하이퍼링크 및 이미지 태그

```html
<!-- 링크 태그 -->
<a href="https://www.google.com" target="_blank">구글로 이동 (새 탭)</a>
<a href="#section1">페이지 내 특정 위치로 이동</a>

<!-- 이미지 태그 (종료 태그 없음) -->
<img src="photo.jpg" alt="사진 설명" width="400" />
```

- `target="_blank"`: 새 탭에서 열기, `target="_self"`: 현재 탭에서 열기 (기본값)
- `alt` 속성: 이미지 로드 실패 시 보여줄 대체 텍스트. 웹 접근성과 SEO에 중요

### 3. 목록 태그

```html
<!-- 순서 없는 목록 (점 표시) -->
<ul>
  <li>사과</li>
  <li>바나나</li>
</ul>

<!-- 순서 있는 목록 (번호 표시) -->
<ol>
  <li>HTML 배우기</li>
  <li>CSS 배우기</li>
</ol>
```

목록 안에 또 다른 목록을 중첩해서 사용할 수 있다.

### 4. 멀티미디어 태그

```html
<audio src="music.mp3" controls></audio>
<video src="video.mp4" controls poster="thumbnail.jpg" width="640"></video>
```

- `controls`: 재생/일시정지/볼륨 등 컨트롤 버튼 표시
- `autoplay`: 페이지 로드 시 자동 재생
- `loop`: 반복 재생
- `poster` (`<video>` 전용): 비디오 로드 전 표시할 썸네일 이미지

### 5. 테이블 태그

```html
<table>
  <thead>
    <tr>
      <th>이름</th>
      <th>나이</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>홍길동</td>
      <td>25</td>
    </tr>
  </tbody>
</table>
```

- `<thead>`: 표의 머리글 영역
- `<tbody>`: 표의 본문 영역
- `<tr>`: 하나의 행(Row)
- `<th>`: 머리글 셀 (굵게, 가운데 정렬이 기본)
- `<td>`: 데이터 셀

---

## 3. 시맨틱 태그(Semantic Tags)

### 1. 시맨틱 태그란?

`<div>`처럼 의미가 없는 태그 대신, **태그 이름 자체가 역할을 설명**하는 태그. 가독성과 SEO, 웹 접근성에 유리하다.

### 2. 주요 시맨틱 태그

| 태그 | 역할 |
|---|---|
| `<header>` | 페이지나 섹션 상단의 로고, 메뉴 등 |
| `<nav>` | 페이지 이동을 위한 메뉴 링크 영역 |
| `<main>` | 문서의 핵심 주요 콘텐츠 |
| `<section>` | 주제별 영역을 논리적으로 구분 |
| `<article>` | 뉴스, 블로그 글 등 독립적으로 배포 가능한 영역 |
| `<aside>` | 본문 옆의 부수적인 정보나 사이드바 |
| `<footer>` | 페이지 하단의 저작권, 연락처 등 |

### 3. 시맨틱 태그 활용 예시 (basic3.html 실습)

```html
<header><h1>Header 제목</h1></header>

<nav>
  <ul>
    <li><a href="">홈</a></li>
    <li><a href="">링크</a></li>
  </ul>
</nav>

<div>
  <main>
    <section>
      <h3>소개</h3>
      <p>안녕하세요! 저는 XXX입니다.</p>
    </section>
    <section>
      <h3>최근 글</h3>
      <article>첫 번째 글</article>
      <article>두 번째 글</article>
    </section>
  </main>

  <aside>
    <h2>사이드바</h2>
    <ul>
      <li># 태그1</li>
    </ul>
  </aside>
</div>

<footer>Footer: my&copy; all rights reserved.</footer>
```

### 4. `<div>` vs 시맨틱 태그

```html
<!-- 좋은 예: 의미에 맞는 시맨틱 태그 사용 -->
<header>
  <h1>사이트 제목</h1>
</header>

<!-- 나쁜 예: 시맨틱 태그를 쓸 수 있는데 div 사용 -->
<div class="header">
  <h1>사이트 제목</h1>
</div>
```

의미를 명확히 표현할 수 있는 시맨틱 태그가 있다면 `<div>` 대신 사용한다. `<div>`는 순수하게 스타일링이나 그룹화 목적일 때 사용한다.

---

## 4. 폼(Form) 태그

### 1. 폼 태그란?

사용자로부터 정보를 입력받아 웹 서버로 전송하는 태그. 회원가입, 로그인, 검색, 결제 등에 활용된다.

```html
<form action="정보를 보낼 주소" method="보내는 방식">
  <!-- 입력 요소들 -->
</form>
```

- `action`: 입력된 정보를 보낼 URL
- `method`: 전송 방식 (`GET` 또는 `POST`)

### 2. 입력(input) 태그

```html
<!-- 기본 구조 -->
<input type="입력_종류" name="입력_이름" placeholder="안내 문구" />
```

#### 글자 입력 타입

```html
<input type="text" name="username" placeholder="사용자명 입력" />
<input type="password" name="password" placeholder="비밀번호 입력" />
<input type="email" name="email" placeholder="이메일 입력" />
<input type="number" name="age" min="1" max="100" />
<input type="date" name="birth_date" />
```

#### 선택 입력 타입

```html
<!-- 체크박스: 여러 개 선택 가능 -->
<input type="checkbox" name="hobbies" value="reading" />

<!-- 라디오: 같은 name 내에서 하나만 선택 가능 -->
<input type="radio" name="room" value="standard" />스탠다드
<input type="radio" name="room" value="delux" />디럭스
<input type="radio" name="room" value="sweet" />스위트
```

### 3. 기타 입력 태그

```html
<!-- 긴 글 입력 -->
<textarea id="content" name="content" rows="5" cols="50"
  placeholder="내용을 입력하세요"></textarea>

<!-- 드롭다운 선택 -->
<select name="country">
  <option value="kr">대한민국</option>
  <option value="us">미국</option>
</select>

<!-- 버튼 -->
<button type="submit">제출</button>
<button type="reset">초기화</button>
```

### 4. 라벨(label) 태그

```html
<label for="username">사용자명:</label>
<input type="text" id="username" name="username" />
```

- `for` 속성과 input의 `id` 속성을 연결하면, 라벨 클릭 시 해당 입력 필드로 포커스가 이동한다
- 웹 접근성 향상에 중요한 요소

### 5. 숙소 예약 폼 실습 (form2.html)

```html
<form action="">
  <label for="check_in">체크인:</label>
  <input type="date" name="check_in" id="check_in" />

  <label>성인:</label>
  <input type="number" name="adults" min="1" />

  선호 객실 타입
  <label><input type="radio" name="room" value="standard" />스탠다드</label>
  <label><input type="radio" name="room" value="delux" />디럭스</label>
  <label><input type="radio" name="room" value="sweet" />스위트</label>

  <textarea name="content" rows="2" cols="20"
    placeholder="특별히 요청하고 싶은 내용을 적어주세요"></textarea>

  <button type="submit">예약하기</button>
</form>
```

---

## 5. 핵심 개념 정리

### 1. 자주 사용하는 태그 요약

| 태그 | 설명 |
|---|---|
| `<h1>~<h6>` | 제목 (h1이 가장 큼) |
| `<p>` | 단락 |
| `<a>` | 하이퍼링크 |
| `<img>` | 이미지 삽입 (빈 태그) |
| `<ul>`, `<ol>`, `<li>` | 목록 |
| `<div>` | 범용 블록 컨테이너 |
| `<span>` | 범용 인라인 컨테이너 |
| `<table>`, `<tr>`, `<th>`, `<td>` | 표 |
| `<form>`, `<input>`, `<textarea>`, `<select>`, `<button>` | 폼 관련 |
| `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>` | 시맨틱 태그 |

### 2. input type 요약

| type | 설명 |
|---|---|
| `text` | 일반 텍스트 입력 |
| `password` | 비밀번호 입력 (마스킹) |
| `email` | 이메일 형식 자동 검증 |
| `number` | 숫자 입력 (`min`, `max` 속성 사용 가능) |
| `date` | 날짜 선택 |
| `checkbox` | 여러 개 선택 가능 |
| `radio` | 하나만 선택 가능 |
| `file` | 파일 선택 |
| `hidden` | 화면에 보이지 않는 입력 |

---

## 6. 학습 포인트 (Key Takeaways)

### 1. 시맨틱 태그를 우선 사용하자

`<div>`는 의미가 없는 범용 컨테이너다. 역할이 명확한 영역(`header`, `nav`, `main`, `footer` 등)에는 반드시 시맨틱 태그를 사용해야 코드 가독성과 접근성, SEO가 모두 향상된다.

### 2. label과 input은 반드시 연결하자

`label`의 `for`와 `input`의 `id`를 일치시키는 것은 단순한 편의성이 아니라 웹 접근성의 기본이다. 스크린 리더가 폼을 올바르게 읽기 위해 필수적이다.

### 3. radio 버튼은 name으로 그룹을 묶는다

같은 `name` 속성을 가진 radio 버튼들은 하나의 그룹으로 묶여 그 중 하나만 선택할 수 있다. `value` 속성에 서버로 전송될 실제 값을 지정한다.

### 4. alt 속성은 생략하지 말자

`<img>`의 `alt` 속성은 이미지 로드 실패 시 대체 텍스트이기도 하지만, 시각 장애인을 위한 스크린 리더가 이미지를 설명하는 데 사용된다. SEO에도 영향을 미치므로 반드시 작성한다.