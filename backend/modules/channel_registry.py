"""채널별 메타데이터 매핑. youtube_collector가 어떤 URL을 받든
파일명에서 채널 정보를 역추적할 수 있도록 source URL 패턴으로 매칭."""

CHANNEL_PROFILES: dict[str, dict[str, str]] = {
    "careersaida": {
        "source_channel": "careersaida",
        "methodology": "careersaida_star",
        "content_type": "consultation",
    },
    "leebro_interview": {
        "source_channel": "leebro_interview",
        "methodology": "leehyung_3C4P",
        "content_type": "framework",
    },
    "kang": {
        "source_channel": "kang_minhyuk",
        "methodology": "kang_3step",
        "content_type": "framework",
    },
    "worktmw": {
        "source_channel": "jerry_mentor",
        "methodology": "mock_feedback",
        "content_type": "teardown",
    },
    "omsjobs": {
        "source_channel": "oms_jobs",
        "methodology": "experience_reframe",
        "content_type": "framework",
    },
}

DEFAULT_PROFILE = {
    "source_channel": "unknown",
    "methodology": "general",
    "content_type": "general",
}


def profile_for_source(source_url_or_text: str) -> dict[str, str]:
    """source 텍스트(파일명 또는 URL)에서 채널을 추론."""
    haystack = source_url_or_text.lower()
    for key, profile in CHANNEL_PROFILES.items():
        if key in haystack:
            return profile
    return DEFAULT_PROFILE
