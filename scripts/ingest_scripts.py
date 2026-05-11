"""
취업사이다 YouTube 스크립트를 청킹하여 Supabase에 저장합니다.
사용법: uv run python scripts/ingest_scripts.py

data/youtube_scripts/ 폴더의 모든 .txt 파일을 처리합니다.
새 스크립트를 추가할 때마다 이 스크립트를 다시 실행하세요.
"""

import hashlib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.modules.methodology_rag import upsert_chunks

SCRIPTS_DIR = Path("data/youtube_scripts")
CHUNK_SIZE = 400
CHUNK_OVERLAP = 80


def _remove_timestamps(text: str) -> str:
    """타임스탬프 제거 (예: 0:00, 1:23, 12:34)"""
    return re.sub(r"^\d+:\d+\s*", "", text, flags=re.MULTILINE)


def _normalize_text(text: str) -> str:
    text = _remove_timestamps(text)
    # 빈 줄 정리
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _chunk_by_topic(text: str) -> list[str]:
    """단락 기반 청킹 (한국어 구어체 특성 반영)"""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) + 2 <= CHUNK_SIZE:
            current = (current + "\n\n" + para).strip() if current else para
        else:
            if current:
                chunks.append(current)
            # 오버랩: 이전 청크의 마지막 일부 유지
            overlap = current[-CHUNK_OVERLAP:] if len(current) > CHUNK_OVERLAP else current
            current = (overlap + "\n\n" + para).strip() if overlap else para

    if current:
        chunks.append(current)

    return chunks


def ingest_file(filepath: Path) -> int:
    raw = filepath.read_text(encoding="utf-8")
    text = _normalize_text(raw)
    chunks = _chunk_by_topic(text)

    rows = [
        {
            "id": hashlib.md5(f"{filepath.stem}_{i}".encode()).hexdigest(),
            "content": chunk,
            "source": filepath.name,
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
