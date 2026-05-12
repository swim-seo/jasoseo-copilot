"""자소서 결과 + 버전 히스토리 저장."""

from typing import Any

from backend.modules.methodology_rag import _get_client

USER_ID = "me"


def save_cover_letter(fields: dict[str, Any]) -> dict[str, Any]:
    client = _get_client()
    payload = {"user_id": USER_ID, **{k: v for k, v in fields.items() if v is not None}}
    res = client.table("cover_letters").insert(payload).execute()
    return res.data[0] if res.data else payload


def list_cover_letters(company: str | None = None) -> list[dict[str, Any]]:
    client = _get_client()
    q = client.table("cover_letters").select("*").eq("user_id", USER_ID)
    if company:
        q = q.eq("company", company)
    res = q.order("created_at", desc=True).execute()
    return res.data or []


def get_cover_letter(letter_id: int) -> dict[str, Any] | None:
    client = _get_client()
    res = client.table("cover_letters").select("*").eq("id", letter_id).limit(1).execute()
    return (res.data or [None])[0]


def get_thread(letter_id: int) -> list[dict[str, Any]]:
    """letter_id를 가진 자소서와 그 자식들 (버전 체인) 반환."""
    client = _get_client()
    root = get_cover_letter(letter_id)
    if not root:
        return []
    res = (
        client.table("cover_letters")
        .select("*")
        .eq("parent_id", letter_id)
        .order("created_at")
        .execute()
    )
    return [root] + (res.data or [])
