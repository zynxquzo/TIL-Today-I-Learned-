# 파이썬 클래스
- 클래스는 데이터와 그 데이터를 처리하는 메서드를 하나의 단위로 묶어 관리하는 사용자 정의 데이터 형식이다.
- 객체 지향 프로그래밍에서 특정 상태를 저장하는 변수와 동작을 수행하는 메서드를 설계하는 역할을 한다.

```python
class Calculator:

    def __init__(self, num = 0):
        self.result = num
        

    def add(self, num):
        self.result += num
        return self.result
    
    def subtract(self, num):
        self.result -= num
        return self.result
    
cal1 = Calculator()
cal2 = Calculator()

cal1.add(10)
cal1.add(20)
cal1.subtract(5)
print(cal1.result)
print(cal2.result)
```
# 파이썬 클래스 상속
- 상속은 이미 정의된 클래스의 모든 속성과 메서드를 새로운 클래스가 물려받아 기능을 확장하거나 재사용하는 메커니즘이다.
- 부모 클래스는 기반 클래스 또는 상위 클래스라고 하며 이를 상속받는 클래스는 파생 클래스 또는 자식 클래스라고 한다.

  ### 단일 상속

- 하나의 자식 클래스가 하나의 부모 클래스로부터 기능을 물려받는 구조이다.
- 자식 클래스는 부모 클래스에 정의된 인스턴스 변수와 메서드를 자신의 것처럼 사용할 수 있다.

### 메서드 오버라이딩

- 부모 클래스에 정의된 메서드를 자식 클래스에서 동일한 이름으로 다시 정의하여 동작을 변경하는 기술이다.
- 자식 클래스의 인스턴스에서 해당 메서드를 호출하면 부모의 메서드 대신 재정의된 자식의 메서드가 실행된다.

### super 함수를 활용한 기능 확장

- super() 함수는 자식 클래스에서 부모 클래스의 메서드나 생성자를 호출할 때 사용한다.
- 부모 클래스의 기존 로직을 유지하면서 자식 클래스에서 필요한 기능을 추가할 때 유용하다.

### 다중 상속

- 하나 이상의 부모 클래스로부터 동시에 기능을 상속받는 방식이다.
- 클래스 선언 시 괄호 안에 여러 부모 클래스를 콤마로 구분하여 명시한다.

## 파이썬 상속 연습 문제 
### 문제 1
```python
class Animal:
    def __init__(self, name):
        self.name = name
        
    def move(self):
        print(f"{self.name}이/가 이동합니다.")
              
class Dog(Animal):
    def bark(self):
        print(f"{self.name}이/가 멍멍 짖습니다.")
class Cat(Animal):
    def mew(self):
        print(f"{self.name}이/가 냥냥 웁니다.")
        
a = Animal('초코')
d = Dog('흰둥')
c = Cat('라떼')
a.move()
d.bark()
c.move()
c.mew()
```
### 문제 2
```python
class Electronics:
    def __init__(self, brand):
        self.brand = brand
        
    def power_on(self):
        print(f"{self.brand}제품의 전원이 켜집니다.")
        
class Smartphone(Electronics):
    def __init__(self, brand, model):
        super().__init__(brand)
        self.model = model
        
    def power_on(self):
        super().power_on()
        print(f"{self.model}이 부팅을 시작합니다.")
        
class Fan(Electronics):
    def power_on(self):
        super().power_on()
        print(f"바람이 붑니다.")

phone = Smartphone('아이폰', '17')
```
### 문제 3

```python
class Speaker:
    def play_sound(self):
        print("소리를 출력합니다.")
        
class Camera:
    def take_photo(self):
        print("사진을 촬영합니다.")
        
class SmartDevice(Speaker, Camera):
    pass

smartphone = SmartDevice()
smartphone.play_sound()
smartphone.take_photo()
```