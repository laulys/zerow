import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';

/** `content` can be a function of whether the card is in front (the one behind only shows its top strip). */
export type WalletCard = { key: string; title: string; content: ReactNode | ((front: boolean) => ReactNode); onPress?: () => void };
const face = (c: WalletCard, front: boolean) => (typeof c.content === 'function' ? c.content(front) : c.content);

const CARD_H = 250;
const PEEK = 48;
const BACK_SCALE = 0.91;
const BACK_DIM = 0.65;
// How far the back card moves up so its top edge shows above the front one.
const BACK_LIFT = PEEK + (CARD_H * (1 - BACK_SCALE)) / 2;
const settle = { damping: 17, stiffness: 220, mass: 0.9 } as const;

/**
 * Open groups as a stack of cards, like Apple Wallet. Swipe the front card
 * sideways and the one behind comes forward on a spring; tapping its edge (or
 * VoiceOver's swipe up/down) do the same. Built on PanResponder, so it needs no
 * extra native module.
 */
export function WalletStack({ cards }: { cards: WalletCard[] }) {
  const { t } = useTheme();
  const reduce = useReducedMotion();
  const [front, setFront] = useState(0);
  const x = useSharedValue(0);
  const n = cards.length;
  const nRef = useRef(n);
  nRef.current = n;

  const advance = (dir: 1 | -1) => {
    Haptics.selectionAsync();
    setFront((f) => (f + dir + nRef.current) % nRef.current);
  };
  const afterFling = (dir: number) => {
    advance(dir < 0 ? 1 : -1);
    x.value = 0;
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Only claim clearly horizontal drags, so the page still scrolls vertically.
        onMoveShouldSetPanResponderCapture: (_, g) => nRef.current > 1 && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          x.value = g.dx;
        },
        onPanResponderRelease: (_, g) => {
          const fling = Math.abs(g.dx) > 90 || Math.abs(g.vx) > 0.7;
          if (!fling) {
            x.value = withSpring(0, settle);
            return;
          }
          const dir = Math.sign(g.dx || g.vx);
          x.value = withTiming(dir * 460, { duration: 220 }, (done) => {
            if (done) runOnJS(afterFling)(dir);
          });
        },
        onPanResponderTerminate: () => {
          x.value = withSpring(0, settle);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { rotate: `${reduce ? 0 : x.value / 22}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => {
    const p = Math.min(1, Math.abs(x.value) / 260);
    return { transform: [{ translateY: -BACK_LIFT * (1 - p) }, { scale: BACK_SCALE + (1 - BACK_SCALE) * p }] };
  });
  // The card behind is the same colour, dimmed, and brightens as it comes forward.
  const dimStyle = useAnimatedStyle(() => ({ opacity: BACK_DIM * (1 - Math.min(1, Math.abs(x.value) / 260)) }));

  const current = cards[Math.min(front, n - 1)];
  const behind = n > 1 ? cards[(front + 1) % n] : null;
  // Larger text needs a taller card; the stack grows with the reading size
  // (up to 1.5×) instead of clipping the balance.
  const { fontScale } = useWindowDimensions();
  const cardH = Math.round(CARD_H * Math.min(Math.max(fontScale, 1), 1.5));
  // With one group there is nothing peeking, so no room is kept for it.
  const peek = behind ? PEEK : 0;

  return (
    <View>
      <View
        style={{ height: cardH + peek }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${current.title}. Grupo ${front + 1} de ${n}`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'increment') advance(1);
          else if (e.nativeEvent.actionName === 'decrement') advance(-1);
          else current.onPress?.();
        }}
      >
        {behind ? (
          <Animated.View key={'back-' + behind.key} entering={FadeInDown.springify().damping(15).stiffness(160)} style={[styles.slot, { top: peek, height: cardH }]} pointerEvents="none">
            <Animated.View style={[styles.card, backStyle]}>
              {face(behind, false)}
              <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.page }, dimStyle]} />
            </Animated.View>
          </Animated.View>
        ) : null}
        {behind ? (
          // The peeking edge of the card behind: tap it to bring that group forward.
          <Pressable
            onPress={() => {
              x.value = withTiming(-460, { duration: 220 }, (done) => {
                if (done) runOnJS(afterFling)(-1);
              });
            }}
            accessibilityRole="button"
            accessibilityLabel={`Ver ${behind.title}`}
            style={styles.peek}
          />
        ) : null}
        <Animated.View key={'front-' + current.key} style={[styles.slot, { top: peek, height: cardH }, styles.card, frontStyle]} {...responder.panHandlers}>
          <Pressable onPress={current.onPress} style={{ flex: 1 }} disabled={!current.onPress}>
            {face(current, true)}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', top: PEEK, left: 0, right: 0, height: CARD_H },
  peek: { position: 'absolute', top: 0, left: 16, right: 16, height: PEEK },
  card: { flex: 1, borderRadius: 32, overflow: 'hidden' },
});
