import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';

const AView = Animated.View;

/**
 * 4.4 «A cero»: a ring of light made of two halves that close, like the two
 * halves of the logo meeting. The halves start apart and offset, slide
 * together on a spring and the glow comes up once they touch. A hairline gap
 * stays at the top and bottom so it still reads as two halves. Still (already
 * closed) with Reduce Motion.
 */
export function ZeroRing({ size = 232, stroke = 14, children }: { size?: number; stroke?: number; children?: React.ReactNode }) {
  const { t } = useTheme();
  const reduce = useReducedMotion();
  const open = useSharedValue(reduce ? 0 : 1);
  const glow = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    open.value = withDelay(150, withSpring(0, { damping: 16, stiffness: 120, mass: 0.9 }));
    glow.value = withDelay(650, withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }));
  }, [reduce, open, glow]);

  const c = size / 2;
  // Figma: 6 pt between the halves, so they still read as the logo's two halves.
  const gap = 3;
  // Each half is centred `gap` off the middle, so the radius leaves room for that offset inside the canvas.
  const r = (size - stroke) / 2 - 1 - gap;
  // Two half circles, each drawn from top to bottom on its own side.
  const left = `M${c - gap} ${c - r} A${r} ${r} 0 0 0 ${c - gap} ${c + r}`;
  const right = `M${c + gap} ${c - r} A${r} ${r} 0 0 1 ${c + gap} ${c + r}`;

  const leftStyle = useAnimatedStyle(() => ({ opacity: 1 - open.value * 0.6, transform: [{ translateX: -28 * open.value }, { translateY: -18 * open.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ opacity: 1 - open.value * 0.6, transform: [{ translateX: 28 * open.value }, { translateY: 18 * open.value }] }));
  // Figma's glow is two shadows: a wide one (blur 36, 65 %) and a tight one (blur 10, 50 %).
  const glowWide = useAnimatedStyle(() => ({ shadowOpacity: 0.65 * glow.value }));
  const glowTight = useAnimatedStyle(() => ({ shadowOpacity: 0.5 * glow.value }));
  // The ring is a vertical gradient, lighter lime at the top (#E4FF9A) to lime at the bottom.
  const grad = (
    <Defs>
      <LinearGradient id="zeroRing" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#E4FF9A" />
        <Stop offset="1" stopColor={t.lime} />
      </LinearGradient>
    </Defs>
  );
  const inside = useAnimatedStyle(() => ({ opacity: glow.value, transform: [{ scale: 0.94 + 0.06 * glow.value }] }));

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
