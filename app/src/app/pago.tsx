import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Avatar } from '../components/Avatar';
import { Money } from '../components/Money';
import { Button, T } from '../components/ui';
import { eurText, people, type PersonId } from '../data/trip';
import { useTheme } from '../theme/useTheme';

const APath = Animated.createAnimatedComponent(Path);
const CHECK_LEN = 63;
const RECEIPT_H = 300;
const name = (p: PersonId) => (p === 'tu' ? 'Tú' : people[p].name);

// Pago enviado (option A), only when you pay: a quiet, Apple Pay-like confirmation. The lime disc
// springs in and the check draws itself, a ring pulses out, then the receipt
// slides down out of a slot as if it were being printed. Saved for a single
// payment; the big celebration stays with "A mano".
export default function PaymentSent() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const p = useLocalSearchParams<{ para: PersonId; importe: string; grupo?: string; concepto?: string }>();
  const to = (p.para ?? 'ana') as PersonId;
  const amount = Number(p.importe ?? 0);
  const group = p.grupo ?? 'Lisboa 2026';

  const when = useMemo(() => {
    const d = new Date();
    const date = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
    const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    return `${date} · ${time}`;
  }, []);
  const ref = useMemo(() => `ZR-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${String(Math.floor(Math.random() * 9000) + 1000)}`, []);

  const disc = useSharedValue(reduce ? 1 : 0.4);
  const discOp = useSharedValue(reduce ? 1 : 0);
  const draw = useSharedValue(reduce ? 1 : 0);
  const ring = useSharedValue(reduce ? 1 : 0);
  const paper = useSharedValue(reduce ? 0 : -RECEIPT_H - 10);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (reduce) return;
    disc.value = withDelay(50, withSpring(1, { damping: 11, stiffness: 180 }));
    discOp.value = withDelay(50, withTiming(1, { duration: 150 }));
    draw.value = withDelay(300, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
    ring.value = withDelay(450, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }));
    paper.value = withDelay(850, withTiming(0, { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }));
  }, [reduce, disc, discOp, draw, ring, paper]);

  const discStyle = useAnimatedStyle(() => ({ opacity: discOp.value, transform: [{ scale: disc.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: reduce ? 0 : 0.9 * (1 - ring.value), transform: [{ scale: 1 + ring.value * 0.7 }] }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LEN * (1 - draw.value) }));
  const paperStyle = useAnimatedStyle(() => ({ transform: [{ translateY: paper.value }] }));
  const at = (ms: number) => (reduce ? undefined : FadeInDown.delay(ms).duration(300));

  const rows: [string, string, PersonId?][] = [
    ['Para', name(to), to],
    ['Grupo', group],
    ['Concepto', p.concepto ?? `Saldar ${group}`],
    ['Fecha', when],
    ['Referencia', ref],
  ];

  const share = () =>
    Share.share({
      message: `Pagué ${eurText(amount)} a ${name(to)} · ${group} · ${when} · Ref. ${ref}. Hecho con Zerow.`,
    });

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingTop: insets.top + 36, paddingHorizontal: 20 }}>
        <View style={styles.badgeWrap} accessible accessibilityLabel={`Pagado: ${eurText(amount)}`}>
          <Animated.View style={[styles.ring, { borderColor: t.lime }, ringStyle]} />
          <Animated.View style={[styles.disc, { backgroundColor: t.lime }, discStyle]}>
            <Svg width={44} height={34} viewBox="-2 -2 46 36">
              <APath d="M0 18 L14 32 L42 0" stroke={t.onLime} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={CHECK_LEN} animatedProps={checkProps} />
            </Svg>
          </Animated.View>
        </View>

        <Animated.View entering={at(500)} style={{ alignItems: 'center', marginTop: 18 }}>
          <T v="bodyStrong" color={t.inkMuted}>
            Pagado
          </T>
          <Money value={amount} size={72} color={t.ink} centsColor={t.inkMuted} />
          <T v="label" color={t.inkMuted} style={{ marginTop: 6, textAlign: 'center' }}>
            Ya no debes nada en {group}
          </T>
        </Animated.View>

        <View style={[styles.slotLine, { backgroundColor: t.line }]} />
        <View style={styles.slot}>
          <Animated.View style={paperStyle}>
            <View style={[styles.receipt, { backgroundColor: t.surface }]}>
              {rows.map(([k, v, who], i) => (
                <View key={k} style={[styles.row, i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: t.line }]}>
                  <T v="label" color={t.inkMuted}>
                    {k}
                  </T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                    {who ? <Avatar id={who} size={22} /> : null}
                    <T v="bodyStrong" color={t.ink} style={{ fontSize: 15 }} numberOfLines={1}>
                      {v}
                    </T>
                  </View>
                </View>
              ))}
              <T v="caption" color={t.inkMuted} style={{ marginTop: 12 }}>
                Marcado como pagado por ti · {name(to)} lo confirmará
              </T>
            </View>
            <Svg width="100%" height={14} viewBox="0 0 320 14" preserveAspectRatio="none">
              <Path d={`M0 0 H320 ${Array.from({ length: 16 }, (_, i) => `L${320 - i * 20 - 10} 14 L${320 - (i + 1) * 20} 0`).join(' ')} Z`} fill={t.surface} />
            </Svg>
          </Animated.View>
        </View>
      </View>

      <Animated.View entering={at(1700)} style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 8 }}>
        <Button label="Compartir comprobante" icon="share" onPress={share} />
        <Button label="Listo" kind="text" height={48} style={{ marginTop: 6 }} onPress={() => router.back()} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeWrap: { alignSelf: 'center', width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 96, height: 96, borderRadius: 48, borderWidth: 2 },
  disc: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  slotLine: { height: 2, borderRadius: 1, marginTop: 22 },
  slot: { height: RECEIPT_H + 24, overflow: 'hidden', paddingTop: 8 },
  receipt: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 },
});
