from fastapi import APIRouter
from pydantic import BaseModel

from backend.modules.gap_analyzer import (
    analyze_gap,
    extract_jd_requirements,
    generate_career_description,
    run_gap_pipeline,
)
from backend.modules.user_profile import get_profile, list_experiences, render_profile_block

router = APIRouter()


class GapRequest(BaseModel):
    jd: str
    user_experience: str


class ExtractJDRequest(BaseModel):
    jd: str


class GapAnalyzeRequest(BaseModel):
    jd_requirements: dict
    user_experience: str


class GenerateCareerRequest(BaseModel):
    jd_requirements: dict
    gap_analysis: dict
    user_experience: str


@router.post("/gap")
def gap_full_pipeline(req: GapRequest):
    """JD + 경험 raw → 요건추출 → 갭분석 → 경력기술서 (3단계 통합)."""
    result = run_gap_pipeline(jd=req.jd, user_experience=req.user_experience)
    return result


@router.post("/gap/extract-jd")
def gap_extract_jd(req: ExtractJDRequest):
    """Step 1: JD에서 요건만 추출."""
    return extract_jd_requirements(req.jd)


@router.post("/gap/analyze")
def gap_analyze(req: GapAnalyzeRequest):
    """Step 2: 요건 vs 경험 갭 분석."""
    profile = get_profile()
    experiences = list_experiences()
    profile_block = render_profile_block(profile, experiences)
    return analyze_gap(req.jd_requirements, req.user_experience, profile_block)


@router.post("/gap/career-description")
def gap_career_description(req: GenerateCareerRequest):
    """Step 3: 갭 분석 결과 → 경력기술서 생성."""
    profile = get_profile()
    experiences = list_experiences()
    profile_block = render_profile_block(profile, experiences)
    return generate_career_description(
        req.jd_requirements,
        req.gap_analysis,
        req.user_experience,
        profile_block,
    )
