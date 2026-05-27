from collections import deque
from typing import Optional


class ConversationContext:
    """Manages conversation history and system prompt for LLM calls.

    Keeps the last `max_turns` exchanges (user + assistant pairs)
    to stay within token limits while preserving follow-up context.
    """

    def __init__(self, system_prompt: str, max_turns: int = 20):
        self.system_prompt = system_prompt
        self.max_turns = max_turns
        # Each element is {"role": str, "content": str}
        self._history: deque[dict] = deque(maxlen=max_turns * 2)

    def add_user_message(self, content: str) -> None:
        self._history.append({"role": "user", "content": content})

    def add_assistant_message(self, content: str) -> None:
        self._history.append({"role": "assistant", "content": content})

    def get_messages(self) -> list[dict]:
        """Return conversation history (without the system prompt)."""
        return list(self._history)

    def clear(self) -> None:
        self._history.clear()

    @property
    def turn_count(self) -> int:
        """Number of complete user→assistant exchanges."""
        return sum(1 for m in self._history if m["role"] == "user")

    def __len__(self) -> int:
        return len(self._history)
