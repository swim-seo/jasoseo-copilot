"""YouTube 스크립트를 청킹하여 Supabase에 저장합니다.
사용법: uv run python scripts/ingest_scripts.py

data/youtube_scripts/ 폴더의 모든 .txt 파일을 처리합니다.
파일 헤더에서 채널을 자동 추론하여 메타데이터 태깅합니다.
"""

import hashlib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.modules.channel_registry import profile_for_source
from backend.modules.methodology_rag import upsert_chunks

SCRIPTS_DIR = Path("data/youtube_scripts")
CHUNK_SIZE = 400
CHUNK_OVERLAP = 80


def _remove_timestamps(text: str) -> str:
    return re.sub(r"^\d+:\d+\s*", "", text, flags=re.MULTILINE)


def _normalize_text(text: str) -> str:
    text = _remove_timestamps(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _chunk_by_topic(text: str) -> list[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 2 <= CHUNK_SIZE:
            current = (current + "\n\n" + para).strip() if current else para
        else:
            if current:
                chunks.append(current)
            overlap = current[-CHUNK_OVERLAP:] if len(current) > CHUNK_OVERLAP else current
            current = (overlap + "\n\n" + para).strip() if overlap else para
    if current:
        chunks.append(current)
    return chunks


def ingest_file(filepath: Path, metadata: dict[str, str] | None = None) -> int:
    raw = filepath.read_text(encoding="utf-8")
    text = _normalize_text(raw)
    chunks = _chunk_by_topic(text)

    # 메타데이터 미지정시 파일 헤더(출처 URL)에서 채널 추론
    profile = metadata or profile_for_source(raw[:500] + " " + filepath.name)

    rows = [
        {
            "id": hashlib.md5(f"{filepath.stem}_{i}".encode()).hexdigest(),
            "content": chunk,
            "source": filepath.name,
            **profile,
        }
        for i, chunk in enumerate(chunks)
    ]

    upsert_chunks(rows)
    return len(rows)


def main() -> None:
    if not SCRIPTS_DIR.exists():
        print(f"디렉토리 없음: {SCRIPTS_DIR}")
        return

    files = list(SCRIPTS_DIR.glob("*.txt"))
    if not files:
        print("txt 파일이 없습니다.")
        return

    total = 0
    for filepath in files:
        count = ingest_file(filepath)
        print(f"  {filepath.name}: {count}개 청크 업로드 완료")
        total += count

    print(f"\n총 {total}개 청크 Supabase 저장 완료")


if __name__ == "__main__":
    main()
