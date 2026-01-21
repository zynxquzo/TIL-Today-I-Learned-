# 파이썬 클래스 미니 프로젝트 2
## 자판기 설계
#### 자판기 클래스
```python
class Vending:
    def __init__(self, drink, price, count):
        self.drink = drink
        self.price = price
        self.count = count

    def is_sold_out(self):
        return self.count == 0
       
    def sell(self):
        if self.is_sold_out():
            return False
        self.count -= 1
        return True

    
    def sell_to(self, person, payment_type):
        if self.is_sold_out():
            return '품절'
        
        if payment_type == 'cash':
            paid = person.pay_cash(self.price)
        elif payment_type == 'card':
            paid = person.pay_card(self.price)
        else:
            return '잘못된 결제 방식'
        
        if not paid:
            return '결제 실패'
        
        self.sell()
        return '음료가 나옵니다'
```
#### 사람(구매자) 클래스
```python
class Person:
    def __init__(self, cash, card_balance):
        self.cash = cash
        self.card_balance = card_balance

    def pay_cash(self, price):
        if self.cash >= price:
            self.cash -= price
            return True
        return False
    
    def pay_card(self, price):
        if self.card_balance >= price:
            self.card_balance -= price
            return True
        return False
```
#### 자판기 음료를 딕셔너리로 묶어서 설계한 클래스
```python
menu = {
    "콜라": {"price": 1500, "count": 3},
    "사이다": {"price": 1400, "count": 2}
}


class Vending:
    def __init__(self, menu):
        self.menu = menu

    def show_menu(self):
        for drink, info in self.menu.items():
            print(f"{drink} - {info['price']}원 ({info['count']}개)")

    def is_sold_out(self, drink):
        return self.menu[drink]["count"] == 0

    def sell(self, drink):
        if self.is_sold_out(drink):
            return False
        self.menu[drink]["count"] -= 1
        return True

    def sell_to(self, drink, person, payment_type):
        if self.is_sold_out(drink):
            return f'[{drink}] 품절입니다.'

        price = self.menu[drink]["price"]

        if payment_type == 'cash':
            paid = person.pay_cash(price)
        elif payment_type == 'card':
            paid = person.pay_card(price)
        else:
            return '잘못된 결제 방식'

        if not paid:
            return f'잔액이 부족하여 {payment_type} 결제 실패'

        self.sell(drink)
        return f'{drink} 구매 성공'
 ```

# 오늘의 알고리즘
-매일 매일 적어도 1개의 알고리즘 문제를 풀고자 생성한 콘텐츠입니다.

## BAEKJOON 1157번
### 단어공부
#### 문제
알파벳 대소문자로 된 단어가 주어지면, 이 단어에서 가장 많이 사용된 알파벳이 무엇인지 알아내는 프로그램을 작성하시오. 단, 대문자와 소문자를 구분하지 않는다.

#### 입력
첫째 줄에 알파벳 대소문자로 이루어진 단어가 주어진다. 주어지는 단어의 길이는 1,000,000을 넘지 않는다.

#### 출력
첫째 줄에 이 단어에서 가장 많이 사용된 알파벳을 대문자로 출력한다. 단, 가장 많이 사용된 알파벳이 여러 개 존재하는 경우에는 ?를 출력한다.
```python
# 문자를 대문자로 통일
word = input().upper()

# 빈 딕셔너리 생성
counts = {}

# 딕셔너리로 개수 세기
for ch in word:
    if ch in counts:
        counts[ch] += 1
    else:
        counts[ch] = 1
# 최대``
#### 사람(구매자) 클래스
```python
class Person:
    def __init__(self, cash, card_balance):
        self.cash = cash
        self.card_balance = card_balance

    def pay_cash(self, price):
        if self.cash >= price:
            self.cash -= price
            return True
        return False
    
    def pay_card(self, price):
        if self.card_balance >= price:
            self.card_balance -= price
            return True
        return False
```
#### 자판기 음료를 딕셔너리로 묶어서 설계한 클래스
```python
menu = {
    "콜라": {"price": 1500, "count": 3},
    "사이다": {"price": 1400, "count": 2}
}


class Vending:
    def __init__(self, menu):
        self.menu = menu

    def show_menu(self):
        for drink, info in self.menu.items():
            print(f"{drink} - {info['price']}원 ({info['count']}개)")

    def is_sold_out(self, drink):
        return self.menu[drink]["count"] == 0

    def sell(self, drink):
        if self.is_sold_out(drink):
            return False
        self.menu[drink]["count"] -= 1
        return True

    def sell_to(self, drink, person, payment_type):
        if self.is_sold_out(drink):
            return f'[{drink}] 품절입니다.'

        price = self.menu[drink]["price"]

        if payment_type == 'cash':
            paid = person.pay_cash(price)
        elif payment_type == 'card':
            paid = person.pay_card(price)
        else:
            return '잘못된 결제 방식'

        if not paid:
            return f'잔액이 부족하여 {payment_type} 결제 실패'

        self.sell(drink)
        return f'{drink} 구매 성공'
 ```

# 오늘의 알고리즘
+ 매일 매일 적어도 1개의 알고리즘 문제를 풀고자 생성한 콘텐츠입니다.

## BAEKJOON 1157번
### 단어공부
#### 문제
알파벳 대소문자로 된 단어가 주어지면, 이 단어에서 가장 많이 사용된 알파벳이 무엇인지 알아내는 프로그램을 작성하시오. 단, 대문자와 소문자를 구분하지 않는다.

#### 입력
첫째 줄에 알파벳 대소문자로 이루어진 단어가 주어진다. 주어지는 단어의 길이는 1,000,000을 넘지 않는다.

#### 출력
첫째 줄에 이 단어에서 가장 많이 사용된 알파벳을 대문자로 출력한다. 단, 가장 많이 사용된 알파벳이 여러 개 존재하는 경우에는 ?를 출력한다.
```python
# 문자를 대문자로 통일
word = input().upper()

# 빈 딕셔너리 생성
counts = {}

# 딕셔너리로 개수 세기
for ch in word:
    if ch in counts:
        counts[ch] += 1
    else:
        counts[ch] = 1

# 최댓값 찾고 판별
max_count = max(counts.values())

# 최댓값 알파벳 저장
best_ch = []
for ch, count in counts.items():
    if count == max_count:
        best_ch.append(ch)

# 결과 출력
if len(best_ch) > 1:
    print('?')
else:
    print(best_ch[0])
 ```
