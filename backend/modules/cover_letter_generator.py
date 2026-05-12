import anthropic

from backend.config import settings
from backend.modules.methodology_rag import retrieve_methodology
from backend.modules.persona_registry import get_persona
from backend.modules.user_profile import (
    get_experiences,
    get_profile,
    list_experiences,
    render_profile_block,
)
from backend.modules.web_searcher import research_company, research_job_posting

BASE_SYSTEM = """당신은 한국 대기업 자소서 전문 코치입니다.

## 공통 원칙
- 글솜씨보다 소재·스토리·가독성. STAR 기법 필수.
- 임원이 가장 중요하게 보는 것은 Action(실행력)과 가치관.
- 소재는 반드시 면접 질문으로 이어질 수 있는 것.

## AI 탐지 절대 회피 표현
- "귀사의 발전에 기여하고 싶습니다"
- "저는 ~하는 인재입니다"
- "항상 노력하는 자세로"
- "글로벌 기업으로 성장"
- 선언적으로 시작하는 문장

## 사용자 캐릭터 일관성
- 사용자의 [핵심 캐릭터]와 [목표 포지션]을 항상 의식하고, 자소서·피드백·면접 답변이 같은 사람의 이야기처럼 보이게 합니다.
- 강점은 성격 소개로 쓰지 말고, 실제 문제 해결의 근거로만 사용합니다.

## 방법론 일관성
- 검색된 컨설팅 사례가 여러 프레임워크를 포함할 수 있습니다. 하나의 primary framework만 사용하고 명칭을 섞지 마십시오.

## 문체
- 합쇼체. 문장 길이를 다양하게. 사람이 직접 쓴 것처럼 자연스럽게."""


QUESTION_TYPE_KEYWORDS = {
    "motivation": ["지원동기", "지원 동기", "지원이유", "관심", "포부"],
    "growth": ["성장과정", "성장 과정", "성장배경", "어린 시절"],
    "competency": ["직무역량", "직무 역량", "강점", "역량", "전문성"],
    "conflict": ["갈등", "팀워크", "협업", "팀 경험"],
    "social_issue": ["사회이슈", "사회 이슈", "시사", "견해"],
    "weakness": ["단점", "약점", "실패", "어려움"],
}


def _classify_question_type(question: str) -> str | None:
    q = question.replace(" ", "")
    for qtype, keywords in QUESTION_TYPE_KEYWORDS.items():
        if any(k.replace(" ", "") in q for k in keywords):
            return qtype
    return None


def _build_system_prompt(persona_key: str) -> str:
    persona = get_persona(persona_key)
    return f"{BASE_SYSTEM}\n\n## 선택된 페르소나: {persona['label']}\n{persona['system']}"


def _build_user_prompt(
    company: str,
    job_role: str,
    question: str,
    company_data: dict[str, str],
    job_posting: str,
    profile_block: str,
    methodology_chunks: list[dict],
    extra_context: str,
    char_limit: int,
) -> str:
    company_text = "\n\n".join(f"[{k}]\n{v}" for k, v in company_data.items())
    if methodology_chunks:
        methodology_text = "\n\n---\n\n".join(
            f"[{c.get('source_channel', 'unknown')} / {c.get('methodology', '')}]\n{c['content']}"
            for c in methodology_chunks
        )
    else:
        methodology_text = "기본 STAR 원칙 적용"
    extra = f"\n\n## 추가 자료 (사용자 제공)\n{extra_context}" if extra_context else ""

    return f"""## 지원 정보
- 회사: {company}
- 직무: {job_role}
- 자소서 항목: {question}

## 사용자 프로필 (고정)
{profile_block}

## 기업 분석
{company_text}{extra}

## 채용 공고
{job_posting or "제공되지 않음"}

## 전문가 컨설팅 사례 (선택된 페르소나 우선)
{methodology_text}

---

자소서 글자 수: **{char_limit}자** (공백 포함, 반드시 준수)

다음 순서로 답변하세요:

**[기업·직무 분석]**
이 회사가 지금 무엇을 원하는지, 이 직무 핵심 역량을 2~3문장으로.

**[소재 선택 이유]**
사용자 프로필의 어떤 경험을 왜 골랐는지 (면접 연결 가능성 포함).

**[자소서 본문]** (목표: {char_limit}자)
STAR 구조로, 사람이 직접 쓴 것처럼. 마지막에 실제 글자 수를 표기."""


def generate(
    company: str,
    job_role: str,
    question: str,
    extra_context: str = "",
    job_posting_override: str = "",
    char_limit: int = 700,
    methodology_preference: str = "auto",
    experience_ids: list[int] | None = None,
) -> str:
    profile = get_profile()
    experiences = (
        get_experiences(experience_ids) if experience_ids else list_experiences()
    )
    profile_block = render_profile_block(profile, experiences)

    company_data = research_company(company, job_role)
    job_posting = job_posting_override or research_job_posting(company, job_role)

    question_type = _classify_question_type(question)
    methodology_filter = None if methodology_preference == "auto" else methodology_preference

    methodology_chunks = retrieve_methodology(
        f"{question} 자소서 {job_role} 작성 방법 소재 선택",
        top_k=6,
        methodology=methodology_filter,
        question_type=question_type,
    )

    user_prompt = _build_user_prompt(
        company=company,
        job_role=job_role,
        question=question,
        company_data=company_data,
        job_posting=job_posting,
        profile_block=profile_block,
        methodology_chunks=methodology_chunks,
        extra_context=extra_context,
        char_limit=char_limit,
    )

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=2000,
        system=_build_system_prompt(methodology_preference),
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text


def feedback(
    draft: str,
    company: str = "",
    job_role: str = "",
    question: str = "",
    methodology_preference: str = "auto",
) -> str:
    """사용자가 쓴 초안 → 선택한 페르소나의 피드백."""
    profile = get_profile()
    experiences = list_experiences()
    profile_block = render_profile_block(profile, experiences)

    methodology_chunks = retrieve_methodology(
        f"{question or draft[:80]} 피드백 첨삭 자소서 작성 원칙",
        top_k=4,
        methodology=None if methodology_preference == "auto" else methodology_preference,
    )
    methodology_text = "\n\n---\n\n".join(
        f"[{c.get('source_channel', '')}]\n{c['content']}" for c in methodology_chunks
    )

    user_prompt = f"""## 자소서 초안
{draft}

## 회사·항목 정보
- 회사: {company or '미지정'}
- 직무: {job_role or '미지정'}
- 항목: {question or '미지정'}

## 사용자 프로필
{profile_block}

## 컨설팅 사례
{methodology_text}

---

다음 순서로 피드백하세요:

**[종합 평가]** — 채용 관점 한 줄 요약 + 점수 (10점 만점)
**[문제 진단]** — 약한 부분을 구체적 문장 인용으로 지적 (3~5개)
**[수정 제안]** — 각 문제별로 대체 문장 2~3개 제시
**[다시 쓰기]** — 전체를 페르소나 스타일로 다시 작성 (같은 글자 수 유지)
"""

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=2500,
        system=_build_system_prompt(methodology_preference),
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text


def interview_questions(
    cover_letter_text: str,
    company: str = "",
    job_role: str = "",
    methodology_preference: str = "auto",
) -> str:
    """자소서 내용 기반 예상 면접 질문 + 답변 가이드."""
    profile = get_profile()
    experiences = list_experiences()
    profile_block = render_profile_block(profile, experiences)

    user_prompt = f"""## 자소서 본문
{cover_letter_text}

## 회사·직무
- 회사: {company or '미지정'}
- 직무: {job_role or '미지정'}

## 사용자 프로필
{profile_block}

---

이 자소서를 면접관이 봤을 때 던질 만한 예상 질문과 답변 전략을 만드세요.

**[꼬리 질문 예상]** 5개 (자소서 본문에서 직접 파생되는 압박 질문)
**[직무 역량 질문]** 3개
**[가치관·인성 질문]** 2개

각 질문마다 다음을 포함:
- 면접관 의도
- 답변 핵심 메시지 (2~3문장)
- 사용자 프로필에서 어떤 경험을 끌어쓸지
"""

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=2500,
        system=_build_system_prompt(methodology_preference),
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text
