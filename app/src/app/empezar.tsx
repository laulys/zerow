import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Aurora } from '../components/Aurora';
import { Avatar, AvatarStack } from '../components/Avatar';
import { BrandGradient } from '../components/BrandGradient';
import { Icon } from '../components/Icon';
import { Money, RollingMoney } from '../components/Money';
import { Orb } from '../components/Orb';
import { useScreen } from '../components/Screen';
import { Button, Card, Hairline, T, Tap } from '../components/ui';
import { Fact } from '../components/Fact';
import { light } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const STEPS = 3;

// 1.3 → 1.6 Onboarding, three steps: tell it like you talk, one question before
// anything counts, and the trip closing into a summary. "Saltar" is always there.
export default function Onboarding() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const done = () => {
    router.replace('/grupos');
    router.push('/grupo-nuevo');
  };
  const next = () => (step < STEPS - 1 ? setStep(step + 1) : done());

  // Figma: the step row sits right at the safe area (y 62) and the last button ends on the home indicator's inset.
  return (
    <View style={{ flex: 1, backgroundColor: t.page, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Aurora preset="onboarding" />
      <StatusBar style="light" />
      <View style={styles.top}>
        <View style={styles.dots} accessible accessibilityLabel={`Paso ${step + 1} de ${STEPS}`}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: t.ink }, i === step ? { width: 24 } : { opacity: 0.35 }]} />
          ))}
          <T v="caption" color={t.inkMuted}>
            {' '}
            Paso {step + 1} de {STEPS}
          </T>
        </View>
        <Tap onPress={() => router.replace('/grupos')} accessibilityRole="button" accessibilityLabel="Saltar la introducción" style={styles.skip}>
          <T v="labelStrong" color={t.ink}>
            Saltar
          </T>
        </Tap>
      </View>

      <Animated.View key={step} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={{ flex: 1, paddingHorizontal: 20 }}>
        {step === 0 ? <TellIt onNext={next} /> : step === 1 ? <OneQuestion onNext={next} /> : <Closing onNext={next} />}
      </Animated.View>
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

/** Figma «Destello»: a four-point star, inner radius 32 %. */
function Sparkle({ size, color }: { size: number; color: string }) {
  const c = size / 2;
  const i = c * 0.32 * Math.SQRT1_2;
  const d = `M${c} 0L${c + i} ${c - i}L${size} ${c}L${c + i} ${c + i}L${c} ${size}L${c - i} ${c + i}L0 ${c}L${c - i} ${c - i}Z`;
  return (
    <Svg width={size} height={size} accessibilityElementsHidden>
      <Path d={d} fill={color} />
    </Svg>
  );
}

/** Figma «Fundido» (1.3): the page fades in under the button (clear → page at 60 %), 170 pt tall from the bottom edge. */
function Fade() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.fade, { bottom: -insets.bottom }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="fundido" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.page} stopOpacity={0} />
            <Stop offset="0.6" stopColor={t.page} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#fundido)" />
      </Svg>
    </View>
  );
}

/** When each line of the 1.3 conversation lands (ms). Zerow «types» for 650 ms before its answers. */
const CHAT = { you1: 250, zerow1: 1250, you2: 1900, zerow2: 2900, card: 3450 };
const OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** The prepared card: rises 16 pt from 97 % as it fades in, on a strong ease-out. */
const arrive = (delay: number) => () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 16 }, { scale: 0.97 }] },
    animations: {
      opacity: withDelay(delay, withTiming(1, { duration: 320, easing: OUT })),
      transform: [{ translateY: withDelay(delay, withTiming(0, { duration: 520, easing: OUT })) }, { scale: withDelay(delay, withTiming(1, { duration: 520, easing: OUT })) }],
    },
  };
};

/**
 * One chat line (Figma 1.3): yours lime on the right, Zerow's raised graphite on the left, both
 * round (22) and at most 282 wide. It pops from its corner (bottom right or bottom left) from 90 %
 * on a soft spring. With `typing`, three dots show in its place for 650 ms first.
 */
function Bubble({ mine, at, typing, children }: { mine?: boolean; at: number; typing?: boolean; children: ReactNode }) {
  const { t } = useTheme();
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  const dots = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    if (typing) dots.value = withDelay(at - 650, withSequence(withTiming(1, { duration: 160, easing: OUT }), withDelay(400, withTiming(0, { duration: 120 }))));
    p.value = withDelay(at, withSpring(1, { damping: 15, stiffness: 200, mass: 0.8 }));
  }, [reduce, typing, at, p, dots]);
  const line = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 1.5), transform: [{ translateY: (1 - p.value) * 8 }, { scale: 0.9 + 0.1 * p.value }] }));
  const typingStyle = useAnimatedStyle(() => ({ opacity: dots.value, transform: [{ scale: 0.85 + 0.15 * dots.value }] }));
  return (
    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: 282 }}>
      {typing ? (
        <Animated.View style={[styles.typing, { backgroundColor: t.panelRaised }, typingStyle]} pointerEvents="none" accessibilityElementsHidden>
          <TypingDots color={t.inkMuted} />
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.bubble, { backgroundColor: mine ? t.lime : t.panelRaised, transformOrigin: mine ? 'right bottom' : 'left bottom' }, line]}>
        <T v="body" color={mine ? t.onLime : t.ink}>
          {children}
        </T>
      </Animated.View>
    </View>
  );
}

/** Three dots that rise and fall in turn while Zerow «types». */
function TypingDots({ color }: { color: string }) {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1);
  }, [phase]);
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} phase={phase} offset={i * 0.18} color={color} />
      ))}
    </View>
  );
}

function Dot({ phase, offset, color }: { phase: SharedValue<number>; offset: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const x = (((phase.value - offset) % 1) + 1) % 1;
    const up = x < 0.4 ? Math.sin((x / 0.4) * Math.PI) : 0;
    return { opacity: 0.45 + 0.55 * up, transform: [{ translateY: -3 * up }] };
  });
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }, style]} />;
}

/** 1.3: a short conversation that ends in an expense to review. */
function TellIt({ onNext }: { onNext: () => void }) {
  const { t } = useTheme();
  const reduce = useReducedMotion();
  const words = (
    <>
      <T v="titleL" color={t.ink} style={{ marginTop: 12 }} accessibilityRole="header">
        Cuéntaselo como hablas
      </T>
      <T v="body" color={t.inkMuted} style={{ marginTop: 8 }}>
        Escribe o dicta lo que pagaste. Si falta un dato, Zerow te lo pregunta: nunca se inventa un importe.
      </T>
    </>
  );
  // Like a real chat: your lines pop up from the bottom right; Zerow «types» (three dots) before each answer;
  // the card it prepared arrives last, with a light tap. Everything is laid out from the start, so nothing jumps.
  useEffect(() => {
    if (reduce) return;
    const id = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), CHAT.card + 200);
    return () => clearTimeout(id);
  }, [reduce]);
  const talk = (
    <>
      <Bubble mine at={CHAT.you1}>
        Pagué el taxi para Ana y para mí
      </Bubble>
      <Bubble at={CHAT.zerow1} typing>
        ¿Cuánto fue? Prefiero preguntarte a adivinarlo.
      </Bubble>
      <Bubble mine at={CHAT.you2}>
        45 dólares
      </Bubble>
      <Bubble at={CHAT.zerow2} typing>
        Listo. Te lo dejo para que lo revises.
      </Bubble>
      <Animated.View entering={reduce ? undefined : arrive(CHAT.card)}>
        <LimeCard radius={28} padding={16} seed={9}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Sparkle size={14} color={light.inkFixed} />
            <T v="caption" color={light.inkMutedFixed} style={{ fontWeight: '600' }}>
              Por revisar · aún no cuenta
            </T>
          </View>
          {/* Figma aligns the title and the amount on their baseline; both line boxes end together. */}
          <View style={[styles.rowBetween, { alignItems: 'flex-end', marginTop: 12 }]}>
            <T v="titleM" color={light.inkFixed}>
              Taxi al aeropuerto
            </T>
            <Money value={45} size={36} color={light.inkFixed} currency="USD" />
          </View>
          <T v="label" color={light.inkMutedFixed} style={{ marginTop: 12, fontWeight: '500' }}>
            Pagaste tú · 20,18 € cada uno, entre 2
          </T>
        </LimeCard>
      </Animated.View>
    </>
  );
  return (
    <TwoUp
      visual={talk}
      words={words}
      actions={<Button label="Siguiente" onPress={onNext} />}
      phone={
        <>
          {words}
          {/* The conversation sits in the middle of the room under the heading, a little high. */}
          <View style={styles.talk}>{talk}</View>
          <Fade />
          <Button label="Siguiente" onPress={onNext} />
        </>
      }
    />
  );
}

/** 1.4: the one question Zerow asks before anything is added. */
function OneQuestion({ onNext }: { onNext: () => void }) {
  const { t } = useTheme();
  const reduce = useReducedMotion();
  // Each piece rises into place (16 pt, from 97 %), one after another.
  const at = (ms: number) => (reduce ? undefined : arrive(ms));
  const question = (
    <>
      <Animated.View entering={at(0)}>
        <Orb size={88} state="listening" label="Zerow pregunta" />
      </Animated.View>
      <Animated.View entering={at(150)}>
        {/* Figma breaks the question in three lines by hand. */}
        <T v="titleL" color={t.ink} style={{ marginTop: 24 }} accessibilityRole="header">
          {'¿Pagaste el taxi\nal aeropuerto, 45 US$,\npara Ana y para ti?'}
        </T>
        <T v="body" color={t.inkMuted} style={{ marginTop: 12 }}>
          Nada suma hasta que respondes.
        </T>
      </Animated.View>
    </>
  );
  const facts = (
    <Animated.View entering={at(350)}>
      <Card style={{ paddingVertical: 4 }}>
        <Fact label="Pagó" value="Tú" faces={['tu']} />
        <Hairline />
        <Fact label="Entre" value="Ana y tú" faces={['ana', 'tu']} />
        <Hairline />
        <Fact label="A cada uno" value="20,18 €" amount />
      </Card>
    </Animated.View>
  );
  const answers = (
    <>
      <Button label="Sí, sumarlo" icon="check" onPress={onNext} />
      <Button label="No es así" kind="secondary" style={{ marginTop: 12 }} onPress={onNext} />
    </>
  );
  return (
    <TwoUp
      visual={question}
      words={facts}
      actions={answers}
      phone={
        <>
          {/* The question and its facts sit in the middle of the room above the answers, a little high. */}
          <View style={styles.middle}>
            {question}
            <View style={{ marginTop: 24 }}>{facts}</View>
          </View>
          {answers}
        </>
      }
    />
  );
}

/** The open card stepping back: fades and shrinks to 97 % in 160 ms (exits are quicker than entrances). */
const stepBack = () => {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }] },
    animations: { opacity: withTiming(0, { duration: 160, easing: OUT }), transform: [{ scale: withTiming(0.97, { duration: 160, easing: OUT }) }] },
  };
};
/** The summary coming forward: from 96 % and 10 pt low to its place, on a soft spring. */
const comeForward = (delay: number) => () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 10 }, { scale: 0.96 }] },
    animations: {
      opacity: withDelay(delay, withTiming(1, { duration: 260, easing: OUT })),
      transform: [{ translateY: withDelay(delay, withSpring(0, { damping: 16, stiffness: 180 })) }, { scale: withDelay(delay, withSpring(1, { damping: 16, stiffness: 180 })) }],
    },
  };
};
/** The «A cero» seal pressing in: from 70 % with a little bounce. */
const seal = (delay: number) => () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.7 }] },
    animations: { opacity: withDelay(delay, withTiming(1, { duration: 180, easing: OUT })), transform: [{ scale: withDelay(delay, withSpring(1, { damping: 10, stiffness: 260 })) }] },
  };
};

/** 1.5 → 1.6: the open trip (a glass card) becomes its closing summary (on the gradient). */
function Closing({ onNext }: { onNext: () => void }) {
  const { t } = useTheme();
  const reduce = useReducedMotion();
  // The story in three beats: the open trip, everyone pays (36,23 € rolls down to 0,00 €),
  // then the open card steps back and the summary arrives on the gradient with its «A cero» seal.
  const [paidUp, setPaidUp] = useState(reduce);
  const [closed, setClosed] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    const a = setTimeout(() => setPaidUp(true), 900);
    const b = setTimeout(() => {
      setClosed(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1900);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [reduce]);
  // Figma 1.5 «Viaje · Lisboa»: white 7 % glass, radius 32, padding 20.
  const open = (
    <Animated.View key="open" exiting={reduce ? undefined : stepBack}>
      <Card style={{ borderRadius: 32, padding: 20 }}>
        <T v="titleM" color={t.ink}>
          Lisboa 2026
        </T>
        <T v="caption" color={t.inkMuted} style={{ marginTop: 8 }}>
          12–18 nov · en curso
        </T>
        <T v="label" color={t.inkMuted} style={{ marginTop: 24, fontWeight: '500' }}>
          Te deben
        </T>
        <View style={{ marginTop: 8 }}>
          <RollingMoney value={paidUp ? 0 : 36.23} size={56} color={t.ink} />
        </View>
        <T v="label" color={paidUp ? t.lime : t.ink} style={{ marginTop: 8, fontWeight: '500' }}>
          {paidUp ? 'Todos han pagado' : '3 pagos pendientes'}
        </T>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 30 }} importantForAccessibility="no-hide-descendants">
          {(['tu', 'ana', 'luis', 'marta'] as const).map((id) => (
            <Avatar key={id} id={id} size={32} bg={t.disc} inset />
          ))}
        </View>
      </Card>
    </Animated.View>
  );
  // Figma 1.6 «Resumen · Lisboa»: on the gradient, with the «A cero» badge and «Compartir».
  const summary = (
    <Animated.View key="closed" entering={reduce ? undefined : comeForward(140)}>
      <LimeCard radius={32} padding={20} seed={5}>
        <View style={[styles.rowBetween, { alignItems: 'flex-start' }]}>
          <View>
            <T v="titleM" color={light.inkFixed}>
              Lisboa 2026
            </T>
            <T v="caption" color={light.inkMutedFixed} style={{ fontWeight: '500' }}>
              12–18 nov · 4 personas
            </T>
          </View>
          <Animated.View entering={reduce ? undefined : seal(560)} style={[styles.badge, { backgroundColor: t.onLimeButton }]}>
            <Icon name="check" size={16} weight={2.5} color={t.lime} />
            <T v="caption" color={t.lime} style={{ fontWeight: '600' }}>
              A cero
            </T>
          </Animated.View>
        </View>
        <View style={{ marginTop: 12 }}>
          <Money value={485.44} size={56} color={light.inkFixed} />
        </View>
        <T v="caption" color={light.inkMutedFixed} style={{ marginTop: 12, fontWeight: '500' }}>
          en 4 gastos · saldado con 3 pagos
        </T>
        <View style={[styles.rowBetween, { marginTop: 12, paddingTop: 8 }]}>
          <AvatarStack ids={['tu', 'ana', 'luis', 'marta']} size={32} gap={-10} on="lime" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Icon name="share" size={20} weight={2} color={light.inkFixed} />
            <T v="labelStrong" color={light.inkFixed}>
              Compartir
            </T>
          </View>
        </View>
      </LimeCard>
    </Animated.View>
  );
  const trip = closed ? summary : open;
  const words = (
    <>
      <T v="titleL" color={t.ink} accessibilityRole="header">
        El viaje se cierra con un resumen
      </T>
      <T v="body" color={t.inkMuted} style={{ marginTop: 8, marginBottom: 24 }}>
        Cuando todos han pagado, el viaje queda a cero y se convierte en un resumen para compartir.
      </T>
    </>
  );
  const action = <Button label="Crear mi primer grupo" onPress={onNext} />;
  return (
    <TwoUp
      visual={trip}
      words={null}
      actions={
        <>
          {words}
          {action}
        </>
      }
      phone={
        <>
          {/* Figma centres the card between the step row and the words. */}
          <View style={{ flex: 1, justifyContent: 'center' }}>{trip}</View>
          {words}
          {action}
        </>
      }
    />
  );
}

/**
 * Open iPhone Duo (Figma «Duo abierto · 1.3–1.6»): the visual in the left
 * column (353 at 50) and the words and buttons in the right one (353 at 474).
 * Elsewhere, the step's own phone layout.
 */
function TwoUp({ visual, words, actions, phone }: { visual: React.ReactNode; words: React.ReactNode; actions: React.ReactNode; phone: React.ReactNode }) {
  const split = useScreen().form === 'split';
  if (!split) return <>{phone}</>;
  return (
    <View style={styles.two}>
      <View style={[styles.col, { justifyContent: 'center', gap: 12 }]}>{visual}</View>
      <View style={[styles.col, { marginLeft: 71 }]}>
        <View style={{ flex: 1, justifyContent: 'center' }}>{words}</View>
        {actions}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  two: { flex: 1, flexDirection: 'row', paddingLeft: 30 },
  col: { width: 353 },
  // Figma «Paso»: 20 in from both edges, 44 tall; «Saltar» keeps 12 pt of padding inside that.
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 44 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  skip: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
  bubble: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 },
  typing: { position: 'absolute', left: 0, top: 0, height: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: 'center' },
  talk: { flex: 1, justifyContent: 'center', gap: 12, paddingTop: 20, paddingBottom: 56 },
  middle: { flex: 1, justifyContent: 'center', paddingBottom: 40 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 15, paddingHorizontal: 12, height: 30 },
  fade: { position: 'absolute', left: -20, right: -20, height: 170 },
  glowLime: { backgroundColor: '#B6F03A', shadowColor: '#B6F03A', shadowOpacity: 0.3, shadowRadius: 28, shadowOffset: { width: 0, height: 22 } },
  glowDark: { backgroundColor: '#1E1E22', shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 9, shadowOffset: { width: 0, height: 8 } },
});
