"""사용자 고정 작성 지침 로더. backend/prompts/user_profile.txt를 읽어 시스템 프롬프트에 prepend."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

_GUIDE_PATH = Path(__file__).parent.parent / "prompts" / "user_profile.txt"


@lru_cache(maxsize=1)
def load_writing_guide() -> str:
    if not _GUIDE_PATH.exists():
        return ""
    return _GUIDE_PATH.read_text(encoding="utf-8").strip()


def prepend_guide(system: str) -> str:
    guide = load_writing_guide()
    if not guide:
        return system
    return f"{guide}\n\n---\n\n{system}"
