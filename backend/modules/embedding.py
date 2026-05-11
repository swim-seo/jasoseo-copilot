import httpx

from backend.config import settings

HF_API_URL = (
    "https://api-inference.huggingface.co/pipeline/feature-extraction"
    "/paraphrase-multilingual-MiniLM-L12-v2"
)
BATCH_SIZE = 32


def _call_hf(texts: list[str]) -> list[list[float]]:
    headers = {"Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"}
    response = httpx.post(
        HF_API_URL,
        headers=headers,
        json={"inputs": texts, "options": {"wait_for_model": True}},
        timeout=60,
    )
    response.raise_for_status()
    result = response.json()
    # single text returns flat list, batch returns nested list
    if texts and isinstance(result[0], float):
        return [result]
    return result


def embed_texts(texts: list[str]) -> list[list[float]]:
    results: list[list[float]] = []
    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        results.extend(_call_hf(batch))
    return results


def embed_text(text: str) -> list[float]:
    return embed_texts([text])[0]
