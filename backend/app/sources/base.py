from abc import ABC, abstractmethod

from app.models.chapter import Chapter
from app.models.manga import MangaDetail, MangaResult


class Source(ABC):
    """One implementation per site. All IDs a source hands back (manga,
    chapter) must be prefixed with `id`, e.g. `aquamanga:one-piece` — see
    registry.py for how that prefix is used to route requests back here.
    """

    id: str
    name: str
    base_url: str

    def make_id(self, local_id: str) -> str:
        return f"{self.id}:{local_id}"

    def strip_id(self, prefixed_id: str) -> str:
        prefix = f"{self.id}:"
        if not prefixed_id.startswith(prefix):
            raise ValueError(f"{prefixed_id!r} does not belong to source {self.id!r}")
        return prefixed_id[len(prefix) :]

    @abstractmethod
    async def search(self, query: str) -> list[MangaResult]: ...

    @abstractmethod
    async def get_manga(self, manga_id: str) -> MangaDetail: ...

    @abstractmethod
    async def get_chapters(self, manga_id: str) -> list[Chapter]: ...

    @abstractmethod
    async def get_pages(self, chapter_id: str) -> list[str]: ...
