"""JD gap analysis: extract requirements → compare → generate 경력기술서."""

from __future__ import annotations

import json
import re

import anthropic

from backend.config import settings
from backend.modules.methodology_rag import retrieve_methodology
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

## 경력기술서 구조
1. 요약 프로필 (3~4문장: 핵심 캐릭터 + 강점 + 지원 포지션 연결)
2. 프로젝트/업무 단위 경력 사항 (회사 단위가 아닌 프로젝트 단위로 분리)
   - 각 항목: 배경(문제/이유) → 역할(내가 맡은 것) → 실행(어떻게 했는가) → 성과(수치 포함)
   - LLM/AI 개발자는 CAR 구조 우선: Challenge(기술적 문제) → Action(내 판단+구현) → Result(임팩트)
   - 분량: 항목당 5~8줄
3. 보유 역량 (JD 키워드 중심 정렬)

## 핵심 규칙
- **행동 동사**: 설계/구현/최적화/주도/제안/발굴 사용. "담당/수행" 금지.
- **ATS 키워드**: JD에 등장한 기술 스택을 정확히 동일한 표기로 각 프로젝트 첫 문장에 포함.
- **수치 없을 때**: 없애지 말고 `[수치 확인 필요: 약 XX%]` 플레이스홀더로 자리 잡기.
- **근거 없는 내용 생성 금지**: matched + partial 경험만 본문 반영. missing은 [보완 필요] 태그.
- **직무 전환 프레이밍**: 데이터분석 경력 → "LLM 평가/실험 설계 역량" / "운영 환경에서 모델 품질 측정 체계 설계"로 재정의.
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

## 전문가 코칭 사례 (경력기술서·포트폴리오 작성 원칙, RAG)
<rag_coaching>
{rag_coaching}
</rag_coaching>

응답 형식:
{{
  "profile_summary": "요약 프로필 문단",
  "projects": [
    {{
      "project_name": "프로젝트/업무명",
      "company": "소속 회사",
      "period": "기간 (YYYY.MM ~ YYYY.MM)",
      "role": "직책/역할",
      "background": "배경 — 어떤 문제가 있었고 왜 이 프로젝트를 맡았는가",
      "actions": ["실행 1 (행동 동사 시작, JD 키워드 포함)", "실행 2"],
      "results": ["성과 1 (수치 또는 [수치 확인 필요: 약 XX%])", "성과 2"]
    }}
  ],
  "skills": {{
    "core": ["핵심 역량"],
    "tools": ["도구/스택 (JD 키워드 동일 표기)"],
    "domain": ["도메인 전문성"]
  }},
  "supplement_needed": ["[보완 필요] 항목 — 사용자가 추가로 준비/확인할 내용"],
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

    # 경력기술서·포트폴리오 관련 코칭 사례 RAG 검색
    job_title = jd_requirements.get("job_title", "")
    rag_query = f"{job_title} 경력기술서 포트폴리오 성과 서술 수치 작성 방법"
    rag_chunks = retrieve_methodology(rag_query, top_k=4)
    rag_text = "\n\n---\n\n".join(
        f"[{c.get('source_channel', '')}]\n{c['content']}" for c in rag_chunks
    ) if rag_chunks else ""

    resp = _get_client().messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=4000,
        system=CAREER_DESC_SYSTEM,
        messages=[{"role": "user", "content": CAREER_DESC_PROMPT.format(
            requirements=safe_req,
            gap_analysis=safe_gap,
            experience=safe_exp,
            profile_block=profile_block,
            rag_coaching=rag_text or "해당 코칭 사례 없음",
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
