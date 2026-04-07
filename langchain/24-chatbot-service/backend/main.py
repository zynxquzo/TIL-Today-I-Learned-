import os

from dotenv import load_dotenv

load_dotenv()

import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import Base, engine, get_db
from models import Conversation
import graph as graph_module


@asynccontextmanager
async def lifespan(app):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    pg_conn = await graph_module.init_graph()
    yield
    await pg_conn.close()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


@app.get("/health")
async def health():
    return {"status": "ok"}


# --- 대화 CRUD ---


@app.get("/conversations")
async def list_conversations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation).order_by(Conversation.created_at.desc())
    )
    conversations = result.scalars().all()
    return [
        {"id": c.id, "title": c.title, "created_at": str(c.created_at)}
        for c in conversations
    ]


@app.post("/conversations")
async def create_conversation(db: AsyncSession = Depends(get_db)):
    conversation = Conversation()
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return {"id": conversation.id, "title": conversation.title}


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation).filter_by(id=conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if conversation:
        await db.delete(conversation)
        await db.commit()
    return {"ok": True}


# --- 메시지 히스토리 ---


@app.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str):
    if graph_module.graph is None:
        return []

    config = {"configurable": {"thread_id": conversation_id}}

    try:
        state = await graph_module.graph.aget_state(config)
    except Exception:
        return []

    if not state or not state.values:
        return []

    messages = []
    for msg in state.values.get("messages", []):
        if msg.type == "human":
            messages.append({"role": "user", "content": msg.content})
        elif msg.type == "ai" and msg.content:
            messages.append({"role": "assistant", "content": msg.content})

    return messages


# --- 채팅 ---


@app.post("/conversations/{conversation_id}/chat/stream")
async def chat_stream(
    conversation_id: str,
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    if graph_module.graph is None:
        raise HTTPException(status_code=503, detail="서버 초기화 중입니다.")

    # 첫 메시지면 제목 업데이트
    result = await db.execute(
        select(Conversation).filter_by(id=conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if conversation and conversation.title == "새 대화":
        conversation.title = req.message[:30] + ("..." if len(req.message) > 30 else "")
        await db.commit()

    config = {"configurable": {"thread_id": conversation_id}}

    async def event_generator():
        async for msg, metadata in graph_module.graph.astream(
            {"messages": [("user", req.message)]},
            config=config,
            stream_mode="messages",
        ):
            node = metadata.get("langgraph_node")

            # 스트리밍에서는 AIMessage가 아닌 토큰 단위의 AIMessageChunk가 온다.
            # langgraph_node로 어떤 노드에서 생성된 청크인지 구분한다.
            # create_agent()의 LLM 노드 이름은 "model"이다.
            if msg.type == "AIMessageChunk" and node == "model":
                if msg.content:
                    data = json.dumps(
                        {"type": "token", "content": msg.content},
                        ensure_ascii=False,
                    )
                    yield f"data: {data}\n\n"

                # Tool 호출 시작
                if msg.tool_call_chunks:
                    for tc in msg.tool_call_chunks:
                        if tc.get("name"):
                            data = json.dumps(
                                {"type": "tool_call", "name": tc["name"]},
                                ensure_ascii=False,
                            )
                            yield f"data: {data}\n\n"

            # Tool 실행 결과
            if msg.type == "tool" and node == "tools":
                data = json.dumps(
                    {
                        "type": "tool_result",
                        "name": msg.name,
                        "content": msg.content[:300],
                    },
                    ensure_ascii=False,
                )
                yield f"data: {data}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
    )
