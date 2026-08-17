import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { api, ApiError } from '@/lib/api';

// True black, zero chrome, tap zones only — see CLAUDE.md Design System.
export default function ReaderScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const [pages, setPages] = useState<string[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [chromeVisible, setChromeVisible] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

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

  const screenWidth = Dimensions.get('window').width;

  return (
    <ThemedView style={styles.container}>
      {status === 'loading' && (
        <ActivityIndicator color={Colors.dark.accent} style={StyleSheet.absoluteFill} />
      )}

      {status === 'error' && (
        <ThemedView style={styles.centered}>
          <ThemedText themeColor="accent">Couldn't load this chapter.</ThemedText>
        </ThemedView>
      )}

      {status === 'ready' && (
        <Pressable style={styles.pageArea} onPress={() => setChromeVisible((v) => !v)}>
          <FlashList
            data={pages}
            keyExtractor={(url, index) => `${index}-${url}`}
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

      {chromeVisible && (
        <SafeAreaView style={styles.chrome} pointerEvents="box-none">
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={Colors.dark.text} />
          </Pressable>
        </SafeAreaView>
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
