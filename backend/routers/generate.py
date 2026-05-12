from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.modules import cover_letter_store
from backend.modules.cover_letter_generator import (
    feedback,
    generate,
    interview_questions,
)

router = APIRouter()

COMMON_QUESTIONS = [
    "지원 동기 및 포부",
    "성장 과정",
    "사회 이슈 및 견해",
    "직무 역량",
    "팀 경험 및 갈등 해결",
]


class GenerateRequest(BaseModel):
    company: str
    job_role: str
    question: str
    char_limit: int = 700
    job_posting: str = ""
    extra_context: str = ""
    methodology_preference: str = "auto"
    experience_ids: list[int] = Field(default_factory=list)
    save: bool = True


class FeedbackRequest(BaseModel):
    draft: str
    company: str = ""
    job_role: str = ""
    question: str = ""
    methodology_preference: str = "auto"
    parent_letter_id: int | None = None
    save: bool = True


class InterviewRequest(BaseModel):
    cover_letter_text: str
    company: str = ""
    job_role: str = ""
    methodology_preference: str = "auto"


@router.get("/questions")
def get_common_questions():
    return COMMON_QUESTIONS


@router.post("/cover-letter")
def create_cover_letter(req: GenerateRequest):
    result = generate(
        company=req.company,
        job_role=req.job_role,
        question=req.question,
        extra_context=req.extra_context,
        job_posting_override=req.job_posting,
        char_limit=req.char_limit,
        methodology_preference=req.methodology_preference,
        experience_ids=req.experience_ids or None,
    )
    saved = None
    if req.save:
        saved = cover_letter_store.save_cover_letter(
            {
                "company": req.company,
                "job_role": req.job_role,
                "question": req.question,
                "methodology_preference": req.methodology_preference,
                "char_limit": req.char_limit,
                "job_posting": req.job_posting,
                "used_experience_ids": req.experience_ids or None,
                "extra_context": req.extra_context,
                "result": result,
                "version": 1,
            }
        )
    return {"result": result, "saved": saved}


@router.post("/feedback")
def create_feedback(req: FeedbackRequest):
    result = feedback(
        draft=req.draft,
        company=req.company,
        job_role=req.job_role,
        question=req.question,
        methodology_preference=req.methodology_preference,
    )
    saved = None
    if req.save:
        version = 1
        if req.parent_letter_id:
            parent = cover_letter_store.get_cover_letter(req.parent_letter_id)
            if parent:
                version = (parent.get("version") or 1) + 1
        saved = cover_letter_store.save_cover_letter(
            {
                "company": req.company,
                "job_role": req.job_role,
                "question": req.question,
                "methodology_preference": req.methodology_preference,
                "parent_id": req.parent_letter_id,
                "feedback_request": req.draft,
                "result": result,
                "version": version,
            }
        )
    return {"result": result, "saved": saved}


@router.post("/interview")
def create_interview(req: InterviewRequest):
    result = interview_questions(
        cover_letter_text=req.cover_letter_text,
        company=req.company,
        job_role=req.job_role,
        methodology_preference=req.methodology_preference,
    )
    return {"result": result}
