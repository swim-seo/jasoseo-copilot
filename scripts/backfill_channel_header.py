"""채널 정보가 빠진 기존 자막 txt에 '채널: @핸들' 헤더 라인을 추가.
사용법: uv run python scripts/backfill_channel_header.py @careersaida
"""

import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SCRIPTS_DIR = Path("data/youtube_scripts")


def backfill(handle: str) -> int:
    handle_norm = handle.lstrip("@")
    channel_line = f"채널: @{handle_norm}\n"
    updated = 0

    for fp in SCRIPTS_DIR.glob("*.txt"):
        text = fp.read_text(encoding="utf-8")
        # 이미 채널 라인이 있으면 건너뜀
        if "채널:" in text.split("\n\n", 1)[0]:
            continue
        lines = text.splitlines(keepends=True)
        if not lines or not lines[0].startswith("출처:"):
            continue
        new_text = lines[0] + channel_line + "".join(lines[1:])
        fp.write_text(new_text, encoding="utf-8")
        updated += 1

    return updated


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법: uv run python scripts/backfill_channel_header.py @핸들")
        sys.exit(1)
    handle = sys.argv[1]
    count = backfill(handle)
    print(f"{count}개 파일에 '채널: {handle}' 추가 완료")
