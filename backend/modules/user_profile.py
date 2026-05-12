"""사용자 고정 프로필 + 경험 관리. singleton user_id='me' 가정."""

from typing import Any

from backend.modules.methodology_rag import _get_client

USER_ID = "me"


def get_profile() -> dict[str, Any]:
    client = _get_client()
    res = client.table("user_profile").select("*").eq("id", USER_ID).limit(1).execute()
    return (res.data or [{}])[0]


def upsert_profile(fields: dict[str, Any]) -> dict[str, Any]:
    client = _get_client()
    payload = {"id": USER_ID, **{k: v for k, v in fields.items() if v is not None}}
    res = client.table("user_profile").upsert(payload, on_conflict="id").execute()
    return res.data[0] if res.data else payload


def list_experiences() -> list[dict[str, Any]]:
    client = _get_client()
    res = (
        client.table("experiences")
        .select("*")
        .eq("user_id", USER_ID)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


def get_experiences(ids: list[int]) -> list[dict[str, Any]]:
    if not ids:
        return []
    client = _get_client()
    res = client.table("experiences").select("*").in_("id", ids).execute()
    return res.data or []


def upsert_experience(fields: dict[str, Any]) -> dict[str, Any]:
    client = _get_client()
    payload = {"user_id": USER_ID, **{k: v for k, v in fields.items() if v is not None}}
    if "id" in payload and payload["id"]:
        res = client.table("experiences").update(payload).eq("id", payload["id"]).execute()
    else:
        res = client.table("experiences").insert(payload).execute()
    return res.data[0] if res.data else payload


def delete_experience(exp_id: int) -> None:
    client = _get_client()
    client.table("experiences").delete().eq("id", exp_id).execute()


def render_profile_block(profile: dict[str, Any], experiences: list[dict[str, Any]]) -> str:
    """프롬프트에 주입할 사용자 프로필 텍스트 블록."""
    parts: list[str] = []
    if profile.get("character_summary"):
        parts.append(f"[핵심 캐릭터]\n{profile['character_summary']}")
    if profile.get("target_role"):
        parts.append(f"[목표 포지션]\n{profile['target_role']}")
    if profile.get("career_summary"):
        parts.append(f"[경력 요약]\n{profile['career_summary']}")
    if profile.get("education"):
        parts.append(f"[학력]\n{profile['education']}")
    if profile.get("strengths"):
        parts.append(f"[강점 (실제 문제 해결의 근거로만 사용)]\n{profile['strengths']}")
    if profile.get("company_preferences"):
        parts.append(f"[선호 회사 성향]\n{profile['company_preferences']}")
    if profile.get("writing_rules"):
        parts.append(f"[작성 규칙]\n{profile['writing_rules']}")
    if experiences:
        exp_text = "\n".join(
            f"- {e.get('title', '')}"
            + (f" ({e.get('org', '')})" if e.get('org') else "")
            + f"\n  S: {e.get('situation', '')}"
            + f"\n  T: {e.get('task', '')}"
            + f"\n  A: {e.get('action', '')}"
            + f"\n  R: {e.get('result', '')}"
            for e in experiences
        )
        parts.append(f"[STAR 정리 경험]\n{exp_text}")
    return "\n\n".join(parts)
