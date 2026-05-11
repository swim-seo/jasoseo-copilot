from supabase import Client, create_client

from backend.config import settings
from backend.modules.embedding import embed_text, embed_texts

TABLE_NAME = "methodology_chunks"
MATCH_FUNCTION = "match_methodology_chunks"


def _get_client() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def retrieve_methodology(query: str, top_k: int = 6) -> list[str]:
    try:
        client = _get_client()
        embedding = embed_text(query)
        response = client.rpc(
            MATCH_FUNCTION,
            {"query_embedding": embedding, "match_count": top_k, "match_threshold": 0.25},
        ).execute()
        return [row["content"] for row in (response.data or [])]
    except Exception:
        return []


def upsert_chunks(chunks: list[dict]) -> None:
    client = _get_client()
    texts = [c["content"] for c in chunks]
    embeddings = embed_texts(texts)

    rows = [
        {
            "id": chunk["id"],
            "content": chunk["content"],
            "source": chunk["source"],
            "embedding": emb,
        }
        for chunk, emb in zip(chunks, embeddings)
    ]
    client.table(TABLE_NAME).upsert(rows, on_conflict="id").execute()
