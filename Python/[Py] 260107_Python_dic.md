# 2026-01-07

## 딕셔너리(dic)

어렵게 느낀 문제 위주로 정리

### problem06 문제 4
점수가 90점 이상인 '우수 학생'의 명단을 리스트 형식으로 만들어 출력하세요.

```python
# 학생들의 점수를 확인해야 합니다.
# 90점 이상인지 확인합니다
# 명단의 list를 만듭니다 (즉, value뿐만 아니라 name도 필요합니다)

scores = {
    "Alice": 85,
    "Bob": 92,
    "Charlie": 78,
    "David": 95,
    "Eve": 88
}

good_list = []
for name, score in scores.items():
    if score >= 90:
        good_list.append(name)
print(good_list)
```

### problem06 문제 5
기존 `scores` 딕셔너리를 사용하여, 점수가 80점 이상이면 'Pass', 미만이면 'Fail'을 값으로 가지는 새로운 딕셔너리를 만드세요.

```python
students = {}

for name, score in scores.items():
    if score >= 80:
        students[name] = 'pass'
    else:
        students[name] = 'fail'
print(students)
```

### problem07 문제 2
유저 권한 시스템 로직입니다. 아래 규칙에 따라 접근 가능 여부(`True`/`False`)를 판단하여 결과를 적절한 형태로 만드세요.
1. `role`이 'admin'이면 점수와 상관없이 `True`
2. `role`이 'user'이고 `score`가 80점 이상이면 `True`
3. 그 외(guest 등)는 모두 `False`

```python
# 중첩 딕셔너리 사용하지 않는 경우
result = []
result_dic = {} 
for item in users:

    name = item['name']
    info = item['info']

    role = info['role']
    score = info['score']

    # 기본이 False 근데 특정 상황에만 True
    status = False
    if role == 'admin':
        status = True
    elif role == 'user' and score >= 80:
        status = True

    result.append(status)
    result_dic[name] = status
    
print(result)
print(result_dic)
```

```python
# 중첩 딕셔너리 사용
for user in users:
    role = user['info']['role'] 
    score = user['info']['score']
    
    if role == 'admin':
        access_results.append(True)
    elif role == 'user' and score >= 80:
        access_results.append(True)
    else:
        access_results.append(False)
        
print(f"접근 권한 결과: {access_results}")
```

### problem07 문제 4
주문 내역 데이터입니다. 각 주문 별로 'items' 리스트가 들어있습니다. 전체 주문을 통틀어 '품절(out_of_stock)' 상태가 포함된 주문의 `order_id` 리스트를 구하세요. 또한 품절 상태인 items의 name에 대한 list를 구하세요.

```python
orders = [
    {
        "order_id": "ORD-001",
        "items": [
            {"name": "사과", "status": "in_stock"},
            {"name": "배", "status": "in_stock"}
        ]
    },
    {
        "order_id": "ORD-002",
        "items": [
            {"name": "포도", "status": "out_of_stock"},
            {"name": "딸기", "status": "in_stock"}
        ]
    },
    {
        "order_id": "ORD-003",
        "items": [
            {"name": "수박", "status": "out_of_stock"}
        ]
    },
    {
        "order_id": "ORD-004",
        "items": [
            {"name": "참외", "status": "out_of_stock"},
            {"name": "멜론", "status": "out_of_stock"}
        ]
    },
    {
        "order_id": "ORD-005",
        "items": [
            {"name": "망고", "status": "out_of_stock"},
            {"name": "토마토", "status": "in_stock"},
            {"name": "호두", "status": "out_of_stock"}
        ]
    },
]

problematic_orders = []      # 품절이 한 개라도 들어있는 주문들의 ID를 모아둘 리스트
out_of_stock = []      # 품절 상품 이름들을 모아둘 리스트

for order in orders:        
    has_out = False         

    for item in order["items"]:         
        if item["status"] == "out_of_stock":   
            has_out = True                     
            out_of_stock.append(item["name"])  

    if has_out:                          
        problematic_orders.append(order["order_id"]) 

print(f"품절 포함 주문 ID: {problematic_orders}")
print(f"품절 상품 이름: {out_of_stock}")
```

## 함수(fucction)

### problem8 문제 4
이름 리스트를 입력받아 이름이 3자 이상인 사람만 골라 새로운 리스트로 반환하는 함수 `filter_long_names`를 작성하세요.

**조건:**
1. `for`문을 사용하여 리스트의 각 이름을 확인합니다.
2. `len()` 함수를 사용하여 이름의 길이를 확인합니다.

```python
name_list = ["김철수", "이영희", "박씨", "최도날드"] 
# 새로운 리스트로 반환

def filter_long_names(name_list):
    result = []
    for name in name_list:
        if len(name) >= 3:
            result.append(name)
    return result
# 테스트

print(filter_long_names(name_list))
```

### problem8 문제6
장바구니에 담긴 상품들의 최종 결제 금액을 계산하는 함수 `calculate_checkout_price`를 작성하세요.

**조건:**
1. `membership_grade`가 'VIP'이면 총액의 15%, 'GOLD'이면 10%를 할인합니다.
2. 할인 적용 후 최종 금액이 50,000원 미만이면 배송비 3,000원을 추가합니다.
3. 50,000원 이상이면 배송비는 무료(0원)입니다.

```python
my_cart = [
    {"price": 25000, "quantity": 1},
    {"price": 15000, "quantity": 2}
]


def calculate_checkout_price(my_cart, membership_grade):
    total = 0  # 총액을 0으로 시작

    # 장바구니 총 상품 금액 계산
    for item in my_cart:
        total += item["price"] * item["quantity"]

    # 멤버십 할인
    if membership_grade == "VIP":
        total *= 0.85
    elif membership_grade == "GOLD":
        total *= 0.9

    # 배송비 적용
    if total < 50000:
        total += 3000

    return int(total) 


print(calculate_checkout_price(my_cart, "GOLD"))
```
