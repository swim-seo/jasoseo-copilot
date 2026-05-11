"""
취업사이다 YouTube 자막 자동 수집기

사용법:
  # 채널 전체 수집 (최근 50개)
  uv run python scripts/youtube_collector.py --channel https://www.youtube.com/@careersaida

  # 채널에서 최대 N개
  uv run python scripts/youtube_collector.py --channel https://www.youtube.com/@careersaida --max 20

  # 특정 영상 URL 지정 (여러 개 가능)
  uv run python scripts/youtube_collector.py --url https://www.youtube.com/watch?v=XXXX
  uv run python scripts/youtube_collector.py --url URL1 --url URL2

  # 수집 후 Supabase 자동 임베딩
  uv run python scripts/youtube_collector.py --channel ... --ingest
"""

import argparse
import re
import sys
from pathlib import Path

import yt_dlp

SCRIPTS_DIR = Path("data/youtube_scripts")
DEFAULT_MAX = 50


def _clean_vtt(vtt_text: str) -> str:
    """VTT 자막 파일을 읽기 좋은 텍스트로 변환"""
    lines = vtt_text.splitlines()
    result: list[str] = []

    for line in lines:
        line = line.strip()
        if not line:
            continue
        # 헤더 및 메타데이터 제거
        if line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")):
            continue
        # 타임스탬프 줄 제거 (00:00:00.000 --> 00:00:03.000)
        if re.match(r"^\d{2}:\d{2}:\d{2}", line) or "-->" in line:
            continue
        # 숫자만 있는 줄 (자막 번호) 제거
        if re.match(r"^\d+$", line):
            continue
        # HTML 태그 및 위치 메타데이터 제거
        line = re.sub(r"<[^>]+>", "", line)
        line = re.sub(r"align:\S+\s*position:\S+", "", line).strip()
        if line:
            result.append(line)

    # 연속 중복 줄 제거 (자막 겹침 현상)
    deduped: list[str] = []
    for line in result:
        if not deduped or line != deduped[-1]:
            deduped.append(line)

    return "\n".join(deduped)


def _save_transcript(video_id: str, title: str, vtt_path: Path) -> Path:
    """VTT 파일을 clean txt로 변환하여 저장"""
    vtt_text = vtt_path.read_text(encoding="utf-8", errors="ignore")
    clean_text = _clean_vtt(vtt_text)

    safe_title = re.sub(r'[\\/*?:"<>|]', "", title)[:60].strip()
    output_path = SCRIPTS_DIR / f"{safe_title}_{video_id}.txt"

    header = f"출처: https://www.youtube.com/watch?v={video_id}\n제목: {title}\n\n"
    output_path.write_text(header + clean_text, encoding="utf-8")

    # 원본 VTT 삭제
    vtt_path.unlink(missing_ok=True)
    return output_path


def collect(urls: list[str], max_videos: int = DEFAULT_MAX) -> list[Path]:
    """YouTube URL 목록에서 자막 수집 (채널 URL 또는 영상 URL)"""
    SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    collected: list[Path] = []

    ydl_opts = {
        "writeautomaticsub": True,
        "writesubtitles": True,
        "subtitleslangs": ["ko", "ko-KR"],
        "subtitlesformat": "vtt",
        "skip_download": True,
        "outtmpl": str(SCRIPTS_DIR / "%(id)s.%(ext)s"),
        "quiet": True,
        "no_warnings": False,
        "playlistend": max_videos,
        "ignoreerrors": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        for url in urls:
            print(f"\n수집 중: {url}")
            try:
                info = ydl.extract_info(url, download=True)
            except Exception as e:
                print(f"  오류: {e}")
                continue

            # 채널/플레이리스트인 경우 entries 순회
            entries = info.get("entries") if info else None
            videos = entries if entries else ([info] if info else [])

            for video in videos:
                if not video:
                    continue
                video_id = video.get("id", "")
                title = video.get("title", video_id)

                # 저장된 VTT 파일 찾기 (ko 또는 ko-KR)
                vtt_files = list(SCRIPTS_DIR.glob(f"{video_id}*.vtt"))
                if not vtt_files:
                    print(f"  ✗ 자막 없음: {title[:40]}")
                    continue

                saved = _save_transcript(video_id, title, vtt_files[0])
                # 남은 VTT 파일 정리
                for f in vtt_files[1:]:
                    f.unlink(missing_ok=True)

                print(f"  ✓ {saved.name}")
                collected.append(saved)

    return collected


def main() -> None:
    parser = argparse.ArgumentParser(description="YouTube 자막 수집기")
    parser.add_argument("--channel", help="YouTube 채널 URL (@careersaida 등)")
    parser.add_argument("--url", action="append", dest="urls", help="영상 URL (여러 번 사용 가능)")
    parser.add_argument("--max", type=int, default=DEFAULT_MAX, help=f"채널 최대 수집 수 (기본 {DEFAULT_MAX})")
    parser.add_argument("--ingest", action="store_true", help="수집 후 Supabase 자동 임베딩")
    args = parser.parse_args()

    targets: list[str] = []
    if args.channel:
        targets.append(args.channel)
    if args.urls:
        targets.extend(args.urls)

    if not targets:
        parser.print_help()
        sys.exit(1)

    collected = collect(targets, max_videos=args.max)
    print(f"\n총 {len(collected)}개 자막 저장 완료 → {SCRIPTS_DIR}")

    if args.ingest and collected:
        print("\nSupabase 임베딩 시작...")
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from scripts.ingest_scripts import ingest_file

        total = 0
        for path in collected:
            count = ingest_file(path)
            print(f"  {path.name}: {count}개 청크")
            total += count
        print(f"총 {total}개 청크 저장 완료")


if __name__ == "__main__":
    main()
