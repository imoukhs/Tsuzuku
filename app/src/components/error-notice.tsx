import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

/**
 * Shared error state. Message text stays washi (not hanko) — hanko as raw
 * text on sumi is 3.3:1, under WCAG AA's 4.5:1 for body text. Hanko is only
 * used here as the icon tint (a graphical object, 3:1 threshold) and as a
 * filled retry button with washi text on top (5.1:1).
 */
export function ErrorNotice({
  message,
  onRetry,
  retryLabel = 'Try again',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={22} color={Colors.dark.accent} />
      <ThemedText style={styles.message}>{message}</ThemedText>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retryButton} hitSlop={8}>
          <ThemedText type="smallBold" style={styles.retryLabel}>
            {retryLabel}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  message: {
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    backgroundColor: Colors.dark.accent,
  },
  retryLabel: {
    color: Colors.dark.text,
  },
});
