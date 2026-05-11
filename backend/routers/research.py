from fastapi import APIRouter
from pydantic import BaseModel

from backend.modules.web_searcher import research_company, research_job_posting

router = APIRouter()


class ResearchRequest(BaseModel):
    company: str
    job_role: str


class ResearchResponse(BaseModel):
    company_analysis: dict[str, str]
    job_posting: str


@router.post("/company", response_model=ResearchResponse)
def get_company_research(req: ResearchRequest) -> ResearchResponse:
    company_analysis = research_company(req.company, req.job_role)
    job_posting = research_job_posting(req.company, req.job_role)
    return ResearchResponse(company_analysis=company_analysis, job_posting=job_posting)
