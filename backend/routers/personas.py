from fastapi import APIRouter

from backend.modules.persona_registry import list_personas

router = APIRouter()


@router.get("/personas")
def get_personas():
    return list_personas()
