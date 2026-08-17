from datetime import datetime

from pydantic import BaseModel

from app.models.manga import SourceInfo


class Chapter(BaseModel):
    id: str  # source-prefixed, e.g. "aquamanga:one-piece-ch-1"
    manga_id: str
    number: float
    title: str | None = None
    published_at: datetime | None = None
    source: SourceInfo


class ChapterPages(BaseModel):
    chapter_id: str
    pages: list[str]  # ordered image URLs
