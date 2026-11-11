import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BrandGradient } from '../components/BrandGradient';
import { Money } from '../components/Money';
import { Orb } from '../components/Orb';
import { Button, Lockup, T } from '../components/ui';
import { font, light } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const COIN = 168;

// 1.1 → 1.2 Bienvenida. First the brand: the two halves of the coin meet (the
// bill is split, the accounts reach zero). Then the product: a sentence becomes
// a draft. Tapping during the intro skips straight to the demo.
export default function Welcome() {
  const [phase, setPhase] = useState<'intro' | 'demo'>('intro');
  const reduceMotion = useReducedMotion();
  const fade = useSharedValue(1);

  const toDemo = () => {
    if (phase === 'demo') return;
    setPhase('demo');
    fade.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) });
  };

  useEffect(() => {
    const id = setTimeout(toDemo, reduceMotion ? 900 : 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const introStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <View style={{ flex: 1 }}>
      {phase === 'demo' ? <Demo /> : null}
      <Animated.View style={[StyleSheet.absoluteFill, introStyle]} pointerEvents={phase === 'intro' ? 'auto' : 'none'}>
        <Pressable style={{ flex: 1 }} onPress={toDemo} accessibilityRole="button" accessibilityLabel="Zerow. Toca para continuar">
          <Intro still={reduceMotion} />
        </Pressable>
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
        <Path d={side === 'left' ? 'M47 17A26 26 0 0 0 47 69Z' : 'M53 31A26 26 0 0 1 53 83Z'} fill={light.inkFixed} />
      </Svg>
    </Animated.View>
  );
}

function Intro({ still }: { still: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <BrandGradient style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <View style={[styles.introWrap, { paddingTop: insets.top }]}>
        <View style={{ width: COIN, height: COIN }} accessibilityElementsHidden>
          <Half side="left" still={still} />
          <Half side="right" still={still} />
        </View>
        <Animated.Text entering={FadeIn.delay(still ? 0 : 750).duration(300)} style={styles.wordmark}>
          zerow
        </Animated.Text>
      </View>
    </BrandGradient>
  );
}

function Demo() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const at = (ms: number) => FadeInDown.delay(ms).duration(300);
  return (
    <View style={[styles.wrap, { backgroundColor: t.page, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }]}>
      <StatusBar style="light" />
      <Animated.View entering={FadeIn.duration(300)}>
        <Lockup color={t.ink} size={30} />
      </Animated.View>

      <View style={{ marginTop: 44 }} accessible accessibilityLabel="Ejemplo: dices «Pagué la cena, 84 euros, entre 4» y Zerow prepara un borrador: 21 euros cada uno.">
        <Animated.View entering={at(150)} style={[styles.bubble, { backgroundColor: t.lime }]}>
          <T v="body" color={t.onLime}>
            Pagué la cena, 84 €, entre 4
          </T>
        </Animated.View>
        <Animated.View entering={at(600)} style={styles.speaker}>
          <Orb size={16} />
          <T v="caption" color={t.inkMuted}>
            Zerow
          </T>
        </Animated.View>
        <Animated.View entering={at(850)}>
          <BrandGradient style={styles.card} seed={9}>
            <View style={styles.speaker}>
              <Orb size={18} onGradient />
              <T v="caption" color={light.inkFixed}>
                Borrador de Zerow · aún no cuenta
              </T>
            </View>
            <View style={styles.rowBetween}>
              <T v="titleM" color={light.inkFixed}>
                Cena
              </T>
              <Money value={84} size={34} color={light.inkFixed} centsColor={light.inkMutedFixed} />
            </View>
            <T v="caption" color={light.inkMutedFixed} style={{ marginTop: 4 }}>
              Pagaste tú · 21,00 € cada uno, entre 4
            </T>
          </BrandGradient>
        </Animated.View>
      </View>

      <View style={{ flex: 1 }} />
      <Animated.View entering={at(1250)}>
        <T v="display" color={t.ink} style={{ marginBottom: 10 }}>
          Dilo en voz alta. Zerow hace las cuentas.
        </T>
        <T v="body" color={t.inkMuted} style={{ marginBottom: 24 }}>
          Nada cuenta hasta que lo confirmas.
        </T>
      </Animated.View>
      <Animated.View entering={at(1350)}>
        <Button label="Empezar" icon="arrow-right" onPress={() => router.replace('/grupos')} />
        <Button label="Ya tengo cuenta" kind="text" height={48} onPress={() => router.push('/entrar')} style={{ marginTop: 6 }} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  introWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: font.medium, fontSize: 40, letterSpacing: -1.6, color: light.inkFixed, marginTop: 10 },
  wrap: { flex: 1, paddingHorizontal: 20 },
  bubble: { alignSelf: 'flex-end', borderRadius: 20, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10 },
  speaker: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, marginBottom: 6, marginLeft: 2 },
  card: { borderRadius: 26, padding: 18, paddingTop: 0 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
});
