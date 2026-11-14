import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';

const AView = Animated.View;

/**
 * 4.4 «A cero»: the logo's promise played out. The ring starts as the logo, two
 * halves of a coin offset vertically (left up, right down), and they slide
 * together into a zero on a spring with a hint of overshoot. The moment they meet
 * the light blooms and settles and the ring gives one soft pulse. What's inside
 * (the amount counting down to 0,00 €) is there from the start. A hairline gap
 * stays at the top and bottom so it still reads as two halves. Still (already
 * closed) with Reduce Motion. `CLOSES_AT` is when they meet, for the haptic.
 */
export const CLOSES_AT = 560;
export function ZeroRing({ size = 232, stroke = 14, children }: { size?: number; stroke?: number; children?: React.ReactNode }) {
  const { t } = useTheme();
  const reduce = useReducedMotion();
  const open = useSharedValue(reduce ? 0 : 1);
  const glow = useSharedValue(reduce ? 1 : 0);
  const shown = useSharedValue(reduce ? 1 : 0);
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    const out = Easing.bezier(0.23, 1, 0.32, 1);
    shown.value = withTiming(1, { duration: 180, easing: out });
    open.value = withDelay(120, withSpring(0, { damping: 13, stiffness: 150, mass: 0.8 }));
    glow.value = withDelay(CLOSES_AT - 40, withSequence(withTiming(1.35, { duration: 220, easing: out }), withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) })));
    pulse.value = withDelay(CLOSES_AT - 20, withSequence(withTiming(1.035, { duration: 150, easing: out }), withSpring(1, { damping: 14, stiffness: 200 })));
  }, [reduce, open, glow, shown, pulse]);

  const c = size / 2;
  // Figma: 6 pt between the halves, so they still read as the logo's two halves.
  const gap = 3;
  // Each half is centred `gap` off the middle, so the radius leaves room for that offset inside the canvas.
  const r = (size - stroke) / 2 - 1 - gap;
  // Two half circles, each drawn from top to bottom on its own side.
  const left = `M${c - gap} ${c - r} A${r} ${r} 0 0 0 ${c - gap} ${c + r}`;
  const right = `M${c + gap} ${c - r} A${r} ${r} 0 0 1 ${c + gap} ${c + r}`;

  // The logo's offset: the left half higher, the right half lower, by a third of the ring.
  const shift = size / 3;
  const leftStyle = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: -shift * open.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: shift * open.value }] }));
  // Figma's glow is two shadows: a wide one (blur 36, 65 %) and a tight one (blur 10, 50 %); it overshoots once as they meet.
  const glowWide = useAnimatedStyle(() => ({ shadowOpacity: Math.min(1, 0.65 * glow.value), transform: [{ scale: pulse.value }] }));
  const glowTight = useAnimatedStyle(() => ({ shadowOpacity: Math.min(1, 0.5 * glow.value) }));
  // The ring is a vertical gradient, lighter lime at the top (#E4FF9A) to lime at the bottom.
  const grad = (
    <Defs>
      <LinearGradient id="zeroRing" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#E4FF9A" />
        <Stop offset="1" stopColor={t.lime} />
      </LinearGradient>
    </Defs>
  );
  const inside = useAnimatedStyle(() => ({ opacity: shown.value }));

  return (
    <View style={{ width: size, height: size }}>
      <AView style={[StyleSheet.absoluteFill, { shadowColor: t.lime, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } }, glowWide]}>
        <AView style={[StyleSheet.absoluteFill, { shadowColor: t.lime, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } }, glowTight]}>
          <AView style={[StyleSheet.absoluteFill, leftStyle]}>
            <Svg width={size} height={size}>
              {grad}
              <Path d={left} stroke="url(#zeroRing)" strokeWidth={stroke} fill="none" />
            </Svg>
          </AView>
          <AView style={[StyleSheet.absoluteFill, rightStyle]}>
            <Svg width={size} height={size}>
              {grad}
              <Path d={right} stroke="url(#zeroRing)" strokeWidth={stroke} fill="none" />
            </Svg>
          </AView>
        </AView>
      </AView>
      <AView style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, inside]}>{children}</AView>
    </View>
  );
}
