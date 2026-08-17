import { Directory, File, Paths } from 'expo-file-system';

/**
 * Offline chapter downloads (in scope for v1 — see CLAUDE.md Decisions Log).
 * Pages are saved under a per-chapter directory with a local JSON index for
 * fast "is this downloaded" / listing checks without touching the filesystem.
 */

const ROOT = new Directory(Paths.document, 'tsuzuku-downloads');
const INDEX_FILE = new File(ROOT, 'index.json');

export interface DownloadedChapter {
  chapterId: string;
  mangaId: string;
  pageCount: number;
  downloadedAt: string;
}

type DownloadIndex = Record<string, DownloadedChapter>;

function sanitize(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function extensionOf(url: string): string {
  const match = /\.(jpg|jpeg|png|webp|avif)(?:$|\?)/i.exec(url);
  return match ? `.${match[1].toLowerCase()}` : '.jpg';
}

function ensureRoot(): void {
  if (!ROOT.exists) {
    ROOT.create({ intermediates: true });
  }
}

function readIndex(): DownloadIndex {
  ensureRoot();
  if (!INDEX_FILE.exists) {
    return {};
  }
  return JSON.parse(INDEX_FILE.textSync()) as DownloadIndex;
}

function writeIndex(index: DownloadIndex): void {
  ensureRoot();
  INDEX_FILE.write(JSON.stringify(index));
}

function chapterDirectory(chapterId: string): Directory {
  return new Directory(ROOT, sanitize(chapterId));
}

export async function downloadChapter(
  chapterId: string,
  mangaId: string,
  pageUrls: string[],
): Promise<void> {
  const dir = chapterDirectory(chapterId);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }

  await Promise.all(
    pageUrls.map((url, index) =>
      File.downloadFileAsync(url, new File(dir, `${index}${extensionOf(url)}`), {
        idempotent: true,
      }),
    ),
  );

  const index = readIndex();
  index[chapterId] = {
    chapterId,
    mangaId,
    pageCount: pageUrls.length,
    downloadedAt: new Date().toISOString(),
  };
  writeIndex(index);
}

export function isChapterDownloaded(chapterId: string): boolean {
  return chapterId in readIndex();
}

export function getDownloadedPages(chapterId: string): string[] {
  const entry = readIndex()[chapterId];
  if (!entry) {
    return [];
  }
  const dir = chapterDirectory(chapterId);
  return Array.from({ length: entry.pageCount }, (_, index) => {
    const file = dir
      .list()
      .find((child): child is File => child instanceof File && child.name.startsWith(`${index}.`));
    return file?.uri ?? '';
  }).filter(Boolean);
}

export function listDownloadedChapters(): DownloadedChapter[] {
  return Object.values(readIndex()).sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt));
}

export function deleteChapterDownload(chapterId: string): void {
  const dir = chapterDirectory(chapterId);
  if (dir.exists) {
    dir.delete();
  }
  const index = readIndex();
  delete index[chapterId];
  writeIndex(index);
}
