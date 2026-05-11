from fastembed import TextEmbedding

MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
BATCH_SIZE = 32

_model: TextEmbedding | None = None


def _get_model() -> TextEmbedding:
    global _model
    if _model is None:
        _model = TextEmbedding(model_name=MODEL_NAME)
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    model = _get_model()
    return [vec.tolist() for vec in model.embed(texts, batch_size=BATCH_SIZE)]


def embed_text(text: str) -> list[float]:
    return embed_texts([text])[0]
