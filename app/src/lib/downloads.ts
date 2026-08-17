import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Offline chapter downloads (in scope for v1 — see CLAUDE.md Decisions Log).
 * Pages are saved under a per-chapter directory with a local JSON index for
 * fast "is this downloaded" / listing checks without touching the filesystem.
 *
 * expo-file-system's Directory/File aren't implemented on web, and merely
 * constructing one there throws — so every entry point below is a no-op on
 * web instead of touching the filesystem, and the root/index File objects
 * are built lazily (not at module scope) so importing this file never
 * crashes web SSR/bundling even though downloads themselves are native-only.
 */
const isWeb = Platform.OS === 'web';

let root: Directory | undefined;
let indexFile: File | undefined;

function getRoot(): Directory {
  if (!root) {
    root = new Directory(Paths.document, 'tsuzuku-downloads');
  }
  return root;
}

function getIndexFile(): File {
  if (!indexFile) {
    indexFile = new File(getRoot(), 'index.json');
  }
  return indexFile;
}

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
  const dir = getRoot();
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
}

function readIndex(): DownloadIndex {
  ensureRoot();
  const file = getIndexFile();
  if (!file.exists) {
    return {};
  }
  return JSON.parse(file.textSync()) as DownloadIndex;
}

function writeIndex(index: DownloadIndex): void {
  ensureRoot();
  getIndexFile().write(JSON.stringify(index));
}

function chapterDirectory(chapterId: string): Directory {
  return new Directory(getRoot(), sanitize(chapterId));
}

export async function downloadChapter(chapterId: string, mangaId: string, pageUrls: string[]): Promise<void> {
  if (isWeb) return;

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
  if (isWeb) return false;
  return chapterId in readIndex();
}

export function getDownloadedPages(chapterId: string): string[] {
  if (isWeb) return [];

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
  if (isWeb) return [];
  return Object.values(readIndex()).sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt));
}

export function deleteChapterDownload(chapterId: string): void {
  if (isWeb) return;

  const dir = chapterDirectory(chapterId);
  if (dir.exists) {
    dir.delete();
  }
  const index = readIndex();
  delete index[chapterId];
  writeIndex(index);
}
