import { Image } from 'expo-image';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { api, ApiError, type Chapter, type MangaDetail } from '@/lib/api';

export default function MangaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [manga, setManga] = useState<MangaDetail | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    Promise.all([api.getManga(id), api.getChapters(id)])
      .then(([mangaDetail, chapterList]) => {
        if (cancelled) return;
        setManga(mangaDetail);
        setChapters(chapterList);
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
        <ThemedText themeColor="accent">Couldn't load this title.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Image source={{ uri: manga.cover_url ?? undefined }} style={styles.cover} contentFit="cover" />

        <SafeAreaView edges={['bottom']} style={styles.body}>
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

          {chapters.length === 0 ? (
            <ThemedText themeColor="textSecondary">No chapters found.</ThemedText>
          ) : (
            [...chapters].reverse().map((chapter) => (
              <Link key={chapter.id} href={{ pathname: '/reader/[chapterId]', params: { chapterId: chapter.id } }} asChild>
                <Pressable style={styles.chapterRow}>
                  <ThemedText>{chapter.title ?? `Chapter ${chapter.number}`}</ThemedText>
                </Pressable>
              </Link>
            ))
          )}
        </SafeAreaView>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: Spacing.six,
  },
  cover: {
    width: '100%',
    aspectRatio: 3 / 2,
    backgroundColor: Colors.dark.backgroundElement,
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
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
});
