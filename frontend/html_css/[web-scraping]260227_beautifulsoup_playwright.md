# [TIL] Web Scraping: BeautifulSoup과 Playwright를 활용한 정적/동적 페이지 스크래핑

## 1. 웹 스크래핑 개요

### 1. 웹 스크래핑이란?

웹사이트의 HTML을 가져와서 원하는 정보만 골라내는 기술이다.

- 뉴스 제목, 상품 가격, 날씨 정보 등 반복적으로 수집해야 하는 데이터에 활용된다
- 사람이 브라우저에서 하는 일을 코드로 자동화하는 것이다

### 2. 크롤링 vs 스크래핑

**크롤링 (Crawling)**
- 웹 페이지를 자동으로 돌아다니며 수집하는 행위
- 예: 구글 검색엔진이 전 세계 웹사이트를 순회하며 색인
- 넓고 자동화된 탐색

**스크래핑 (Scraping)**
- 웹 페이지에서 원하는 데이터만 추출하는 행위
- 예: 네이버 뉴스에서 기사 제목만 뽑아오기
- 특정 페이지에서 정밀한 데이터 추출

---

## 2. BeautifulSoup을 활용한 정적 페이지 스크래핑

### 1. 동작 원리

```
1. 웹 페이지에 HTTP 요청을 보낸다  (requests)
2. HTML 응답을 받는다
3. HTML을 분석(파싱)한다           (BeautifulSoup)
4. 원하는 데이터를 추출한다
```

### 2. 라이브러리 설치

```bash
pip install requests beautifulsoup4
```

- `requests` — HTTP 요청을 보내고 응답을 받는 역할
- `beautifulsoup4` — 받아온 HTML을 분석(파싱)하여 원하는 데이터를 추출하는 역할

### 3. HTML 가져오기

```python
import requests

url = "https://news.google.com/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNRFp4WkRNU0FtdHZLQUFQAQ?hl=ko&gl=KR&ceid=KR%3Ako"

response = requests.get(url)

print(response.status_code)  # 200이면 성공
```

**주요 개념:**
- `requests.get(url)` — 지정한 URL에 GET 요청을 보낸다
- `response.status_code` — HTTP 상태 코드 (200 = 성공)

### 4. HTML 파싱하기

```python
from bs4 import BeautifulSoup

soup = BeautifulSoup(response.text, "html.parser")
```

- `response.text` — 서버에서 받아온 HTML 문자열
- `"html.parser"` — Python 내장 HTML 파서 (별도 설치 불필요)

### 5. BeautifulSoup의 핵심 메서드

| 메서드 | 설명 | 반환값 |
|---|---|---|
| `soup.select_one("선택자")` | 조건에 맞는 첫 번째 요소 반환 | 단일 요소 (없으면 `None`) |
| `soup.select("선택자")` | 조건에 맞는 모든 요소 반환 | 리스트 |

### 6. 데이터 추출하기

```python
# 뉴스 제목 링크 모두 가져오기
articles = soup.select("a.gPFEn")

for article in articles:
    title = article.get_text()       # 태그 안의 텍스트
    link = article["href"]           # href 속성값
    print(f"제목: {title}")
    print(f"링크: {link}")
    print("-" * 50)
```

**주요 메서드:**
- `.get_text()` — 태그 안의 텍스트만 추출 (예: `<a>기사 제목</a>` → `"기사 제목"`)
- `["속성명"]` — 특정 속성값 가져오기 (예: `tag["href"]` → `"https://..."`)

### 7. 전체 코드 예시

```python
import requests
from bs4 import BeautifulSoup

url = "https://news.google.com/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNRFp4WkRNU0FtdHZLQUFQAQ?hl=ko&gl=KR&ceid=KR%3Ako"

response = requests.get(url)

soup = BeautifulSoup(response.text, "html.parser")

articles = soup.select("a.gPFEn")

for article in articles:
    title = article.get_text()
    link = article["href"]
    print(f"제목: {title}")
    print(f"링크: {link}")
    print("-" * 50)
```

---

## 3. Playwright를 활용한 동적 페이지 스크래핑

### 1. 정적 페이지 vs 동적 페이지

**정적 페이지**
- HTML에 이미 모든 데이터가 들어 있다
- `requests`로 받으면 바로 데이터를 추출할 수 있다
- 예: 위키백과, 정부 공공데이터 페이지

**동적 페이지**
- HTML은 빈 껍데기이고, JavaScript가 실행되면서 데이터가 채워진다
- `requests`로 받으면 빈 페이지만 나온다
- 예: 네이버 웹툰, 인스타그램, 쿠팡

**Playwright / Selenium의 필요성:**
- 최근 대부분의 웹사이트는 JavaScript로 콘텐츠를 동적으로 렌더링한다
- 실제 브라우저를 자동으로 조작하여 JavaScript 실행 후의 완성된 페이지를 가져온다

### 2. 동작 원리

```
1. 브라우저를 실행한다 (Playwright / Selenium)
2. URL로 이동한다
3. JavaScript가 실행될 때까지 기다린다
4. 완성된 HTML에서 데이터를 추출한다
```

### 3. 라이브러리 설치

```bash
pip install playwright
```

### 4. 브라우저 설치

```bash
playwright install chromium
```

- Playwright는 별도의 브라우저를 다운로드하여 사용한다
- `chromium` — Chrome 기반 브라우저
- 한 번만 설치하면 된다

### 5. 브라우저 실행 및 조작

```python
from playwright.sync_api import sync_playwright

# Playwright 시작 및 브라우저 실행
pw = sync_playwright().start()
browser = pw.chromium.launch(headless=False)
page = browser.new_page()
```

**주요 메서드:**
- `sync_playwright().start()` — Playwright를 시작한다
- `launch(headless=False)` — 브라우저 창을 보이게 실행한다
  - `headless=True`로 하면 백그라운드에서 실행된다
- `new_page()` — 새 탭을 연다

### 6. 페이지 이동 및 대기

```python
page.goto("https://comic.naver.com/webtoon?tab=mon")
page.wait_for_load_state("networkidle")
```

- `goto()` — 해당 URL로 이동한다
- `wait_for_load_state("networkidle")` — 네트워크 요청이 끝날 때까지 기다린다
  - 동적 페이지는 이동 후 바로 데이터가 안 보일 수 있으므로 대기가 필요하다

### 7. Playwright의 핵심 메서드

| 메서드 | 설명 |
|---|---|
| `page.locator("선택자")` | CSS 선택자로 요소를 찾는다 |
| `locator.all()` | 조건에 맞는 모든 요소를 리스트로 반환 |
| `locator.first` | 첫 번째 요소를 반환 |
| `locator.text_content()` | 요소의 텍스트를 가져온다 |
| `locator.get_attribute("속성명")` | 요소의 속성값을 가져온다 |

### 8. 데이터 추출 예시

```python
# 웹툰 제목 요소 모두 가져오기
titles = page.locator(".ContentTitle__title--e3qXt").all()

for title in titles:
    print(title.text_content())
```

### 9. 브라우저 종료

```python
browser.close()
pw.stop()
```

**중요:**
- 작업이 끝나면 반드시 브라우저를 닫고 Playwright를 종료해야 한다
- 종료하지 않으면 브라우저 프로세스가 백그라운드에 남아 메모리를 차지한다

### 10. 전체 코드 예시

```python
from playwright.sync_api import sync_playwright

# 1. Playwright 시작 및 브라우저 실행
pw = sync_playwright().start()
browser = pw.chromium.launch(headless=False)
page = browser.new_page()

# 2. 네이버 웹툰 페이지 이동
page.goto("https://comic.naver.com/webtoon?tab=mon")
page.wait_for_load_state("networkidle")

# 3. 웹툰 목록 추출 (선택자는 개발자 도구에서 확인)
items = page.locator(".ContentTitle__title--e3qXt").all()

print(f"웹툰 목록 ({len(items)}건)")
print("=" * 40)

for i, item in enumerate(items, 1):
    print(f"{i}. {item.text_content()}")

# 4. 브라우저 종료
browser.close()
pw.stop()
```

---

## 4. 브라우저 조작하기

Playwright는 단순 데이터 추출 외에도 클릭, 입력, 스크롤 등 브라우저 조작이 가능하다.

### 1. 기본 조작

```python
# 클릭
page.locator("a.link").click()

# 텍스트 입력
page.locator("input.search").fill("검색어")

# 키보드 입력
page.keyboard.press("Enter")

# 스크롤
page.mouse.wheel(0, 500)   # 아래로 500px 스크롤

# 스크린샷
page.screenshot(path="screenshot.png")
```

---

## 5. requests + BeautifulSoup vs Playwright 비교

| 특징 | requests + BeautifulSoup | Playwright |
|---|---|---|
| **적용 대상** | 정적 HTML | 동적 페이지 (JavaScript 렌더링) |
| **속도** | 빠름 | 상대적으로 느림 |
| **리소스** | 가벼움 (브라우저 불필요) | 무거움 (브라우저 실행) |
| **브라우저 조작** | 불가능 | 가능 (클릭, 스크롤 등) |
| **사용 예시** | 뉴스 기사, 공공데이터 | 웹툰, SNS, 쇼핑몰 |

**선택 기준:**
- 정적 페이지라면 `requests` + `BeautifulSoup`으로 충분하다
- JavaScript로 콘텐츠가 로딩되는 페이지라면 `Playwright`를 사용해야 한다

---

## 6. 실습: Yes24 베스트셀러 스크래핑

### 1. 실습 코드

```python
import requests
from bs4 import BeautifulSoup

url = "https://www.yes24.com/product/category/daybestseller?categoryNumber=001&pageNumber=1&pageSize=24&type=day"

response = requests.get(url)

soup = BeautifulSoup(response.text, "html.parser")

titles = soup.select("a.gd_name")

for title in titles:
    book_title = title.get_text()
    print(book_title)
```

### 2. 코드 분석

**1단계: 라이브러리 임포트**
```python
import requests
from bs4 import BeautifulSoup
```

**2단계: URL 설정 및 HTTP 요청**
```python
url = "https://www.yes24.com/product/category/daybestseller?categoryNumber=001&pageNumber=1&pageSize=24&type=day"
response = requests.get(url)
```
- Yes24의 일간 베스트셀러 페이지에 GET 요청을 보낸다

**3단계: HTML 파싱**
```python
soup = BeautifulSoup(response.text, "html.parser")
```
- 받아온 HTML을 BeautifulSoup 객체로 변환한다

**4단계: 선택자로 요소 찾기**
```python
titles = soup.select("a.gd_name")
```
- 개발자 도구로 확인한 결과, 책 제목이 `<a class="gd_name">` 태그 안에 있다
- `.select()`로 해당 클래스를 가진 모든 `<a>` 태그를 가져온다

**5단계: 텍스트 추출 및 출력**
```python
for title in titles:
    book_title = title.get_text()
    print(book_title)
```
- 각 태그에서 `.get_text()`로 텍스트만 추출하여 출력한다

### 3. 실습 결과

```
진보를 위한 주식투자
모모세 아키라의 첫사랑 파탄 중 4 트리플특전판
방울벌레 이야기
단단력
나의 완벽한 장례식
인생을 위한 최소한의 생각
...
```

**구현 특징:**
- 정적 페이지이므로 `requests` + `BeautifulSoup`만으로 충분하다
- CSS 선택자 `a.gd_name`로 정확한 요소를 선택할 수 있다
- 반복문으로 여러 책 제목을 한 번에 처리한다

---

## 7. 웹 스크래핑 주의사항

### 1. User-Agent

```python
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."
}
response = requests.get(url, headers=headers)
```

- HTTP 요청을 보낼 때 "나는 어떤 브라우저/프로그램이다"라고 알려주는 정보
- `requests`의 기본 User-Agent는 `"python-requests/2.x.x"`
- 일부 사이트는 이를 감지하여 봇 요청을 차단한다
- 실제 브라우저처럼 보이도록 User-Agent를 설정하면 차단을 피할 수 있다

### 2. robots.txt

- 웹사이트마다 크롤링 허용/차단 범위를 명시한 파일
- `https://사이트주소/robots.txt`로 확인 가능
- 예: `https://www.naver.com/robots.txt`
- `Disallow`로 표시된 경로는 크롤링이 금지된 영역

### 3. 법적/윤리적 고려사항

- 수집한 데이터를 상업적으로 사용하면 법적 문제가 될 수 있다
- 짧은 시간에 대량 요청을 보내면 서버에 부담을 주어 차단될 수 있다
- 개인정보가 포함된 데이터 수집은 개인정보보호법 위반 가능성이 있다
- 학습/연구 목적의 소규모 수집은 일반적으로 허용되는 범위

---

## 8. 핵심 개념 정리

### 1. BeautifulSoup 주요 메서드

| 메서드 | 설명 | 반환값 |
|---|---|---|
| `soup.select("선택자")` | CSS 선택자로 모든 요소 검색 | 리스트 |
| `soup.select_one("선택자")` | 첫 번째 요소만 반환 | 단일 요소 또는 None |
| `element.get_text()` | 태그 안의 텍스트 추출 | 문자열 |
| `element["속성명"]` | 특정 속성값 가져오기 | 문자열 |

### 2. Playwright 주요 메서드

| 메서드 | 설명 |
|---|---|
| `page.goto(url)` | 페이지 이동 |
| `page.wait_for_load_state()` | 페이지 로딩 대기 |
| `page.locator("선택자")` | 요소 검색 |
| `locator.all()` | 모든 요소 가져오기 |
| `locator.text_content()` | 텍스트 추출 |
| `browser.close()` | 브라우저 종료 |

### 3. CSS 선택자 패턴

| 선택자 | 설명 | 예시 |
|---|---|---|
| `태그명` | 특정 태그 선택 | `a`, `div` |
| `.클래스명` | 특정 클래스 선택 | `.gd_name` |
| `#아이디` | 특정 ID 선택 | `#header` |
| `태그.클래스` | 태그와 클래스 조합 | `a.gd_name` |
| `부모 > 자식` | 직계 자식 선택 | `div > a` |

---

## 9. 학습 포인트 (Key Takeaways)

### 1. 정적/동적 페이지를 구분하자

정적 페이지는 `requests` + `BeautifulSoup`으로 충분하다. 동적 페이지는 Playwright가 필요하다. 먼저 개발자 도구에서 HTML 소스를 확인하여 데이터가 이미 있는지 판단한다.

### 2. CSS 선택자를 정확히 찾자

개발자 도구(F12)에서 요소를 검사하여 클래스명이나 태그 구조를 파악한다. 선택자가 정확해야 원하는 데이터만 추출할 수 있다.

### 3. 반복문으로 여러 데이터를 처리하자

`.select()`는 리스트를 반환하므로 `for` 반복문으로 각 요소를 처리한다. 이를 통해 여러 개의 뉴스 기사, 상품 정보 등을 한 번에 수집할 수 있다.

### 4. 리소스를 반드시 정리하자

Playwright 사용 후에는 `browser.close()`와 `pw.stop()`으로 브라우저와 Playwright를 종료해야 한다. 그렇지 않으면 메모리 누수가 발생한다.

### 5. 법적/윤리적 책임을 인식하자

웹 스크래핑은 강력한 도구지만, robots.txt를 확인하고 서버에 과도한 부하를 주지 않으며, 수집한 데이터를 적절히 사용해야 한다. 학습 목적의 소규모 실습은 일반적으로 허용된다.

### 6. 실전 적용 시나리오

- **뉴스 모니터링**: 매일 특정 키워드 뉴스 자동 수집
- **가격 추적**: 쇼핑몰 상품 가격 변동 기록
- **데이터 분석**: 수집한 데이터를 pandas로 분석
- **자동화**: 정기적으로 데이터를 수집하는 스크립트 작성