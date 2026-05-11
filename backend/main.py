from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import generate, research

app = FastAPI(title="자소서 코파일럿", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(research.router, prefix="/api/research", tags=["research"])
app.include_router(generate.router, prefix="/api/generate", tags=["generate"])


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
