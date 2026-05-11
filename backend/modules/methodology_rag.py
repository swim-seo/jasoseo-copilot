from supabase import Client, create_client

from backend.config import settings
from backend.modules.embedding import embed_text, embed_texts

TABLE_NAME = "methodology_chunks"
MATCH_FUNCTION = "match_methodology_chunks_filtered"


def _get_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def retrieve_methodology(
    query: str,
    top_k: int = 6,
    methodology: str | None = None,
    question_type: str | None = None,
    content_type: str | None = None,
    channel_balance: bool = True,
) -> list[dict]:
    """RAG 검색. 필터 미지정시 전체 검색.
    channel_balance=True면 한 채널이 결과의 50% 이상 차지하지 않도록 재정렬."""
    try:
        client = _get_client()
        embedding = embed_text(query)
        fetch_count = top_k * 3 if channel_balance else top_k
        response = client.rpc(
            MATCH_FUNCTION,
            {
                "query_embedding": embedding,
                "match_count": fetch_count,
                "match_threshold": 0.25,
                "filter_methodology": methodology,
                "filter_question_type": question_type,
                "filter_content_type": content_type,
            },
        ).execute()
        rows = response.data or []
        if channel_balance:
            rows = _channel_balanced(rows, top_k)
        return rows[:top_k]
    except Exception:
        return []


def _channel_balanced(rows: list[dict], top_k: int) -> list[dict]:
    """채널별 등장 횟수 균형. 한 채널이 top_k의 50% 초과 못하도록."""
    limit_per_channel = max(1, top_k // 2)
    counts: dict[str, int] = {}
    result: list[dict] = []
    overflow: list[dict] = []
    for row in rows:
        ch = row.get("source_channel") or "unknown"
        if counts.get(ch, 0) < limit_per_channel:
            result.append(row)
            counts[ch] = counts.get(ch, 0) + 1
        else:
            overflow.append(row)
        if len(result) >= top_k:
            break
    if len(result) < top_k:
        result.extend(overflow[: top_k - len(result)])
    return result


def upsert_chunks(chunks: list[dict]) -> None:
    """chunks 각 항목 필드: id, content, source, [source_channel, methodology, content_type, question_type]"""
    client = _get_client()
    texts = [c["content"] for c in chunks]
    embeddings = embed_texts(texts)

    rows = []
    for chunk, emb in zip(chunks, embeddings):
        row = {
            "id": chunk["id"],
            "content": chunk["content"],
            "source": chunk["source"],
            "embedding": emb,
        }
        for key in ("source_channel", "methodology", "content_type", "question_type"):
            if chunk.get(key):
                row[key] = chunk[key]
        rows.append(row)
    client.table(TABLE_NAME).upsert(rows, on_conflict="id").execute()
