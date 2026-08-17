import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';

const STAMP_DELAY = 520;
const STAMP_DURATION = 300;
const SETTLE_PAUSE = 450;

/**
 * The signature "to be continued" moment (see CLAUDE.md Design System):
 * freeze-frame desaturate to kohaku sepia, a beat of pause, then 続 stamps
 * on in hanko red — a tasteful nod to the freeze-frame ending rather than a
 * literal meme reference. Fires once when the reader reaches the last page.
 *
 * Tapping anywhere skips straight to the settled state so the transition
 * never traps a reader who already knows what's next.
 */
export function ChapterCompleteOverlay({
  hasNext,
  onNext,
  onDone,
}: {
  hasNext: boolean;
  onNext: () => void;
  onDone: () => void;
}) {
  const scrimOpacity = useSharedValue(0);
  const stampOpacity = useSharedValue(0);
  const stampScale = useSharedValue(1.35);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    scrimOpacity.value = withTiming(0.88, { duration: 320, easing: Easing.out(Easing.quad) });
    stampOpacity.value = withDelay(STAMP_DELAY, withTiming(1, { duration: 220 }));
    stampScale.value = withDelay(
      STAMP_DELAY,
      withSequence(
        withTiming(0.92, { duration: 160, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 140, easing: Easing.out(Easing.back(1.6)) }),
      ),
    );
    const settleTimer = setTimeout(() => setSettled(true), STAMP_DELAY + STAMP_DURATION + SETTLE_PAUSE);

    return () => {
      clearTimeout(settleTimer);
      cancelAnimation(scrimOpacity);
      cancelAnimation(stampOpacity);
      cancelAnimation(stampScale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    cancelAnimation(scrimOpacity);
    cancelAnimation(stampOpacity);
    cancelAnimation(stampScale);
    scrimOpacity.value = 0.88;
    stampOpacity.value = 1;
    stampScale.value = 1;
    setSettled(true);
  };

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));
  const stampStyle = useAnimatedStyle(() => ({
    opacity: stampOpacity.value,
    transform: [{ scale: stampScale.value }],
  }));

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={skip}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />
      <Animated.View style={[styles.stampWrap, stampStyle]}>
        <ThemedText style={styles.stamp}>続</ThemedText>
      </Animated.View>
      {settled && <SettledActions hasNext={hasNext} onNext={onNext} onDone={onDone} />}
    </Pressable>
  );
}

function SettledActions({
  hasNext,
  onNext,
  onDone,
}: {
  hasNext: boolean;
  onNext: () => void;
  onDone: () => void;
}) {
  return (
    <Animated.View style={styles.actions}>
      {hasNext ? (
        <Pressable onPress={onNext} style={styles.primaryButton} hitSlop={8}>
          <ThemedText type="smallBold" style={styles.primaryLabel}>
            Next chapter →
          </ThemedText>
        </Pressable>
      ) : (
        <Pressable onPress={onDone} style={styles.primaryButton} hitSlop={8}>
          <ThemedText type="smallBold" style={styles.primaryLabel}>
            Back to details
          </ThemedText>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: Colors.dark.highlight,
  },
  stampWrap: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  stamp: {
    fontFamily: Fonts.display,
    fontSize: 96,
    color: Colors.dark.accent,
    textShadowColor: 'rgba(11, 11, 13, 0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  actions: {
    position: 'absolute',
    bottom: '18%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  primaryButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.four,
    backgroundColor: Colors.dark.accent,
  },
  primaryLabel: {
    color: Colors.dark.text,
    fontSize: 16,
  },
});
