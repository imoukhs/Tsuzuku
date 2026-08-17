from app.sources.aquamanga import AquaMangaSource
from app.sources.base import Source

_SOURCES: dict[str, Source] = {
    source.id: source
    for source in (AquaMangaSource(),)
}


def all_sources() -> list[Source]:
    return list(_SOURCES.values())


def get_source(source_id: str) -> Source:
    try:
        return _SOURCES[source_id]
    except KeyError:
        raise ValueError(f"Unknown source: {source_id!r}") from None


def get_source_for_id(prefixed_id: str) -> Source:
    """Split a prefixed manga/chapter id on its first `:` and look up the
    owning source, per the ID convention in CLAUDE.md.
    """
    source_id, _, rest = prefixed_id.partition(":")
    if not rest:
        raise ValueError(f"Not a source-prefixed id: {prefixed_id!r}")
    return get_source(source_id)
