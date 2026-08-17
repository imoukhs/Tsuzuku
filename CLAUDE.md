# Tsuzuku (続く) — Personal Manga Reader

> "To be continued" — the words that close every anime episode and manga
> chapter before the next one. App icon: 続 (the kanji itself).
>
> Self-hosted manga reader inspired by Tachiyomi/Tachimanga. Scraping is
> centralized server-side via Scrapling instead of per-device extensions.
> **Personal use only** — not for public distribution or app store submission.

## Vision

A Tachiyomi-style reader (search → library → chapters → reader) where the
"extension" layer is replaced by a FastAPI backend running Scrapling-based
source modules. One clean REST API, any frontend can consume it.

## Architecture

```
Expo app (React Native)  →  FastAPI backend (source interface)  →  Redis cache
                                      ↓
                            Scrapling source modules (one per site)
```

- **Backend**: FastAPI, exposes `/search`, `/manga/{id}`, `/manga/{id}/chapters`, `/chapter/{id}/pages`. No auth for v1 — single-user, not publicly shared (see Decisions Log)
- **Scraping**: Scrapling — `Fetcher` for simple sites, `StealthyFetcher` for Cloudflare-protected ones
- **Cache**: Redis (Upstash) in front of every scrape — never let a client request trigger a live scrape directly
- **Storage**: Supabase — library entries, reading progress, categories
- **Frontend**: Expo (React Native) — search, library grid, reader view. Same EAS build pipeline already proven on Stay Go / Staycore operator app
  - `FlashList` for chapter/page lists
  - `react-native-reanimated` + `react-native-gesture-handler` for page-turn / continuous-scroll reading modes
  - `expo-image` for cached remote page loading
  - `expo-file-system` for offline chapter downloads (in scope for v1)
- **Deployment**: Railway (backend), EAS (app builds) — same pattern as existing Staycore Android work

## Source Interface Contract

Every site is one module implementing this ABC:

```python
class Source(ABC):
    id: str          # e.g. "mangadex", "toonily" — used as ID prefix
    name: str        # display name shown in UI
    base_url: str

    @abstractmethod
    async def search(self, query: str) -> list[MangaResult]: ...

    @abstractmethod
    async def get_manga(self, manga_id: str) -> MangaDetail: ...

    @abstractmethod
    async def get_chapters(self, manga_id: str) -> list[Chapter]: ...

    @abstractmethod
    async def get_pages(self, chapter_id: str) -> list[str]: ...
```

New sources = new file under `sources/`, nothing else changes.

**ID convention**: every manga/chapter ID returned by a source is prefixed
with that source's `id`, e.g. `mangadex:one-piece`. This is how the same
title from two sites never collides, and how the backend knows which source
module to route a request to — split on the first `:` and look up the
source in the registry. Every API response also carries a `source` field
(id + display name) so the frontend can show a badge and store which site a
library entry came from.

## Folder Structure

```
tsuzuku/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── search.py
│   │   │       ├── manga.py
│   │   │       └── chapters.py
│   │   ├── sources/
│   │   │   ├── base.py          # Source ABC
│   │   │   ├── registry.py      # id -> Source instance lookup
│   │   │   ├── mangadex.py
│   │   │   └── toonily.py
│   │   ├── models/
│   │   │   ├── manga.py
│   │   │   └── chapter.py
│   │   ├── cache/
│   │   │   └── redis_client.py
│   │   └── core/
│   │       └── config.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── app/                           # Expo app (SDK 57 default template:
│   │                              # expo-router root is src/app/, not app/app/)
│   ├── src/
│   │   ├── app/                   # expo-router screens
│   │   │   ├── (tabs)/
│   │   │   │   ├── _layout.tsx    # NativeTabs
│   │   │   │   ├── library.tsx
│   │   │   │   ├── search.tsx
│   │   │   │   └── settings.tsx
│   │   │   ├── _layout.tsx        # root Stack + font loading
│   │   │   ├── manga/[id].tsx
│   │   │   └── reader/[chapterId].tsx
│   │   ├── components/
│   │   ├── constants/theme.ts     # palette + type tokens
│   │   ├── hooks/
│   │   └── lib/
│   │       ├── api.ts             # backend client
│   │       ├── downloads.ts       # expo-file-system chapter downloads + local index
│   │       └── supabase.ts
│   ├── app.json
│   └── package.json
│
├── CLAUDE.md
└── README.md
```

- `sources/` on the backend and screens under `app/src/app/` are the two
  places that grow as the project grows — everything else should stay stable
- `registry.py` is the single place that maps a source `id` prefix to its
  module; the ID-splitting logic described above lives there

## Design System

**Palette**

| Name | Hex | Use |
|---|---|---|
| Sumi 墨 (ink black) | `#0B0B0D` | Reading surface + app background — true dark so manga pages sit without color cast |
| Washi 和紙 (paper white) | `#F3EEE2` | Primary text, warmed paper tone instead of clinical white |
| Hanko 判子 (seal red) | `#B23A2E` | The one loud accent — CTAs, unread badges, source tags |
| Kohaku 琥珀 (amber sepia) | `#C68A3D` | Reserved almost exclusively for the chapter-complete transition |
| Nezumi 鼠 (gray) | `#7A766D` | Metadata — chapter counts, timestamps |

**Type**
- Display: **Shippori Mincho** — Japanese Mincho serif with real brush character. Manga titles, wordmark. Used sparingly.
- Body/UI: **Manrope** — quiet, legible. Library grids, chapter lists, all app chrome.
- Metadata/mono: **JetBrains Mono** — page counts, source tags, timestamps.

**Layout**
```
Library: dense cover grid, Sumi bg, covers are the only color
Reader:  true black, zero chrome, tap zones only
Search:  Washi-tinted cards floating on Sumi — paper on ink
```

**Signature moment**: finishing a chapter triggers a freeze-frame transition
— quick desaturate to Kohaku sepia, a beat of pause, then 続 stamps on in
Hanko red like a hanko seal hitting paper, before sliding into the next
chapter. This is the only place Kohaku appears — keeps it special instead of
worn out. A tasteful, functional take on the JoJo "to be continued" freeze
frame rather than a literal meme reference.

## Scraping Rules

- Always pass `adaptive=True` on selectors — sources should self-heal when a
  site's HTML changes instead of hard-failing like a stale Tachiyomi extension
- `StealthyFetcher` only where actually needed (Cloudflare Turnstile) — plain
  `Fetcher` is faster and cheaper everywhere else
- Cache aggressively: chapter lists get a short TTL (change often), page
  image URLs get a longer TTL
- No redistribution of scraped content — this stays a single-user tool

## Roadmap

Each phase adds exactly one axis of difficulty. If something breaks, it's
obvious which piece is responsible — don't skip ahead to Mangakakalot early
"to just get it working"; that means debugging theme reuse, JS rendering,
and stealth all at once instead of one at a time.

| Phase | Target | Fetcher | Proves |
|---|---|---|---|
| 1 | Aqua Manga | `Fetcher` | Full contract end-to-end: search → chapters → pages → cache → Expo UI |
| 2 | Arena Scans, Vortex Scans | `Fetcher` | Madara-theme scraping logic generalizes — new sources are `base_url` swaps, not new code |
| 3 | A structurally different SFW site (e.g. Comic Fury) | `Fetcher` | Adaptive selectors hold up on genuinely different markup, not just a theme variant |
| 4 | A JS-rendered site | `DynamicFetcher` | Full browser automation path works when a site needs real rendering, separate from anti-bot bypass |
| 5 | A lightly Cloudflare-protected site | `StealthyFetcher` | Stealth fetch + Turnstile bypass proven in isolation, on an easier target than the finale |
| 6 | **Mangakakalot** | TBD — verify on arrival | Capstone. Confirm its actual current protection level empirically before assuming which fetcher it needs — Cloudflare configs are set per site-owner and change over time. Clearing this validates the architecture for basically any source added afterward |

## Status

- [x] FastAPI skeleton + `Source` ABC
- [x] First scrape-based source module (Aqua Manga) — parsing verified against
      realistic Madara HTML fixtures; not yet verified live (this sandbox's
      network proxy blocks aquareader.org, so test on a real dev machine
      before trusting it end-to-end)
- [x] Redis cache layer
- [x] Expo search + reader UI — navigation shell, screens, and design system
      wired to the backend; library screen is still an empty state pending
      the Supabase schema below
- [x] Offline download manager (`expo-file-system`) — `lib/downloads.ts`
      implements download/list/delete against the File/Directory/Paths API;
      wired to a per-chapter download button in the manga detail chapter
      list, and the reader now prefers downloaded pages over the network
      when a chapter is available offline. Native-only — a `Platform.OS`
      guard hides the button and no-ops the download calls on web, since
      expo-file-system's Directory/File aren't implemented there
- [x] UI/UX polish pass — fixed two WCAG AA contrast failures (`nezumi`
      textSecondary was 4.3:1 on `sumi`, `hanko` used as raw error-message
      text was 3.3:1; see updated comments in `constants/theme.ts`), added
      a shared `ErrorNotice` component (icon + retry) to every screen that
      previously dead-ended on fetch failure, gave the manga detail header
      a scrim so its transparent back button stays legible over any cover
      art, converted the chapter list to `FlashList` for long chapter runs,
      and built the chapter-complete freeze-frame transition (desaturate to
      kohaku, `続` stamps in hanko, hands off to the next chapter) —
      `components/chapter-complete-overlay.tsx`, triggered from the reader
      on reaching the last page
- [ ] Supabase schema: library, progress, categories

**Known issue found during the polish pass**: the `(tabs)` layout's
`NativeTabs` (`expo-router/unstable_native_tabs`) crashes on web — its icon
renderer calls `expo-font.renderToImageAsync`, which doesn't exist outside
native. Reproducible on a clean checkout (unrelated to any change in this
pass), scoped to routes inside the tab navigator; `manga/[id]` and
`reader/[chapterId]` render fine since they sit outside it. Not fixed here —
native is the target platform (see Architecture) and web is a dev
convenience, but worth a `Platform.OS`-gated fallback tab bar if web is ever
meant to work.

## Decisions Log

- **Auth**: none for v1. Backend is single-user and its Railway URL won't be
  shared. Revisit and add an API key or Supabase JWT check before this is
  ever exposed beyond your own devices.
- **Offline downloads**: in scope for v1. `expo-file-system` stores pages
  locally with a local index of downloaded chapters.
- **First source**: scrape-based, not the MangaDex API — proves the full
  Scrapling pipeline (adaptive selectors, stealth fetch, caching) from the
  start rather than deferring that risk. Landed on Aqua Manga
  (`aquareader.org`) — SFW, runs on the Madara WordPress theme shared by many
  sites in the keiyoushi extensions repo (Arena Scans, Vortex Scans, Anisa
  Scans, etc). Once this source works, most of its scraping logic transfers
  directly to those other sites — just swap `base_url`. Backup if it gives
  trouble: Arena Scans or Vortex Scans, same theme family. Deliberately
  avoided high-traffic aggregators (MangaFire, Webtoons.com) as the starting
  point — those are the ones worth investing in anti-bot, so they're the
  wrong place to prove the pipeline first. See Roadmap for the full
  progression from here up to Mangakakalot.

## Open Decisions

- Whether to add Komga-style self-hosted server support later, like Tachimanga

## Conventions

- One source per file, one responsibility per source
- No hardcoded selectors without an adaptive fallback
- Keep the API layer source-agnostic — frontend never knows which site data came from
