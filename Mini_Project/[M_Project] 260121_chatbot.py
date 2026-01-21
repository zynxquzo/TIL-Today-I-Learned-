import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
model = "gpt-4o-mini"

client = OpenAI(api_key=OPENAI_API_KEY)

history = [{"role": "system", "content": "당신은 말투가 상당히 거친 40대 남성입니다."}]

print("=== 대화를 시작합니다! (종료: exit) ===")

while True:
    user_input = input("\n나: ")
    if user_input.lower() in ["exit", "quit", "종료"]:
        break
    # if len(history) > 4:
    #     history = history[len(history)-4:] 4번째 히스토리까지만 기억하게 설정
    history.append({"role": "user", "content": user_input})

    # 1. stream=True 설정 추가
    response_stream = client.chat.completions.create(
        model=model,
        messages=history,
        stream=True  # 서버가 조각(Chunk) 단위로 보내도록 설정
    )

    print("AI: ", end="", flush=True) # AI 답변 시작 표시
    
    full_answer = "" # 조각들을 모아서 완성된 답변을 저장할 변수

    # 2. for 루프를 사용해 조각(chunk)들을 하나씩 받기
    for chunk in response_stream:
        # 조각 안에 실제 텍스트 내용이 있는지 확인
        content = chunk.choices[0].delta.content
        if content: # 내용이 있으면
            print(content, end="", flush=True) # 화면에 즉시 출력
            full_answer += content # 전체 답변 변수에도 기록

    print() # 답변 종료 후 줄바꿈
    
    # 3. 완성된 전체 답변을 기록에 추가 (맥락 유지용)
    history.append({"role": "assistant", "content": full_answer})

# 명령어는 python chatbot.py