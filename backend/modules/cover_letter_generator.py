import anthropic

from backend.config import settings
from backend.modules.methodology_rag import retrieve_methodology
from backend.modules.web_searcher import research_company, research_job_posting

SYSTEM_PROMPT = """당신은 대기업 자소서 전문 코치입니다. 취업사이다 방식의 핵심 원칙을 따릅니다.

## 핵심 원칙
- 글솜씨보다 소재·스토리·가독성이 중요합니다
- STAR 기법 (Situation → Task → Action → Result) 필수 적용
- 임원들은 Action(실행력)과 가치관을 가장 중요하게 봅니다
- 자소서 소재는 반드시 면접 질문으로 이어질 수 있는 것으로 선택합니다

## 절대 사용 금지 표현 (AI 탐지 위험)
- "귀사의 발전에 기여하고 싶습니다"
- "저는 ~하는 인재입니다"
- "항상 노력하는 자세로"
- "글로벌 기업으로 성장"
- 선언적으로 시작하는 문장 (예: "저는 도전을 두려워하지 않습니다")

## 항목별 작성 원칙
- 지원 동기: 회사·기술 설명 X → 본인이 왜 이 직무에 지원했는지 본인 관점으로
- 성장 과정: STAR 기법, Action을 ① ② ③으로 구체적으로 분리, 수치 결과 필수
- 사회 이슈: 논란 주제 금지, 직무 관련 무난한 이슈
- 존경 인물: 유명인 X → 실질적 영향을 준 사람 + 스토리

## 문체
- 합쇼체 (습니다/입니다) 사용
- 문장 길이를 의도적으로 다양하게 (AI 패턴 회피)
- 25세 한국 취업준비생이 직접 쓴 것처럼 자연스럽게"""


def _build_user_prompt(
    company: str,
    job_role: str,
    question: str,
    company_data: dict[str, str],
    job_posting: str,
    experiences: list[dict],
    methodology_chunks: list[str],
    extra_context: str,
    char_limit: int = 700,
) -> str:
    company_text = "\n\n".join(f"[{k}]\n{v}" for k, v in company_data.items())
    exp_text = "\n".join(
        f"- {e.get('title', '')}: {e.get('description', '')}" for e in experiences
    )
    methodology_text = (
        "\n\n---\n\n".join(methodology_chunks)
        if methodology_chunks
        else "기본 STAR 원칙 적용"
    )
    extra = f"\n\n## 추가 자료 (사용자 제공)\n{extra_context}" if extra_context else ""

    return f"""아래 정보를 바탕으로 자소서를 작성해 주세요.

## 지원 정보
- 회사: {company}
- 직무: {job_role}
- 자소서 항목: {question}

## 기업 분석 (웹 검색)
{company_text}{extra}

## 채용 공고
{job_posting or "제공되지 않음"}

## 내 경험
{exp_text}

## 전문가 방법론 (취업사이다 컨설팅 사례 기반)
{methodology_text}

---

자소서 글자 수 제한: **{char_limit}자** (공백 포함, 반드시 준수)

다음 순서로 답변해 주세요:

**[기업·직무 분석]**
이 회사가 지금 무엇을 원하는지, 이 직무에서 어떤 역량이 핵심인지 2~3문장으로.

**[소재 선택 이유]**
내 경험 중 왜 이 소재를 골랐는지 (면접 연결 가능성, STAR 구성 가능성 포함).

**[자소서 본문]** (목표: {char_limit}자)
STAR 구조로, 사람이 직접 쓴 것처럼 자연스럽게. 마지막에 실제 글자 수를 표기."""


def generate(
    company: str,
    job_role: str,
    question: str,
    experiences: list[dict],
    extra_context: str = "",
    job_posting_override: str = "",
    char_limit: int = 700,
) -> str:
    company_data = research_company(company, job_role)
    job_posting = job_posting_override or research_job_posting(company, job_role)

    methodology_chunks = retrieve_methodology(
        f"{question} 자소서 {job_role} 작성 방법 소재 선택", top_k=6
    )

    user_prompt = _build_user_prompt(
        company=company,
        job_role=job_role,
        question=question,
        company_data=company_data,
        job_posting=job_posting,
        experiences=experiences,
        methodology_chunks=methodology_chunks,
        extra_context=extra_context,
        char_limit=char_limit,
    )

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return response.content[0].text
