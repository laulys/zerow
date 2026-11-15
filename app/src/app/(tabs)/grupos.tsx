import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusStatusBar } from '../../components/FocusStatusBar';
import { Avatar, AvatarStack, RingAvatar } from '../../components/Avatar';
import { Frost } from '../../components/Frost';
import { Icon, type IconName } from '../../components/Icon';
import { BrandGradient } from '../../components/BrandGradient';
import { Money, RollingMoney } from '../../components/Money';
import { WalletStack, type WalletCard } from '../../components/WalletStack';
import { Glass } from '../../components/Glass';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Aurora } from '../../components/Aurora';
import { LIST_PANE, useScreen } from '../../components/Screen';
import { Bone, Skeleton } from '../../components/Skeleton';
import { Tile } from '../../components/Tile';
import { useAppState } from '../../data/states';
import { TripView } from '../trip/[id]';
import { Button, Card, Hairline, T, Tap } from '../../components/ui';
import { balancesFor, eurText, pastGroups, people, plural, settledBalances, settleUp, usePeopleBalances, usePisoBalance, useTrip, type Expense, type GroupKind, type PersonId } from '../../data/trip';

import { useMinimizeOnScroll } from '../../components/TabChrome';
import { aurora } from '../../theme/tokens';
import { live } from '../../data/live';
import { useTheme } from '../../theme/useTheme';

const HEADER_H = 44;
const GLOW_OVERSCROLL = 400;

const kindIcon: Record<GroupKind, IconName> = {
  viaje: 'plane',
  piso: 'house',
  evento: 'gift',
  otro: 'shapes',
};

// 2.1 Inicio: your groups. Lisboa is the open trip; its balance rolls when it changes.
export default function Home({ initial }: { initial?: string }) {
  const { t } = useTheme();
  // With an engine connected, coming back to Inicio reads the trip again.
  useFocusEffect(useCallback(() => live.refresh(), []));
  const insets = useSafeAreaInsets();
  const { expenses, draft, groups, groupExpenses, pisoPaid, pisoPaidAmount, pastEmoji, paid } = useTrip();
  const pendingPayments = settleUp(settledBalances(expenses, paid)).length;
  const mine = settledBalances(expenses, paid).tu;
  // Lisboa's line above the amount: «A cero» once every payment is marked.
  const mineWord = Math.abs(mine) < 0.005 ? 'A cero' : mine > 0 ? 'Te deben' : 'Debes';
  const between = usePeopleBalances();
  // 6.1 and 6.4: loading and «no groups yet» (see data/states).
  const appState = useAppState();
  const piso = usePisoBalance();
  const { form } = useScreen();
  const split = form === 'split';
  // Which group the detail pane shows on the open Duo: the one in front of the stack.
  const [shown, setShown] = useState(initial ?? 'lisboa');
  // The glass strip's balance. In the open Duo's narrow list it's signed and short (Figma: «−18,40 €»).
  const peekText = (v: number, currency?: Parameters<typeof eurText>[1]) => {
    if (Math.abs(v) < 0.005) return 'A cero';
    if (split) return `${v > 0 ? '+' : '−'}${eurText(Math.abs(v), currency)}`;
    return `${v > 0 ? 'Te deben' : 'Debes'} ${eurText(Math.abs(v), currency)}`;
  };
  const pisoWord = Math.abs(piso) < 0.005 ? 'A cero' : piso > 0 ? 'Te deben' : 'Debes';

  // Open groups, front to back: the trip in progress first, on the brand gradient.
  const cards: WalletCard[] = [
    {
      key: 'lisboa',
      title: `Lisboa 2026. ${Math.abs(mine) < 0.005 ? 'A cero' : `${mineWord} ${eurText(Math.abs(mine))}`}${draft ? '. 1 gasto por revisar' : ''}`,
      onPress: () => router.push('/trip/lisboa'),
      content: (front: boolean) => (
        <Face front={front} seed={3}>
          <CardTop glass={!front} title="Lisboa 2026" meta="12–18 nov · en curso" people={['tu', 'ana', 'luis', 'marta']} peek={front ? undefined : peekText(mine)} />
          <T v="label" color={t.inkMutedFixed} style={{ marginTop: 'auto', fontWeight: '500' }}>
            {mineWord}
          </T>
          <RollingMoney value={Math.abs(mine)} size={heroSize(mine)} color={t.inkFixed} />
          <View style={styles.cardFoot}>
            {draft ? (
              <ActionPill label="1 gasto por revisar" dot />
            ) : (
              <T v="caption" color={t.inkMutedFixed}>
                {eurText(expenses.reduce((a, e) => a + e.amountEur, 0))} en {plural(expenses.length, 'gasto')}
              </T>
            )}
          </View>
        </Face>
      ),
    },
    {
      key: 'piso',
      title: `Piso Calle Mayor. ${pisoWord}${Math.abs(piso) < 0.005 ? '' : ' ' + eurText(Math.abs(piso))}`,
      // A card opens its group, like Lisboa's; paying Ana is the pill's own button.
      onPress: () => router.push('/trip/piso'),
      content: (front: boolean) => (
        <Face front={front} seed={7} lively>
          <CardTop
            glass={!front}
            title="Piso Calle Mayor"
            meta={`3 personas · ${plural((groupExpenses.piso ?? []).length, 'gasto')} este mes`}
            people={['tu', 'ana', 'luis']}
            peek={front ? undefined : peekText(piso)}
          />
          <T v="label" color={t.inkMutedFixed} style={{ marginTop: 'auto', fontWeight: '500' }}>
            {pisoWord}
          </T>
          <RollingMoney value={Math.abs(piso)} size={heroSize(piso)} color={t.inkFixed} />
          <View style={styles.cardFoot}>
            {/* When you owe, the card says what to do about it, not just the number. */}
            {piso < -0.005 ? (
              <ActionPill label="Pagar a Ana" onPress={() => router.push('/pagar')} />
            ) : pisoPaid ? (
              <>
                <Icon name="check" size={16} color={t.inkFixed} />
                <T v="caption" color={t.inkFixed} style={{ fontWeight: '600' }}>
                  Pagaste {eurText(pisoPaidAmount)} a Ana
                </T>
              </>
            ) : null}
          </View>
        </Face>
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
          <Face front={front} seed={11} lively>
            <CardTop
              glass={!front}
              title={g.name}
              meta={`${plural(g.members.length, 'persona')}${g.dates ? ' · ' + g.dates : ''}`}
              people={g.members}
              peek={front ? undefined : list.length ? peekText(bal, g.currency) : 'Sin gastos'}
            />
            <T v="label" color={t.inkMutedFixed} style={{ marginTop: 'auto', fontWeight: '500' }}>
              {list.length ? (bal >= 0 ? 'Te deben' : 'Debes') : 'Saldo'}
            </T>
            <Money value={Math.abs(bal)} size={heroSize(bal)} color={t.inkFixed} currency={g.currency} />
            <View style={styles.cardFoot}>
              <Icon name={kindIcon[g.kind]} size={16} color={t.inkMutedFixed} />
              <T v="caption" color={t.inkMutedFixed}>
                {list.length ? `${list.length} gasto${list.length === 1 ? '' : 's'}` : 'Sin gastos todavía'}
              </T>
            </View>
          </Face>
        ),
      };
    }),
  ];

  // Figma: the header row starts right at the top inset (y 62 on a 62 pt inset).
  const headerTop = insets.top;
  // The dark fade under the status bar only appears once you scroll, so at rest
  // it doesn't dim the glow.
  const y = useSharedValue(0);
  const minimize = useMinimizeOnScroll();
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
    minimize(e.contentOffset.y, e.contentSize.height, e.layoutMeasurement.height);
  });
  const fadeStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 32], [0, 1], Extrapolation.CLAMP) }));

  const meButton = (
    <Tap onPress={() => router.navigate('/perfil')} accessibilityRole="button" accessibilityLabel="Tu perfil" style={styles.ring}>
      <RingAvatar id="tu" />
    </Tap>
  );
  const plusButton = (
    <Tap onPress={() => router.push('/dividir')} accessibilityRole="button" accessibilityLabel="Dividir algo nuevo">
      <Glass fallback={t.control} stroke style={styles.round}>
        <Icon name="plus" size={24} color={t.ink} />
      </Glass>
    </Tap>
  );
  // One microphone per screen (asked 2026-11-14): adding an expense lives on the lime button
  // by the tab bar (the rail on the closed Duo, the capture bar in the open Duo's detail pane),
  // so Inicio keeps the two other things you do here, side by side. The open Duo's list pane
  // is narrower, so there they stack.
  const tile = split ? undefined : { flex: 1 };
  const actions = (
    <View style={[styles.actions, split && styles.actionsStacked]}>
      <ActionRow
        icon="arrow-left-right"
        title="Saldar"
        sub={pendingPayments ? `${pendingPayments} pago${pendingPayments === 1 ? '' : 's'}` : 'A cero'}
        onPress={() => router.push('/saldar')}
        style={tile}
      />
      <ActionRow icon="receipt" title="Dividir" sub="Una cuenta" onPress={() => router.push('/cuenta')} style={tile} />
    </View>
  );

  // iPhone Duo open (Figma «Duo abierto · 2.1 Inicio»): the list pane keeps your
  // groups and the quick actions; the detail pane shows the group in front, so
  // swapping cards changes what's on the right. Search moves to the bottom.
  if (split) {
    // The front card is already open on the right; only Piso's "Pagar a Ana" still acts.
    const listCards = cards.map((c) => ({ ...c, onPress: undefined }));
    return (
      <View style={{ flex: 1, backgroundColor: t.page, flexDirection: 'row' }}>
        <FocusStatusBar style="light" />
        <View pointerEvents="none" style={styles.glow}>
          <Aurora preset="inicio" />
        </View>
        <View style={{ width: LIST_PANE, paddingTop: headerTop, paddingHorizontal: 20 }}>
          <View style={styles.header}>
            {meButton}
            <T v="titleM" color={t.ink} style={{ flex: 1 }} accessibilityRole="header">
              Grupos
            </T>
            {plusButton}
          </View>
          <View style={{ marginTop: 24 }}>
            <WalletStack cards={listCards} onFrontChange={setShown} cardHeight={232} initialKey={initial} />
          </View>
          {actions}
          <Tap
            onPress={() => router.push('/buscar')}
            accessibilityRole="search"
            accessibilityLabel="Buscar grupos, contactos o gastos"
            style={{ position: 'absolute', left: 20, right: 20, bottom: Math.max(insets.bottom, 20) + 8 }}
          >
            <Glass fallback={t.control} stroke style={styles.search}>
              <Icon name="search" size={20} color={t.inkSoft} />
              <T v="body" color={t.inkSoft} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                Buscar
              </T>
            </Glass>
          </Tap>
        </View>
        <View style={[styles.fold, { backgroundColor: t.line }]} />
        <View style={{ flex: 1 }}>
          <TripView key={shown} id={shown} embedded />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <Animated.ScrollView
        // On the closed Duo the light reaches into the control column instead of stopping at its edge.
        style={{ flex: 1, overflow: form === 'rail' ? 'visible' : undefined }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: headerTop + HEADER_H + 24,
          paddingHorizontal: 20,
          paddingBottom: 140,
        }}
        scrollIndicatorInsets={{ top: HEADER_H }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <FocusStatusBar style="light" />
        {/* v3 Aurora: the brand's lime and mint as ambient light at the top, fading
            into the graphite page. It scrolls with the page. */}
        <View pointerEvents="none" style={styles.glow}>
          <Aurora preset={appState === 'cargando' ? 'loading' : 'inicio'} overscroll={GLOW_OVERSCROLL} />
        </View>
        {appState === 'cargando' ? (
          <HomeSkeleton />
        ) : appState === 'sin-grupos' ? (
          <NoGroups />
        ) : (
          <>
            <WalletStack cards={cards} />

            {/* Quick actions: settle (a pending task, with its count) · split a bill. */}
            {actions}

            <T v="section" color={t.ink} style={{ marginTop: 24, marginBottom: 12 }} accessibilityRole="header">
              Contactos
            </T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={styles.people}>
              <Tap onPress={() => router.push({ pathname: '/invitar', params: { elegir: '1' } })} accessibilityRole="button" accessibilityLabel="Invitar a alguien" style={styles.person}>
                {/* The same translucent disc as the faces, with a plus instead of a face. */}
                <View style={[styles.face, { backgroundColor: t.disc }]}>
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
                    <Avatar id={p.id} size={FACE} bg={t.disc} portrait />
                    <T v="caption" color={t.ink} style={[styles.personName, { fontWeight: '500' }]} numberOfLines={1} maxFontSizeMultiplier={1.4}>
                      {name}
                    </T>
                  </Tap>
                );
              })}
            </ScrollView>

            <SpentOn expenses={expenses} />

            <T v="section" color={t.ink} style={{ marginTop: 24, marginBottom: 12 }} accessibilityRole="header">
              Anteriores
            </T>
            <Card style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
              {pastGroups.map((p, i) => (
                <View key={p.id}>
                  <Tap
                    highlight
                    onPress={() => router.push({ pathname: '/resumen', params: { id: p.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.kind}: ${p.name}. ${p.meta}. ${eurText(p.total)}, a cero. Cambiar emoji`}
                    style={[styles.rowBetween, { paddingVertical: 12 }]}
                  >
                    <View style={[styles.tile, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                      {pastEmoji[p.id] ? (
                        <Text style={styles.emoji} maxFontSizeMultiplier={1.3}>
                          {pastEmoji[p.id]}
                        </Text>
                      ) : (
                        <Icon name={kindIcon[p.kind === 'Piso' ? 'piso' : p.kind === 'Viaje' ? 'viaje' : p.kind === 'Regalo' ? 'evento' : 'otro']} size={20} color={t.ink} />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <T v="bodyStrong" color={t.ink}>
                        {p.name}
                      </T>
                      <T v="caption" color={t.inkMuted}>
                        {p.meta}
                      </T>
                    </View>
                    {/* The figure is what the group spent in all; tabular digits keep the column straight. */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <T v="titleXS" color={t.ink} style={styles.tabular}>
                        {eurText(p.total)}
                      </T>
                      <T v="caption" color={t.inkMuted}>
                        a cero
                      </T>
                    </View>
                  </Tap>
                  {i < pastGroups.length - 1 ? <Hairline /> : null}
                </View>
              ))}
            </Card>
          </>
        )}
      </Animated.ScrollView>

      {/* Floating header, like Revolut's: the page scrolls under it, so the search
          and + sit on Liquid Glass (the navigation layer, per Apple). A soft fade
          keeps the status bar readable over the lime cards. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: headerTop + HEADER_H + 24 }, fadeStyle]}>
        <Svg width="100%" height={headerTop + HEADER_H + 24}>
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.page} stopOpacity={0.96} />
              <Stop offset={(headerTop + HEADER_H) / (headerTop + HEADER_H + 24)} stopColor={t.page} stopOpacity={0.9} />
              <Stop offset="1" stopColor={t.page} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#fade)" />
        </Svg>
      </Animated.View>
      <View style={[styles.header, { position: 'absolute', top: headerTop, left: 20, right: 20 }]}>
        {meButton}
        <Tap onPress={() => router.push('/buscar')} accessibilityRole="search" accessibilityLabel="Buscar grupos, contactos o gastos" style={{ flex: 1 }}>
          <Glass fallback={t.control} stroke style={styles.search}>
            <Icon name="search" size={20} color={t.inkSoft} />
            <T v="body" color={t.inkSoft} numberOfLines={1} maxFontSizeMultiplier={1.4}>
              Buscar
            </T>
          </Glass>
        </Tap>
        {plusButton}
      </View>
    </View>
  );
}

/** 6.1 Inicio · cargando: the outline of the group in front, the two actions and the list below. */
function HomeSkeleton() {
  const { t } = useTheme();
  return (
    <Skeleton label="Cargando tus grupos">
      <Card style={{ height: 250, padding: 20 }}>
        <Bone w={150} h={22} />
        <Bone w={110} style={{ marginTop: 12 }} />
        <Bone w={70} style={{ marginTop: 34 }} />
        <Bone w={190} h={56} r={16} style={{ marginTop: 12 }} />
        <Bone w={170} h={40} r={20} style={{ marginTop: 12 }} />
      </Card>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        <Card style={{ flex: 1, height: 60, borderRadius: 22 }}>{null}</Card>
        <Card style={{ flex: 1, height: 60, borderRadius: 22 }}>{null}</Card>
      </View>
      <T v="section" color={t.ink} style={{ marginTop: 24, marginBottom: 12 }}>
        Anteriores
      </T>
      <Card style={{ paddingVertical: 4 }}>
        {[0, 1, 2].map((i) => (
          <View key={i}>
            {i > 0 ? <Hairline /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 68 }}>
              <Bone w={44} h={44} r={12} />
              <View style={{ flex: 1, gap: 8 }}>
                <Bone w={130} />
                <Bone w={90} h={10} />
              </View>
              <Bone w={64} />
            </View>
          </View>
        ))}
      </Card>
    </Skeleton>
  );
}

/** 6.4 Inicio · sin grupos: an invitation to start, on the brand gradient, and the one thing you can do without a group. */
function NoGroups() {
  const { t } = useTheme();
  return (
    <>
      <BrandGradient style={{ borderRadius: 28, padding: 20, minHeight: 237 }} seed={5}>
        <T v="titleM" color={t.inkFixed} accessibilityRole="header">
          Tu primer grupo
        </T>
        <T v="label" color={t.inkMutedFixed} style={{ marginTop: 8, fontWeight: '500' }}>
          Un viaje, el piso o una cena: añade a tus amigos y Zerow lleva las cuentas.
        </T>
        <View style={{ flex: 1, minHeight: 24 }} />
        <Button label="Crear un grupo" kind="onGradient" height={48} onPress={() => router.push('/grupo-nuevo')} />
      </BrandGradient>
      <Tap onPress={() => router.push('/cuenta')} accessibilityRole="button" accessibilityLabel="Dividir una cuenta ahora. Una cena o una compra, sin crear grupo" style={{ marginTop: 16 }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Tile>
            <Icon name="receipt" size={20} color={t.ink} />
          </Tile>
          <View style={{ flex: 1 }}>
            <T v="labelStrong" color={t.ink}>
              Dividir una cuenta ahora
            </T>
            <T v="caption" color={t.inkMuted} numberOfLines={1}>
              Una cena o una compra, sin crear grupo
            </T>
          </View>
          <Icon name="chevron-right" size={16} color={t.inkMuted} />
        </Card>
      </Tap>
      <Tap
        onPress={() => router.push({ pathname: '/nuevo', params: { ejemplo: 'Cena 84 euros, entre 4' } })}
        accessibilityRole="button"
        accessibilityLabel="Prueba a decir: cena 84 euros, entre 4"
        style={styles.tryIt}
      >
        <Frost fill={t.glass} radius={18} intensity={20} />
        <T v="caption" color={t.ink} style={{ fontWeight: '500' }}>
          {'Prueba: «cena 84\u00A0€, entre 4»'}
        </T>
      </Tap>
    </>
  );
}

/**
 * Group name, dates and faces. On the card behind, only this strip shows, so it
 * carries the balance instead of the faces: both groups read without swiping.
 */
function CardTop({ title, meta, people, peek, glass }: { title: string; meta: string; people: PersonId[]; peek?: string; glass?: boolean }) {
  const { t } = useTheme();
  const split = useScreen().form === 'split';
  const ink = glass ? t.ink : t.inkFixed;
  const muted = glass ? t.inkMuted : t.inkMutedFixed;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ flex: 1 }}>
        {/* On the glass strip the name steps down (Figma: 17 pt), so it fits next to the balance. */}
        <T v={glass ? 'titleXS' : split ? 'section' : 'titleM'} color={ink} numberOfLines={1} maxFontSizeMultiplier={1.4}>
          {title}
        </T>
        {/* The strip shows only the name and the balance (Figma «Franja»). */}
        {glass ? null : (
          <T v="caption" color={muted} style={{ fontWeight: '500' }} numberOfLines={1} maxFontSizeMultiplier={1.4}>
            {meta}
          </T>
        )}
      </View>
      {peek ? (
        <T v="labelStrong" color={ink} style={[styles.tabular, { flexShrink: 0 }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
          {peek}
        </T>
      ) : (
        <AvatarStack ids={people} size={split ? 24 : 30} max={split ? 3 : 4} on="lime" />
      )}
    </View>
  );
}

/** A group card's face: the brand gradient in front, a clear strip (the stack paints the glass) behind. */
function Face({ front, seed, lively, children }: { front: boolean; seed: number; lively?: boolean; children: React.ReactNode }) {
  return front ? (
    <BrandGradient style={styles.cardBody} seed={seed} lively={lively}>
      {children}
    </BrandGradient>
  ) : (
    <View style={styles.strip}>{children}</View>
  );
}

/** Figma «Saldar» / «Dividir»: a 60 pt glass tile with a lime-tinted icon disc, title, detail and a chevron. */
function ActionRow({ icon, title, sub, onPress, style }: { icon: IconName; title: string; sub: string; onPress: () => void; style?: { flex: number } }) {
  const { t } = useTheme();
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} style={style}>
      <Card style={styles.actionRow}>
        <View style={[styles.rowDisc, { backgroundColor: 'rgba(203,242,107,0.14)' }]}>
          <Icon name={icon} size={20} color={t.lime} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="labelStrong" color={t.ink} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {title}
          </T>
          <T v="caption" color={t.inkMuted} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {sub}
          </T>
        </View>
        <Icon name="chevron-right" size={16} color={t.inkMuted} />
      </Card>
    </Tap>
  );
}

/**
 * Where the open trip's money went: one row per expense (largest first, the rest
 * folded into "Otros"), each with a thin lime bar of its share. One hue only:
 * the name and amount carry identity, the bar only the proportion.
 */
function SpentOn({ expenses }: { expenses: Expense[] }) {
  const { t } = useTheme();
  if (!expenses.length) return null;
  const total = expenses.reduce((a, e) => a + e.amountEur, 0);
  const sorted = [...expenses].sort((a, b) => b.amountEur - a.amountEur);
  const rows =
    sorted.length > 4
      ? [...sorted.slice(0, 3).map((e) => ({ key: e.id, name: e.title, v: e.amountEur })), { key: 'otros', name: 'Otros', v: sorted.slice(3).reduce((a, e) => a + e.amountEur, 0) }]
      : sorted.map((e) => ({ key: e.id, name: e.title, v: e.amountEur }));
  return (
    <Tap
      onPress={() => router.push('/trip/lisboa')}
      accessibilityRole="button"
      accessibilityLabel={`En qué se fue Lisboa 2026: ${rows.map((r) => `${r.name} ${eurText(r.v)}`).join(', ')}`}
      style={{ marginTop: 24 }}
    >
      <Card style={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <T v="section" color={t.ink}>
              En qué se fue
            </T>
            <T v="caption" color={t.inkMuted}>
              Lisboa 2026 · {eurText(total)} en {plural(expenses.length, 'gasto')}
            </T>
          </View>
          <Icon name="chevron-right" size={16} color={t.inkMuted} />
        </View>
        {rows.map((r) => (
          <View key={r.key} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T v="label" color={t.ink} style={{ flex: 1, fontWeight: '500' }} numberOfLines={1}>
                {r.name}
              </T>
              <T v="caption" color={t.inkMuted} style={styles.tabular}>
                {`${Math.round((r.v / total) * 100)}\u00A0%`}
              </T>
              <T v="titleXS" color={t.ink} style={styles.tabular}>
                {eurText(r.v)}
              </T>
            </View>
            {/* The bar is the expense's share of the total (Figma: 60 % of the track). */}
            <View style={[styles.track, { backgroundColor: 'rgba(255,255,255,0.10)' }]}>
              <View style={[styles.bar, { width: `${Math.max(3, (r.v / total) * 100)}%`, backgroundColor: t.lime }]} />
            </View>
          </View>
        ))}
      </Card>
    </Tap>
  );
}

/** The one thing to do on a card, as a real button shape: a see-through dark pill, like the mic disc. */
function ActionPill({ label, dot, onPress }: { label: string; dot?: boolean; onPress?: () => void }) {
  const Box = onPress ? Tap : View;
  return (
    <Box style={styles.pill} {...(onPress ? { onPress, accessibilityRole: 'button' as const, accessibilityLabel: label } : {})}>
      {dot ? <View style={styles.pillDot} /> : null}
      <T v="labelStrong" color={aurora.inkFixed} maxFontSizeMultiplier={1.4}>
        {label}
      </T>
      <Icon name="chevron-right" size={16} color={aurora.inkFixed} />
    </Box>
  );
}

/** The balance shrinks a step for every extra digit so 4.812,30 € still fits the card. */
const heroSize = (v: number) => {
  const digits = Math.floor(Math.abs(v)).toString().length;
  // Figma: v3/Importe XL (76) for the open group; fewer points as the figure gets longer.
  return digits <= 3 ? 76 : digits === 4 ? 60 : 50;
};

const FACE = 56;

const styles = StyleSheet.create({
  emoji: { fontSize: 24, lineHeight: 30 },
  tabular: { fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionsStacked: { flexDirection: 'column', marginTop: 16 },
  actionRow: { height: 60, borderRadius: 22, paddingVertical: 0, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowDisc: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 22, paddingLeft: 16, paddingRight: 12, backgroundColor: 'rgba(17,17,18,0.12)' },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: aurora.inkFixed },
  cardBody: { flex: 1, padding: 20 },
  // Figma 6.4: a glass hint at the bottom right, just above the tab bar.
  tryIt: { marginTop: 'auto', alignSelf: 'flex-end', minHeight: 36, borderRadius: 18, paddingHorizontal: 16, justifyContent: 'center' },
  // Figma «Franja»: the strip's name and balance sit 12 from the top, 16 from the sides.
  strip: { flex: 1, paddingTop: 12, paddingHorizontal: 16 },
  people: { paddingHorizontal: 20, gap: 20 },
  person: { width: 56, alignItems: 'center' },
  personName: { marginTop: 8 },
  face: {
    width: FACE,
    height: FACE,
    borderRadius: FACE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    minHeight: 44,
  },
  glow: { position: 'absolute', left: 0, top: 0 },
  // The Duo's hinge between the two panes.
  fold: { width: StyleSheet.hairlineWidth * 2, opacity: 0.6 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  ring: { width: 44, height: 44 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
