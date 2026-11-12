import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, StyleSheet, useWindowDimensions, View, type GestureResponderHandlers } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { gradientStops } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Frost } from './Frost';

/** `content(front)`: the lit face (true) and the glass strip's face (false). */
export type WalletCard = { key: string; title: string; content: ReactNode | ((front: boolean) => ReactNode); onPress?: () => void };
const face = (c: WalletCard, front: boolean) => (typeof c.content === 'function' ? c.content(front) : c.content);

// Measures from the Figma component «Pila de grupos · iPhone».
const CARD_H = 254;
const PEEK = 44;
const STRIP_H = 90;
const STRIP_INSET = 16;
const R_FRONT = 32;
const R_STRIP = 28;
// The prototype's Smart Animate: 420 ms on the iOS drawer curve.
const morph = { duration: 420, easing: Easing.bezier(0.32, 0.72, 0, 1) };
const settle = { damping: 17, stiffness: 220, mass: 0.9 } as const;

/**
 * Open groups as a stack, like the v3 prototype: the group in front is a card
 * on the brand gradient and the next one is a glass strip peeking above it.
 * Changing group is a transformation, not a swipe-away: the strip grows down
 * into the lit card while the old front shrinks up into the strip. Swipe the
 * front card sideways, tap the strip, or use VoiceOver's swipe up/down.
 * Built on PanResponder, so it needs no extra native module.
 */
export function WalletStack({
  cards,
  onFrontChange,
  cardHeight = CARD_H,
  initialKey,
}: {
  cards: WalletCard[];
  onFrontChange?: (key: string) => void;
  cardHeight?: number;
  /** The group to start with in front (the open Duo opening a group from elsewhere). */
  initialKey?: string;
}) {
  const reduce = useReducedMotion();
  const [front, setFront] = useState(() =>
    Math.max(
      0,
      cards.findIndex((c) => c.key === initialKey),
    ),
  );
  // The sideways drag, and which card it belongs to: after the swap the old
  // front carries it back to 0 while it shrinks, so the new front never jumps.
  const x = useSharedValue(0);
  const owner = useSharedValue(0);
  const n = cards.length;
  const nRef = useRef(n);
  nRef.current = n;
  const frontRef = useRef(front);
  frontRef.current = front;

  const advance = (dir: 1 | -1) => {
    if (nRef.current < 2) return;
    Haptics.selectionAsync();
    owner.value = frontRef.current;
    x.value = reduce ? 0 : withTiming(0, morph);
    setFront((f) => (f + dir + nRef.current) % nRef.current);
  };
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Only claim clearly horizontal drags, so the page still scrolls vertically.
        onMoveShouldSetPanResponderCapture: (_, g) => nRef.current > 1 && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
        onPanResponderGrant: () => {
          owner.value = frontRef.current;
        },
        onPanResponderTerminationRequest: () => false,
        // The card follows the finger with resistance: it hints at the change, it doesn't leave.
        onPanResponderMove: (_, g) => {
          x.value = g.dx * 0.35;
        },
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > 70 || Math.abs(g.vx) > 0.6) advanceRef.current(g.dx + g.vx < 0 ? 1 : -1);
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
  // The open Duo shows the front group in the detail pane.
  useEffect(() => {
    onFrontChange?.(current.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.key]);
  const behindIdx = n > 1 ? (front + 1) % n : -1;
  const behind = behindIdx >= 0 ? cards[behindIdx] : null;
  // Larger text needs a taller card and a taller strip; both grow with the
  // reading size (up to 1.5×) instead of clipping.
  const { fontScale } = useWindowDimensions();
  const grow = Math.min(Math.max(fontScale, 1), 1.5);
  const geo = { cardH: Math.round(cardHeight * grow), peek: behind ? Math.round(PEEK * grow) : 0, stripH: Math.round(STRIP_H * grow) };

  return (
    <View
      style={{ height: geo.cardH + geo.peek }}
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
          the gradient never has to redraw from scratch when the stack changes. */}
      {cards.map((c, i) => {
        const role: Role = i === front ? 'front' : i === behindIdx ? 'back' : 'hidden';
        return <StackCard key={c.key} card={c} index={i} role={role} x={x} owner={owner} reduce={reduce} geo={geo} panHandlers={role === 'front' ? responder.panHandlers : undefined} />;
      })}
      {behind ? (
        // The strip that peeks above the front card: tap it to bring that group forward.
        <Pressable onPress={() => advance(1)} accessibilityRole="button" accessibilityLabel={`Ver ${behind.title}`} style={[styles.peek, { height: geo.peek }]} />
      ) : null}
    </View>
  );
}

type Role = 'front' | 'back' | 'hidden';
type Geo = { cardH: number; peek: number; stripH: number };

function StackCard({
  card,
  index,
  role,
  x,
  owner,
  reduce,
  geo,
  panHandlers,
}: {
  card: WalletCard;
  index: number;
  role: Role;
  x: SharedValue<number>;
  owner: SharedValue<number>;
  reduce: boolean;
  geo: Geo;
  panHandlers?: GestureResponderHandlers;
}) {
  const { t } = useTheme();
  // 1 = the lit card in front, 0 = the glass strip behind. Hidden cards sit at
  // the strip's place, invisible, so a third group comes in from there.
  const p = useSharedValue(role === 'front' ? 1 : 0);
  const shown = useSharedValue(role === 'hidden' ? 0 : 1);
  useEffect(() => {
    const to = role === 'front' ? 1 : 0;
    p.value = reduce ? to : withTiming(to, morph);
    shown.value = reduce ? (role === 'hidden' ? 0 : 1) : withTiming(role === 'hidden' ? 0 : 1, { duration: 220 });
  }, [role, reduce, p, shown]);

  const { cardH, peek, stripH } = geo;
  const box = useAnimatedStyle(() => {
    const k = p.value;
    const inset = STRIP_INSET * (1 - k);
    const dx = owner.value === index ? x.value : 0;
    return {
      top: peek * k,
      left: inset,
      right: inset,
      height: stripH + (cardH - stripH) * k,
      opacity: shown.value,
      transform: [{ translateX: dx }, { rotate: `${reduce ? 0 : dx / 40}deg` }],
    };
  });
  const clip = useAnimatedStyle(() => ({ borderRadius: R_STRIP + (R_FRONT - R_STRIP) * p.value }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, (p.value - 0.5) * 2) }));
  // The two faces cross-fade in the middle of the move, so the card lights up as it arrives.
  const lit = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, (p.value - 0.1) / 0.45)) }));
  // An opaque lime under the lit face that turns on as soon as the strip starts to
  // grow, so the card on its way back never shows through it mid-move.
  const backing = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 6) }));
  const glass = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, Math.max(0, (p.value - 0.25) / 0.6)) }));
  const twoFaced = typeof card.content === 'function';

  return (
    <Animated.View style={[styles.slot, { zIndex: role === 'front' ? 2 : role === 'back' ? 1 : 0, shadowColor: t.lime }, box]} pointerEvents={role === 'front' ? 'auto' : 'none'} {...panHandlers}>
      {/* Figma: the card in front glows lime underneath (#B6F03A 30 %, blur 56, 22 down) over a darker
          shadow (black 40 %, blur 18, 8 down). Drawn by two solid layers the card covers. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glowLime, clip, glowStyle]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glowDark, clip, glowStyle]} />
      <Animated.View style={[styles.clip, clip]}>
        {twoFaced ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glass]}>
            <Frost fill={t.glass} radius={0} />
            <View style={{ height: cardH }}>{face(card, false)}</View>
          </Animated.View>
        ) : null}
        {twoFaced ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: gradientStops[2] }, backing]} /> : null}
        <Animated.View style={[styles.face, { height: cardH }, twoFaced && lit]}>
          <Pressable onPress={card.onPress} style={{ flex: 1 }} disabled={role !== 'front' || !card.onPress}>
            {face(card, true)}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: { position: 'absolute' },
  glowLime: { backgroundColor: '#B6F03A', shadowColor: '#B6F03A', shadowOpacity: 0.3, shadowRadius: 28, shadowOffset: { width: 0, height: 22 } },
  glowDark: { backgroundColor: '#1E1E22', shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 9, shadowOffset: { width: 0, height: 8 } },
  clip: { flex: 1, overflow: 'hidden' },
  // Laid out at the full card height and revealed by the clip as the card grows.
  face: { position: 'absolute', top: 0, left: 0, right: 0 },
  // Above the cards (they use zIndex 0-2) so the strip that shows is always tappable.
  peek: { position: 'absolute', top: 0, left: STRIP_INSET, right: STRIP_INSET, zIndex: 3 },
});
