import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, StyleSheet, useWindowDimensions, View, type GestureResponderHandlers } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';

/** `content` can be a function of whether the card is in front (the one behind only shows its top strip). */
export type WalletCard = { key: string; title: string; content: ReactNode | ((front: boolean) => ReactNode); onPress?: () => void };
const face = (c: WalletCard, front: boolean) => (typeof c.content === 'function' ? c.content(front) : c.content);

const CARD_H = 250;
const PEEK = 48;
const BACK_SCALE = 0.91;
// How far the back card moves up so its top edge shows above the front one.
const BACK_LIFT = PEEK + (CARD_H * (1 - BACK_SCALE)) / 2;
const settle = { damping: 17, stiffness: 220, mass: 0.9 } as const;

/**
 * Open groups as a stack of cards, like Apple Wallet. v3: the card in front is
 * always on the brand gradient and the one behind is a glass strip; each card
 * carries both faces and cross-fades between them as it changes place. Swipe the front card
 * sideways and the one behind comes forward on a spring; tapping its edge (or
 * VoiceOver's swipe up/down) do the same. Built on PanResponder, so it needs no
 * extra native module.
 */
export function WalletStack({ cards }: { cards: WalletCard[] }) {
  const reduce = useReducedMotion();
  const [front, setFront] = useState(0);
  const x = useSharedValue(0);
  // Which card the drag belongs to. When the stack swaps, the old front keeps
  // owning `x` (it's off-screen), so the new front sits still at 0: no snap back.
  const owner = useSharedValue(0);
  const n = cards.length;
  const nRef = useRef(n);
  nRef.current = n;
  const frontRef = useRef(front);
  frontRef.current = front;

  const advance = (dir: 1 | -1) => {
    Haptics.selectionAsync();
    setFront((f) => (f + dir + nRef.current) % nRef.current);
  };
  const afterFling = (dir: number) => advance(dir < 0 ? 1 : -1);

  // After the swap, ease `x` back to rest: the card that just went behind
  // shrinks into place and dims, instead of jumping there.
  useEffect(() => {
    if (x.value === 0) return;
    x.value = reduce ? 0 : withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front]);

  const fling = (dir: number) => {
    owner.value = frontRef.current;
    x.value = withTiming(dir * 460, { duration: 220 }, (done) => {
      if (done) runOnJS(afterFling)(dir);
    });
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Only claim clearly horizontal drags, so the page still scrolls vertically.
        onMoveShouldSetPanResponderCapture: (_, g) => nRef.current > 1 && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderGrant: () => {
          owner.value = frontRef.current;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          x.value = g.dx;
        },
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > 90 || Math.abs(g.vx) > 0.7) fling(Math.sign(g.dx || g.vx));
          else x.value = withSpring(0, settle);
        },
        onPanResponderTerminate: () => {
          x.value = withSpring(0, settle);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const current = cards[Math.min(front, n - 1)];
  const behindIdx = n > 1 ? (front + 1) % n : -1;
  const behind = behindIdx >= 0 ? cards[behindIdx] : null;
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
        {/* Every card stays mounted under its own key and only changes role, so
            the gradient never has to redraw from scratch when the stack swaps. */}
        {cards.map((c, i) => {
          const role: Role = i === front ? 'front' : i === behindIdx ? 'back' : 'hidden';
          return (
            <StackCard key={c.key} card={c} index={i} role={role} x={x} owner={owner} reduce={reduce} top={peek} height={cardH} panHandlers={role === 'front' ? responder.panHandlers : undefined} />
          );
        })}
        {behind ? (
          // The peeking edge of the card behind: tap it to bring that group forward.
          <Pressable onPress={() => fling(-1)} accessibilityRole="button" accessibilityLabel={`Ver ${behind.title}`} style={styles.peek} />
        ) : null}
      </View>
    </View>
  );
}

type Role = 'front' | 'back' | 'hidden';

function StackCard({
  card,
  index,
  role,
  x,
  owner,
  reduce,
  top,
  height,
  panHandlers,
}: {
  card: WalletCard;
  index: number;
  role: Role;
  x: SharedValue<number>;
  owner: SharedValue<number>;
  reduce: boolean;
  top: number;
  height: number;
  panHandlers?: GestureResponderHandlers;
}) {
  const { t } = useTheme();
  const style = useAnimatedStyle(() => {
    if (role === 'front') {
      const dx = owner.value === index ? x.value : 0;
      return { opacity: 1, transform: [{ translateX: dx }, { translateY: 0 }, { scale: 1 }, { rotate: `${reduce ? 0 : dx / 22}deg` }] };
    }
    if (role === 'back') {
      const p = Math.min(1, Math.abs(x.value) / 260);
      return { opacity: 1, transform: [{ translateX: 0 }, { translateY: -BACK_LIFT * (1 - p) }, { scale: BACK_SCALE + (1 - BACK_SCALE) * p }, { rotate: '0deg' }] };
    }
    return { opacity: 0, transform: [{ translateX: 0 }, { translateY: -BACK_LIFT }, { scale: BACK_SCALE }, { rotate: '0deg' }] };
  });
  // Each card has two faces: lit (the brand gradient) in front, glass behind.
  // They cross-fade with the drag, so the card coming forward lights up as it arrives.
  const lit = useAnimatedStyle(() => ({ opacity: role === 'front' ? 1 : role === 'back' ? Math.min(1, Math.abs(x.value) / 260) : 0 }));
  const glass = useAnimatedStyle(() => ({ opacity: role === 'back' ? 1 - Math.min(1, Math.abs(x.value) / 260) : 0 }));
  const twoFaced = typeof card.content === 'function';
  return (
    <Animated.View
      style={[styles.slot, { top, height, zIndex: role === 'front' ? 2 : role === 'back' ? 1 : 0 }, styles.card, style]}
      pointerEvents={role === 'front' ? 'auto' : 'none'}
      {...panHandlers}
    >
      <Animated.View style={[{ flex: 1 }, twoFaced && lit]}>
        <Pressable onPress={card.onPress} style={{ flex: 1 }} disabled={role !== 'front' || !card.onPress}>
          {face(card, true)}
        </Pressable>
      </Animated.View>
      {twoFaced ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.glass }, glass]}>
          {face(card, false)}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute', top: PEEK, left: 0, right: 0, height: CARD_H },
  // Above the cards (they use zIndex 0-2) so the strip that shows is always tappable.
  peek: { position: 'absolute', top: 0, left: 16, right: 16, height: PEEK, zIndex: 3 },
  card: { flex: 1, borderRadius: 32, overflow: 'hidden' },
});
