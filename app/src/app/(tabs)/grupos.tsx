import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusStatusBar } from '../../components/FocusStatusBar';
import { Avatar, AvatarStack } from '../../components/Avatar';
import { Icon, type IconName } from '../../components/Icon';
import { BrandGradient } from '../../components/BrandGradient';
import { Money, RollingMoney } from '../../components/Money';
import { WalletStack, type WalletCard } from '../../components/WalletStack';
import { Glass } from '../../components/Glass';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Card, Hairline, T, Tap } from '../../components/ui';
import { balancesFor, eurText, pastGroups, people, usePeopleBalances, usePisoBalance, useTrip, type GroupKind, type PersonId } from '../../data/trip';
import { font, light } from '../../theme/tokens';

import { useTheme } from '../../theme/useTheme';

const HEADER_H = 48;
const GLOW_H = 520;
const GLOW_OVERSCROLL = 400;

const kindIcon: Record<GroupKind, IconName> = {
  viaje: 'plane',
  piso: 'house',
  evento: 'gift',
  otro: 'shapes',
};

// 2.1 Inicio: your groups. Lisboa is the open trip; its balance rolls when it changes.
export default function Home() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, draft, groups, groupExpenses, pisoPaid, pastEmoji } = useTrip();
  const mine = balancesFor(expenses).tu;
  const between = usePeopleBalances();
  const piso = usePisoBalance();
  const pisoWord = Math.abs(piso) < 0.005 ? 'A mano' : piso > 0 ? 'Te deben' : 'Debes';

  // Open groups, front to back: the trip in progress first, on the brand gradient.
  const cards: WalletCard[] = [
    {
      key: 'lisboa',
      title: `Lisboa 2026. ${mine >= 0 ? 'Te deben' : 'Debes'} ${eurText(Math.abs(mine))}${draft ? '. 1 borrador por confirmar' : ''}`,
      onPress: () => router.push('/trip/lisboa'),
      content: (front: boolean) => (
        <BrandGradient style={styles.cardBody} seed={3}>
          <CardTop
            title="Lisboa 2026"
            meta="12–18 nov · en curso"
            people={['tu', 'ana', 'luis', 'marta']}
            peek={front ? undefined : `${mine >= 0 ? 'Te deben' : 'Debes'} ${eurText(Math.abs(mine))}`}
          />
          <T v="label" color={light.inkMutedFixed} style={{ marginTop: 'auto', marginBottom: 4 }}>
            {mine >= 0 ? 'Te deben' : 'Debes'}
          </T>
          <RollingMoney value={Math.abs(mine)} size={heroSize(mine)} color={light.inkFixed} centsColor={light.inkMutedFixed} />
          <View style={styles.cardFoot}>
            {draft ? (
              <ActionPill label="1 gasto por revisar" dot />
            ) : (
              <T v="caption" color={light.inkMutedFixed}>
                {eurText(expenses.reduce((a, e) => a + e.amountEur, 0))} en {expenses.length} gastos
              </T>
            )}
          </View>
        </BrandGradient>
      ),
    },
    {
      key: 'piso',
      title: pisoPaid ? `Piso Calle Mayor. ${pisoWord}${piso ? ' ' + eurText(Math.abs(piso)) : ''}` : 'Piso Calle Mayor. Debes 18,40 €. Toca para pagar a Ana',
      // Unpaid, the card is the quick way to pay Ana; once paid it opens the flat.
      onPress: () => router.push(pisoPaid ? '/trip/piso' : '/pagar'),
      content: (front: boolean) => (
        <BrandGradient style={styles.cardBody} seed={7} lively>
          <CardTop
            title="Piso Calle Mayor"
            meta="3 personas · 2 gastos este mes"
            people={['tu', 'ana', 'luis']}
            peek={front ? undefined : `${pisoWord}${Math.abs(piso) < 0.005 ? '' : ' ' + eurText(Math.abs(piso))}`}
          />
          <T v="label" color={light.inkMutedFixed} style={{ marginTop: 'auto', marginBottom: 4 }}>
            {pisoWord}
          </T>
          <RollingMoney value={Math.abs(piso)} size={heroSize(piso)} color={light.inkFixed} centsColor={light.inkMutedFixed} />
          <View style={styles.cardFoot}>
            {/* When you owe, the card says what to do about it, not just the number. */}
            {pisoPaid ? (
              <>
                <Icon name="check" size={16} color={light.inkFixed} />
                <T v="caption" color={light.inkFixed} style={{ fontFamily: font.medium }}>
                  Pagaste 18,40 € a Ana
                </T>
              </>
            ) : (
              <ActionPill label="Pagar a Ana" />
            )}
          </View>
        </BrandGradient>
      ),
    },
    ...groups.map((g) => {
      const list = groupExpenses[g.id] ?? [];
      const bal = balancesFor(list).tu;
      return {
        key: g.id,
        title: `${g.name}. ${list.length ? `${bal >= 0 ? 'Te deben' : 'Debes'} ${eurText(Math.abs(bal), g.currency)}` : 'Sin gastos todavía'}`,
        onPress: () => router.push({ pathname: '/trip/[id]', params: { id: g.id } }),
        content: (front: boolean) => (
          <BrandGradient style={styles.cardBody} seed={11} lively>
            <CardTop
              title={g.name}
              meta={`${g.members.length} personas${g.dates ? ' · ' + g.dates : ''}`}
              people={g.members}
              peek={front ? undefined : list.length ? `${bal >= 0 ? 'Te deben' : 'Debes'} ${eurText(Math.abs(bal), g.currency)}` : 'Sin gastos'}
            />
            <T v="label" color={light.inkMutedFixed} style={{ marginTop: 'auto', marginBottom: 4 }}>
              {list.length ? (bal >= 0 ? 'Te deben' : 'Debes') : 'Saldo'}
            </T>
            <Money value={Math.abs(bal)} size={heroSize(bal)} color={light.inkFixed} centsColor={light.inkMutedFixed} currency={g.currency} />
            <View style={styles.cardFoot}>
              <Icon name={kindIcon[g.kind]} size={16} color={light.inkMutedFixed} />
              <T v="caption" color={light.inkMutedFixed}>
                {list.length ? `${list.length} gasto${list.length === 1 ? '' : 's'}` : 'Sin gastos todavía'}
              </T>
            </View>
          </BrandGradient>
        ),
      };
    }),
  ];

  const headerTop = insets.top + 8;
  const { width } = useWindowDimensions();
  // The dark fade under the status bar only appears once you scroll, so at rest
  // it doesn't dim the glow.
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const fadeStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 60], [0, 1], Extrapolation.CLAMP) }));

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headerTop + HEADER_H + 28,
          paddingHorizontal: 20,
          paddingBottom: 140,
        }}
        scrollIndicatorInsets={{ top: HEADER_H }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <FocusStatusBar style="light" />
        {/* A lime glow behind the wallet (reference: Paynx), olive at the top and
            fading into the graphite page, so the cards and the glass header sit
            on colour. It scrolls with the page. */}
        <Svg pointerEvents="none" style={[styles.glow, { top: -GLOW_OVERSCROLL, width }]} width={width} height={GLOW_H + GLOW_OVERSCROLL}>
          <Defs>
            <LinearGradient id="glow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#3D4A1F" stopOpacity={1} />
              <Stop offset={String(GLOW_OVERSCROLL / (GLOW_H + GLOW_OVERSCROLL) + 0.12)} stopColor="#3D4A1F" stopOpacity={0.85} />
              <Stop offset="0.62" stopColor="#2A3318" stopOpacity={0.45} />
              <Stop offset="1" stopColor={t.page} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#glow)" />
        </Svg>
        <WalletStack cards={cards} />

        <T v="section" color={t.ink} style={{ marginTop: 28, marginBottom: 12 }} accessibilityRole="header">
          Contactos
        </T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={styles.people}>
          <Tap onPress={() => router.push({ pathname: '/invitar', params: { elegir: '1' } })} accessibilityRole="button" accessibilityLabel="Invitar a alguien" style={styles.person}>
            {/* An empty seat: dashed, no fill, so it never reads as one more person. */}
            <View style={[styles.face, styles.addFace, { borderColor: t.inkMuted }]}>
              <Icon name="plus" size={22} color={t.ink} />
            </View>
            <T v="caption" color={t.inkMuted} style={styles.personName} numberOfLines={1} maxFontSizeMultiplier={1.4}>
              Invitar
            </T>
          </Tap>
          {/* Only faces and names: what you owe each other lives in their sheet (2.9). */}
          {between.map((p) => {
            const name = people[p.id].name;
            return (
              <Tap
                key={p.id}
                onPress={() => router.push({ pathname: '/persona', params: { id: p.id } })}
                accessibilityRole="button"
                accessibilityLabel={name}
                accessibilityHint="Ver lo que os debéis"
                style={styles.person}
              >
                <Avatar id={p.id} size={FACE} bg={t.surface} />
                <T v="caption" color={t.ink} style={[styles.personName, { fontFamily: font.medium }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                  {name}
                </T>
              </Tap>
            );
          })}
        </ScrollView>

        <T v="section" color={t.ink} style={{ marginTop: 28, marginBottom: 12 }} accessibilityRole="header">
          Anteriores
        </T>
        {/* No sheen here: the glow above already lights this screen; a third shine would crowd it. */}
        <Card bg={t.surface} sheen={false} style={{ paddingVertical: 4 }}>
          {pastGroups.map((p, i) => (
            <View key={p.id}>
              <Tap
                onPress={() => router.push({ pathname: '/emoji', params: { id: p.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${p.kind}: ${p.name}. ${p.meta}. ${eurText(p.total)} en total, saldado. Cambiar emoji`}
                style={[styles.rowBetween, { paddingVertical: 12 }]}
              >
                <View style={[styles.tile, { backgroundColor: t.panelRaised }]}>
                  {pastEmoji[p.id] ? (
                    <Text style={styles.emoji}>{pastEmoji[p.id]}</Text>
                  ) : (
                    <Icon name={kindIcon[p.kind === 'Piso' ? 'piso' : p.kind === 'Viaje' ? 'viaje' : p.kind === 'Regalo' ? 'evento' : 'otro']} size={20} color={t.ink} />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <T v="bodyStrong" color={t.ink}>
                    {p.name}
                  </T>
                  <T v="caption" color={t.inkMuted}>
                    {p.meta} · saldado
                  </T>
                </View>
                {/* The figure is what the group spent in all; tabular digits keep the column straight. */}
                <View style={{ alignItems: 'flex-end' }}>
                  <T v="bodyStrong" color={t.ink} style={styles.tabular}>
                    {eurText(p.total)}
                  </T>
                  <T v="caption" color={t.inkMuted}>
                    en total
                  </T>
                </View>
              </Tap>
              {i < pastGroups.length - 1 ? <Hairline color={t.line} inset={52} /> : null}
            </View>
          ))}
        </Card>
      </Animated.ScrollView>

      {/* Floating header, like Revolut's: the page scrolls under it, so the search
          and + sit on Liquid Glass (the navigation layer, per Apple). A soft fade
          keeps the status bar readable over the lime cards. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: headerTop + HEADER_H + 24 }, fadeStyle]}>
        <Svg width="100%" height={headerTop + HEADER_H + 24}>
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.page} stopOpacity={0.9} />
              <Stop offset="0.55" stopColor={t.page} stopOpacity={0.6} />
              <Stop offset="1" stopColor={t.page} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#fade)" />
        </Svg>
      </Animated.View>
      <View style={[styles.header, { position: 'absolute', top: headerTop, left: 20, right: 20 }]}>
        <Tap onPress={() => router.navigate('/perfil')} accessibilityRole="button" accessibilityLabel="Tu perfil" style={[styles.ring, { borderColor: 'rgba(203, 242, 107, 0.45)' }]}>
          <Avatar id="tu" size={40} />
        </Tap>
        <Tap onPress={() => router.push('/buscar')} accessibilityRole="search" accessibilityLabel="Buscar grupos, contactos o gastos" style={{ flex: 1 }}>
          <Glass fallback={t.surface} style={styles.search}>
            <Icon name="search" size={18} color={t.ink} />
            <T v="body" color={t.ink} numberOfLines={1} maxFontSizeMultiplier={1.4}>
              Buscar
            </T>
          </Glass>
        </Tap>
        <Tap onPress={() => router.push('/dividir')} accessibilityRole="button" accessibilityLabel="Dividir algo nuevo">
          <Glass fallback={t.surface} style={styles.round}>
            <Icon name="plus" size={20} color={t.ink} />
          </Glass>
        </Tap>
      </View>
    </View>
  );
}

/**
 * Group name, dates and faces. On the card behind, only this strip shows, so it
 * carries the balance instead of the faces: both groups read without swiping.
 */
function CardTop({ title, meta, people, peek }: { title: string; meta: string; people: PersonId[]; peek?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <T v="titleM" color={light.inkFixed} numberOfLines={1} maxFontSizeMultiplier={1.4}>
          {title}
        </T>
        <T v="caption" color={light.inkMutedFixed} style={{ marginTop: 2 }} numberOfLines={1} maxFontSizeMultiplier={1.4}>
          {meta}
        </T>
      </View>
      {peek ? (
        <T v="bodyStrong" color={light.inkFixed} style={[styles.tabular, { marginTop: 2, flexShrink: 0 }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {peek}
        </T>
      ) : (
        <AvatarStack ids={people} size={32} outline="#D3F27F" on="lime" />
      )}
    </View>
  );
}

/** The one thing to do on a card, as a real button shape: dark pill, lime words. */
function ActionPill({ label, dot }: { label: string; dot?: boolean }) {
  return (
    <View style={[styles.pill, { backgroundColor: light.inkFixed }]}>
      {dot ? <View style={styles.pillDot} /> : null}
      <T v="caption" color="#CBF26B" style={{ fontFamily: font.medium }} maxFontSizeMultiplier={1.4}>
        {label}
      </T>
      <Icon name="chevron-right" size={14} color="#CBF26B" />
    </View>
  );
}

/** The balance shrinks a step for every extra digit so 4.812,30 € still fits the card. */
const heroSize = (v: number) => {
  const digits = Math.floor(Math.abs(v)).toString().length;
  return digits <= 3 ? 60 : digits === 4 ? 50 : 42;
};

const FACE = 60;

const styles = StyleSheet.create({
  emoji: { fontSize: 22, lineHeight: 28 },
  tabular: { fontVariant: ['tabular-nums'] },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, paddingLeft: 12, paddingRight: 10, paddingVertical: 7 },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBF26B' },
  cardBody: { flex: 1, padding: 20, paddingBottom: 18 },
  people: { paddingHorizontal: 20, gap: 14 },
  person: { minWidth: 64, alignItems: 'center' },
  personName: { marginTop: 6 },
  face: {
    width: FACE,
    height: FACE,
    borderRadius: FACE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFace: { borderWidth: 1.5, borderStyle: 'dashed' },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  glow: { position: 'absolute', left: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  search: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    overflow: 'hidden',
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: 18,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
