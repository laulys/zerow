import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusStatusBar } from '../../components/FocusStatusBar';
import { Avatar, AvatarStack } from '../../components/Avatar';
import { Icon, type IconName } from '../../components/Icon';
import { BrandGradient } from '../../components/BrandGradient';
import { Money, RollingMoney } from '../../components/Money';
import { WalletStack, type WalletCard } from '../../components/WalletStack';
import { Glass } from '../../components/Glass';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Aurora } from '../../components/Aurora';
import { LIST_PANE, useScreen } from '../../components/Screen';
import { TripView } from '../trip/[id]';
import { Card, Hairline, T, Tap } from '../../components/ui';
import { balancesFor, eurText, pastGroups, people, settleUp, transferKey, usePeopleBalances, usePisoBalance, useTrip, type Expense, type GroupKind, type PersonId } from '../../data/trip';
import { light } from '../../theme/tokens';

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
  const insets = useSafeAreaInsets();
  const { expenses, draft, groups, groupExpenses, pisoPaid, pastEmoji, paid } = useTrip();
  const pendingPayments = settleUp(balancesFor(expenses)).filter((x) => !paid.has(transferKey(x))).length;
  const mine = balancesFor(expenses).tu;
  const between = usePeopleBalances();
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
      title: `Lisboa 2026. ${mine >= 0 ? 'Te deben' : 'Debes'} ${eurText(Math.abs(mine))}${draft ? '. 1 gasto por revisar' : ''}`,
      onPress: () => router.push('/trip/lisboa'),
      content: (front: boolean) => (
        <Face front={front} seed={3}>
          <CardTop glass={!front} title="Lisboa 2026" meta="12–18 nov · en curso" people={['tu', 'ana', 'luis', 'marta']} peek={front ? undefined : peekText(mine)} />
          <T v="label" color={light.inkMutedFixed} style={{ marginTop: 'auto', fontWeight: '500' }}>
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
        </Face>
      ),
    },
    {
      key: 'piso',
      title: pisoPaid ? `Piso Calle Mayor. ${pisoWord}${piso ? ' ' + eurText(Math.abs(piso)) : ''}` : 'Piso Calle Mayor. Debes 18,40 €. Toca para pagar a Ana',
      // Unpaid, the card is the quick way to pay Ana; once paid it opens the flat.
      onPress: () => router.push(pisoPaid ? '/trip/piso' : '/pagar'),
      content: (front: boolean) => (
        <Face front={front} seed={7} lively>
          <CardTop glass={!front} title="Piso Calle Mayor" meta="3 personas · 2 gastos este mes" people={['tu', 'ana', 'luis']} peek={front ? undefined : peekText(piso)} />
          <T v="label" color={light.inkMutedFixed} style={{ marginTop: 'auto', fontWeight: '500' }}>
            {pisoWord}
          </T>
          <RollingMoney value={Math.abs(piso)} size={heroSize(piso)} color={light.inkFixed} centsColor={light.inkMutedFixed} />
          <View style={styles.cardFoot}>
            {/* When you owe, the card says what to do about it, not just the number. */}
            {pisoPaid ? (
              <>
                <Icon name="check" size={16} color={light.inkFixed} />
                <T v="caption" color={light.inkFixed} style={{ fontWeight: '600' }}>
                  Pagaste 18,40 € a Ana
                </T>
              </>
            ) : (
              <ActionPill label="Pagar a Ana" />
            )}
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
              meta={`${g.members.length} personas${g.dates ? ' · ' + g.dates : ''}`}
              people={g.members}
              peek={front ? undefined : list.length ? peekText(bal, g.currency) : 'Sin gastos'}
            />
            <T v="label" color={light.inkMutedFixed} style={{ marginTop: 'auto', fontWeight: '500' }}>
              {list.length ? (bal >= 0 ? 'Te deben' : 'Debes') : 'Saldo'}
            </T>
            <Money value={Math.abs(bal)} size={heroSize(bal)} color={light.inkFixed} centsColor={light.inkMutedFixed} currency={g.currency} />
            <View style={styles.cardFoot}>
              <Icon name={kindIcon[g.kind]} size={16} color={light.inkMutedFixed} />
              <T v="caption" color={light.inkMutedFixed}>
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
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const fadeStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 60], [0, 1], Extrapolation.CLAMP) }));

  const meButton = (
    <Tap onPress={() => router.navigate('/perfil')} accessibilityRole="button" accessibilityLabel="Tu perfil" style={styles.ring}>
      {/* Figma «Avatar · laura»: 44 pt on white 8 %, with a 1.5 pt ring from lime to mint that fades out. */}
      <Avatar id="tu" size={44} bg="rgba(255,255,255,0.08)" />
      <Svg width={44} height={44} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="me" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={t.lime} stopOpacity={1} />
            <Stop offset="0.55" stopColor={t.mint} stopOpacity={0.9} />
            <Stop offset="1" stopColor={t.lime} stopOpacity={0.2} />
          </LinearGradient>
        </Defs>
        <Circle cx={22} cy={22} r={21.25} stroke="url(#me)" strokeWidth={1.5} fill="none" />
      </Svg>
    </Tap>
  );
  const plusButton = (
    <Tap onPress={() => router.push('/dividir')} accessibilityRole="button" accessibilityLabel="Dividir algo nuevo">
      <Glass fallback={t.control} stroke style={styles.round}>
        <Icon name="plus" size={24} color={t.ink} />
      </Glass>
    </Tap>
  );
  const actions = (
    <View style={[styles.actions, split && { marginTop: 16 }]}>
      <AddExpense onPress={() => router.push('/nuevo')} />
      <View style={{ flex: 1, gap: 12 }}>
        <ActionRow icon="arrow-left-right" title="Saldar" sub={pendingPayments ? `${pendingPayments} pago${pendingPayments === 1 ? '' : 's'}` : 'A cero'} onPress={() => router.push('/saldar')} />
        <ActionRow icon="receipt" title="Dividir" sub="Una cuenta" onPress={() => router.push('/cuenta')} />
      </View>
    </View>
  );

  // iPhone Duo open (Figma «Duo abierto · 2.1 Inicio»): the list pane keeps your
  // groups and the quick actions; the detail pane shows the group in front, so
  // swapping cards changes what's on the right. Search moves to the bottom.
  if (split) {
    // The front card is already open on the right; only Piso's "Pagar a Ana" still acts.
    const listCards = cards.map((c) => ({ ...c, onPress: c.key === 'piso' && !pisoPaid ? c.onPress : undefined }));
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
          <Aurora preset="inicio" overscroll={GLOW_OVERSCROLL} />
        </View>
        <WalletStack cards={cards} />

        {/* Quick actions, by how often you need them: add (the main one, on the brand
            gradient) · settle (a pending task, with its count) · split a bill. */}
        {actions}

        <T v="section" color={t.ink} style={{ marginTop: 24, marginBottom: 12 }} accessibilityRole="header">
          Contactos
        </T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={styles.people}>
          <Tap onPress={() => router.push({ pathname: '/invitar', params: { elegir: '1' } })} accessibilityRole="button" accessibilityLabel="Invitar a alguien" style={styles.person}>
            {/* A solid disc, the same as the faces, with a plus instead of a face. */}
            <View style={[styles.face, { backgroundColor: t.panelRaised }]}>
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
                <Avatar id={p.id} size={FACE} />
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
                onPress={() => router.push({ pathname: '/emoji', params: { id: p.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${p.kind}: ${p.name}. ${p.meta}. ${eurText(p.total)}, a cero. Cambiar emoji`}
                style={[styles.rowBetween, { paddingVertical: 12 }]}
              >
                <View style={[styles.tile, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
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

/**
 * Group name, dates and faces. On the card behind, only this strip shows, so it
 * carries the balance instead of the faces: both groups read without swiping.
 */
function CardTop({ title, meta, people, peek, glass }: { title: string; meta: string; people: PersonId[]; peek?: string; glass?: boolean }) {
  const { t } = useTheme();
  const split = useScreen().form === 'split';
  const ink = glass ? t.ink : light.inkFixed;
  const muted = glass ? t.inkMuted : light.inkMutedFixed;
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

/**
 * Figma «Añadir gasto»: a glass card (white 7 % + blur) with the mic on a 52 pt
 * brand-gradient disc that glows softly, the title in Título S and its hint below.
 */
function AddExpense({ onPress }: { onPress: () => void }) {
  const { t } = useTheme();
  // The open Duo's list pane is narrower: the label steps down so it fits whole.
  const split = useScreen().form === 'split';
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel="Añadir gasto. Dilo o escríbelo" style={{ flex: 1 }}>
      <Card style={styles.addTile}>
        <View style={styles.micGlow}>
          <BrandGradient style={styles.micDisc} seed={11}>
            <Icon name="mic" size={24} color={light.inkFixed} />
          </BrandGradient>
        </View>
        <View>
          <T v={split ? 'titleXS' : 'section'} color={t.ink} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            Añadir gasto
          </T>
          <T v="caption" color={t.inkMuted} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            Dilo o escríbelo
          </T>
        </View>
      </Card>
    </Tap>
  );
}

/** Figma «Saldar» / «Dividir»: a 60 pt glass row with a lime-tinted icon disc, title, detail and a chevron. */
function ActionRow({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`} style={{ flex: 1 }}>
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
              Lisboa 2026 · {eurText(total)} en {expenses.length} gastos
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
                {Math.round((r.v / total) * 100)} %
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
function ActionPill({ label, dot }: { label: string; dot?: boolean }) {
  return (
    <View style={styles.pill}>
      {dot ? <View style={styles.pillDot} /> : null}
      <T v="labelStrong" color={light.inkFixed} maxFontSizeMultiplier={1.4}>
        {label}
      </T>
      <Icon name="chevron-right" size={16} color={light.inkFixed} />
    </View>
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
  actions: { flexDirection: 'row', gap: 12, marginTop: 20, height: 132 },
  addTile: { height: 132, borderRadius: 28, padding: 16, justifyContent: 'space-between' },
  micGlow: { width: 52, height: 52, borderRadius: 26, shadowColor: '#B6F03A', shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  micDisc: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  actionRow: { flex: 1, borderRadius: 22, paddingVertical: 0, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowDisc: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 22, paddingLeft: 16, paddingRight: 12, backgroundColor: 'rgba(17,17,18,0.12)' },
  pillDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: light.inkFixed },
  cardBody: { flex: 1, padding: 20 },
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
  ring: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
