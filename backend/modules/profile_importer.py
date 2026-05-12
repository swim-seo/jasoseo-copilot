"""PDF 또는 자유텍스트 → Claude로 STAR 구조화된 프로필+경험 추출.
사용자가 검토 후 PUT/POST로 저장하는 2단계 흐름."""

import io
import json
import re

import anthropic
from pypdf import PdfReader

from backend.config import settings

SYSTEM_PROMPT = """당신은 채용 관점에서 이력서·경력 텍스트를 분석하는 어시스턴트입니다.
주어진 원문에서 다음을 추출하고, 반드시 JSON 형식으로만 응답하세요.

응답 스키마:
{
  "profile": {
    "name": "이름 또는 빈 문자열",
    "target_role": "본인이 목표로 하는 포지션",
    "character_summary": "이 사람을 한 문장으로 요약하는 캐릭터 (한 줄)",
    "career_summary": "전체 경력 흐름 요약 2~3문장",
    "education": "학력 한 줄 요약",
    "strengths": "강점 키워드 콤마로 나열",
    "company_preferences": "선호 회사 성향 (없으면 빈 문자열)",
    "writing_rules": "본인이 글쓰기에서 지키는 원칙 (없으면 빈 문자열)"
  },
  "experiences": [
    {
      "title": "경험 한 줄 제목",
      "org": "회사·학교·조직명",
      "period": "기간 (YYYY.MM ~ YYYY.MM 형식, 모르면 빈 문자열)",
      "situation": "어떤 상황·배경이었는지 (한 줄)",
      "task": "맡은 문제·역할 (한 줄)",
      "action": "내가 실제로 한 행동 (수치/디테일 포함, 1~3문장)",
      "result": "정량 결과 또는 변화 (수치 우선, 없으면 빈 문자열)",
      "tech_stack": "사용 기술/도구 콤마 나열",
      "tags": ["키워드", "키워드"]
    }
  ],
  "missing_info": [
    "원문에서 누락되어 보완이 필요한 항목들 (예: 'X 경험의 정량 결과')"
  ]
}

규칙:
- 추측으로 채우지 말 것. 원문에 없으면 빈 문자열로 두고 missing_info에 명시.
- experiences는 최소 1개, 가능하면 5개 이내로 굵직한 것만.
- result는 정량 수치(예: 75% 단축, 5만건 처리)를 우선 추출.
- 응답에 JSON 외 다른 텍스트 절대 포함하지 말 것."""


def extract_pdf_text(pdf_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(pdf_bytes))
    return "\n\n".join(page.extract_text() or "" for page in reader.pages).strip()


def _parse_json_block(text: str) -> dict:
    """Claude가 ```json ... ``` 으로 감쌌을 수도 있어 안전 추출."""
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    return json.loads(text)


def analyze_text(raw_text: str) -> dict:
    """원문 텍스트를 Claude에 보내 profile + experiences + missing_info 추출."""
    if not raw_text.strip():
        return {"profile": {}, "experiences": [], "missing_info": ["빈 입력"]}

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=4000,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"## 원문\n{raw_text}\n\n위 원문을 분석하여 스키마대로 JSON만 응답하세요.",
            }
        ],
    )
    text = response.content[0].text
    try:
        return _parse_json_block(text)
    except json.JSONDecodeError as e:
        return {
            "profile": {},
            "experiences": [],
            "missing_info": [f"Claude 응답 JSON 파싱 실패: {e}", text[:200]],
        }
