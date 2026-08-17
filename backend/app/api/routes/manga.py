from fastapi import APIRouter

from app.models.manga import MangaDetail
from app.sources.registry import get_source_for_id

router = APIRouter()


@router.get("/manga/{manga_id:path}", response_model=MangaDetail)
async def get_manga(manga_id: str) -> MangaDetail:
    source = get_source_for_id(manga_id)
    return await source.get_manga(manga_id)
