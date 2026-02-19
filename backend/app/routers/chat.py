"""
Chat router — multi-turn MedGemma chat grounded in analysis results.

POST /api/chat         →  send message, get response
DELETE /api/chat/{id}  →  clear a chat session
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.chat import ChatService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["chat"])

_chat_service: ChatService | None = None


def get_chat_service() -> ChatService:
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService()
    return _chat_service


# ── Request / Response models ───────────────────────────

class ChatRequest(BaseModel):
    session_id: str
    message: str
    context: dict | None = None 


class ChatResponse(BaseModel):
    session_id: str
    reply: str


# ── Endpoints ───────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    if not body.message.strip():
        raise HTTPException(400, "Message cannot be empty")

    svc = get_chat_service()
    reply = svc.chat(
        session_id=body.session_id,
        message=body.message.strip(),
        context=body.context,
    )

    logger.info(f"Chat {body.session_id}: Q={body.message[:80]}... A={reply[:80]}...")
    return ChatResponse(session_id=body.session_id, reply=reply)


@router.delete("/chat/{session_id}")
async def clear_chat(session_id: str):
    svc = get_chat_service()
    svc.clear_session(session_id)
    return {"status": "ok", "session_id": session_id}
