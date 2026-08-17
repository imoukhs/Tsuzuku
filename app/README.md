# Tsuzuku app

Expo (React Native) client for Tsuzuku. See the root [`CLAUDE.md`](../CLAUDE.md)
for architecture and design system.

## Get started

```bash
npm install
cp .env.example .env  # set EXPO_PUBLIC_API_BASE_URL to your backend
npx expo start
```

## Structure

File-based routing via `expo-router`, rooted at `src/app/`:

- `(tabs)/` — Library, Search, Settings
- `manga/[id].tsx` — manga detail + chapter list
- `reader/[chapterId].tsx` — full-bleed page reader

`src/lib/` holds the backend client (`api.ts`), Supabase client
(`supabase.ts`), and the offline download manager (`downloads.ts`).
