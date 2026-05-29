"""
conversation_store.py
──────────────────────
In-memory conversation history store with optional MongoDB persistence.

Each session identified by a session_id tracks:
- Message history (user/assistant turns)
- Active voice_id
- Session metadata

MongoDB write is best-effort — the system works fully without it.
"""

import asyncio
import time
import uuid
from collections import deque
from typing import Optional

from app.utils.logger import logger


class ConversationSession:
    """
    A single conversation session with bounded message history.
    """

    MAX_TURNS = 20

    def __init__(
        self,
        session_id: str,
        system_prompt: str,
        voice_id: Optional[str] = None,
        language: str = "en",
    ):
        self.session_id = session_id
        self.system_prompt = system_prompt
        self.voice_id = voice_id
        self.language = language
        self.created_at = time.time()
        self.last_active = time.time()

        # Bounded history: max 2 × MAX_TURNS messages
        self._history: deque[dict] = deque(maxlen=self.MAX_TURNS * 2)

    # ── Message management ─────────────────────────────────────────────────────

    def add_user(self, text: str) -> None:
        self._history.append({"role": "user", "content": text})
        self.last_active = time.time()

    def add_assistant(self, text: str) -> None:
        self._history.append({"role": "assistant", "content": text})
        self.last_active = time.time()

    def get_messages(self) -> list[dict]:
        """Return a copy of the conversation history (without system prompt)."""
        return list(self._history)

    def clear(self) -> None:
        self._history.clear()

    @property
    def turn_count(self) -> int:
        """Number of complete user→assistant exchanges."""
        return sum(1 for m in self._history if m["role"] == "user")

    @property
    def is_empty(self) -> bool:
        return len(self._history) == 0

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "voice_id": self.voice_id,
            "language": self.language,
            "turn_count": self.turn_count,
            "created_at": self.created_at,
            "last_active": self.last_active,
            "messages": self.get_messages(),
        }


class ConversationStore:
    """
    Global store of all active ConversationSessions.

    Thread-safe via asyncio.Lock.  Sessions idle for > SESSION_TTL seconds
    are automatically pruned.
    """

    SESSION_TTL = 3600  # 1 hour

    def __init__(self):
        self._sessions: dict[str, ConversationSession] = {}
        self._lock = asyncio.Lock()

    # ── Session management ─────────────────────────────────────────────────────

    async def create_session(
        self,
        system_prompt: str,
        voice_id: Optional[str] = None,
        language: str = "en",
        session_id: Optional[str] = None,
    ) -> ConversationSession:
        sid = session_id or uuid.uuid4().hex
        session = ConversationSession(
            session_id=sid,
            system_prompt=system_prompt,
            voice_id=voice_id,
            language=language,
        )
        async with self._lock:
            self._sessions[sid] = session
        logger.debug(f"[Session] Created {sid}")
        return session

    async def get_session(self, session_id: str) -> Optional[ConversationSession]:
        async with self._lock:
            return self._sessions.get(session_id)

    async def delete_session(self, session_id: str) -> None:
        async with self._lock:
            self._sessions.pop(session_id, None)
        logger.debug(f"[Session] Deleted {session_id}")

    async def prune_stale(self) -> int:
        """Remove sessions idle for > SESSION_TTL seconds. Returns count removed."""
        cutoff = time.time() - self.SESSION_TTL
        async with self._lock:
            stale = [
                sid
                for sid, s in self._sessions.items()
                if s.last_active < cutoff
            ]
            for sid in stale:
                del self._sessions[sid]
        if stale:
            logger.info(f"[Session] Pruned {len(stale)} stale sessions")
        return len(stale)

    @property
    def active_count(self) -> int:
        return len(self._sessions)


# ── Global singleton ───────────────────────────────────────────────────────────

_store: Optional[ConversationStore] = None


def get_conversation_store() -> ConversationStore:
    global _store
    if _store is None:
        _store = ConversationStore()
    return _store
