import { Aurora } from '../components/Aurora';
import { Spread } from '../components/Duo';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { PixelRatio, ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Avatar } from '../components/Avatar';
import { Money } from '../components/Money';
import { Icon } from '../components/Icon';
import { Button, T, Tap } from '../components/ui';
import { eurText, people, pisoGroup, type PersonId } from '../data/trip';
import { useTheme } from '../theme/useTheme';

const APath = Animated.createAnimatedComponent(Path);
// Figma's check: 27 × 18 in a 40 pt box, 2.5 stroke. Drawn left to right.
const CHECK = 'M7 20 L15.33 28.33 L33.67 10';
const CHECK_LEN = 38;
// The paper: 8 on top, five 46 pt rows with their lines, 10 of air, the 18 pt note and 20 below.
const RECEIPT_H = 291;
// Figma «Papel»: white 9 % with half circles (10 pt) cut out of the bottom edge.
const PAPER = 'rgba(255,255,255,0.09)';
const name = (p: PersonId) => (p === 'tu' ? 'Tú' : people[p].name);

// 4.7 Pago enviado, only when you pay: a quiet, Apple Pay-like confirmation. The lime disc
// springs in and the check draws itself, a ring pulses out, then the receipt
// slides down out of a slot as if it were being printed. Saved for a single
// payment; the big celebration stays with «A cero».
export default function PaymentSent() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const p = useLocalSearchParams<{ para: PersonId; importe: string; grupo?: string; concepto?: string; metodo?: string }>();
  const to = (p.para ?? 'ana') as PersonId;
  const amount = Number(p.importe ?? 0);
  const group = p.grupo ?? 'Lisboa 2026';
  // The flat's payments are your share of the month.
  const concept = p.concepto ?? (group === pisoGroup.name ? `Tu parte de ${pisoGroup.dates}` : `Saldar ${group}`);

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
  // The paper is as tall as its text, so with larger type it starts further up the slot.
  const paper = useSharedValue(reduce ? 0 : -Math.ceil(RECEIPT_H * Math.max(1, PixelRatio.getFontScale())) - 10);

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
    ['Concepto', concept],
    ['Fecha', when],
    ['Referencia', ref],
  ];

  const share = () =>
    Share.share({
      message: `Pagué ${eurText(amount)} a ${name(to)} · ${group} · ${when} · Ref. ${ref}. Hecho con Zerow.`,
    });

  const paid = (
    <>
      <View style={styles.badgeWrap} accessible accessibilityLabel={`Pagado: ${eurText(amount)}`}>
        <Animated.View style={[styles.ring, { borderColor: t.lime }, ringStyle]} />
        <Animated.View style={[styles.disc, { backgroundColor: t.lime, shadowColor: t.lime }, discStyle]}>
          <Svg width={40} height={40} viewBox="0 0 40 40">
            <APath d={CHECK} stroke={t.inkFixed} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={CHECK_LEN} animatedProps={checkProps} />
          </Svg>
        </Animated.View>
      </View>

      <Animated.View entering={at(500)} style={{ alignItems: 'center', marginTop: 24 }}>
        <T v="body" color={t.inkSoft}>
          Pagado
        </T>
        <View style={{ marginTop: 8 }}>
          <Money value={amount} size={56} color={t.ink} />
        </View>
        <T v="label" color={t.inkSoft} style={{ marginTop: 8, textAlign: 'center' }}>
          Ya no debes nada en {group}
        </T>
      </Animated.View>
    </>
  );
  const receipt = (
    <>
      {/* The slot the receipt comes out of: a dark groove with the paper sliding down from it. */}
      <View style={styles.slotLine} />
      <View style={styles.slot}>
        <Animated.View style={paperStyle}>
          <View style={styles.receipt}>
            {rows.map(([k, v, who]) => (
              <View key={k}>
                <View style={styles.row}>
                  <T v="label" color={t.inkMuted}>
                    {k}
                  </T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
                    {who ? <Avatar id={who} size={24} bg={t.disc} inset /> : null}
                    <T v="labelStrong" color={t.ink} numberOfLines={1}>
                      {v}
                    </T>
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: t.hairline }} />
              </View>
            ))}
            <T v="caption" color={t.inkMuted} style={{ marginTop: 10 }}>
              {/* Paid through the bank or a payment app, it says so; «de otra forma» is your word, so the other person confirms. */}
              {p.metodo && p.metodo !== 'Otra forma' ? `Pagado con ${p.metodo === 'Tu banco' ? 'tu banco' : p.metodo}` : `Marcado como pagado por ti · ${name(to)} lo confirmará`}
            </T>
          </View>
          <Svg width="100%" height={20} viewBox="0 0 353 20" preserveAspectRatio="none">
            {/* The tear-off edge: 19 half circles cut out of the bottom of the paper. */}
            <Path d={`M0 0 H353 V20 ${Array.from({ length: 19 }, (_, i) => `H${(349 - i * 18.6).toFixed(1)} a5 5 0 0 0 -10 0`).join(' ')} H0 Z`} fill={PAPER} />
          </Svg>
        </Animated.View>
      </View>
    </>
  );
  const actions = (
    <Animated.View entering={at(1700)}>
      {/* What almost everyone does next leads; sharing the receipt is the quiet text button under it. */}
      <Button label="Listo" onPress={() => router.back()} />
      <Tap onPress={share} accessibilityRole="button" accessibilityLabel="Compartir comprobante" style={styles.listo}>
        <Icon name="share" size={20} color={t.ink} />
        <T v="bodyStrong" color={t.ink}>
          Compartir comprobante
        </T>
      </Tap>
    </Animated.View>
  );

  // Open iPhone Duo (Figma «Duo abierto · 4.7»): paid on the left; the receipt and the buttons on the right.
  return (
    <Spread
      phone={
        <View style={{ flex: 1, backgroundColor: t.page }}>
          <Aurora preset="receipt" />
          <StatusBar style="light" />
          {/* It fits on one screen; with larger text it scrolls instead of hiding under the buttons. */}
          <ScrollView
            style={{ flex: 1 }}
            alwaysBounceVertical={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: insets.top + 34, paddingHorizontal: 20, paddingBottom: 24 }}
          >
            {paid}
            <View style={{ marginTop: 24 }}>{receipt}</View>
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom }}>
            {/* Figma «Fundido»: the page fades in under the buttons. */}
            <Svg pointerEvents="none" style={styles.fade} width="100%" height="100%">
              <Defs>
                <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={t.page} stopOpacity={0} />
                  <Stop offset="0.6" stopColor={t.page} stopOpacity={1} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#fade)" />
            </Svg>
            {actions}
          </View>
        </View>
      }
      left={<View style={{ marginTop: 110 }}>{paid}</View>}
      right={<View style={{ marginTop: 16 }}>{receipt}</View>}
      footer={actions}
    />
  );
}

const styles = StyleSheet.create({
  badgeWrap: { alignSelf: 'center', width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 88, height: 88, borderRadius: 44, borderWidth: 2 },
  disc: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  slotLine: { height: 10, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', zIndex: 1 },
  slot: { overflow: 'hidden', marginTop: -5 },
  receipt: { backgroundColor: PAPER, paddingHorizontal: 16, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 46, paddingVertical: 8 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 },
  // «Compartir comprobante»: a 44 pt text button with 17 pt type.
  listo: { minHeight: 44, marginTop: 12, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
});
