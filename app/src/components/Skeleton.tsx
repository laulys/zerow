import { useEffect, type ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { announce } from './announce';

/** One placeholder shape: the outline of a line of text, an amount or a face. */
export function Bone({ w, h = 12, r, style }: { w: DimensionValue; h?: number; r?: number; style?: StyleProp<ViewStyle> }) {
  const { t } = useTheme();
  return <View style={[{ width: w, height: h, borderRadius: r ?? h / 2, backgroundColor: t.fill }, style]} />;
}

/**
 * Figma 6.1 / 6.2: while a screen loads you see its outline, breathing gently,
 * so you already know where everything goes. Still with Reduce Motion. It reads
 * as one thing to VoiceOver and says itself when it appears.
 */
export function Skeleton({ label, children, style }: { label: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const breath = useSharedValue(1);
  useEffect(() => {
    announce(label);
    if (reduce) return;
    breath.set(withRepeat(withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [label, reduce, breath]);
  const anim = useAnimatedStyle(() => ({ opacity: breath.value }));
  return (
    <Animated.View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={[style, anim]}>
      {children}
    </Animated.View>
  );
}
