# [TIL] FastAPI: uvicorn, APIRouter, Pydantic를 활용한 게시판 CRUD 실습

## 1. 웹 애플리케이션 서버, uvicorn

`uvicorn`은 Python의 **ASGI(Asynchronous Server Gateway Interface)** 기반 웹 애플리케이션 서버(WAS)로, FastAPI 앱을 실행하는 역할을 한다.

* **역할**: FastAPI로 작성한 애플리케이션을 실제로 서버로 실행하고, HTTP 요청을 받아 처리하는 부분을 담당한다.
* **실행 방식**: `uvicorn main:app --reload` 형태로 실행하며, `--reload` 옵션은 코드가 변경되면 자동으로 서버를 재시작하는 개발 편의 기능이다.
* **ASGI**: 비동기 통신을 지원하는 인터페이스 표준으로, 비동기 프레임워크인 FastAPI와 잘 맞는 조합이다.

---

## 2. 경로 분리, APIRouter

한 파일에 모든 경로를 정의하지 않고, 기능 단위로 분리하기 위해 `APIRouter`를 사용했다.

* **정의**: FastAPI의 `app` 객체와 동일한 경로 정의 기능을 가진 라우터 객체로, 모듈화된 경로 관리가 가능하다.
* **prefix 설정**: `APIRouter(prefix="/posts-pydantic")`로 경로 접두사를 설정하면, 해당 라우터의 모든 엔드포인트가 해당 접두사 아래로 자동으로 매핑된다.
* **등록**: `main.py`에서 `app.include_router(router)`를 호출하여 메인 앱에 라우터를 등록했다.

```python
# post_api.py — 라우터 생성 및 prefix 설정
router = APIRouter(prefix="/posts-pydantic")

# main.py — 메인 앱에 라우터 등록
app.include_router(pydantic_router)
```

---

## 3. 데이터 검증, Pydantic

요청본문(Request Body)의 데이터를 받아들이고 검증하는 역할을 **Pydantic**의 `BaseModel`이 맡았다.

* **BaseModel**: Pydantic이 제공하는 기본 클래스로, 필드의 타입을 선언하면 자동으로 입력값의 타입 검증을 수행한다.
* **활용 목적**: FastAPI에서 POST, PUT 등의 요청본문 데이터를 받을 때, 스키마(Schema)를 정의하여 잘못된 형식의 데이터를 사전에 차단하는 데 사용했다.
* **모델과 클래스의 구분**: `PostCreate`는 Pydantic 모델(검증용)이고, `Post`는 일반 클래스(저장용)로 구분하여 사용했다.

```python
# post.py — Pydantic 모델과 저장용 클래스 분리
class PostCreate(BaseModel):  # 검증용 모델
    title: str
    content: str

class Post:                   # 저장용 클래스
    def __init__(self, id, title, content):
        self.id = id
        self.title = title
        self.content = content
```

---

## 4. CRUD 엔드포인트 구현

`APIRouter`를 활용하여 게시글의 생성(C), 조회(R), 수정(U), 삭제(D) 엔드포인트를 구현했다.

### 엔드포인트 구조 정리

| HTTP 메서드 | 경로 | 기능 | 핵심 로직 |
| --- | --- | --- | --- |
| `POST` | `/posts-pydantic` | 게시글 생성 | `global post_id`를 증가시켜 고유 ID 생성 |
| `GET` | `/posts-pydantic` | 전체 조회 | 저장소 리스트를 그대로 반환 |
| `GET` | `/posts-pydantic/{id}` | 단일 조회 | 리스트를 순회하며 ID 일치 시 반환 |
| `PUT` | `/posts-pydantic/{id}` | 게시글 수정 | ID 탐색 후 필드값 갱신 |
| `DELETE` | `/posts-pydantic/{id}` | 게시글 삭제 | `list.pop(index)`로 해당 요소 제거 |

### 생성 엔드포인트 (POST)

```python
@router.post("")
def create_post(post_data: PostCreate):
    global post_id
    post_id += 1
    new_post = Post(post_id, post_data.title, post_data.content)
    posts.append(new_post)
    return new_post
```

* `PostCreate` 모델을 파라미터로 받으면 FastAPI가 요청본문을 자동으로 파싱하고 검증했다.
* `global` 키워드를 사용하여 모듈 레벨의 `post_id` 카운터를 증가시켜 고유 식별자를 생성했다.

### 조회 엔드포인트 (GET)

```python
@router.get("/{id}")
def read_post(id: int):
    for post in posts:
        if post.id == id:
            return post
    return {"message": "데이터를 찾을 수 없습니다."}
```

* 경로 파라미터 `{id}`는 타입 힌트 `int`로 선언하여 자동 변환 및 검증이 수행되었다.
* 조회 실패 시 딕셔너리 형태의 메시지를 반환했다.

### 수정 및 삭제 엔드포인트 (PUT, DELETE)

```python
@router.put("/{id}")
def update_post(id: int, updated_post: PostCreate):
    for post in posts:
        if post.id == id:
            post.title = updated_post.title
            post.content = updated_post.content
            return post
    return {"message": "수정할 대상이 없습니다."}

@router.delete("/{id}")
def delete_post(id: int):
    for index, post in enumerate(posts):
        if post.id == id:
            return posts.pop(index)
    return {"message": "삭제할 대상이 없습니다."}
```

* PUT은 경로 파라미터(`id`)와 요청본문(`PostCreate`) 두 종류의 입력을 동시에 받아 처리했다.
* DELETE는 `enumerate()`를 활용하여 인덱스를 함께 추적하고, `list.pop(index)`로 해당 요소를 제거했다.

---

## 5. 프로젝트 구조 정리

실습 시 파일을 다음과 같이 구성했다.

```
mysite2/
├── post.py          # Pydantic 모델 (PostCreate) 및 저장용 클래스 (Post)
├── post_api.py      # APIRouter를 사용한 CRUD 엔드포인트 정의
main.py              # FastAPI 앱 생성 및 라우터 등록
```

* `main.py`에서는 `mysite`와 `mysite2` 두 패키지의 라우터를 각각 별도로 가져와 등록했다.
* 기능별 모듈 분리의 장점을 실습하는 목적으로 파일을 분리했다.

---

## 6. 학습 포인트 (Troubleshooting)

* **global 키워드의 필요성**: 함수 내부에서 모듈 레벨 변수를 **재할당**하려면 반드시 `global`을 선언해야 했다. 이를 빠뜨리면 지역 변수로 새로 생성되어 카운터가 정상적으로 증가하지 않았다.
* **Pydantic 모델과 저장용 클래스의 분리**: 검증 전용 모델(`PostCreate`)과 실제 저장 객체(`Post`)를 분리하면, 클라이언트에서 `id`를 임의로 지정하는 것을 방지할 수 있었다.
* **경로 파라미터의 타입 검증**: `/{id}` 경로 파라미터에 타입 힌트를 붙으면 FastAPI가 자동으로 타입 변환과 검증을 수행하여, 잘못된 입력(예: 문자열)은 400 에러로 바로 차단되었다.
* **리스트 기반 저장소의 한계**: 현재 저장소는 메모리 내 리스트로, 서버가 재시작되면 모든 데이터가 초기화된다. 실제 서비스에서는 데이터베이스와 연동하여 영속성을 확보해야 한다.