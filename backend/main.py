from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import generate, history, personas, profile, research

app = FastAPI(title="자소서 코파일럿", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router, prefix="/api", tags=["profile"])
app.include_router(personas.router, prefix="/api", tags=["personas"])
app.include_router(research.router, prefix="/api/research", tags=["research"])
app.include_router(generate.router, prefix="/api/generate", tags=["generate"])
app.include_router(history.router, prefix="/api/history", tags=["history"])


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
