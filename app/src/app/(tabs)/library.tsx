import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { MangaResult } from '@/lib/api';
import { Colors, Spacing } from '@/constants/theme';

// Dense cover grid, Sumi bg, covers are the only color — see CLAUDE.md Design System.
// Populated from the Supabase library table once that schema lands (Status: not yet built).
const LIBRARY: MangaResult[] = [];

const COLUMNS = 3;

export default function LibraryScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedText type="title" style={styles.heading}>
          Library
        </ThemedText>

        {LIBRARY.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              続く
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
              Nothing here yet. Find something in Search and it'll show up on this shelf.
            </ThemedText>
          </View>
        ) : (
          <FlashList
            data={LIBRARY}
            numColumns={COLUMNS}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.grid}
            renderItem={({ item }) => (
              <Link href={{ pathname: '/manga/[id]', params: { id: item.id } }} asChild>
                <Pressable style={styles.cover}>
                  <Image source={{ uri: item.cover_url ?? undefined }} style={styles.coverImage} contentFit="cover" />
                </Pressable>
              </Link>
            )}
          />
        )}
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
  grid: {
    paddingHorizontal: Spacing.three,
  },
  cover: {
    flex: 1,
    margin: Spacing.one,
    aspectRatio: 2 / 3,
    borderRadius: Spacing.one,
    overflow: 'hidden',
    backgroundColor: Colors.dark.backgroundElement,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  emptyTitle: {
    color: Colors.dark.highlight,
  },
  emptyBody: {
    textAlign: 'center',
  },
});
