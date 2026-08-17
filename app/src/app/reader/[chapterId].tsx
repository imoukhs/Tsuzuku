import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChapterCompleteOverlay } from '@/components/chapter-complete-overlay';
import { ErrorNotice } from '@/components/error-notice';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { api, ApiError, type Chapter } from '@/lib/api';
import { getDownloadedPages, isChapterDownloaded } from '@/lib/downloads';

// True black, zero chrome, tap zones only — see CLAUDE.md Design System.
export default function ReaderScreen() {
  const { chapterId, mangaId } = useLocalSearchParams<{ chapterId: string; mangaId?: string }>();
  const [pages, setPages] = useState<string[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [chromeVisible, setChromeVisible] = useState(true);
  const [siblingChapters, setSiblingChapters] = useState<Chapter[]>([]);
  const [showComplete, setShowComplete] = useState(false);

  const loadPages = useCallback(() => {
    let cancelled = false;
    setStatus('loading');

    if (isChapterDownloaded(chapterId)) {
      setPages(getDownloadedPages(chapterId));
      setStatus('ready');
      return () => {
        cancelled = true;
      };
    }

    api
      .getPages(chapterId)
      .then((result) => {
        if (cancelled) return;
        setPages(result.pages);
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus('error');
        console.warn('Failed to load pages:', error instanceof ApiError ? error.message : error);
      });

    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  useEffect(() => loadPages(), [loadPages]);

  // Chain "next chapter" for the end-of-chapter transition — re-derived per
  // screen (rather than passed through params) so it keeps working across
  // repeated auto-advances.
  useEffect(() => {
    setShowComplete(false);
    if (!mangaId) return;
    let cancelled = false;
    api
      .getChapters(mangaId)
      .then((list) => {
        if (!cancelled) setSiblingChapters(list);
      })
      .catch(() => {
        // Non-critical — the overlay just won't offer a "next chapter" hand-off.
      });
    return () => {
      cancelled = true;
    };
  }, [mangaId, chapterId]);

  const nextChapterId = useMemo(() => {
    // .slice() instead of [...siblingChapters] — see manga/[id].tsx for why.
    const asc = siblingChapters.slice().sort((a, b) => a.number - b.number);
    const index = asc.findIndex((chapter) => chapter.id === chapterId);
    return index >= 0 ? (asc[index + 1]?.id ?? null) : null;
  }, [siblingChapters, chapterId]);

  const screenWidth = Dimensions.get('window').width;

  return (
    <ThemedView style={styles.container}>
      {status === 'loading' && (
        <ActivityIndicator color={Colors.dark.accent} style={StyleSheet.absoluteFill} />
      )}

      {status === 'error' && (
        <ThemedView style={styles.centered}>
          <ErrorNotice message="Couldn't load this chapter." onRetry={loadPages} />
        </ThemedView>
      )}

      {status === 'ready' && (
        <Pressable style={styles.pageArea} onPress={() => setChromeVisible((v) => !v)}>
          <FlashList
            data={pages}
            keyExtractor={(url, index) => `${index}-${url}`}
            onEndReachedThreshold={0.15}
            onEndReached={() => setShowComplete(true)}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                // Manga pages run ~2:3 to ~5:8 — a fixed estimate keeps FlashList's
                // windowing stable; refine to per-image aspect ratio in a later pass.
                style={{ width: screenWidth, height: screenWidth * 1.45 }}
                contentFit="contain"
              />
            )}
          />
        </Pressable>
      )}

      {chromeVisible && !showComplete && (
        <SafeAreaView style={styles.chrome} pointerEvents="box-none">
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={Colors.dark.text} />
          </Pressable>
        </SafeAreaView>
      )}

      {showComplete && (
        <ChapterCompleteOverlay
          hasNext={nextChapterId !== null}
          onNext={() => {
            if (!nextChapterId) return;
            router.replace({
              pathname: '/reader/[chapterId]',
              params: { chapterId: nextChapterId, ...(mangaId ? { mangaId } : {}) },
            });
          }}
          onDone={() => {
            if (mangaId) {
              router.replace({ pathname: '/manga/[id]', params: { id: mangaId } });
            } else {
              router.back();
            }
          }}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageArea: {
    flex: 1,
  },
  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    margin: Spacing.three,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 11, 13, 0.72)',
  },
});
