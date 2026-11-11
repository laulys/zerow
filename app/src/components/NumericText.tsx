import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const DURATION = 420;
const ease = Easing.bezier(0.2, 0.9, 0.3, 1);

/**
 * Like SwiftUI's `.contentTransition(.numericText(countsDown:))`: only the
 * characters that change move. Counting up, the new digit rises in from below
 * while the old one rises out and fades; counting down, the other way. Cells are
 * keyed from the right, so units stay put when the number grows a digit.
 * Reduce Motion swaps instantly.
 */
export function NumericText({ text, style, countsDown = false, label }: { text: string; style: StyleProp<TextStyle>; countsDown?: boolean; label?: string }) {
  const chars = [...text];
  const n = chars.length;
  const changeOrder = useRef(0);
  // Stagger left to right among the cells that change in this update.
  const prev = useRef(text);
  const changed: number[] = [];
  if (prev.current !== text) {
    const old = [...prev.current];
    for (let i = 0; i < n; i++) {
      const fromRight = n - 1 - i;
      if (old[old.length - 1 - fromRight] !== chars[i]) changed.push(i);
    }
    changeOrder.current++;
  }
  useEffect(() => {
    prev.current = text;
  }, [text]);

  return (
    <View style={styles.row} accessible accessibilityLabel={label ?? text}>
      {chars.map((c, i) => {
        const fromRight = n - 1 - i;
        const order = changed.indexOf(i);
        return <Cell key={fromRight} char={c} style={style} dir={countsDown ? -1 : 1} delay={order > 0 ? order * 24 : 0} />;
      })}
    </View>
  );
}

function Cell({ char, style, dir, delay }: { char: string; style: StyleProp<TextStyle>; dir: 1 | -1; delay: number }) {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ cur: char, old: null as string | null });
  const p = useSharedValue(1);
  const d = useSharedValue(dir);
  const size = (StyleSheet.flatten(style)?.fontSize as number) ?? 16;
  const cap = size >= 28 ? 1.15 : undefined;

  useEffect(() => {
    if (char === state.cur) return;
    if (reduce) {
      setState({ cur: char, old: null });
      return;
    }
    setState({ cur: char, old: state.cur });
    d.value = dir;
    p.value = 0;
    p.value = withDelay(delay, withTiming(1, { duration: DURATION, easing: ease }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char]);

  const travel = size * 0.55;
  const inStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateY: d.value * (1 - p.value) * travel }, { scale: 0.92 + 0.08 * p.value }],
  }));
  const outStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, p.value * 1.6),
    transform: [{ translateY: -d.value * p.value * travel }, { scale: 1 - 0.08 * p.value }],
  }));

  return (
    <Animated.View
      entering={reduce ? undefined : FadeIn.duration(220)}
      exiting={reduce ? undefined : FadeOut.duration(160)}
      layout={reduce ? undefined : LinearTransition.duration(DURATION).easing(ease)}
    >
      <Animated.View style={inStyle}>
        <Text style={style} maxFontSizeMultiplier={cap}>
          {state.cur}
        </Text>
      </Animated.View>
      {state.old !== null ? (
        <Animated.View style={[StyleSheet.absoluteFill, outStyle]} pointerEvents="none">
          <Text style={style} maxFontSizeMultiplier={cap}>
            {state.old}
          </Text>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'baseline' } });
