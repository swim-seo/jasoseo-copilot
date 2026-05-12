from fastapi import APIRouter, File, Form, UploadFile
from pydantic import BaseModel

from backend.modules import profile_importer, user_profile

router = APIRouter()


class ProfileFields(BaseModel):
    name: str | None = None
    target_role: str | None = None
    character_summary: str | None = None
    career_summary: str | None = None
    education: str | None = None
    strengths: str | None = None
    company_preferences: str | None = None
    writing_rules: str | None = None


class ExperienceFields(BaseModel):
    id: int | None = None
    title: str
    org: str | None = None
    period: str | None = None
    situation: str | None = None
    task: str | None = None
    action: str | None = None
    result: str | None = None
    tech_stack: str | None = None
    tags: list[str] | None = None


class CommitRequest(BaseModel):
    profile: ProfileFields
    experiences: list[ExperienceFields]
    replace_experiences: bool = False


@router.get("/profile")
def get_profile():
    return user_profile.get_profile()


@router.put("/profile")
def update_profile(fields: ProfileFields):
    return user_profile.upsert_profile(fields.model_dump(exclude_none=True))


@router.get("/experiences")
def list_experiences():
    return user_profile.list_experiences()


@router.post("/experiences")
def create_or_update_experience(exp: ExperienceFields):
    return user_profile.upsert_experience(exp.model_dump(exclude_none=True))


@router.delete("/experiences/{exp_id}")
def delete_experience(exp_id: int):
    user_profile.delete_experience(exp_id)
    return {"deleted": exp_id}


@router.post("/profile/import")
async def import_profile(
    text: str = Form(default=""),
    file: UploadFile | None = File(default=None),
):
    """PDF 또는 자유텍스트 → Claude로 STAR 구조화된 미리보기.
    저장하지 않고 사용자 검토용 결과만 반환."""
    raw_text = text or ""
    if file:
        pdf_bytes = await file.read()
        try:
            raw_text = (raw_text + "\n\n" + profile_importer.extract_pdf_text(pdf_bytes)).strip()
        except Exception as e:
            return {"error": f"PDF 파싱 실패: {e}", "raw_text": ""}
    analysis = profile_importer.analyze_text(raw_text)
    return {"raw_text": raw_text[:2000], **analysis}


@router.post("/profile/import/commit")
def commit_import(req: CommitRequest):
    """사용자가 검토 완료한 결과를 실제 저장."""
    saved_profile = user_profile.upsert_profile(req.profile.model_dump(exclude_none=True))
    if req.replace_experiences:
        for existing in user_profile.list_experiences():
            user_profile.delete_experience(existing["id"])
    saved_exps = [
        user_profile.upsert_experience(e.model_dump(exclude_none=True))
        for e in req.experiences
    ]
    return {"profile": saved_profile, "experiences": saved_exps}
