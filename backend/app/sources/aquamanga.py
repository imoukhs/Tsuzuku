import asyncio
import re
from urllib.parse import quote_plus, urlparse

from scrapling.fetchers import Fetcher

from app.models.chapter import Chapter
from app.models.manga import MangaDetail, MangaResult, SourceInfo
from app.sources.base import Source

_CHAPTER_NUMBER_RE = re.compile(r"(\d+(?:\.\d+)?)")


def _slug_from_manga_url(url: str) -> str:
    """`https://aquareader.org/manga/one-piece/` -> `one-piece`"""
    return urlparse(url).path.strip("/").removeprefix("manga/").strip("/")


def _slug_from_chapter_url(url: str) -> str:
    """`https://aquareader.org/manga/one-piece/chapter-1/` -> `one-piece/chapter-1`"""
    return urlparse(url).path.strip("/").removeprefix("manga/").strip("/")


class AquaMangaSource(Source):
    """Madara WordPress theme (aquareader.org). Simple, no Cloudflare — the
    proving ground for the source contract. See CLAUDE.md Roadmap phase 1.
    """

    id = "aquamanga"
    name = "Aqua Manga"
    base_url = "https://aquareader.org"

    def _source_info(self) -> SourceInfo:
        return SourceInfo(id=self.id, name=self.name)

    async def search(self, query: str) -> list[MangaResult]:
        url = f"{self.base_url}/?s={quote_plus(query)}&post_type=wp-manga"
        page = await asyncio.to_thread(Fetcher.get, url)

        results: list[MangaResult] = []
        for card in page.css(".c-tabs-item__content", adaptive=True):
            link = card.css(".post-title a", adaptive=True).first
            if link is None:
                continue
            href = link.attrib.get("href", "")
            if not href:
                continue
            title = (link.text or "").strip()
            cover = card.css("img", adaptive=True).first
            cover_url = None
            if cover is not None:
                cover_url = cover.attrib.get("data-src") or cover.attrib.get("src")

            results.append(
                MangaResult(
                    id=self.make_id(_slug_from_manga_url(href)),
                    title=title,
                    cover_url=cover_url,
                    source=self._source_info(),
                )
            )
        return results

    async def get_manga(self, manga_id: str) -> MangaDetail:
        slug = self.strip_id(manga_id)
        url = f"{self.base_url}/manga/{slug}/"
        page = await asyncio.to_thread(Fetcher.get, url)

        title_el = page.css(".post-title h1", adaptive=True).first
        title = (title_el.text or slug).strip() if title_el else slug

        cover_el = page.css(".summary_image img", adaptive=True).first
        cover_url = None
        if cover_el is not None:
            cover_url = cover_el.attrib.get("data-src") or cover_el.attrib.get("src")

        description_parts = page.css(
            ".description-summary .summary__content ::text", adaptive=True
        ).getall()
        description = " ".join(p.strip() for p in description_parts if p.strip()) or None

        authors = [
            a.strip()
            for a in page.css(".author-content a::text", adaptive=True).getall()
            if a.strip()
        ]
        genres = [
            g.strip()
            for g in page.css(".genres-content a::text", adaptive=True).getall()
            if g.strip()
        ]

        status_el = page.css(".post-status .summary-content", adaptive=True).first
        status = (status_el.text or "").strip().lower() or None if status_el else None

        return MangaDetail(
            id=manga_id,
            title=title,
            cover_url=cover_url,
            description=description,
            authors=authors,
            genres=genres,
            status=status,
            source=self._source_info(),
        )

    async def get_chapters(self, manga_id: str) -> list[Chapter]:
        slug = self.strip_id(manga_id)
        url = f"{self.base_url}/manga/{slug}/"
        page = await asyncio.to_thread(Fetcher.get, url)

        chapters: list[Chapter] = []
        for link in page.css(".wp-manga-chapter a", adaptive=True):
            href = link.attrib.get("href", "")
            if not href:
                continue
            text = (link.text or "").strip()
            match = _CHAPTER_NUMBER_RE.search(text)
            number = float(match.group(1)) if match else 0.0

            chapters.append(
                Chapter(
                    id=self.make_id(_slug_from_chapter_url(href)),
                    manga_id=manga_id,
                    number=number,
                    title=text or None,
                    source=self._source_info(),
                )
            )
        chapters.sort(key=lambda c: c.number)
        return chapters

    async def get_pages(self, chapter_id: str) -> list[str]:
        local_id = self.strip_id(chapter_id)
        url = f"{self.base_url}/manga/{local_id}/"
        page = await asyncio.to_thread(Fetcher.get, url)

        pages: list[str] = []
        for img in page.css(".reading-content img", adaptive=True):
            src = img.attrib.get("data-src") or img.attrib.get("src")
            if src:
                pages.append(src.strip())
        return pages
