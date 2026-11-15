import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { Avatar } from '../../components/Avatar';
import { FocusStatusBar } from '../../components/FocusStatusBar';
import { BrandGradient } from '../../components/BrandGradient';
import { Icon } from '../../components/Icon';
import { useScreen } from '../../components/Screen';
import { StretchyScroll } from '../../components/StretchyScroll';
import { Tile } from '../../components/Tile';
import { useMinimizeOnScroll } from '../../components/TabChrome';
import { Card, Hairline, T, Tap } from '../../components/ui';
import { eurText, settleUp, settledBalances, useTrip } from '../../data/trip';
import { useTheme } from '../../theme/useTheme';

// Figma «Tarjeta de perfil» is 398 tall on a 54 pt status bar; the rest follows the device's own inset.
const HEADER_BELOW_INSET = 344;

// 2.3 Perfil: you, on the brand gradient, then the one thing worth acting on
// (what you're owed) and a plain settings list. Pull down and the gradient stretches.
// It's a tab, so it doesn't stage an entrance: it cross-fades in like the others. The only
// movement is the slow dashed ring around you, which stops with Reduce Motion.
export default function Profile() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, paid, groups } = useTrip();
  const [notify, setNotify] = useState(true);
  const [currency, setCurrency] = useState<'EUR' | 'USD'>('EUR');
  const split = useScreen().form === 'split';
  const minimize = useMinimizeOnScroll();
  // With larger text the name, the email and the pill need more room: the header (and its gradient) grow with them.
  const [grown, setGrown] = useState(0);
  const header = Math.max(insets.top + HEADER_BELOW_INSET, grown);

  const mine = settledBalances(expenses, paid).tu;
  const mineLine = Math.abs(mine) < 0.005 ? 'Estás a cero' : `${mine > 0 ? 'Te deben' : 'Debes'} ${eurText(Math.abs(mine))}`;
  const pending = settleUp(settledBalances(expenses, paid)).length;
  const open = 2 + groups.length;
  const total = open + 4;

  const gradient = <BrandGradient style={{ flex: 1, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }} seed={6} />;

  const you = (
    <>
      {/* Figma «Cabecera»: the title, 44 tall. Editing the profile comes back when that screen exists. */}
      <View style={styles.head}>
        <T v="titleL" color={t.inkFixed} accessibilityRole="header">
          Perfil
        </T>
      </View>
      <View style={{ marginTop: 26 }}>
        <Avatar id="tu" size={108} decorative={false} bg="rgba(255,255,255,0.35)" />
        <Ring />
      </View>
      <View style={{ alignItems: 'center' }}>
        <T v="titleM" color={t.inkFixed} style={{ marginTop: 22 }}>
          Laura
        </T>
        <T v="label" color={t.inkMutedFixed} style={{ marginTop: 8 }}>
          laura@ejemplo.com
        </T>
        <View style={styles.pill}>
          <View style={[styles.dot, { backgroundColor: t.inkFixed }]} />
          <T v="caption" color={t.inkFixed} style={{ fontWeight: '600' }}>
            {total} grupos · {open} abiertos
          </T>
        </View>
      </View>
    </>
  );
  const settings = (
    <View style={{ gap: 16 }}>
      <View>
        <Tap
          onPress={() => router.push('/saldar')}
          accessibilityRole="button"
          accessibilityLabel={`${mineLine} en Lisboa 2026. ${pending ? `Falta${pending === 1 ? '' : 'n'} ${pending} pago${pending === 1 ? '' : 's'}` : 'Sin pagos pendientes'}. Ir a saldar`}
        >
          <Card style={{ paddingVertical: 4 }}>
            <View style={styles.highlight}>
              <View style={[styles.highlightIcon, { backgroundColor: t.lime }]}>
                <Icon name="arrow-left-right" size={20} color={t.inkFixed} weight={2} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="bodyStrong" color={t.ink}>
                  {mineLine}
                </T>
                <T v="caption" color={t.inkMuted}>
                  En Lisboa 2026 · {pending ? `falta${pending === 1 ? '' : 'n'} ${pending} pago${pending === 1 ? '' : 's'}` : 'sin pagos pendientes'}
                </T>
              </View>
              <Icon name="chevron-right" size={16} color={t.inkMuted} />
            </View>
          </Card>
        </Tap>
      </View>

      <View>
        <Card style={{ paddingVertical: 4 }}>
          <Row
            icon={<Glyph name="coins" color={t.ink} />}
            label="Moneda por defecto"
            value={currency === 'EUR' ? 'Euros (€)' : 'Dólares (US$)'}
            onPress={() => setCurrency((c) => (c === 'EUR' ? 'USD' : 'EUR'))}
          />
          <Hairline />
          <Row
            icon={<Icon name="bell" size={20} color={t.ink} />}
            label="Avisos de gastos y pagos"
            right={
              // iOS draws its switch from the top of the box RN gives it; a 58 pt box keeps it centred in the row.
              <View style={styles.switch}>
                <Switch value={notify} onValueChange={setNotify} trackColor={{ true: t.lime, false: t.line }} accessibilityLabel="Avisos de gastos y pagos" />
              </View>
            }
          />
          <Hairline />
          <Row icon={<Glyph name="circle-help" color={t.ink} />} label="Cómo funciona Zerow" onPress={() => router.push({ pathname: '/empezar', params: { repaso: '1' } })} chevron />
        </Card>
      </View>

      <View>
        <Card style={{ paddingVertical: 4 }}>
          <Row icon={<Icon name="log-out" size={20} color={t.danger} />} label="Cerrar sesión" danger onPress={() => router.replace('/')} height={56} />
        </Card>
      </View>
    </View>
  );

  // iPhone Duo open (Figma «Duo abierto · 2.3»): you on the gradient card on the
  // left, what's worth acting on and the settings on the right.
  if (split) {
    return (
      <View style={{ flex: 1, backgroundColor: t.page, flexDirection: 'row' }}>
        <FocusStatusBar style="dark" />
        <BrandGradient style={{ width: 433, borderTopRightRadius: 36, borderBottomRightRadius: 36 }} seed={6}>
          <View style={{ paddingTop: insets.top + 8, paddingLeft: 50, paddingRight: 30, alignItems: 'center' }}>{you}</View>
        </BrandGradient>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 44, paddingLeft: 41, paddingRight: 40, paddingBottom: 40 }}>{settings}</ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <FocusStatusBar style="dark" />
      <StretchyScroll background={gradient} backgroundHeight={header} contentContainerStyle={{ paddingBottom: 140 }} onScrollY={minimize}>
        <View
          style={{ minHeight: insets.top + HEADER_BELOW_INSET, paddingTop: insets.top, paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center' }}
          onLayout={(e) => setGrown(Math.ceil(e.nativeEvent.layout.height))}
        >
          {you}
        </View>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>{settings}</View>
      </StretchyScroll>
    </View>
  );
}

/**
 * A settings row (Figma «Fila»): the icon on a white 8 % tile, the label, the
 * current value in 15 pt and a chevron when it leads somewhere.
 */
function Row({
  icon,
  label,
  value,
  right,
  onPress,
  danger,
  chevron,
  height = 58,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  chevron?: boolean;
  height?: number;
}) {
  const { t } = useTheme();
  const body = (
    <View style={[styles.row, { minHeight: height }]}>
      <Tile>{icon}</Tile>
      <T v="body" color={danger ? t.danger : t.ink} style={{ flex: 1 }}>
        {label}
      </T>
      {value ? (
        <T v="label" color={t.inkMuted}>
          {value}
        </T>
      ) : null}
      {right}
      {chevron ? <Icon name="chevron-right" size={16} color={t.inkMuted} /> : null}
    </View>
  );
  return onPress ? (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={value ? `${label}: ${value}` : label}>
      {body}
    </Tap>
  ) : (
    <View accessible={!right} accessibilityLabel={value ? `${label}: ${value}` : undefined}>
      {body}
    </View>
  );
}

// Lucide icons the shared set doesn't have yet (same 24 grid as `Icon`, same absolute 1.75 pt stroke).
const glyphs: Record<string, { paths: string[]; circles?: [number, number, number][] }> = {
  coins: { paths: ['M18.09 10.37A6 6 0 1 1 10.34 18', 'M7 6h1v4', 'm16.71 13.88.7.71-2.82 2.82'], circles: [[8, 8, 6]] },
  'circle-help': { paths: ['M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'], circles: [[12, 12, 10]] },
};

function Glyph({ name, color }: { name: keyof typeof glyphs; color: string }) {
  const g = glyphs[name];
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={(1.75 * 24) / 20} strokeLinecap="round" strokeLinejoin="round">
      {g.paths.map((d) => (
        <Path key={d} d={d} />
      ))}
      {(g.circles ?? []).map(([cx, cy, r]) => (
        <Circle key={`${cx}${cy}`} cx={cx} cy={cy} r={r} />
      ))}
    </Svg>
  );
}

/** Figma «Aro»: a dashed ring (4 on, 6 off) 10 pt around the avatar that turns slowly. Still with Reduce Motion. */
function Ring() {
  const reduce = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (!reduce) turn.value = withRepeat(withTiming(360, { duration: 18000, easing: Easing.linear }), -1, false);
  }, [reduce, turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-turn.value}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.ring, style]}>
      <Svg width={128} height={128}>
        <Circle cx={64} cy={64} r={63.25} fill="none" stroke="rgba(17,17,18,0.5)" strokeWidth={1.5} strokeDasharray="4 6" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  head: { alignSelf: 'stretch', minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ring: { position: 'absolute', top: -10, left: -10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, minHeight: 36, paddingLeft: 12, paddingRight: 16, borderRadius: 18, backgroundColor: 'rgba(17,17,18,0.08)' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68 },
  highlightIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switch: { height: 58, justifyContent: 'center' },
});
