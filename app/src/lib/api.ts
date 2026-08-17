/**
 * Client for the Tsuzuku FastAPI backend. Mirrors the Source Interface
 * Contract in CLAUDE.md — every id here is source-prefixed
 * (e.g. `aquamanga:one-piece`) and the frontend never needs to know which
 * source module produced it.
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export interface SourceInfo {
  id: string;
  name: string;
}

export interface MangaResult {
  id: string;
  title: string;
  cover_url: string | null;
  source: SourceInfo;
}

export interface MangaDetail extends MangaResult {
  description: string | null;
  authors: string[];
  genres: string[];
  status: string | null;
}

export interface Chapter {
  id: string;
  manga_id: string;
  number: number;
  title: string | null;
  published_at: string | null;
  source: SourceInfo;
}

export interface ChapterPages {
  chapter_id: string;
  pages: string[];
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }
  return response.json() as Promise<T>;
}

export const api = {
  search: (query: string) => apiFetch<MangaResult[]>(`/search?q=${encodeURIComponent(query)}`),
  getManga: (mangaId: string) => apiFetch<MangaDetail>(`/manga/${mangaId}`),
  getChapters: (mangaId: string) => apiFetch<Chapter[]>(`/manga/${mangaId}/chapters`),
  getPages: (chapterId: string) => apiFetch<ChapterPages>(`/chapter/${chapterId}/pages`),
};

export { ApiError };
