import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Animated, { Easing, FadeInDown, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { FocusStatusBar } from '../../components/FocusStatusBar';
import { BrandGradient } from '../../components/BrandGradient';
import { Icon, type IconName } from '../../components/Icon';
import { StretchyScroll } from '../../components/StretchyScroll';
import { T, Tap } from '../../components/ui';
import { balancesFor, eurText, settleUp, transferKey, useTrip } from '../../data/trip';
import { light } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const HEADER = 392;

// 2.3 Perfil: you, on the brand gradient, then the one thing worth acting on
// (what you're owed) and a plain settings list. Pull down and the gradient stretches.
export default function Profile() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, paid, groups } = useTrip();
  const [notify, setNotify] = useState(true);
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');

  const mine = balancesFor(expenses).tu;
  const pending = settleUp(balancesFor(expenses)).filter((x) => !paid.has(transferKey(x))).length;
  const open = 2 + groups.length;
  const total = open + 4;
  const at = (ms: number) => FadeInDown.delay(ms).duration(300);

  const header = <BrandGradient style={{ flex: 1, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 }} seed={6} />;

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <FocusStatusBar style="dark" />
      <StretchyScroll background={header} backgroundHeight={HEADER} contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={{ height: HEADER, paddingTop: insets.top + 8, paddingHorizontal: 20, alignItems: 'center' }}>
          <T v="titleL" color={light.inkFixed} style={{ alignSelf: 'flex-start' }} accessibilityRole="header">
            Perfil
          </T>
          <Animated.View entering={ZoomIn.springify().damping(14)} style={{ marginTop: 14 }}>
            <Ring />
            <View style={styles.avatar}>
              <Avatar id="tu" size={104} decorative={false} />
            </View>
          </Animated.View>
          <Animated.View entering={at(180)} style={{ alignItems: 'center' }}>
            <T v="titleM" color={light.inkFixed} style={{ marginTop: 14 }}>
              Laura
            </T>
            <T v="label" color={light.inkMutedFixed} style={{ marginTop: 2 }}>
              laura@ejemplo.com
            </T>
            <View style={styles.pill}>
              <View style={[styles.dot, { backgroundColor: light.inkFixed }]} />
              <T v="label" color={light.inkFixed} style={{ fontFamily: 'SpaceGrotesk_500Medium' }}>
                {total} grupos · {open} abiertos
              </T>
            </View>
          </Animated.View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <Animated.View entering={at(280)} style={{ marginTop: 20 }}>
            <Tap onPress={() => router.push('/saldar')} accessibilityRole="button" accessibilityLabel={`${mine >= 0 ? 'Te deben' : 'Debes'} ${eurText(Math.abs(mine))} en Lisboa 2026. ${pending ? `Faltan ${pending} pagos` : 'A mano'}. Ir a saldar`} style={[styles.highlight, { backgroundColor: t.panel }]}>
              <View style={[styles.highlightIcon, { backgroundColor: t.lime }]}>
                <Icon name="arrow-left-right" size={20} color={t.inkFixed} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="bodyStrong" color={t.onPanel}>
                  {mine >= 0 ? 'Te deben' : 'Debes'} {eurText(Math.abs(mine))}
                </T>
                <T v="caption" color={t.onPanelMuted}>
                  En Lisboa 2026 · {pending ? `faltan ${pending} pago${pending === 1 ? '' : 's'}` : 'a mano'}
                </T>
              </View>
              <Icon name="chevron-right" size={18} color={t.onPanelMuted} />
            </Tap>
          </Animated.View>

          <Animated.View entering={at(360)} style={{ marginTop: 12 }}>
            <Row icon="user" label="Foto de perfil" value="Memoji" />
            <Row icon="receipt" label="Moneda por defecto" value={currency === 'EUR' ? 'Euros (€)' : 'Dólares (US$)'} onPress={() => setCurrency((c) => (c === 'EUR' ? 'USD' : 'EUR'))} />
            <Row icon="bell" label="Avisos de gastos y pagos" right={<Switch value={notify} onValueChange={setNotify} trackColor={{ true: t.lime, false: t.line }} accessibilityLabel="Avisos de gastos y pagos" />} />
            <Row icon="users" label="Cómo funciona Zerow" onPress={() => router.push('/')} />
            <Row icon="log-out" label="Cerrar sesión" danger onPress={() => router.replace('/')} last />
          </Animated.View>
        </View>
      </StretchyScroll>
    </View>
  );
}

function Row({ icon, label, value, right, onPress, danger, last }: { icon: IconName; label: string; value?: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean; last?: boolean }) {
  const { t } = useTheme();
  const color = danger ? t.danger : t.ink;
  const body = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: t.line }]}>
      <Icon name={icon} size={20} color={color} />
      <T v="body" color={color} style={{ flex: 1, marginLeft: 14 }}>
        {label}
      </T>
      {value ? (
        <T v="body" color={t.inkMuted}>
          {value}
        </T>
      ) : null}
      {right ? <View style={{ height: 58, justifyContent: 'center' }}>{right}</View> : null}
      {onPress && !danger ? <Icon name="chevron-right" size={18} color={t.inkMuted} /> : null}
    </View>
  );
  return onPress ? (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {body}
    </Tap>
  ) : (
    <View accessible accessibilityLabel={value ? `${label}: ${value}` : undefined}>
      {body}
    </View>
  );
}

/** Dashed ring around the avatar that turns slowly. Still with Reduce Motion. */
function Ring() {
  const reduce = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (!reduce) turn.value = withRepeat(withTiming(360, { duration: 18000, easing: Easing.linear }), -1, false);
  }, [reduce, turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-turn.value}deg` }] }));
  return <Animated.View style={[styles.ring, style]} />;
}

const styles = StyleSheet.create({
  ring: { width: 124, height: 124, borderRadius: 62, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(18,18,18,0.5)' },
  avatar: { position: 'absolute', top: 10, left: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: 'rgba(18,18,18,0.08)', borderWidth: 1, borderColor: 'rgba(18,18,18,0.22)' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 22, padding: 16, minHeight: 76 },
  highlightIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 58 },
});
