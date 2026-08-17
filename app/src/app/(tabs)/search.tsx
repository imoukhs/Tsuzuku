import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorNotice } from '@/components/error-notice';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { api, ApiError, type MangaResult } from '@/lib/api';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MangaResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    try {
      const found = await api.search(trimmed);
      setResults(found);
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      console.warn('Search failed:', error instanceof ApiError ? error.message : error);
    }
  }, [query]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="title" style={styles.heading}>
          Search
        </ThemedText>

        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={runSearch}
          placeholder="Search a title..."
          placeholderTextColor={Colors.dark.textSecondary}
          returnKeyType="search"
          autoCorrect={false}
          style={styles.input}
        />

        {status === 'loading' && <ActivityIndicator color={Colors.dark.accent} style={styles.spinner} />}

        {status === 'error' && (
          <View style={styles.message}>
            <ErrorNotice
              message="Couldn't reach the backend. Check EXPO_PUBLIC_API_BASE_URL and try again."
              onRetry={runSearch}
            />
          </View>
        )}

        {status === 'idle' && results.length === 0 && query.trim().length > 0 && (
          <ThemedText themeColor="textSecondary" style={styles.message}>
            No results for "{query.trim()}".
          </ThemedText>
        )}

        <FlashList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Link href={{ pathname: '/manga/[id]', params: { id: item.id } }} asChild>
              <Pressable style={styles.card}>
                <Image source={{ uri: item.cover_url ?? undefined }} style={styles.cardCover} contentFit="cover" />
                <View style={styles.cardBody}>
                  <ThemedText style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </ThemedText>
                  <ThemedText type="code" themeColor="textSecondary">
                    {item.source.name}
                  </ThemedText>
                </View>
              </Pressable>
            </Link>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  heading: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  input: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 16,
  },
  spinner: {
    marginTop: Spacing.three,
  },
  message: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
  },
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginHorizontal: Spacing.one,
    marginBottom: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardCover: {
    width: 56,
    height: 80,
    borderRadius: Spacing.one,
    backgroundColor: Colors.dark.backgroundSelected,
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.one,
  },
  cardTitle: {
    fontFamily: Fonts.bodyMedium,
  },
});
