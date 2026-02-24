# 오늘의 알고리즘 (2026.02.24)

## 오늘 푼 문제

* **프로그래머스**: [게임 맵 최단거리](https://school.programmers.co.kr/learn/courses/30/lessons/1844) (Level 2)

---

## 내 풀이
```python
from collections import deque

def solution(maps):
    n = len(maps)
    m = len(maps[0])
    
    queue = deque()
    queue.append((0, 0, 1))
    maps[0][0] = 0
    
    dx = [-1, 1, 0, 0]
    dy = [0, 0, -1, 1]
    
    while queue:
        x, y, dist = queue.popleft()
        
        if x == n-1 and y == m-1:
            return dist
        
        for i in range(4):
            nx = x + dx[i]
            ny = y + dy[i]
            
            if 0 <= nx < n and 0 <= ny < m and maps[nx][ny] == 1:
                queue.append((nx, ny, dist + 1))
                maps[nx][ny] = 0
    
    return -1
```

## 새로 배운 개념

### 1. BFS (너비 우선 탐색)

* BFS는 **가까운 곳부터 동심원으로 퍼져나가며** 탐색하는 알고리즘이다.
* **최단거리**를 보장한다는 것이 DFS와의 가장 큰 차이점이다.
* 큐(Queue)를 사용하여 구현한다.
```
출발점 → 1칸 거리 → 2칸 거리 → 3칸 거리...
```

### 2. DFS vs BFS 비교

| 특징 | DFS | BFS |
|------|-----|-----|
| 탐색 방식 | 깊게 파고들기 | 넓게 퍼져나가기 |
| 구현 도구 | 스택(Stack) 또는 재귀 | 큐(Queue) |
| 최단거리 보장? | ❌ 아니요 | ✅ 네! |

### 3. deque (덱) 사용하기

* `collections` 모듈의 `deque`는 양쪽 끝에서 삽입/삭제가 빠른 자료구조이다.
* BFS 구현 시 일반 리스트보다 `deque`가 효율적이다.
  * `list.pop(0)` → 느림 O(n)
  * `deque.popleft()` → 빠름 O(1)
```python
from collections import deque

queue = deque()
queue.append((0, 0, 1))     # 뒤에 추가
current = queue.popleft()   # 앞에서 제거
```

### 4. 상하좌우 이동 처리

* 상하좌우 이동을 리스트로 정의하면 반복문으로 깔끔하게 처리할 수 있다.
* `dx`, `dy` 배열을 사용하여 4방향 탐색을 구현한다.
```python
dx = [-1, 1, 0, 0]  # 상, 하, 좌, 우
dy = [0, 0, -1, 1]

for i in range(4):
    nx = x + dx[i]  # 다음 x좌표
    ny = y + dy[i]  # 다음 y좌표
```

### 5. 방문 체크 방법

* 같은 칸을 중복 방문하면 비효율적이므로 방문 표시가 필요하다.
* 이 문제에서는 **원본 maps를 수정**하는 방법을 사용했다.
  * 방문한 칸을 `0`으로 바꿔서 다시 방문하지 않도록 함
  * 별도의 `visited` 배열을 만들지 않아 메모리 절약
```python
maps[nx][ny] = 0  # 방문 표시
```

### 6. 문제 해결 흐름

**1단계: 초기 설정**
```
큐에 시작점 (0, 0, 1) 추가
시작점을 방문 처리 (maps[0][0] = 0)
```

**2단계: BFS 탐색**
```
큐에서 현재 위치와 거리를 꺼냄
목적지(n-1, m-1)인지 확인 → 맞으면 거리 반환
상하좌우 4방향 탐색
  - 맵 범위 내인지 확인
  - 길(1)인지 확인
  - 조건 만족 시 큐에 추가하고 방문 표시
```

**3단계: 도달 불가능 처리**
```
큐가 빌 때까지 목적지에 도달하지 못하면 -1 반환
```

### 7. 인덱스 주의사항

* maps의 크기가 `n x m`일 때, 마지막 칸은 `(n-1, m-1)`이다.
* **인덱스는 0부터 시작**하기 때문에 크기에서 1을 빼야 한다.
```python
n = len(maps)      # 행의 개수
m = len(maps[0])   # 열의 개수
# 목적지: (n-1, m-1)
```

## 회고

* **최단거리** 문제에는 BFS를 사용해야 한다는 것을 배웠다.
* `dx`, `dy` 배열을 사용한 상하좌우 탐색 패턴을 배웠다. 이 패턴은 앞으로 많은 문제에서 재사용할 수 있을 것 같다.
* 방문 체크를 원본 배열에 하는 방법이 메모리 효율적이라는 것을 알게 되었다.