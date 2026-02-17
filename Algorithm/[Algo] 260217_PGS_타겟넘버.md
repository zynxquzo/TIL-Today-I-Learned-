# 오늘의 알고리즘 (2026.02.17)

## 오늘 푼 문제

* **프로그래머스 43165번**: [타겟 넘버](https://school.programmers.co.kr/learn/courses/30/lessons/43165) (Level 2)

---

## 내 풀이
```python
def solution(numbers, target):
    answer = 0 # 타겟 넘버 만드는 방법의 수
    
    def dfs(index, current_sum):
        nonlocal answer
        if index == len(numbers): # 끝에 도달했을 때
            if current_sum == target: # target이랑 같으면
                answer += 1 # answer에 1 더하기
        else:
            dfs(index + 1, current_sum + numbers[index])
            dfs(index + 1, current_sum - numbers[index])
    
    dfs(0, 0) # index 0, 합계 0으로 시작
    
    return answer
```

## 새로 배운 개념

### 1. DFS (깊이 우선 탐색)

* **DFS(Depth First Search)** 는 나무(tree) 구조를 탐색할 때 한 가지를 끝까지 파고든 다음, 다른 가지로 넘어가는 방식이다.
* 타겟 넘버 문제에서는 각 숫자마다 **+를 붙이거나 -를 붙이는 두 가지 선택지**가 있고, 이 선택지가 나무처럼 뻗어나간다.

```
              시작
            /      \
        +4            -4
       /  \          /  \
    +4+1  +4-1    -4+1  -4-1
    / \    / \    / \    / \
  ...  ...  ...  ...  ...  ...
```

### 2. 재귀(Recursion)

* **재귀**란 함수가 자기 자신을 호출하는 방식이다.
* DFS를 구현할 때 재귀를 활용하면 나무의 각 가지를 자연스럽게 탐색할 수 있다.
* `dfs(index + 1, ...)` 처럼 index를 1씩 늘려가며 다음 숫자로 넘어간다.

### 3. 재귀의 종료 조건

* 재귀함수는 반드시 **종료 조건**이 있어야 한다. 없으면 무한루프에 빠진다.
* 이 문제에서는 `index == len(numbers)` 가 종료 조건이다.
* 마지막 숫자(index 3)를 처리한 후 `index + 1` 이 되어 index 4가 되는 순간, 더 이상 선택할 숫자가 없다는 신호가 된다.

```python
if index == len(numbers):  # 끝에 도달했을 때
    if current_sum == target:
        answer += 1
```

### 4. nonlocal 키워드

* 중첩 함수(함수 안의 함수)에서 **바깥 함수의 변수를 변경**할 때 `nonlocal` 키워드가 필요하다.
* `nonlocal` 없이 안쪽 함수에서 바깥 변수를 변경하려 하면 오류가 발생한다.

```python
def solution(numbers, target):
    answer = 0  # 바깥 함수의 변수
    
    def dfs(index, current_sum):
        nonlocal answer  # 바깥 함수의 answer를 사용하겠다고 선언
        ...
        answer += 1  # 정상적으로 변경 가능
```

### 5. 문제 해결 과정

**1단계: 나무 구조 파악**
* 각 숫자마다 +/-를 붙이는 두 가지 선택지가 있다.
* 모든 숫자를 선택하면 끝(잎사귀)에 도달한다.

**2단계: 종료 조건 설정**
```python
if index == len(numbers):
```
* index가 numbers의 길이와 같아지면 모든 숫자를 다 선택한 것이다.

**3단계: 끝에서 target 비교**
```python
if current_sum == target:
    answer += 1
```

**4단계: 재귀 호출로 두 가지 선택지 탐색**
```python
dfs(index + 1, current_sum + numbers[index])  # + 붙인 경우
dfs(index + 1, current_sum - numbers[index])  # - 붙인 경우
```

### 6. 시뮬레이션으로 문제 이해하기

```
numbers = [4, 1, 2, 1], target = 4

dfs(0, 0)
├── +4 → dfs(1, 4)
│   ├── +1 → dfs(2, 5)
│   │   ├── +2 → dfs(3, 7)
│   │   │   ├── +1 → dfs(4, 8)  → 8 != 4 ❌
│   │   │   └── -1 → dfs(4, 6)  → 6 != 4 ❌
│   │   └── -2 → dfs(3, 3)
│   │       ├── +1 → dfs(4, 4)  → 4 == 4 ✅ answer = 1
│   │       └── -1 → dfs(4, 2)  → 2 != 4 ❌
│   └── -1 → dfs(2, 3)
│       ├── +2 → dfs(3, 5)
│       │   ├── +1 → dfs(4, 6)  → 6 != 4 ❌
│       │   └── -1 → dfs(4, 4)  → 4 == 4 ✅ answer = 2
│       └── -2 → dfs(3, 1)
│           ├── +1 → dfs(4, 2)  → 2 != 4 ❌
│           └── -1 → dfs(4, 0)  → 0 != 4 ❌
└── -4 → dfs(1, -4)
    └── ... (전부 target 4에 못 미침 ❌)

return 2
```

## 회고

* DFS와 재귀 개념을 처음 접했는데, **나무 구조로 시각화**해서 생각하니 이해가 훨씬 쉬웠다.
* `nonlocal` 키워드를 몰라서 막혔었는데, 중첩 함수에서 바깥 변수를 변경할 때 반드시 필요하다는 것을 배웠다.
* 종료 조건에서 `index == len(numbers)` 가 되는 이유를 처음엔 헷갈렸지만, 마지막 숫자를 처리한 후 index가 하나 더 증가하기 때문이라는 것을 이해했다.