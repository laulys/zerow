import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '../components/Aurora';
import { Avatar, AvatarStack } from '../components/Avatar';
import { BrandGradient } from '../components/BrandGradient';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';
import { Orb } from '../components/Orb';
import { Button, Card, Hairline, T, Tap } from '../components/ui';
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

  return (
    <View style={{ flex: 1, backgroundColor: t.page, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }}>
      <Aurora height={420} strength={0.8} />
      <StatusBar style="light" />
      <View style={styles.top}>
        <View style={styles.dots} accessible accessibilityLabel={`Paso ${step + 1} de ${STEPS}`}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i === step ? { width: 20, backgroundColor: t.ink } : { backgroundColor: t.inkMuted, opacity: 0.6 }]} />
          ))}
          <T v="caption" color={t.inkMuted} style={{ marginLeft: 8 }}>
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

/** 1.3: a short conversation that ends in an expense to review. */
function TellIt({ onNext }: { onNext: () => void }) {
  const { t } = useTheme();
  const reduce = useReducedMotion();
  const at = (ms: number) => (reduce ? undefined : FadeInDown.delay(ms).duration(300));
  const bubble = (mine: boolean) => [
    styles.bubble,
    mine ? { alignSelf: 'flex-end' as const, backgroundColor: t.lime, borderBottomRightRadius: 6 } : { alignSelf: 'flex-start' as const, backgroundColor: t.card, borderBottomLeftRadius: 6 },
  ];
  return (
    <>
      <T v="titleL" color={t.ink} style={{ marginTop: 16 }} accessibilityRole="header">
        Cuéntaselo como hablas
      </T>
      <T v="body" color={t.inkMuted} style={{ marginTop: 8 }}>
        Escribe o dicta lo que pagaste. Si falta un dato, Zerow te lo pregunta: nunca se inventa un importe.
      </T>
      <View style={{ flex: 1, justifyContent: 'center', gap: 12 }}>
        <Animated.View entering={at(150)} style={bubble(true)}>
          <T v="body" color={t.onLime}>
            Pagué el taxi para Ana y para mí
          </T>
        </Animated.View>
        <Animated.View entering={at(650)} style={bubble(false)}>
          <T v="body" color={t.ink}>
            ¿Cuánto fue? Prefiero preguntarte a adivinarlo.
          </T>
        </Animated.View>
        <Animated.View entering={at(1150)} style={bubble(true)}>
          <T v="body" color={t.onLime}>
            45 dólares
          </T>
        </Animated.View>
        <Animated.View entering={at(1650)} style={bubble(false)}>
          <T v="body" color={t.ink}>
            Listo. Te lo dejo para que lo revises.
          </T>
        </Animated.View>
        <Animated.View entering={at(2050)}>
          <BrandGradient style={styles.review} seed={9}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Orb size={18} onGradient />
              <T v="caption" color={light.inkFixed}>
                Por revisar · aún no cuenta
              </T>
            </View>
            <View style={[styles.rowBetween, { marginTop: 8 }]}>
              <T v="titleM" color={light.inkFixed}>
                Taxi al hotel
              </T>
              <Money value={45} size={36} color={light.inkFixed} centsColor={light.inkMutedFixed} currency="USD" />
            </View>
            <T v="label" color={light.inkMutedFixed} style={{ marginTop: 4 }}>
              Pagaste tú · 20,18 € cada uno, entre 2
            </T>
          </BrandGradient>
        </Animated.View>
      </View>
      <Button label="Siguiente" onPress={onNext} />
    </>
  );
}

/** 1.4: the one question Zerow asks before anything is added. */
function OneQuestion({ onNext }: { onNext: () => void }) {
  const { t } = useTheme();
  const reduce = useReducedMotion();
  const at = (ms: number) => (reduce ? undefined : FadeInDown.delay(ms).duration(300));
  return (
    <>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Animated.View entering={at(0)}>
          <Orb size={88} state="listening" label="Zerow pregunta" />
        </Animated.View>
        <Animated.View entering={at(150)}>
          <T v="titleL" color={t.ink} style={{ marginTop: 24 }} accessibilityRole="header">
            ¿Pagaste el taxi al hotel, 45 US$, para Ana y para ti?
          </T>
          <T v="body" color={t.inkMuted} style={{ marginTop: 12 }}>
            Nada suma hasta que respondes.
          </T>
        </Animated.View>
        <Animated.View entering={at(350)} style={{ marginTop: 24 }}>
          <Card style={{ paddingVertical: 4 }}>
            <Fact label="Pagó" value="Tú" faces={['tu']} />
            <Hairline color={t.line} />
            <Fact label="Entre" value="Ana y tú" faces={['ana', 'tu']} />
            <Hairline color={t.line} />
            <Fact label="A cada uno" value="20,18 €" strong />
          </Card>
        </Animated.View>
      </View>
      <Button label="Sí, sumarlo" icon="check" onPress={onNext} />
      <Button label="No es así" kind="secondary" style={{ marginTop: 12 }} onPress={onNext} />
    </>
  );
}

function Fact({ label, value, faces, strong }: { label: string; value: string; faces?: ('tu' | 'ana')[]; strong?: boolean }) {
  const { t } = useTheme();
  return (
    <View style={styles.fact} accessible accessibilityLabel={`${label}: ${value}`}>
      <T v="label" color={t.inkMuted} style={{ flex: 1 }}>
        {label}
      </T>
      {faces?.map((id) => (
        <Avatar key={id} id={id} size={24} />
      ))}
      <T v={strong ? 'bodyStrong' : 'labelStrong'} color={t.ink} style={{ marginLeft: 4, fontVariant: ['tabular-nums'] }}>
        {value}
      </T>
    </View>
  );
}

/** 1.5 → 1.6: the open trip becomes its closing summary. */
function Closing({ onNext }: { onNext: () => void }) {
  const { t } = useTheme();
  const reduce = useReducedMotion();
  const [closed, setClosed] = useState(reduce);
  useEffect(() => {
    if (reduce) return;
    const id = setTimeout(() => setClosed(true), 1600);
    return () => clearTimeout(id);
  }, [reduce]);
  return (
    <>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <BrandGradient style={styles.trip} seed={closed ? 5 : 3}>
          <View style={styles.rowBetween}>
            <View>
              <T v="titleM" color={light.inkFixed}>
                Lisboa 2026
              </T>
              <T v="caption" color={light.inkMutedFixed} style={{ marginTop: 2 }}>
                {closed ? '12–18 nov · 4 personas' : '12–18 nov · en curso'}
              </T>
            </View>
            {closed ? (
              <Animated.View entering={FadeIn.duration(300)} style={[styles.badge, { backgroundColor: t.onLimeButton }]}>
                <Icon name="check" size={14} color={t.lime} />
                <T v="caption" color={t.lime} style={{ fontWeight: '600' }}>
                  A cero
                </T>
              </Animated.View>
            ) : null}
          </View>
          {closed ? (
            <Animated.View key="closed" entering={FadeInDown.duration(350)}>
              <View style={{ marginTop: 16 }}>
                <Money value={485.44} size={56} color={light.inkFixed} centsColor={light.inkMutedFixed} />
              </View>
              <T v="caption" color={light.inkFixed} style={{ marginTop: 8 }}>
                en 4 gastos · saldado con 3 pagos
              </T>
              <View style={[styles.rowBetween, { marginTop: 16 }]}>
                <AvatarStack ids={['tu', 'ana', 'luis', 'marta']} size={28} on="lime" />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="share" size={16} color={light.inkFixed} />
                  <T v="labelStrong" color={light.inkFixed}>
                    Compartir
                  </T>
                </View>
              </View>
            </Animated.View>
          ) : (
            <Animated.View key="open" exiting={FadeOut.duration(150)}>
              <T v="label" color={light.inkMutedFixed} style={{ marginTop: 20, marginBottom: 4 }}>
                Te deben
              </T>
              <Money value={36.23} size={56} color={light.inkFixed} centsColor={light.inkMutedFixed} />
              <T v="label" color={light.inkFixed} style={{ marginTop: 12 }}>
                3 pagos pendientes
              </T>
            </Animated.View>
          )}
        </BrandGradient>
      </View>
      <T v="titleL" color={t.ink} accessibilityRole="header">
        El viaje se cierra con un resumen
      </T>
      <T v="body" color={t.inkMuted} style={{ marginTop: 8, marginBottom: 24 }}>
        Cuando todos han pagado, el viaje queda a cero y se convierte en un resumen para compartir.
      </T>
      <Button label="Crear mi primer grupo" onPress={onNext} />
    </>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8, height: 44 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  skip: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
  bubble: { maxWidth: '86%', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12 },
  review: { borderRadius: 28, padding: 16 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 52 },
  trip: { borderRadius: 28, padding: 20, minHeight: 208 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, paddingHorizontal: 10, height: 28 },
});
