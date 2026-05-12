from fastapi import APIRouter, HTTPException

from backend.modules import cover_letter_store

router = APIRouter()


@router.get("/letters")
def list_letters(company: str | None = None):
    return cover_letter_store.list_cover_letters(company)


@router.get("/letters/{letter_id}")
def get_letter(letter_id: int):
    letter = cover_letter_store.get_cover_letter(letter_id)
    if not letter:
        raise HTTPException(status_code=404, detail="Not found")
    return letter


@router.get("/letters/{letter_id}/thread")
def get_thread(letter_id: int):
    thread = cover_letter_store.get_thread(letter_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Not found")
    return thread
