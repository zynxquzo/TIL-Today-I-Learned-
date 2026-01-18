# TMDB API 데이터 가공 및 파이썬 로직 최적화

## 1. 학습 목표
- TMDB '현재 상영 중인 영화(Now Playing)' 데이터를 가져와 가공한다.
- 영화 목록 API에 없는 상세 정보(장르 텍스트)를 얻기 위해 상세 엔드포인트에 재요청을 보낸다.
- 파이썬의 들여쓰기(Indentation) 규칙을 이해하고 로직 오류를 해결한다.

## 2. 핵심 코드 및 상세 주석

```python
import requests
from pprint import pprint

# 1. 현재 상영 중인 영화
data = get_now_playing_movies()
movies = data['results'] # 영화 객체들이 담긴 리스트

new_lst = []
API_KEY = "your_api_key_here"

for movie in movies:
    movie_id = movie['id']
    
    # 각 영화별 상세 정보 조회를 위한 엔드포인트 주소 생성
    detail_URL = f"[https://api.themoviedb.org/3/movie/](https://api.themoviedb.org/3/movie/){movie_id}"
    
    params = {'language' : 'ko-kr'}
    headers = {"Authorization" : f"Bearer {API_KEY}"}

    try:
        # 영화 한 개에 대한 상세 데이터 요청
        response = requests.get(detail_URL, headers=headers, params=params)
        response.raise_for_status() # 응답 에러 발생 시 except 블록으로 이동
        detail_data = response.json()

        # 장르 이름만 따로 추출하기
        genre_names = []
        
        # .get('genres', []): 'genres' 키가 없을 경우 빈 리스트를 반환해 for문의 에러를 방지하는 방어적 코딩
        for g in detail_data.get('genres', []):
            # 딕셔너리 형태의 장르 데이터에서 'name' 값(텍스트)만 추출
            genre_names.append(g['name'])

        # [들여쓰기 주의] 장르 추출 for문이 끝난 시점에서 영화 정보 딕셔너리 생성
        movie_info = {
            'title': movie['title'],
            'genres': genre_names
        }
        
        # 최종 결과 리스트에 한 영화의 정보를 추가
        new_lst.append(movie_info)

    except Exception as e:
        print(e)

# 모든 영화의 반복 처리가 끝난 후 최종 결과를 출력
print("--- 최종 가공 데이터 ---")
pprint(new_lst)
```

## 3. 트러블슈팅 (Troubleshooting)

### 문제 1: 데이터 중복 저장 및 출력 무한 반복
- **현상**: 
    - 결과 리스트에 같은 영화 정보가 해당 영화의 장르 개수만큼 중복되어 저장됨.
    - 실행 중 콘솔 창에 중간 과정 리스트가 끊임없이 출력되어 가독성이 떨어짐.
- **원인 분석**:
    - `new_lst.append()`가 장르 추출을 위한 `for`문 **내부**에 위치함. 이로 인해 장르를 하나씩 리스트에 담을 때마다 영화 정보 전체가 리스트에 추가되는 논리적 오류 발생.
    - `pprint()`가 전체 영화 목록을 도는 `for`문 **내부**에 위치함. 영화 한 편 처리가 끝날 때마다 현재까지 쌓인 전체 리스트를 출력하게 됨.
- **해결 방법**: 
    - **들여쓰기(Indentation) 위치 조정**: 장르 수집(`append`)이 모두 끝난 지점으로 `movie_info` 생성 및 `new_lst.append()` 위치를 옮기고, 모든 영화의 처리가 완료된 가장 바깥쪽 단계에서 `pprint`를 호출하도록 수정함.



### 문제 2: TabError (Inconsistent use of tabs and spaces)
- **현상**: 코드를 실행하려 하면 `TabError`가 발생하며 인터프리터가 중단됨.
- **원인**: 외부 예시 코드를 복사해 붙여넣거나 수정하는 과정에서 눈에 보이지 않는 **탭(Tab)**과 **공백(Space)**이 코드 내에 뒤섞임. 파이썬은 이 두 가지를 혼용할 경우 문법 에러로 처리함.
- **해결 방법**: 
    - 에디터(VS Code 등)의 `Convert Indentation to Spaces` 기능을 활용해 파일 전체의 들여쓰기를 공백 4칸으로 강제 통일함.
    - `Render Whitespace` 설정을 활성화하여 눈에 보이지 않는 들여쓰기 형식을 시각적으로 확인하며 작업함.



---

## 4. 새롭게 알게 된 점 (Key Learnings)

###  API 체이닝 (Enrichment)
한 번의 API 호출(`now_playing`)로 모든 정보를 얻을 수 없을 때, 추출한 `id`를 기반으로 다른 엔드포인트(`movie_details`)에 다시 요청을 보내 데이터를 보완하는 **데이터 보강(Enrichment)** 프로세스를 경험함.

###  `dict.get()`을 통한 안전한 데이터 접근
딕셔너리 키에 직접 접근(`dict['key']`)하는 방식보다 `.get('key', default)` 방식을 선호하게 됨. 서버 응답에서 특정 데이터가 누락되어 오더라도 에러로 프로그램이 중단되지 않고 설정한 기본값(빈 리스트 등)을 반환하게 하여 **코드의 안정성(Robustness)**을 높이는 법을 배움.

###  파이썬 들여쓰기와 스코프(Scope)
파이썬에서 들여쓰기는 단순한 가독성을 위한 도구가 아니라, 해당 코드가 **'어느 시점에, 어느 범위에서 실행될지'**를 결정하는 문법의 핵심임을 깨달음. 특히 이중 반복문 내에서의 들여쓰기 한 칸이 결과값에 얼마나 큰 차이를 만드는지 실감함.
