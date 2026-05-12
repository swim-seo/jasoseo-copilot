"""JD gap analysis: extract requirements → compare → generate 경력기술서."""

from __future__ import annotations

import json
import re

import anthropic

from backend.config import settings
from backend.modules.user_profile import get_profile, list_experiences, render_profile_block
from backend.modules.writing_guide import prepend_guide

_client = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


def _parse_json(text: str) -> dict | list:
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(\{.*\}|\[.*\])\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    return json.loads(text)


# ── Step 1: JD 요건 추출 ──────────────────────────────────────────────────

JD_EXTRACT_SYSTEM = """당신은 채용 공고(JD)를 분석하는 리크루팅 전문가입니다.
JD에서 요건을 추출해 JSON으로만 응답하세요. 다른 텍스트 없이 JSON만.

required vs preferred를 반드시 구분하십시오. 많은 JD가 이를 섞어 쓰므로 주의.
"""

JD_EXTRACT_PROMPT = """아래 채용 공고에서 요건을 추출하세요.

<job_description>
{jd}
</job_description>

응답 형식:
{{
  "job_title": "직무명",
  "seniority": "junior|mid|senior|lead",
  "required_skills": ["필수 기술스택/도구"],
  "preferred_skills": ["우대 기술스택/도구"],
  "years_experience": "경력 요건 (예: 3년 이상)",
  "education": "학력 요건",
  "certifications": ["자격증/인증"],
  "domain_keywords": ["도메인 전문 용어 및 ATS 키워드"],
  "soft_skills": ["소프트 스킬"],
  "culture_signals": ["회사 문화 키워드 (예: 자율, 빠른 실행)"],
  "core_responsibilities": ["핵심 업무 2~5개"]
}}"""


def extract_jd_requirements(jd: str) -> dict:
    safe_jd = jd[:8000]
    resp = _get_client().messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=1200,
        system=JD_EXTRACT_SYSTEM,
        messages=[{"role": "user", "content": JD_EXTRACT_PROMPT.format(jd=safe_jd)}],
    )
    try:
        return _parse_json(resp.content[0].text)
    except Exception:
        return {"raw": resp.content[0].text[:500], "error": "JD 파싱 실패"}


# ── Step 2: 갭 분석 ──────────────────────────────────────────────────────

GAP_SYSTEM = prepend_guide("""당신은 채용 관점에서 지원자의 경험과 JD 요건의 갭을 분석하는 전문가입니다.

규칙:
- 사용자가 언급하지 않은 내용을 matched에 넣지 마십시오. 근거 없는 매칭은 금지.
- partial: 어느 정도 가지고 있지만 증거가 약한 항목
- missing: 전혀 언급되지 않거나 증거가 없는 항목
- priority: 채용 의사결정에 미치는 영향 기준으로 정렬
JSON 외 다른 텍스트 없이 응답하세요.""")

GAP_PROMPT = """아래 JD 요건과 사용자 경험을 비교해 갭을 분석하세요.

## JD 요건
<requirements>
{requirements}
</requirements>

## 사용자 경험 (날것 포함)
<user_experience>
{experience}
</user_experience>

## 사용자 저장 프로필
<profile>
{profile_block}
</profile>

응답 형식:
{{
  "match_score": 0~100 정수,
  "match_summary": "한 줄 총평",
  "matched": [
    {{"item": "요건명", "evidence": "사용자 경험에서 근거 인용", "strength": "strong|moderate"}}
  ],
  "partial": [
    {{"item": "요건명", "evidence": "약한 근거 인용", "gap": "어떤 부분이 부족한지", "suggestion": "어떻게 보강할지"}}
  ],
  "missing": [
    {{"item": "요건명", "priority": "high|medium|low", "suggestion": "이 갭을 채울 방법 또는 우회 서술 방법"}}
  ],
  "keyword_gaps": ["JD에 있지만 경험에 없는 ATS 키워드"],
  "strengths_to_highlight": ["특히 강조해야 할 강점 2~3개"],
  "critical_gaps": ["채용 결정에 치명적인 갭 (있을 경우)"]
}}"""


def analyze_gap(jd_requirements: dict, user_experience: str, profile_block: str) -> dict:
    safe_exp = user_experience[:12000]
    safe_req = json.dumps(jd_requirements, ensure_ascii=False)[:4000]

    resp = _get_client().messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=2000,
        system=GAP_SYSTEM,
        messages=[{"role": "user", "content": GAP_PROMPT.format(
            requirements=safe_req,
            experience=safe_exp,
            profile_block=profile_block,
        )}],
    )
    try:
        return _parse_json(resp.content[0].text)
    except Exception:
        return {"raw": resp.content[0].text[:500], "error": "갭 분석 파싱 실패"}


# ── Step 3: 경력기술서 생성 ────────────────────────────────────────────────

CAREER_DESC_SYSTEM = prepend_guide("""당신은 한국 채용 시장 경력기술서 전문 작성가입니다.

경력기술서 구조:
1. 요약 프로필 (3~4문장: 핵심 캐릭터 + 강점 + 지원 포지션 연결)
2. 경력 사항 (회사별: 기간·직책·역할·성과, STAR 기반, 수치 포함)
3. 보유 역량 (JD 키워드 중심으로 정렬)
4. 보완 필요 항목 표시 (실제 없는 내용은 절대 꾸며내지 말고 [보완 필요: ...]로 표시)

규칙:
- matched + partial 경험만 본문에 반영. missing은 [보완 필요] 태그로 표시.
- 수치가 없으면 "수치 보강 필요" 주석 추가.
- 사용자가 언급하지 않은 내용 생성 금지.
- 합쇼체, 자연스럽게.
JSON 외 다른 텍스트 없이 응답하세요.""")

CAREER_DESC_PROMPT = """아래 데이터를 바탕으로 경력기술서를 작성하세요.

## JD 요건
<requirements>
{requirements}
</requirements>

## 갭 분석 결과
<gap_analysis>
{gap_analysis}
</gap_analysis>

## 사용자 경험 (원문)
<user_experience>
{experience}
</user_experience>

## 사용자 저장 프로필
<profile>
{profile_block}
</profile>

응답 형식:
{{
  "profile_summary": "요약 프로필 문단",
  "career_sections": [
    {{
      "company": "회사명",
      "period": "기간",
      "title": "직책",
      "responsibilities": ["역할 1", "역할 2"],
      "achievements": ["성과 1 (수치 포함 권장)", "성과 2"]
    }}
  ],
  "skills": {{
    "core": ["핵심 역량"],
    "tools": ["도구/스택"],
    "domain": ["도메인 전문성"]
  }},
  "supplement_needed": ["[보완 필요] 항목 목록 — 사용자가 추가로 준비할 내용"],
  "full_text": "위 내용을 통합한 완성된 경력기술서 전문 (마크다운)"
}}"""


def generate_career_description(
    jd_requirements: dict,
    gap_analysis: dict,
    user_experience: str,
    profile_block: str,
) -> dict:
    safe_exp = user_experience[:10000]
    safe_req = json.dumps(jd_requirements, ensure_ascii=False)[:3000]
    safe_gap = json.dumps(gap_analysis, ensure_ascii=False)[:4000]

    resp = _get_client().messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=3000,
        system=CAREER_DESC_SYSTEM,
        messages=[{"role": "user", "content": CAREER_DESC_PROMPT.format(
            requirements=safe_req,
            gap_analysis=safe_gap,
            experience=safe_exp,
            profile_block=profile_block,
        )}],
    )
    try:
        return _parse_json(resp.content[0].text)
    except Exception:
        return {"full_text": resp.content[0].text, "error": "파싱 실패"}


# ── 통합 파이프라인 ───────────────────────────────────────────────────────

def run_gap_pipeline(jd: str, user_experience: str) -> dict:
    """JD + 경험 raw → 요건추출 → 갭분석 → 경력기술서 생성."""
    profile = get_profile()
    experiences = list_experiences()
    profile_block = render_profile_block(profile, experiences)

    jd_req = extract_jd_requirements(jd)
    gap = analyze_gap(jd_req, user_experience, profile_block)
    career_desc = generate_career_description(jd_req, gap, user_experience, profile_block)

    return {
        "jd_requirements": jd_req,
        "gap_analysis": gap,
        "career_description": career_desc,
    }
