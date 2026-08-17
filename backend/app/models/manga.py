from pydantic import BaseModel


class SourceInfo(BaseModel):
    """Which source module a piece of data came from, for UI badges."""

    id: str
    name: str


class MangaResult(BaseModel):
    """A single search hit."""

    id: str  # source-prefixed, e.g. "aquamanga:one-piece"
    title: str
    cover_url: str | None = None
    source: SourceInfo


class MangaDetail(BaseModel):
    """Full detail page for a manga/series."""

    id: str
    title: str
    cover_url: str | None = None
    description: str | None = None
    authors: list[str] = []
    genres: list[str] = []
    status: str | None = None  # e.g. "ongoing", "completed"
    source: SourceInfo
