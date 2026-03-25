# 특정 질문에 대해 web 검색을 하고, 검색 결과를 notion api를 통해 특정 page에 저장하는 llm agent
import os
import requests
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, ToolMessage, SystemMessage
from tavily import TavilyClient
from dotenv import load_dotenv

load_dotenv()

tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

@tool
def web_search(query: str) -> str:
    """웹에서 최신 정보를 검색한다. 실시간 정보(날씨, 뉴스, 주가 등)가 필요할 때 사용한다."""
    results = tavily_client.search(query=query, max_results=3)
    output = []
    for result in results["results"]:
        output.append(f"제목: {result['title']}")
        output.append(f"내용: {result['content'][:200]}")
        output.append(f"출처: {result['url']}")
        output.append("")
    return "\n".join(output)

@tool
def save_to_notion(title: str, content: str) -> str:
    """검색 결과를 Notion 페이지에 저장한다."""

    NOTION_API_KEY = os.getenv("NOTION_API_KEY")
    PAGE_ID = os.getenv("NOTION_PAGE_ID")

    url = "https://api.notion.com/v1/pages"

    headers = {
        "Authorization": f"Bearer {NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }

    data = {
        "parent": {"page_id": PAGE_ID},
        "properties": {
            "title": [
                {
                    "text": {
                        "content": title
                    }
                }
            ]
        },
        "children": [
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": content[:2000]
                            }
                        }
                    ]
                }
            }
        ]
    }

    response = requests.post(url, headers=headers, json=data)

    if response.status_code != 200:
        print("❌ 상태코드:", response.status_code)
        print("❌ 응답내용:", response.text)
        return "노션 저장 실패"

    return "노션에 저장 완료!"
# =======================================================================================
tools = [
    web_search,
    save_to_notion,
]
tool_map = {t.name: t for t in tools}

search_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
search_agent = search_llm.bind_tools(tools)

system_msg = SystemMessage(content="""
너는 정보를 검색하고 정리해서 노션에 저장하는 AI다.

규칙:
1. 정보가 필요하면 web_search를 사용한다
2. 결과를 정리한 뒤 save_to_notion을 사용한다
3. 제목은 질문을 기반으로 생성한다
4. 내용을 깔끔하게 요약해서 저장한다
""")

questions = [
    "오늘 주요 뉴스 알려줘",
]

for q in questions:
    print(f"\n사용자: {q}")
    messages = [system_msg, HumanMessage(content=q)]

    response = search_agent.invoke(messages)
    messages.append(response)

    

    while response.tool_calls:
        for tc in response.tool_calls:
            tool_name = tc["name"]
            tool_args = tc["args"]

            print(f"  → Tool 호출: {tool_name}({tool_args})")

            result = tool_map[tool_name].invoke(tool_args)

            messages.append(
                ToolMessage(content=str(result), tool_call_id=tc["id"])
            )

        response = search_agent.invoke(messages)
        messages.append(response)

    print(f"답변: {response.content}")

