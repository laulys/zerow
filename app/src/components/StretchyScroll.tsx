import type { ReactNode } from 'react';
import { StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion, useSharedValue } from 'react-native-reanimated';

/**
 * A scroll view whose header background stretches when you pull past the top,
 * like iOS profile headers. iOS's own rubber-band overscroll does the spring:
 * the further you pull the more it resists, and on release it settles back
 * with a soft bounce. The header just follows it, growing upwards from its bottom edge.
 * With Reduce Motion the header stays still (the list still bounces, as iOS does).
 */
export function StretchyScroll({
  background,
  backgroundHeight,
  children,
  contentContainerStyle,
  style,
  onScrollY,
  ...rest
}: ScrollViewProps & {
  background: ReactNode;
  backgroundHeight: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Worklet called on every scroll with (offset, content height, visible height): the tab bar listens through it. */
  onScrollY?: (y: number, content: number, view: number) => void;
}) {
  const y = useSharedValue(0);
  const reduce = useReducedMotion();
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
    onScrollY?.(e.contentOffset.y, e.contentSize.height, e.layoutMeasurement.height);
  });
  const bg = useAnimatedStyle(() => {
    const pull = reduce ? 0 : Math.max(0, -y.value);
    // Grow upwards from the bottom edge, so the bottom shape (curve, rounded
    // corners) stays where it is and the top always reaches the screen edge.
    return { transform: [{ scaleY: 1 + pull / backgroundHeight }] };
  });
  return (
    <Animated.ScrollView {...rest} style={style} onScroll={onScroll} scrollEventThrottle={16} alwaysBounceVertical contentContainerStyle={contentContainerStyle}>
      <Animated.View pointerEvents="none" style={[styles.bg, { height: backgroundHeight, transformOrigin: 'bottom' }, bg]}>
        {background}
      </Animated.View>
      <View>{children}</View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  bg: { position: 'absolute', top: 0, left: 0, right: 0 },
});
