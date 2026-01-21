# 파이썬 미니 프로젝트 - 게임 캐릭터 설계
#### 캐릭터 클래스
```python
# 객체지향에서 가장 중요한 질문
# 이 행동의 주체는 누구인가?

class Character: # “행동을 시키는 주체”는 항상 Character
    def __init__(self, name, role):
        self.name = name
        self.role = role  
        self.weapon = None

    def attack(self):
        print(f"{self.name}이(가) 공격합니다.")
        self.role.attack_style()

    def equip_weapon(self, weapon):
        if weapon.name not in self.role.allowed_weapons:
            print("이 직업은 해당 무기를 장착할 수 없습니다")
            return

        self.weapon = weapon
        print(f"{weapon.name}을(를) 장착했습니다")

    def use_weapon_skill(self):

        if self.weapon is None:
            print("장착된 무기가 없습니다")
            return
        
        print(self.weapon.use_skill())
```
#### 직업 클래스
```python

from abc import ABC, abstractmethod

class Role(ABC): # 직업은 공격 방식을 제공
    def __init__(self, allowed_weapons):
        self.allowed_weapons = allowed_weapons

    @abstractmethod
    def attack_style(self):
        pass

class Warrior(Role): # 전사
    def __init__(self):
        super().__init__(["Sword"])

    def attack_style(self):
        return "검을 휘두릅니다."
    
class Mage(Role): # 마법사
    def __init__(self):
        super().__init__(["Staff"])

    def attack_style(self):
        return "마법을 시전합니다."

class Thief(Role): # 도적
    def __init__(self):
        super().__init__(["Dual_wielding"])

    def attack_style(self):
        return "이도류를 휘두릅니다."

class Archer(Role): # 궁수
    def __init__(self):
        super().__init__(["Bow"])

    def attack_style(self):
        return "활을 쏩니다."
```
#### 무기 클래스
```python
class Weapon(ABC): # 무기는 스킬이 뭔지만 알고 있음
    def __init__(self, name):
        self.name = name

    @abstractmethod
    def use_skill(self):
        pass

class Sword(Weapon): 
    def __init__(self):
        super().__init__("Sword")

    def use_skill(self):
        return "연속 베기!"

class Staff(Weapon):
    def __init__(self):
        super().__init__("Staff")

    def use_skill(self):
        return "파이어볼!"

class Dual_wielding(Weapon):
    def __init__(self):
        super().__init__("Dual_wielding")

    def use_skill(self):
        return "마구 갈기기!"

class Bow(Weapon):
    def __init__(self):
        super().__init__("Bow")

    def use_skill(self):
        return "연속 쏘기!"
```
