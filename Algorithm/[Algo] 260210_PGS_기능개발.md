# 오늘의 알고리즘 (2026.02.10)

## 오늘 푼 문제

* **프로그래머스 42586번**: [기능개발](https://school.programmers.co.kr/learn/courses/30/lessons/42586) (Level 2)

---

## 내 풀이
```python
import math

def solution(progresses, speeds):
    # 각 작업의 완료일 계산
    days = []
    for i in range(len(progresses)):
        day = math.ceil((100 - progresses[i]) / speeds[i])
        days.append(day)
    
    # 배포 묶기
    answer = []
    current_day = days[0]  # 첫 번째 작업 완료일이 기준일
    count = 1
    
    for i in range(1, len(days)):
        if days[i] <= current_day:
            count += 1
        else:
            answer.append(count)
            current_day = days[i]
            count = 1
    
    answer.append(count)  # 마지막 배포 추가
    
    return answer
```

## 새로 배운 개념

### 1. 올림 계산 - `math.ceil()`

* 작업 완료일을 계산할 때 **소수점 올림**이 필요하다.
* 예: 7일 걸리는 작업과 7.5일 걸리는 작업 → 7.5일은 **8일로 올림**해야 한다.
* `math.ceil((100 - progresses[i]) / speeds[i])`
  - `(100 - progresses[i])`: 남은 작업량
  - `/ speeds[i]`: 속도로 나눠서 소요 일수 계산
  - `math.ceil()`: 올림 처리


### 2. 올림 계산의 다른 방법들

올림 계산은 여러 방법으로 할 수 있다:

**방법 1: `math.ceil()` 사용**
```python
import math
day = math.ceil((100 - progresses[i]) / speeds[i])
```

**방법 2: 수학 트릭**
```python
# (a + b - 1) // b는 올림과 같다
day = (100 - progresses[i] + speeds[i] - 1) // speeds[i]
```

**방법 3: 나머지 체크**
```python
remain = 100 - progresses[i]
day = remain // speeds[i]
if remain % speeds[i] != 0:
    day += 1
```

### 3. 큐(Queue) 개념 응용

* 이 문제는 **순서가 중요**한 문제다.
* 앞의 작업이 완료되어야 뒤 작업도 배포 가능 → **선입선출(FIFO)** 특성
* 직접 큐를 구현하지는 않았지만, "앞에서부터 순서대로 처리"하는 큐의 개념을 활용했다.

### 4. 기준점(Pivot) 활용 알고리즘

* `current_day`를 **기준점**으로 잡고, 이후 작업들과 비교하는 방식
* 기준점보다 빨리 끝나는 작업들을 **그룹화**하는 로직
* 새로운 기준점을 만날 때마다:
  1. 이전 그룹을 마무리 (`answer.append(count)`)
  2. 새로운 기준점 설정 (`current_day = days[i]`)
  3. 카운터 초기화 (`count = 1`)

### 5. 반복문 종료 후 처리의 중요성

* 반복문이 끝난 후 **마지막 그룹을 처리**하는 것을 잊지 말아야 한다.
* `for i in range(1, len(days))`는 마지막 요소까지 순회하지만,
* 마지막 요소가 포함된 그룹의 count는 **반복문 안에서 answer에 추가되지 않는다**.
* 따라서 `answer.append(count)`를 반복문 밖에서 한 번 더 해줘야 한다.

### 6. 시뮬레이션으로 문제 이해하기


```
progresses = [93, 30, 55]
speeds = [1, 30, 5]

완료일 계산:
- 1번: (100-93)/1 = 7일
- 2번: (100-30)/30 = 2.33일 → 3일
- 3번: (100-55)/5 = 9일

days = [7, 3, 9]

배포 시뮬레이션:
- 기준일 7일 → 3일은 이미 끝남 → 함께 배포 (2개)
- 기준일 9일 → 새로운 배포 (1개)

answer = [2, 1]
```

## 회고

* 처음에는 어떻게 접근해야 할지 막막했지만, **구체적인 예시로 손으로 풀어보니** 패턴이 보였다.
* `count = 0`이 아니라 `count = 1`로 초기화해야 하는 이유를 처음엔 놓쳤다가, "새로운 배포는 현재 작업 1개부터 시작"이라는 논리로 이해했다.
* 반복문이 끝난 후 마지막 그룹을 처리하는 것을 잊으면 안 된다는 **패턴**을 익혔다. 이런 유형의 문제에서 자주 나타나는 실수인 것 같다.