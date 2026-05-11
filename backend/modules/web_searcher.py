from tavily import TavilyClient

from backend.config import settings

_client: TavilyClient | None = None


def _get_client() -> TavilyClient:
    global _client
    if _client is None:
        _client = TavilyClient(api_key=settings.TAVILY_API_KEY)
    return _client


def _search(query: str, max_results: int = 3) -> str:
    client = _get_client()
    response = client.search(query, max_results=max_results, search_depth="advanced")
    return "\n".join(r["content"] for r in response["results"] if r.get("content"))


def research_company(company: str, job_role: str) -> dict[str, str]:
    queries = {
        "최신_사업_전략": f"{company} 사업 전략 방향 동향 2024 2025",
        "직무_역할": f"{company} {job_role} 직무 주요 업무 핵심 역량",
        "인재상_문화": f"{company} 인재상 핵심가치 기업문화 채용",
    }
    return {key: _search(query) for key, query in queries.items()}


def research_job_posting(company: str, job_role: str) -> str:
    query = f"{company} {job_role} 채용 공고 자격요건 우대사항 주요 업무"
    return _search(query, max_results=5)
