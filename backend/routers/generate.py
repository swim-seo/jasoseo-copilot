from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.modules.cover_letter_generator import generate

router = APIRouter()

COMMON_QUESTIONS = [
    "지원 동기 및 포부",
    "성장 과정",
    "사회 이슈 및 견해",
    "직무 역량",
    "팀 경험 및 갈등 해결",
]


class Experience(BaseModel):
    title: str = Field(description="경험 제목 (예: 삼성 인턴, 연구실 프로젝트)")
    description: str = Field(description="경험 상세 내용 (STAR 형식 권장)")


class GenerateRequest(BaseModel):
    company: str
    job_role: str
    question: str = Field(description="자소서 항목 (예: 지원 동기 및 포부)")
    experiences: list[Experience]
    char_limit: int = Field(default=700, description="자소서 글자 수 제한")
    job_posting: str = Field(default="", description="채용 공고 텍스트 (선택, 직접 붙여넣기)")
    extra_context: str = Field(default="", description="추가 기업 자료 (뉴스, IR 등 직접 붙여넣기)")


class GenerateResponse(BaseModel):
    result: str
    company: str
    job_role: str
    question: str


@router.get("/questions")
def get_common_questions() -> list[str]:
    return COMMON_QUESTIONS


@router.post("/cover-letter", response_model=GenerateResponse)
def create_cover_letter(req: GenerateRequest) -> GenerateResponse:
    result = generate(
        company=req.company,
        job_role=req.job_role,
        question=req.question,
        experiences=[e.model_dump() for e in req.experiences],
        extra_context=req.extra_context,
        job_posting_override=req.job_posting,
        char_limit=req.char_limit,
    )
    return GenerateResponse(
        result=result,
        company=req.company,
        job_role=req.job_role,
        question=req.question,
    )
