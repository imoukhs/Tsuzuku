from fastapi import APIRouter

from app.cache.redis_client import get_or_set_list
from app.core.config import get_settings
from app.models.manga import MangaResult
from app.sources.registry import all_sources

router = APIRouter()


@router.get("/search", response_model=list[MangaResult])
async def search(q: str) -> list[MangaResult]:
    settings = get_settings()

    async def fetch() -> list[MangaResult]:
        results_per_source = await _search_all_sources(q)
        return [result for results in results_per_source for result in results]

    return await get_or_set_list(
        key=f"search:{q}",
        ttl_seconds=settings.search_cache_ttl_seconds,
        model=MangaResult,
        fetch=fetch,
    )


async def _search_all_sources(query: str) -> list[list[MangaResult]]:
    return [await source.search(query) for source in all_sources()]
