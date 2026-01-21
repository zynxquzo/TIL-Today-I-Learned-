# 2026-01-08
## 랜덤으로 점심 조 짜기 프로젝트

```python
# 남자 12명, 여자 8명
# 한 조만 남자4 나머지는 남자2 여자2

# 남자만 있는 새로운 리스트를 하나 만들고 그 중에서 랜덤으로 4명 먼저 뽑기
# 남은 사람들 중에서 남자2, 여자2 조 만들기 

# 1조 2조 3조 4조 5조로 조 이름을 고정하고 그 조 안에 랜덤으로 뽑힌 사람을 넣는 형식 -> 딕셔너리 사용

mans = ['A', 'B', 'C', 'D',
        'E', 'F', 'G',  'H', 
        'I', 'J', 'K', 'L' ]

womans = ['a', 'b', 'c', 'd', 
         'e', 'f', 'g', 'h']

teams = {'1조' : [],
         '2조' : [],
         '3조' : [],
         '4조' : [],
         '5조' : []}

# 1. 남자 4명 조 만들기
import random
first_team = random.sample(mans, 4)
teams['1조'] = first_team


# 2. 뽑힌 남자 4명을 리스트에서 제거해서 남은 남자 구하기
remaining_mans = []

for man in mans:
    if man not in first_team:
        remaining_mans.append(man)

# 3. 남은 사람들 섞기
random.shuffle(remaining_mans)
random.shuffle(womans)

# 4. 섞은 사람들을 순서대로 2명씩 뽑아 2조~5조: 남자 2명 + 여자 2명
team_names = ['2조', '3조', '4조', '5조']

for i, team in enumerate(team_names): # 변수 i(index), 리스트 안의 값 team
    teams[team] = (                   # 딕셔너리의 value를 사람 이름이 들어있는 새 리스트로 재설정
        remaining_mans[i*2:(i+1)*2] +
        womans[i*2:(i+1)*2]
    )

# 결과 출력 -> 딕셔너리 출력
for team, members in teams.items():
    print(team, members)
  ```
