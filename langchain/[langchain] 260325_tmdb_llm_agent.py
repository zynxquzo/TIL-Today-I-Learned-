# TMDB의 다른 API들을 추가로 활용하여 나의 취향에 맞는 영화 검색 / 추천 등의 질문을 자연어로 처리해주는
# 출력값이 정제된 형태로 만들어주는 llm agent 만들기

import os
import requests
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, ToolMessage, SystemMessage
from dotenv import load_dotenv

load_dotenv()

TMDB_API_KEY = os.getenv("TMDB_API_KEY")

@tool
def search_movies(query: str) -> str:
    """영화를 검색한다. 영화 제목이나 키워드로 검색할 수 있다. 예: '인셉션', '기생충', '아이언맨' 
    결과에는 [movie_id]가 포함되며, 이 id를 get_movie_detail에 사용할 수 있다."""
    response = requests.get(
        "https://api.themoviedb.org/3/search/movie",
        headers={"Authorization": f"Bearer {TMDB_API_KEY}"},
        params={
            "query": query,
            "language": "ko-KR",
        },
    )
    data = response.json()
    results = data.get("results", [])[:5]

    if not results:
        return f"'{query}'에 대한 검색 결과가 없습니다."

    output = []
    for movie in results:
        movie_id = movie.get("id")
        title = movie.get("title", "제목 없음")
        year = (movie.get("release_date") or "")[:4]
        rating = movie.get("vote_average", 0)
        overview = movie.get("overview", "줄거리 없음")[:100]
        output.append(f"- [{movie_id}] {title} ({year}) ⭐ {rating}\n  {overview}")
    return "\n".join(output)

@tool
def get_movie_detail(movie_id: int) -> str:
    """영화의 상세 정보를 반환한다. movie_id를 입력받아 출연진, 감독, 런타임 등을 반환한다."""
    response = requests.get(
        f"https://api.themoviedb.org/3/movie/{movie_id}",
        headers={"Authorization":f"Bearer {TMDB_API_KEY}"},
        params={
            "language": "ko-KR",
            "append_to_response": "credits",
		},
	)
    data = response.json()
    
	# 기본 정보
    title = data.get("title", "제목 없음")
    runtime = data.get("runtime", "정보 없음")

    # 감독 찾기
    crew = data.get("credits", {}).get("crew", [])
    director = "정보 없음"
    for person in crew:
        if person.get("job") == "Director":
            director = person.get("name")
            break

    # 출연진 (상위 5명)
    cast = data.get("credits", {}).get("cast", [])[:5]
    cast_names = [actor.get("name") for actor in cast]

    return (
        f"🎬 {title}\n"
        f"- 감독: {director}\n"
        f"- 러닝타임: {runtime}분\n"
        f"- 출연진: {', '.join(cast_names) if cast_names else '정보 없음'}"

	)

@tool
def get_movie_keywords(movie_id: int) -> str:
    """영화의 핵심 키워드를 반환한다.
    비슷한 영화 추천 전에 반드시 사용해야 한다."""
    response = requests.get(
        f"https://api.themoviedb.org/3/movie/{movie_id}/keywords",
        headers={"Authorization":f"Bearer {TMDB_API_KEY}"},
    )
    data = response.json()
    keywords = [k["name"] for k in data.get("keywords", [])]

    if not keywords:
        return "키워드 정보 없음"

    return ", ".join(keywords)

@tool
def recommend_similar_movies(movie_id: int) -> str:
    """주어진 영화와 비슷한 영화를 추천한다."""

    response = requests.get(
        f"https://api.themoviedb.org/3/movie/{movie_id}/similar",
        headers={"Authorization": f"Bearer {TMDB_API_KEY}"},
        params={"language": "ko-KR"}
    )

    data = response.json()
    results = data.get("results", [])[:5]

    if not results:
        return "추천 영화 없음"

    output = []
    for movie in results:
        title = movie.get("title")
        rating = movie.get("vote_average")
        output.append(f"- {title} ⭐ {rating}")

    return "\n".join(output)
# ==================================================================================
# Tool 준비
tools = [
    search_movies, 
    get_movie_detail,
    get_movie_keywords,
    recommend_similar_movies,
]

tool_map = {t.name: t for t in tools}

# LLM + Tool 연결
movie_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
movie_agent = movie_llm.bind_tools(tools)

system_msg = SystemMessage(content="""
너는 영화 추천 전문가다.

절대 규칙:

1. "비슷한 영화", "같은 느낌", "추천" 요청이 들어오면
   반드시 아래 순서를 따른다:

   (1) search_movies로 movie_id 확보
   (2) get_movie_keywords로 영화 특징 분석
   (3) recommend_similar_movies로 추천

2. get_movie_keywords를 호출하지 않고 추천을 수행하는 것은 금지한다.

3. 반드시 Tool을 순서대로 호출한 후 답변을 생성하라.
""")

# 테스트 질문
questions = [
    "인셉션 같은 영화 추천해줘",
    "기생충 같은 분위기 영화 추천해줘",
    "인셉션 영화 특징 키워드 알려줘",

]

# Agent 실행
for q in questions:
    print(f"\n사용자: {q}")
    messages = [system_msg, HumanMessage(content=q)]

    response = movie_agent.invoke(messages)
    messages.append(response)

    # 🔁 Tool 호출 루프
    while response.tool_calls:
        for tc in response.tool_calls:
            tool_name = tc["name"]
            tool_args = tc["args"]

            print(f"  → Tool 호출: {tool_name}({tool_args})")

            # 🔥 핵심: tool_map으로 올바른 Tool 실행
            result = tool_map[tool_name].invoke(tool_args)

            messages.append(
                ToolMessage(
                    content=str(result),
                    tool_call_id=tc["id"]
                )
            )

        response = movie_agent.invoke(messages)
        messages.append(response)

    print(f"답변: {response.content}")