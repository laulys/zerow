import { useEffect, useState } from 'react';
import { StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';

/**
 * Keeps the clock and the battery readable while a page scrolls under them: the
 * page colour over the status bar, fading out just below it. It only appears once
 * you scroll, so at rest it doesn't dim the aurora. Pass `y` (a scroll offset
 * shared value) or `shown`.
 */
export function StatusVeil({ shown, y, below = 20 }: { shown?: boolean; y?: SharedValue<number>; below?: number }) {
  const { t } = useTheme();
  const top = useSafeAreaInsets().top;
  const on = useSharedValue(0);
  useEffect(() => {
    if (shown !== undefined) on.set(withTiming(shown ? 1 : 0, { duration: 160 }));
  }, [shown, on]);
  const style = useAnimatedStyle(() => ({ opacity: y ? interpolate(y.value, [0, 24], [0, 1], Extrapolation.CLAMP) : on.value }));
  const h = top + below;
  return (
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.veil, { height: h }, style]}>
      <Svg width="100%" height={h}>
        <Defs>
          <LinearGradient id="statusVeil" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.page} stopOpacity={0.96} />
            <Stop offset={Math.max(0, top - 8) / h} stopColor={t.page} stopOpacity={0.96} />
            <Stop offset="1" stopColor={t.page} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#statusVeil)" />
      </Svg>
    </Animated.View>
  );
}

/**
 * For a plain ScrollView: spread `scroll` on it and render `veil` after it.
 * The state only changes when the page leaves or reaches the top.
 */
export function useStatusVeil() {
  const [scrolled, setScrolled] = useState(false);
  return {
    scroll: {
      onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => setScrolled(e.nativeEvent.contentOffset.y > 8),
      scrollEventThrottle: 32,
    },
    veil: <StatusVeil shown={scrolled} />,
  };
}

const styles = StyleSheet.create({
  veil: { position: 'absolute', top: 0, left: 0, right: 0 },
});
