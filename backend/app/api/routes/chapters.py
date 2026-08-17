from fastapi import APIRouter

from app.cache.redis_client import get_or_set, get_or_set_list
from app.core.config import get_settings
from app.models.chapter import Chapter, ChapterPages
from app.sources.registry import get_source_for_id

router = APIRouter()


@router.get("/manga/{manga_id:path}/chapters", response_model=list[Chapter])
async def get_chapters(manga_id: str) -> list[Chapter]:
    settings = get_settings()
    source = get_source_for_id(manga_id)

    return await get_or_set_list(
        key=f"chapters:{manga_id}",
        ttl_seconds=settings.chapters_cache_ttl_seconds,
        model=Chapter,
        fetch=lambda: source.get_chapters(manga_id),
    )


@router.get("/chapter/{chapter_id:path}/pages", response_model=ChapterPages)
async def get_pages(chapter_id: str) -> ChapterPages:
    settings = get_settings()
    source = get_source_for_id(chapter_id)

    async def fetch() -> ChapterPages:
        pages = await source.get_pages(chapter_id)
        return ChapterPages(chapter_id=chapter_id, pages=pages)

    return await get_or_set(
        key=f"pages:{chapter_id}",
        ttl_seconds=settings.pages_cache_ttl_seconds,
        model=ChapterPages,
        fetch=fetch,
    )
