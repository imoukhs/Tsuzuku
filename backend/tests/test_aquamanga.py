"""Offline tests against realistic Madara-theme HTML fixtures — no live
network. `Fetcher.get` is monkeypatched per-test to return a canned Adaptor,
so these validate the selector/parsing logic in aquamanga.py in isolation.
"""

from unittest.mock import patch

import pytest
from scrapling.parser import Adaptor

from app.sources.aquamanga import AquaMangaSource

SEARCH_HTML = """
<div class="c-tabs-item">
  <div class="c-tabs-item__content">
    <div class="post-title">
      <h3><a href="https://aquareader.org/manga/one-piece/">One Piece</a></h3>
    </div>
    <img src="placeholder.jpg" data-src="https://aquareader.org/covers/one-piece.jpg" />
  </div>
  <div class="c-tabs-item__content">
    <div class="post-title">
      <h3><a href="https://aquareader.org/manga/naruto/">Naruto</a></h3>
    </div>
    <img src="https://aquareader.org/covers/naruto.jpg" />
  </div>
</div>
"""

MANGA_HTML = """
<div class="post-title"><h1>One Piece</h1></div>
<div class="summary_image"><img data-src="https://aquareader.org/covers/one-piece.jpg" /></div>
<div class="description-summary">
  <div class="summary__content"><p>A pirate adventure across the Grand Line.</p></div>
</div>
<div class="author-content"><a>Eiichiro Oda</a></div>
<div class="genres-content"><a>Action</a><a>Adventure</a></div>
<div class="post-status"><div class="summary-content">OnGoing</div></div>
<ul class="main version-chap">
  <li class="wp-manga-chapter"><a href="https://aquareader.org/manga/one-piece/chapter-2/">Chapter 2</a></li>
  <li class="wp-manga-chapter"><a href="https://aquareader.org/manga/one-piece/chapter-1/">Chapter 1</a></li>
</ul>
"""

READER_HTML = """
<div class="reading-content">
  <img data-src="https://aquareader.org/pages/one-piece/1/1.jpg" src="lazy-placeholder.jpg" />
  <img data-src="https://aquareader.org/pages/one-piece/1/2.jpg" src="lazy-placeholder.jpg" />
  <img src="https://aquareader.org/pages/one-piece/1/3.jpg" />
</div>
"""


def _adaptor(html: str) -> Adaptor:
    return Adaptor(html, url="https://aquareader.org")


@pytest.mark.asyncio
async def test_search_parses_titles_ids_and_covers():
    source = AquaMangaSource()
    with patch("app.sources.aquamanga.Fetcher.get", return_value=_adaptor(SEARCH_HTML)):
        results = await source.search("one")

    assert [r.title for r in results] == ["One Piece", "Naruto"]
    assert results[0].id == "aquamanga:one-piece"
    assert results[0].cover_url == "https://aquareader.org/covers/one-piece.jpg"
    assert results[0].source.id == "aquamanga"
    # falls back to src when there's no data-src
    assert results[1].cover_url == "https://aquareader.org/covers/naruto.jpg"


@pytest.mark.asyncio
async def test_get_manga_parses_detail_fields():
    source = AquaMangaSource()
    with patch("app.sources.aquamanga.Fetcher.get", return_value=_adaptor(MANGA_HTML)):
        detail = await source.get_manga("aquamanga:one-piece")

    assert detail.title == "One Piece"
    assert detail.cover_url == "https://aquareader.org/covers/one-piece.jpg"
    assert detail.description == "A pirate adventure across the Grand Line."
    assert detail.authors == ["Eiichiro Oda"]
    assert detail.genres == ["Action", "Adventure"]
    assert detail.status == "ongoing"


@pytest.mark.asyncio
async def test_get_chapters_are_sorted_ascending_with_prefixed_ids():
    source = AquaMangaSource()
    with patch("app.sources.aquamanga.Fetcher.get", return_value=_adaptor(MANGA_HTML)):
        chapters = await source.get_chapters("aquamanga:one-piece")

    assert [c.number for c in chapters] == [1.0, 2.0]
    assert chapters[0].id == "aquamanga:one-piece/chapter-1"
    assert chapters[0].manga_id == "aquamanga:one-piece"


@pytest.mark.asyncio
async def test_get_pages_prefers_data_src_over_lazy_placeholder():
    source = AquaMangaSource()
    with patch("app.sources.aquamanga.Fetcher.get", return_value=_adaptor(READER_HTML)):
        pages = await source.get_pages("aquamanga:one-piece/chapter-1")

    assert pages == [
        "https://aquareader.org/pages/one-piece/1/1.jpg",
        "https://aquareader.org/pages/one-piece/1/2.jpg",
        "https://aquareader.org/pages/one-piece/1/3.jpg",
    ]
