import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Link, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorNotice } from '@/components/error-notice';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { api, ApiError, type Chapter, type MangaDetail } from '@/lib/api';
import { downloadChapter, isChapterDownloaded } from '@/lib/downloads';

type DownloadState = 'none' | 'downloading' | 'done';

export default function MangaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [manga, setManga] = useState<MangaDetail | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});

  const load = useCallback(() => {
    let cancelled = false;
    setStatus('loading');

    Promise.all([api.getManga(id), api.getChapters(id)])
      .then(([mangaDetail, chapterList]) => {
        if (cancelled) return;
        setManga(mangaDetail);
        setChapters(chapterList);
        setDownloads(
          Object.fromEntries(
            chapterList
              .filter((chapter) => isChapterDownloaded(chapter.id))
              .map((chapter) => [chapter.id, 'done' as const]),
          ),
        );
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus('error');
        console.warn('Failed to load manga:', error instanceof ApiError ? error.message : error);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => load(), [load]);

  // Newest first for display; the reader screen re-derives ascending order
  // itself (via /manga/{id}/chapters, cached) to chain "next chapter".
  const chaptersDesc = useMemo(() => [...chapters].sort((a, b) => b.number - a.number), [chapters]);

  const handleDownload = useCallback(
    async (chapter: Chapter) => {
      setDownloads((prev) => ({ ...prev, [chapter.id]: 'downloading' }));
      try {
        const { pages } = await api.getPages(chapter.id);
        await downloadChapter(chapter.id, chapter.manga_id, pages);
        setDownloads((prev) => ({ ...prev, [chapter.id]: 'done' }));
      } catch (error) {
        setDownloads((prev) => ({ ...prev, [chapter.id]: 'none' }));
        Alert.alert('Download failed', error instanceof ApiError ? error.message : 'Please try again.');
      }
    },
    [],
  );

  if (status === 'loading') {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={Colors.dark.accent} />
      </ThemedView>
    );
  }

  if (status === 'error' || !manga) {
    return (
      <ThemedView style={styles.centered}>
        <ErrorNotice message="Couldn't load this title." onRetry={load} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlashList
        data={chaptersDesc}
        keyExtractor={(chapter) => chapter.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.six }}
        ListHeaderComponent={
          <View>
            <View style={styles.coverWrap}>
              <Image source={{ uri: manga.cover_url ?? undefined }} style={styles.cover} contentFit="cover" />
              {/* Scrim so the transparent header's back button stays legible over any cover art */}
              <View style={styles.headerScrim} pointerEvents="none" />
            </View>

            <View style={styles.body}>
              <ThemedText type="title">{manga.title}</ThemedText>

              <View style={styles.metaRow}>
                {manga.status && (
                  <ThemedText type="code" themeColor="highlight">
                    {manga.status.toUpperCase()}
                  </ThemedText>
                )}
                {manga.authors.length > 0 && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {manga.authors.join(', ')}
                  </ThemedText>
                )}
              </View>

              {manga.genres.length > 0 && (
                <View style={styles.genres}>
                  {manga.genres.map((genre) => (
                    <View key={genre} style={styles.genreChip}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {genre}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}

              {manga.description && (
                <ThemedText themeColor="textSecondary" style={styles.description}>
                  {manga.description}
                </ThemedText>
              )}

              <ThemedText type="subtitle" style={styles.chaptersHeading}>
                Chapters
              </ThemedText>

              {chapters.length === 0 && <ThemedText themeColor="textSecondary">No chapters found.</ThemedText>}
            </View>
          </View>
        }
        renderItem={({ item: chapter }) => {
          const downloadState = downloads[chapter.id] ?? 'none';
          return (
            <View style={styles.chapterRow}>
              <Link
                href={{
                  pathname: '/reader/[chapterId]',
                  params: { chapterId: chapter.id, mangaId: manga.id },
                }}
                asChild>
                <Pressable style={styles.chapterLink}>
                  <ThemedText>{chapter.title ?? `Chapter ${chapter.number}`}</ThemedText>
                </Pressable>
              </Link>
              {Platform.OS !== 'web' && (
                <Pressable
                  onPress={() => handleDownload(chapter)}
                  disabled={downloadState !== 'none'}
                  style={styles.downloadButton}
                  hitSlop={10}>
                  {downloadState === 'downloading' ? (
                    <ActivityIndicator size="small" color={Colors.dark.textSecondary} />
                  ) : (
                    <Ionicons
                      name={downloadState === 'done' ? 'checkmark-circle' : 'cloud-download-outline'}
                      size={20}
                      color={downloadState === 'done' ? Colors.dark.highlight : Colors.dark.textSecondary}
                    />
                  )}
                </Pressable>
              )}
            </View>
          );
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.background,
  },
  coverWrap: {
    width: '100%',
    aspectRatio: 3 / 2,
    backgroundColor: Colors.dark.backgroundElement,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  headerScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(11, 11, 13, 0.45)',
  },
  body: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  genreChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
    backgroundColor: Colors.dark.backgroundElement,
  },
  description: {
    marginTop: Spacing.two,
    lineHeight: 22,
  },
  chaptersHeading: {
    marginTop: Spacing.four,
    marginBottom: Spacing.one,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  chapterLink: {
    flex: 1,
    paddingVertical: Spacing.three,
  },
  downloadButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
  },
});
