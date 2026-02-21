# 오늘의 알고리즘 (2026.02.21)

## 오늘 푼 문제

* **프로그래머스 92341번**: [주차 요금 계산](https://school.programmers.co.kr/learn/courses/30/lessons/92341) (Level 2)

---

## 내 풀이
```python
import math

def to_minutes(time):
    h, m = time.split(":")
    return (int(h) * 60) + int(m)

def solution(fees, records):
    answer = []
    parking = {}  # 번호판 -> 입차시간 저장
    total = {}    # 번호판 -> 누적 주차시간 저장 (분 단위 숫자)

    for record in records:
        data = record.split()       # "08:00 1234 IN" -> ["08:00", "1234", "IN"]
        time = data[0]              # 시간
        car_num = data[1]           # 번호판
        status = data[2]            # IN/OUT

        if status == "IN":
            parking[car_num] = time         # 입차시간 저장
        else:
            if car_num not in total:
                total[car_num] = 0          # 처음 출차하는 차량이면 0으로 초기화
            stayed = to_minutes(time) - to_minutes(parking[car_num])  # 주차시간 계산
            total[car_num] += stayed        # 누적시간에 더하기
            del parking[car_num]            # 출차했으니 parking에서 삭제

    # 아직 주차 중인 차량 처리 (23:59 기준)
    for car_num in parking:
        if car_num not in total:
            total[car_num] = 0
        stayed = to_minutes("23:59") - to_minutes(parking[car_num])
        total[car_num] += stayed

    # 요금 계산 (번호판 오름차순)
    base_time, base_fee, unit_time, unit_fee = fees
    for car_num in sorted(total):
        t = total[car_num]
        if t <= base_time:
            fee = base_fee
        else:
            over_time = t - base_time
            fee = base_fee + math.ceil(over_time / unit_time) * unit_fee
        answer.append(fee)

    return answer
```

## 새로 배운 개념

### 1. 딕셔너리로 데이터 관리하기

* 차량 번호판을 **키(key)** 로, 관련 정보를 **값(value)** 으로 저장하면 특정 차량 정보를 빠르게 찾을 수 있다.
* 이 문제에서는 딕셔너리를 두 개 사용했다.
  * `parking`: 현재 주차 중인 차량의 입차시간 저장
  * `total`: 차량별 누적 주차시간(분) 저장

```python
parking = {}
parking["1234"] = "08:00"   # {"1234": "08:00"}

total = {}
total["1234"] = 0
total["1234"] += 60         # {"1234": 60}
```

### 2. 문자열 쪼개기 (split)

* `split()` 은 문자열을 공백 기준으로 나눠서 리스트로 반환한다.
* `split(":")` 처럼 구분자를 지정할 수도 있다.

```python
"08:00 1234 IN".split()     # ["08:00", "1234", "IN"]
"08:00".split(":")          # ["08", "00"]
```

### 3. 시간을 분으로 변환하기

* 시간 문자열끼리는 바로 빼기가 안 되므로, **분 단위 숫자**로 변환한 후 계산한다.
* `"08:00"` → `8 * 60 + 0` = `480분`

```python
def to_minutes(time):
    h, m = time.split(":")
    return (int(h) * 60) + int(m)
```

### 4. 딕셔너리에서 키 삭제하기 (del)

* `del 딕셔너리[키]` 로 특정 키를 삭제할 수 있다.
* 이 문제에서는 OUT이 나왔을 때 `parking`에서 해당 차량을 삭제했다.
* records를 다 읽고 나서 `parking`에 **남아있는 차량 = 아직 주차 중인 차량** 이 된다.

```python
del parking["1234"]
```

### 5. 올림 계산 (math.ceil)

* 초과 시간을 단위 시간으로 나눌 때 **올림** 처리가 필요하다.
* 예를 들어 초과시간이 15분이고 단위시간이 10분이면 1.5단위 → 올림 → **2단위** 로 계산한다.

```python
import math
math.ceil(15 / 10)  # 2
```

### 6. 문제 해결 흐름

**1단계: records를 한 줄씩 읽으며 IN/OUT 처리**
```
IN  → parking에 입차시간 저장
OUT → 주차시간 계산 후 total에 누적, parking에서 삭제
```

**2단계: 아직 주차 중인 차량 처리**
```
records를 다 읽은 후 parking에 남아있는 차량들을
23:59 기준으로 주차시간 계산 후 total에 누적
```

**3단계: 요금 계산**
```
번호판 오름차순으로 정렬 후
기본시간 이하 → 기본요금
기본시간 초과 → 기본요금 + ceil(초과시간 / 단위시간) * 단위요금
```

## 회고

* 문제 자체는 이해했는데 **어떤 자료구조로 뭘 저장할지** 설계하는 게 제일 어려웠다. 코드를 짜기 전에 딕셔너리 두 개로 역할을 나누는 설계가 핵심이었다.
* `del` 키워드로 딕셔너리에서 키를 삭제하면, 나중에 남은 키만 확인해서 아직 주차 중인 차량을 걸러낼 수 있다는 아이디어가 인상적이었다.
* 시간 문자열은 바로 계산이 안 되기 때문에 분 단위로 변환하는 `to_minutes` 함수를 따로 만들어 재사용한 것이 코드를 깔끔하게 만들어줬다.