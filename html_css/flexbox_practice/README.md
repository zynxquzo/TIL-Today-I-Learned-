# Flexbox Practice - TIL

## 📅 날짜
2026-02-26

## 🎯 학습 목표
Flexbox를 활용한 반응형 웹 레이아웃 구현 연습

## 📝 프로젝트 개요
FlexPractice라는 이름의 랜딩 페이지를 Flexbox를 사용하여 제작했다. 헤더, 히어로 섹션, 서비스 소개, 팀 소개, 요금제, 푸터로 구성된 완전한 웹 페이지를 구현했다.

## 🎨 완성 화면

### 주요 섹션별 화면

#### Header / Hero Section / Services
![헤더 / 히어로 섹션 / 서비스 소개](https://github.com/user-attachments/assets/6731f485-c3a7-4a1d-90f7-34542a8be104)

#### Team / Pricing
![팀 소개 / 요금제](https://github.com/user-attachments/assets/d636a3fe-4966-4176-b42b-eba30dc7451b)

#### Footer
![푸터](https://github.com/user-attachments/assets/08c99a69-c0fa-46cd-9e74-5253d48c3a4b)

## 🛠️ 구현한 섹션

### 1. Header
- `justify-content: space-between`으로 로고와 네비게이션을 양 끝에 배치했다.
- 네비게이션 링크를 `display: flex`와 `gap`으로 균등하게 배치했다.

### 2. Hero Section (히어로 섹션)
- 파란색 배경의 중앙 정렬 섹션을 구현했다.
- 버튼 두 개를 `display: flex`로 가로 배치했다.
- `width` 속성으로 버튼 크기를 통일했다.

### 3. Services (서비스 소개)
- 3개의 카드를 `display: flex`로 가로 배치했다.
- `flex: 1`로 각 카드가 동일한 너비를 갖도록 설정했다.
- `hover` 효과로 카드가 위로 올라가는 애니메이션을 추가했다.

### 4. Team (팀 소개)
- 카드 내부에서 `display: flex`를 사용해 아바타와 정보를 가로 배치했다.
- `align-items: center`로 수직 중앙 정렬을 적용했다.
- `gap`으로 아바타와 텍스트 사이 간격을 조정했다.

### 5. Pricing (요금제)
- 3개의 카드를 `display: flex`로 가로 배치했다.
- `flex-direction: column`과 `flex-grow: 1`을 활용해 버튼을 항상 하단에 배치했다.
- 중앙 카드에 `.featured` 클래스로 강조 효과를 적용했다.

### 6. Footer
- `display: flex`로 3개의 섹션을 가로 배치했다.
- `justify-content: space-between`으로 균등 분배를 적용했다.

## 💡 주요 학습 내용

### Flexbox 핵심 속성
```css
/* 컨테이너 */
display: flex;
flex-direction: row | column;
justify-content: center | space-between | flex-start | flex-end;
align-items: center | flex-start | flex-end;
gap: 20px;

/* 아이템 */
flex: 1; /* flex-grow, flex-shrink, flex-basis의 축약 */
flex-grow: 1;
flex-shrink: 0;
```

### 버튼 크기 통일하기
처음에는 텍스트 길이에 따라 버튼 크기가 달랐지만, `width` 속성을 추가하여 해결했다.
```css
.btn-primary {
    width: 140px; /* 고정 너비 */
}
```

### 버튼을 카드 하단에 고정하기
`flex-direction: column`과 `flex-grow: 1`을 조합하여 버튼을 항상 카드 하단에 배치했다.
```css
.pricing-card {
    display: flex;
    flex-direction: column;
}

.pricing-card ul {
    flex-grow: 1; /* 남은 공간을 모두 차지 */
}
```

### 가로 배치와 중앙 정렬
팀 소개 카드에서 아바타와 텍스트를 가로로 배치하고 수직 중앙 정렬을 적용했다.
```css
.team-member {
    display: flex;
    align-items: center;
    gap: 20px;
}
```

## 🐛 트러블슈팅

### 문제 1: 버튼 크기가 다름
- **원인**: 텍스트 길이가 달라서 자동으로 크기가 조정되었다.
- **해결**: `width` 속성으로 고정 너비를 지정했다.

### 문제 2: 요금제 버튼 위치가 다름
- **원인**: 카드 높이가 달라도 버튼이 상대적인 위치에 배치되었다.
- **해결**: `flex-direction: column`과 `flex-grow: 1` 조합으로 버튼을 하단에 고정했다.

### 문제 3: 팀 소개 카드 레이아웃
- **원인**: 처음에는 세로 배치로 되어 있었다.
- **해결**: `display: flex`로 아바타와 정보를 가로로 배치하고 `align-items: center`로 중앙 정렬했다.

### 문제 4: 버튼이 중앙 정렬되지 않음
- **원인**: 버튼이 block 요소처럼 전체 너비를 차지했다.
- **해결**: `margin: 0 auto`를 추가하여 중앙 정렬했다.

## 📚 배운 점

1. **Flexbox는 1차원 레이아웃에 최적화되어 있다.**
   - 가로 또는 세로 한 방향으로 정렬할 때 매우 효과적이다.

2. **flex-direction으로 방향 전환이 자유롭다.**
   - `row`와 `column`을 상황에 맞게 활용할 수 있다.

3. **gap 속성이 매우 유용하다.**
   - margin을 일일이 설정하는 것보다 `gap`으로 간격을 조정하는 것이 편리하다.

4. **flex-grow로 남은 공간 활용이 가능하다.**
   - 요금제 카드에서 버튼을 하단에 고정하는 데 활용했다.

5. **클래스 선택자를 구체적으로 작성하면 스타일 충돌을 방지할 수 있다.**
   - `.hero-buttons .btn-primary`처럼 부모 클래스를 명시하여 다른 섹션의 버튼과 구분했다.

## 참고 자료
- [MDN - Flexbox](https://developer.mozilla.org/ko/docs/Web/CSS/CSS_Flexible_Box_Layout)
- [CSS-Tricks - A Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)

## 느낀 점
Flexbox를 실제로 활용해보니 레이아웃 구현이 훨씬 쉬워졌다. 특히 `justify-content`, `align-items`, `gap` 같은 속성들이 매우 직관적이고 강력하다는 것을 알게 되었다. 다음에는 Grid와 함께 사용하는 방법도 연습해봐야겠다.