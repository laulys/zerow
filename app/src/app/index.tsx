import { router } from 'expo-router';
import { FocusStatusBar } from '../components/FocusStatusBar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Aurora } from '../components/Aurora';
import { BrandGradient } from '../components/BrandGradient';
import { Money } from '../components/Money';
import { AvatarStack } from '../components/Avatar';
import { Spread } from '../components/Duo';
import { useScreen } from '../components/Screen';
import { Button, T } from '../components/ui';
import { aurora, font } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const COIN = 220;

// 1.1 → 1.2 Bienvenida. First the brand: the two halves of the coin meet (the
// bill is split, the accounts reach zero) and «Empezar» waits below. Then the
// product ("así se verá"): one sentence and the trip card it turns into.
export default function Welcome() {
  const [phase, setPhase] = useState<'intro' | 'demo'>('intro');
  const reduceMotion = useReducedMotion();
  const fade = useSharedValue(1);

  const toDemo = () => {
    if (phase === 'demo') return;
    setPhase('demo');
    fade.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) });
  };

  const introStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <View style={{ flex: 1 }}>
      {/* Both screens stay mounted, so one status bar follows the phase: dark text on the lime intro, light on 1.2. */}
      <FocusStatusBar style={phase === 'intro' ? 'dark' : 'light'} />
      {/* 1.2 is mounted from the start, under the intro, so its card's gradient is
          already drawn when you tap «Empezar»; its pieces then come in one by one. */}
      <View style={StyleSheet.absoluteFill} pointerEvents={phase === 'demo' ? 'auto' : 'none'}>
        <Demo play={phase === 'demo'} still={reduceMotion} />
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, introStyle]} pointerEvents={phase === 'intro' ? 'auto' : 'none'}>
        <Intro still={reduceMotion} onStart={toDemo} />
      </Animated.View>
    </View>
  );
}

function Half({ side, still }: { side: 'left' | 'right'; still: boolean }) {
  const dx = useSharedValue(still ? 0 : side === 'left' ? -80 : 80);
  const op = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    dx.value = withDelay(100, withSpring(0, { duration: 700, dampingRatio: 0.7 }));
    op.value = withDelay(100, withTiming(1, { duration: 300 }));
  }, [dx, op]);
  const style = useAnimatedStyle(() => ({ opacity: op.value, transform: [{ translateX: dx.value }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={COIN} height={COIN} viewBox="0 0 100 100">
        <Path d={side === 'left' ? 'M47 17A26 26 0 0 0 47 69Z' : 'M53 31A26 26 0 0 1 53 83Z'} fill={aurora.inkFixed} />
      </Svg>
    </Animated.View>
  );
}

function Intro({ still, onStart }: { still: boolean; onStart: () => void }) {
  const insets = useSafeAreaInsets();
  const split = useScreen().form === 'split';
  const mark = (
    <>
      <View style={{ width: COIN, height: COIN }} accessibilityElementsHidden>
        <Half side="left" still={still} />
        <Half side="right" still={still} />
      </View>
      <Animated.Text entering={FadeIn.delay(still ? 0 : 750).duration(300)} style={styles.wordmark}>
        zerow
      </Animated.Text>
    </>
  );
  // On the all-lime screen the button is the logo's black, not the cards' graphite.
  const start = <Button label="Empezar" bg={aurora.inkFixed} color="#FFFFFF" onPress={onStart} />;

  // Open iPhone Duo (Figma «Duo abierto · 1.1»): the coin on the left; one line about Zerow and the buttons on the right.
  if (split) {
    return (
      <BrandGradient style={{ flex: 1 }}>
        <View style={[styles.splitIntro, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.introWrap, { flex: 0, width: 353 }]}>{mark}</View>
          <Animated.View entering={FadeIn.delay(still ? 0 : 950).duration(300)} style={{ width: 353, marginLeft: 71, justifyContent: 'flex-end' }}>
            <T v="titleL" color={aurora.inkFixed}>
              Cuentas claras entre amigos.
            </T>
            <T v="body" color={aurora.inkMutedFixed} style={{ marginTop: 8, marginBottom: 20 }}>
              Divide un viaje, el piso o una cena. Zerow lleva las cuentas hasta que estéis a cero.
            </T>
            {start}
            <Button label="Ya tengo cuenta" kind="text" height={44} color={aurora.inkFixed} onPress={() => router.push('/entrar')} style={{ marginTop: 12 }} />
          </Animated.View>
        </View>
      </BrandGradient>
    );
  }

  // Figma 1.1: the coin sits a little above the middle of the space over the words (88 above, 122 below),
  // then the headline, the line about Zerow, the black «Empezar» and «Ya tengo cuenta».
  return (
    <BrandGradient style={{ flex: 1 }}>
      <View style={[styles.introWrap, { paddingTop: insets.top, paddingBottom: 34 }]}>{mark}</View>
      <Animated.View entering={FadeIn.delay(still ? 0 : 950).duration(300)} style={{ paddingHorizontal: 20, paddingBottom: insets.bottom }}>
        {/* Figma breaks the line after «claras»; the wider phones would otherwise leave «amigos.» alone. */}
        <T v="display" color={aurora.inkFixed} accessibilityRole="header">
          {'Cuentas claras\nentre amigos.'}
        </T>
        <T v="body" color={aurora.inkMutedFixed} style={{ marginTop: 12, marginBottom: 18 }}>
          Divide un viaje, el piso o una cena. Zerow lleva las cuentas hasta que estéis a cero.
        </T>
        {start}
        <HaveAccount color={aurora.inkFixed} />
      </Animated.View>
    </BrandGradient>
  );
}

/** «Ya tengo cuenta»: Figma draws it 44 tall with 17 pt type; Button only uses 17 pt from 48 up, so ask for 48 and draw 44. */
function HaveAccount({ color }: { color: string }) {
  return <Button label="Ya tengo cuenta" kind="text" height={48} color={color} onPress={() => router.push('/entrar')} style={{ height: 44, marginTop: 12 }} />;
}

/**
 * Figma's small lockup (1.2, 1.7): the coin cropped to its halves (23 × 40), 8 pt, then
 * «zerow» in Título M. The shared Lockup scales the mark with the type, so it can't draw this one.
 */
function SmallLockup({ color }: { color: string }) {
  return (
    <View style={styles.lockup} accessible accessibilityRole="header" accessibilityLabel="Zerow">
      <Svg width={23.2} height={40} viewBox="21 0 58 100">
        <Path d="M47 17A26 26 0 0 0 47 69Z" fill={color} />
        <Path d="M53 31A26 26 0 0 1 53 83Z" fill={color} />
      </Svg>
      <T v="titleM" color={color}>
        zerow
      </T>
    </View>
  );
}

/** Figma's lime glow under the cards on the gradient (#B6F03A 30 %, blur 56, 22 down, over black 40 %, blur 18, 8 down). */
function LimeCard({ radius, padding, seed, children }: { radius: number; padding: number; seed: number; children: React.ReactNode }) {
  return (
    <View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glowLime, { borderRadius: radius }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glowDark, { borderRadius: radius }]} />
      <BrandGradient style={{ borderRadius: radius, padding }} seed={seed}>
        {children}
      </BrandGradient>
    </View>
  );
}

/** Fades a piece of 1.2 in and up by 12 pt, `delay` ms after `play` turns on. Still with Reduce Motion. */
function useEntrance(play: boolean, delay: number, still: boolean) {
  const p = useSharedValue(0);
  useEffect(() => {
    if (!play) return;
    p.value = still ? 1 : withDelay(delay, withTiming(1, { duration: 360, easing: Easing.bezier(0.23, 1, 0.32, 1) }));
  }, [play, delay, still, p]);
  return useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 12 }] }));
}

function Demo({ play, still }: { play: boolean; still: boolean }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  // Bubble, then the card it turns into, then the promise, then the buttons.
  const steps = {
    logo: useEntrance(play, 0, still),
    bubble: useEntrance(play, 150, still),
    card: useEntrance(play, 550, still),
    words: useEntrance(play, 950, still),
    buttons: useEntrance(play, 1100, still),
  };
  const lockup = (
    <Animated.View style={steps.logo}>
      <SmallLockup color={t.ink} />
    </Animated.View>
  );
  const example = (
    <View accessible accessibilityLabel="Ejemplo: dices «Pagué la cena, 84 euros, entre 4» y en tu viaje Lisboa 2026 te deben 63 euros.">
      <Animated.View style={[styles.bubble, { backgroundColor: t.lime }, steps.bubble]}>
        <T v="body" color={t.onLime}>
          Pagué la cena, 84 €, entre 4
        </T>
      </Animated.View>
      <Animated.View style={[{ marginTop: 12 }, steps.card]}>
        <LimeCard radius={32} padding={20} seed={3}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <T v="titleM" color={t.inkFixed}>
                Lisboa 2026
              </T>
              <T v="caption" color={t.inkMutedFixed} style={{ fontWeight: '500' }}>
                Acabas de sumar la cena
              </T>
            </View>
            <AvatarStack ids={['tu', 'ana', 'luis', 'marta']} size={30} on="lime" />
          </View>
          <T v="label" color={t.inkMutedFixed} style={{ marginTop: 16, fontWeight: '500' }}>
            Te deben
          </T>
          <Money value={63} size={76} color={t.inkFixed} />
        </LimeCard>
      </Animated.View>
    </View>
  );
  const message = (
    <Animated.View style={steps.words}>
      <T v="titleL" color={t.ink} style={{ marginBottom: 8 }}>
        Dilo en voz alta. Zerow hace las cuentas.
      </T>
      <T v="body" color={t.inkMuted} style={{ marginBottom: 22 }}>
        Tú revisas cada gasto antes de que cuente.
      </T>
    </Animated.View>
  );
  const actions = (
    <Animated.View style={steps.buttons}>
      <Button label="Empezar" onPress={() => router.push('/empezar')} />
      <HaveAccount color={t.ink} />
    </Animated.View>
  );

  // Figma 1.2: the lockup 2 pt above the safe area, the promise and the buttons at the bottom,
  // and the example centred in the room between them (a little high, on the optical centre).
  const phone = (
    <View style={[styles.wrap, { backgroundColor: t.page, paddingTop: insets.top - 2, paddingBottom: insets.bottom }]}>
      <Aurora preset="welcome" />
      {lockup}
      <View style={styles.middle}>{example}</View>
      {message}
      {actions}
    </View>
  );

  // Open iPhone Duo (Figma «Duo abierto · 1.2»): the example on the left, the promise and the buttons on the right.
  return (
    <Spread
      phone={phone}
      left={
        <>
          {lockup}
          <View style={{ marginTop: 24 }}>{example}</View>
        </>
      }
      right={null}
      footer={
        <>
          {message}
          {actions}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  middle: { flex: 1, justifyContent: 'center', paddingTop: 24, paddingBottom: 48 },
  introWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splitIntro: { flex: 1, flexDirection: 'row', paddingLeft: 50 },
  wordmark: { fontFamily: font.medium, fontSize: 40, lineHeight: 44, letterSpacing: -0.8, color: aurora.inkFixed, marginTop: 4 },
  wrap: { flex: 1, paddingHorizontal: 20 },
  bubble: { alignSelf: 'flex-end', maxWidth: 282, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  glowLime: { backgroundColor: aurora.glow, shadowColor: aurora.glow, shadowOpacity: 0.3, shadowRadius: 28, shadowOffset: { width: 0, height: 22 } },
  glowDark: { backgroundColor: '#1E1E22', shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 9, shadowOffset: { width: 0, height: 8 } },
});
