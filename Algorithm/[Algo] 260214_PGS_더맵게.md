# 오늘의 알고리즘 (2026.02.14)

## 오늘 푼 문제

* **프로그래머스 42626번**: [더 맵게](https://school.programmers.co.kr/learn/courses/30/lessons/42626) (Level 2)

---

## 내 풀이
```python
import heapq

def solution(scoville, K):
    heapq.heapify(scoville)
    count = 0
    # 가장 작은 값이 K보다 작을 때 반복: K보다 같거나 크면 음식을 섞을 이유X
    while scoville[0] < K:
        if len(scoville) < 2:
            return -1  # -1은 에러, 불가능을 표현하는 약속된 값
        # 가장 작은 값 꺼내기
        first = heapq.heappop(scoville)
        # 두 번째로 작은 값 꺼내기
        second = heapq.heappop(scoville)
        # 새로운 스코빌 지수 계산
        new_scoville = first + (second * 2)
        # 새로운 값 힙에 넣기
        heapq.heappush(scoville, new_scoville)
        # 섞은 횟수 증가
        count += 1
    return count
```

## 새로 배운 개념

### 1. 힙(Heap) 자료구조

* **힙**은 항상 가장 작은 값(또는 가장 큰 값)을 빠르게 찾을 수 있는 트리 구조다.
* 파이썬의 `heapq`는 **최소 힙(Min Heap)**을 제공한다.
* 특징:
  - 가장 작은 값이 항상 맨 앞(index 0)에 위치
  - 값을 넣거나 뺄 때 자동으로 정렬 상태 유지
  - 전체 정렬보다 훨씬 효율적

### 2. heapq 주요 함수

**`heapq.heapify(list)`**: 일반 리스트를 힙으로 변환
```python
numbers = [5, 2, 9, 1, 7]
heapq.heapify(numbers)  # [1, 2, 9, 5, 7]
```

**`heapq.heappop(heap)`**: 가장 작은 값 꺼내기
```python
smallest = heapq.heappop(numbers)  # 1
# numbers는 자동으로 [2, 5, 9, 7]로 재정렬
```

**`heapq.heappush(heap, value)`**: 새 값을 넣으면서 힙 구조 유지
```python
heapq.heappush(numbers, 3)  # [2, 3, 9, 7, 5]
```

### 3. 시간 복잡도 비교: sorted vs heapq

이 문제를 처음 접근할 때 `sorted()`를 사용하는 방법도 생각했지만, 효율성 면에서 차이가 크다.

**sorted 방식:**
```python
while min(scoville) < K:
    scoville = sorted(scoville)  # 매번 전체 정렬
    # ... 섞기
```
- 시간 복잡도: O(n log n) × 반복 횟수
- 매번 전체 리스트를 정렬해야 함

**heapq 방식:**
```python
heapq.heapify(scoville)  # 초기 힙 변환: O(n)
while scoville[0] < K:
    heappop()  # O(log n)
    heappop()  # O(log n)
    heappush()  # O(log n)
```
- 시간 복잡도: O(log n) × 반복 횟수
- 필요한 부분만 재정렬

결과적으로 **heapq가 훨씬 효율적**이며, 프로그래머스의 효율성 테스트를 통과하려면 heapq를 사용해야 한다.

### 4. 예외 처리: 불가능한 경우

* 문제에서 모든 음식을 K 이상으로 만들 수 없는 경우 **-1을 반환**하라고 했다.
* -1은 프로그래밍에서 "에러" 또는 "불가능"을 나타내는 약속된 값이다.
* 언제 불가능한가?
  - 음식이 1개만 남았는데 그 값이 K보다 작을 때
  - 예: `scoville = [0]`, `K = 10` → 더 이상 섞을 수 없음
```python
if len(scoville) < 2:
    return -1
```

### 5. 힙의 첫 번째 요소로 조건 확인

* 힙에서 `scoville[0]`은 항상 최솟값이다.
* 따라서 `scoville[0] < K`로 반복 조건을 확인할 수 있다.
* 모든 값을 일일이 확인할 필요 없이 **최솟값만 체크**하면 되는 것이 핵심!

### 6. 시뮬레이션으로 문제 이해하기
```
scoville = [1, 2, 3, 9, 10, 12]
K = 7

초기 힙: [1, 2, 3, 9, 10, 12]

1회 섞기:
- first = 1, second = 2
- new = 1 + (2 × 2) = 5
- 힙: [3, 5, 9, 10, 12]

2회 섞기:
- first = 3, second = 5
- new = 3 + (5 × 2) = 13
- 힙: [9, 10, 12, 13]

9 ≥ 7이므로 종료
return 2
```

## 회고

* 처음에는 `sorted()`를 사용하는 방식으로 접근했지만, 효율성 문제를 고려해야 한다는 것을 배웠다.
* **힙(Heap)** 자료구조의 개념과 사용법을 새롭게 익혔다. 특히 "항상 정렬된 상태를 유지하면서 최솟값을 빠르게 찾는" 특성이 이 문제에 완벽하게 맞았다.
* `heappop()`과 `heappush()`의 인자를 헷갈렸는데, **첫 번째 인자는 항상 힙 리스트**라는 것을 명확히 이해했다.
* -1을 반환하는 예외 처리의 의미를 처음엔 이해하지 못했지만, "불가능을 나타내는 약속된 값"이라는 개념을 배웠다.
* 알고리즘 문제를 풀 때 단순히 동작하는 코드가 아니라 **효율성까지 고려**해야 한다는 중요한 교훈을 얻었다.