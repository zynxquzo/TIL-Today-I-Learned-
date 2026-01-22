import os
import json
import urllib.request
import urllib.parse
from dotenv import load_dotenv
from openai import OpenAI

# 환경변수 로드
load_dotenv()

Naver_Client_ID = os.getenv('Naver_Client_ID')
Naver_Client_Secret = os.getenv('Naver_Client_Secret')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# OpenAI 클라이언트 초기화
client = OpenAI(api_key=OPENAI_API_KEY)
model = 'gpt-4o-mini'

# 네이버 뉴스 검색 함수
def search_naver_news(query):
    """네이버 뉴스 API를 호출하여 검색 결과를 반환합니다."""
    encText = urllib.parse.quote(query)
    url = "https://openapi.naver.com/v1/search/news.json?query=" + encText
    
    request = urllib.request.Request(url)
    request.add_header("X-Naver-Client-Id", Naver_Client_ID)
    request.add_header("X-Naver-Client-Secret", Naver_Client_Secret)
    
    try:
        response = urllib.request.urlopen(request)
        rescode = response.getcode()
        
        if rescode == 200:
            response_body = response.read()
            return json.loads(response_body.decode('utf-8'))
        else:
            return {"error": f"Error Code: {rescode}"}
    except Exception as e:
        return {"error": str(e)}

# OpenAI Tool 정의
tools = [
    {
        "type": "function",
        "function": {
            "name": "search_naver_news",
            "description": "네이버에서 뉴스를 검색합니다. 사용자가 특정 주제나 키워드에 대한 뉴스를 요청할 때 사용합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "검색할 뉴스 키워드 또는 주제",
                    },
                },
                "required": ["query"],
            },
        }
    },
]

# 사용자 입력
user_message = "오늘 AI 관련 뉴스를 알려줘"

# OpenAI API 호출
messages = [{"role": "user", "content": user_message}]

response = client.chat.completions.create(
    model=model,
    messages=messages,
    tools=tools,
    tool_choice="auto"
)

# Tool 호출 처리
response_message = response.choices[0].message
tool_calls = response_message.tool_calls

if tool_calls:
    # Tool 호출이 있는 경우
    messages.append(response_message)
    
    for tool_call in tool_calls:
        function_name = tool_call.function.name
        function_args = json.loads(tool_call.function.arguments)
        
        print(f"Tool 호출: {function_name}")
        print(f"인자: {function_args}")
        
        # 네이버 뉴스 검색 실행
        if function_name == "search_naver_news":
            function_response = search_naver_news(function_args.get("query"))
            
            # 검색 결과를 메시지에 추가
            messages.append({
                "tool_call_id": tool_call.id,
                "role": "tool",
                "name": function_name,
                "content": json.dumps(function_response, ensure_ascii=False),
            })
    
    # Tool 결과를 포함하여 다시 API 호출
    second_response = client.chat.completions.create(
        model=model,
        messages=messages
    )
    
    print("\n최종 응답:")
    print(second_response.choices[0].message.content)
else:
    # Tool 호출 없이 바로 응답
    print("\n최종 응답:")
    print(response_message.content)