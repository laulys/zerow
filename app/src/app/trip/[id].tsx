import { payerLine } from '../../components/Duo';
import { useScreen } from '../../components/Screen';
import { Aurora, type AuroraPreset } from '../../components/Aurora';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, LinearTransition, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Avatar } from '../../components/Avatar';
import { BrandGradient } from '../../components/BrandGradient';
import { Frost } from '../../components/Frost';
import { Glass } from '../../components/Glass';
import { Icon } from '../../components/Icon';
import { Orb } from '../../components/Orb';
import { Money, RollingAmount, RollingMoney } from '../../components/Money';
import { Button, Card, Hairline, IconButton, T, Tap, type as typeScale } from '../../components/ui';
import { PISO_SHARE, balancesFor, eurText, invite, people, pisoGroup, settleUp, transferKey, usePisoBalance, useTrip, type Currency, type Expense, type Group, type PersonId } from '../../data/trip';
import { light, motion } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const order: PersonId[] = ['tu', 'luis', 'ana', 'marta'];

function caption(id: PersonId, v: number) {
  if (Math.abs(v) < 0.005) return 'a cero';
  if (id === 'tu') return v > 0 ? 'te deben' : 'debes';
  return v > 0 ? 'le deben' : 'debe';
}

const headline = (v: number) => (Math.abs(v) < 0.005 ? 'A cero' : v > 0 ? 'Te deben' : 'Debes');

// 3.1 Lisboa: the AI draft on the brand gradient, everyone's balance and the
// expense list. Confirming makes every balance roll to its new value.
export default function TripRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Open iPhone Duo (Figma 3.1 / 3.8): a group opens as Inicio's list and detail, with it in front.
  if (useScreen().form === 'split') {
    // Required here, not at the top: Inicio imports this file too, and a top-level
    // import both ways is a require cycle that breaks hot reloads.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Home = require('../(tabs)/grupos').default as (p: { initial?: string }) => React.JSX.Element;
    return <Home initial={id} />;
  }
  return <TripView id={id} />;
}

// On the open iPhone Duo the group lives in Inicio's detail pane: no back
// button (the list is right there) and no light of its own (Inicio's spans both panes).
const Embedded = createContext(false);

export function TripView({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const { groups } = useTrip();
  const group = groups.find((g) => g.id === id);
  return <Embedded.Provider value={embedded}>{id === 'piso' ? <PisoGroup /> : group ? <EmptyGroup group={group} /> : <Trip />}</Embedded.Provider>;
}

// Lucide paths drawn at Figma's own stroke weights (the shared Icon is fixed at 1.75 in a 24 box).
const glyphs = {
  arrowRightLeft: ['m16 3 4 4-4 4', 'M20 7H4', 'm8 21-4-4 4-4', 'M4 17h16'],
  arrowRight: ['M5 12h14', 'm12 5 7 7-7 7'],
  check: ['M20 6 9 17l-5-5'],
  undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  mic: ['M12 19v3', 'M19 10v2a7 7 0 0 1-14 0v-2'],
  pen: ['M12 20h9', 'M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z'],
};

/** An icon whose `weight` is the stroke in points at its drawn size, as Figma reports it. */
export function Glyph({ name, size, color, weight }: { name: keyof typeof glyphs; size: number; color: string; weight: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={(weight * 24) / size} strokeLinecap="round" strokeLinejoin="round">
      {glyphs[name].map((d) => (
        <Path key={d} d={d} />
      ))}
      {name === 'mic' ? <Rect x={9} y={2} width={6} height={13} rx={3} /> : null}
    </Svg>
  );
}

/** Figma «Destello»: the four-point star that marks what Zerow prepared. */
function Sparkle({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Path d="M7 0 L8.584 5.416 L14 7 L8.584 8.584 L7 14 L5.416 8.584 L0 7 L5.416 5.416 Z" fill={color} />
    </Svg>
  );
}

/** Figma «Fundido»: the page colour rising from clear, so content scrolls away under the bottom controls. */
export function BottomFade({ height }: { height: number }) {
  const { t } = useTheme();
  return (
    <Svg pointerEvents="none" style={[styles.fade, { height }]} width="100%" height={height}>
      <Defs>
        <LinearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.page} stopOpacity={0} />
          <Stop offset="0.6" stopColor={t.page} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height={height} fill="url(#bottomFade)" />
    </Svg>
  );
}

/** Where the capture bar sits: 22 pt above the screen's bottom edge on a phone with a home indicator (Figma). */
const barBottom = (inset: number) => Math.max(inset - 12, 12);
const BAR = 60;
/** Room under the scrolling content: the bar, plus the 27 pt Figma leaves above it. */
const listPad = (inset: number) => barBottom(inset) + BAR + 27;

function Back() {
  const { t } = useTheme();
  const embedded = useContext(Embedded);
  if (embedded) return <View />;
  return <IconButton name="chevron-left" label="Volver" bg={t.glass} color={t.ink} onPress={() => router.back()} />;
}

// Figma's lime/mint glow on a group (3.1, 3.8), a little softer when it's empty (5.4, 6.5): the exact
// «Aurora» frames of those screens.
function Light({ preset = 'group' }: { preset?: AuroraPreset }) {
  const embedded = useContext(Embedded);
  return embedded ? null : <Aurora preset={preset} />;
}

/** The navigation row: back, then invite (and anything else, e.g. «Saldar») on the right. */
function Nav({ name, children }: { name: string; children?: React.ReactNode }) {
  const { t } = useTheme();
  return (
    <View style={styles.nav}>
      <Back />
      <View style={{ flex: 1 }} />
      <IconButton name="user-plus" label="Invitar al grupo" bg={t.glass} color={t.ink} onPress={() => router.push({ pathname: '/invitar', params: { nombre: name } })} />
      {children}
    </View>
  );
}

/** Título L 16 pt under the navigation, then the status line in ink-soft. */
function Heading({ title, meta }: { title: string; meta: string }) {
  const { t } = useTheme();
  return (
    <>
      <T v="titleL" color={t.ink} style={{ marginTop: 16 }} accessibilityRole="header">
        {title}
      </T>
      <T v="label" color={t.inkSoft} style={{ marginTop: 4 }}>
        {meta}
      </T>
    </>
  );
}

const metaLine = (g: Group) => [g.dates, `${g.members.length} personas`, g.currency === 'EUR' ? 'en euros' : 'en dólares'].filter(Boolean).join(' · ');

// Piso Calle Mayor (3.8): the sample flat, with its two bills and your share to Ana.
function PisoGroup() {
  const { t } = useTheme();
  const { pisoPaid } = useTrip();
  const mine = usePisoBalance();
  return (
    <EmptyGroup
      group={pisoGroup}
      mine={mine}
      note={pisoPaid ? undefined : 'Tu parte de la luz y el agua, a Ana'}
      action={
        pisoPaid ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Glyph name="check" size={16} color={t.lime} weight={2} />
            <T v="caption" color={t.inkMuted}>
              Pagaste {eurText(PISO_SHARE)} a Ana
            </T>
          </View>
        ) : (
          <Button label={`Pagar a Ana · ${eurText(PISO_SHARE)}`} height={48} onPress={() => router.push('/pagar')} />
        )
      }
    />
  );
}

// A group created in the app. Empty, Zerow invites you to say the first expense
// (6.5, 5.4); with expenses, the same balance-and-list layout as Piso (3.8).
function EmptyGroup({ group, mine: fixed, note, action }: { group: Group; mine?: number; note?: string; action?: React.ReactNode }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupExpenses } = useTrip();
  const list = groupExpenses[group.id] ?? [];
  const mine = fixed ?? balancesFor(list).tu;
  if (!list.length) return <ListeningEmpty group={group} />;
  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <Light />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: listPad(insets.bottom) }}>
        <Nav name={group.name} />
        <Heading title={group.name} meta={metaLine(group)} />
        {/* Figma «Saldo»: p16, 4 pt between the lines, 10 pt of air above the action. */}
        <Card style={{ marginTop: 16, gap: 4 }}>
          <T v="label" color={t.inkMuted} style={{ fontWeight: '500' }}>
            {headline(mine)}
          </T>
          <RollingMoney value={Math.abs(mine)} size={56} color={t.ink} currency={group.currency} duration={motion.numbers} />
          <T v="labelStrong" color={t.ink}>
            {eurText(
              list.reduce((a, e) => a + e.amountEur, 0),
              group.currency,
            )}{' '}
            en {list.length} gasto{list.length === 1 ? '' : 's'}
          </T>
          {note ? (
            <T v="caption" color={t.inkMuted}>
              {note}
            </T>
          ) : null}
          {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
        </Card>
        <Expenses list={list} group={group.id} currency={group.currency} />
      </ScrollView>
      <CaptureBar bottom={insets.bottom} group={group.id} />
    </View>
  );
}

// The spoken form goes to Zerow; the chip shows Figma's shorter one.
const firstExamples = [
  { show: '«Pagué el hotel, 300 €, entre todos»', say: 'Pagué el hotel, 300 euros, entre todos' },
  { show: '«Taxi, 45 dólares, para Ana y para mí»', say: 'Pagué el taxi, 45 dólares, para Ana y para mí' },
  { show: '«Pagué la cena, 84 €, entre todos»', say: 'Pagué la cena, 84 euros, entre todos' },
];

// 6.5 Viaje sin gastos (and 5.4, just joined): an empty group is an invitation to
// talk. Zerow's orb, one sentence, and examples you can tap to try straight away.
function ListeningEmpty({ group }: { group: Group }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  // 5.4: you got here from Ana's invitation, so the screen first confirms you're in.
  const joined = group.name === invite.name;
  const at = (ms: number) => FadeInDown.delay(ms).duration(300);
  const tryIt = (ejemplo: string) => router.push({ pathname: '/nuevo', params: { grupo: group.id, ejemplo } });
  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <Light preset="joined" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: listPad(insets.bottom) }}>
        <Nav name={group.name} />
        <Heading title={group.name} meta={metaLine(group)} />
        {/* Figma «Vacío»: a centred column, 12 pt apart, with extra air around the orb. */}
        <View style={{ marginTop: 16, alignItems: 'center', gap: 12 }}>
          {joined ? (
            <View style={[styles.joined, { backgroundColor: 'rgba(203,242,107,0.14)' }]} accessibilityLiveRegion="polite">
              <Glyph name="check" size={20} color={t.lime} weight={2.25} />
              <T v="labelStrong" color={t.lime}>
                Te has unido. Empiezas en {eurText(0, group.currency)}.
              </T>
            </View>
          ) : null}
          <View style={{ height: 26 }} />
          <Orb size={96} state="listening" label="Zerow te escucha" />
          <View style={{ height: 2 }} />
          <Animated.View entering={at(150)} style={{ alignSelf: 'stretch', gap: 12 }}>
            <T v="titleM" color={t.ink} style={{ textAlign: 'center' }} accessibilityRole="header">
              Cuéntame el primer gasto
            </T>
            <T v="label" color={t.inkMuted} style={{ textAlign: 'center' }}>
              Dilo como se lo dirías a un amigo. Yo lo dejo por revisar y nada cuenta hasta que lo sumes.
            </T>
          </Animated.View>
          <View style={{ height: 4 }} />
          <Animated.View entering={at(280)} style={{ alignItems: 'center', gap: 12 }}>
            {firstExamples.map((ex) => (
              <Tap key={ex.say} onPress={() => tryIt(ex.say)} accessibilityRole="button" accessibilityLabel={`Probar: ${ex.say}`} style={styles.example}>
                <Frost fill={t.glass} radius={22} intensity={20} />
                <T v="labelStrong" color={t.ink}>
                  {ex.show}
                </T>
              </Tap>
            ))}
          </Animated.View>
        </View>
      </ScrollView>
      <CaptureBar bottom={insets.bottom} group={group.id} />
    </View>
  );
}

function Trip() {
  const { t } = useTheme();
  const embedded = useContext(Embedded);
  const insets = useSafeAreaInsets();
  const { expenses, draft, confirmDraft, discardDraft, undoLast, paid } = useTrip();
  // 3.2 / 3.3: a notice with «Deshacer» after either answer. «No es así» only hides
  // the draft; it is dropped when the notice goes, so «Deshacer» can bring it back.
  const [notice, setNotice] = useState<{ title: string; kind: 'sumado' | 'descartado' } | null>(null);
  const discarding = notice?.kind === 'descartado';
  const shown = discarding ? null : draft;
  const now = balancesFor(expenses);
  const next = shown ? balancesFor([shown, ...expenses]) : null;
  const total = expenses.reduce((s, e) => s + e.amountEur, 0);
  const pendingPayments = settleUp(now).filter((x) => !paid.has(transferKey(x))).length;

  const pending = useRef(false);
  useEffect(() => {
    pending.current = discarding;
  }, [discarding]);
  // Leaving the screen with a discard pending makes it final.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => (pending.current ? discardDraft() : undefined), []);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => {
      if (notice.kind === 'descartado') discardDraft();
      setNotice(null);
    }, 10000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);

  const onConfirm = () => {
    if (!draft) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    confirmDraft();
    setNotice({ title: draft.title, kind: 'sumado' });
  };
  const onDiscard = () => {
    if (draft) setNotice({ title: draft.title, kind: 'descartado' });
  };
  const onUndo = () => {
    if (notice?.kind === 'sumado') undoLast();
    setNotice(null);
  };

  const bar = barBottom(insets.bottom);
  const saldar = pendingPayments ? `Saldar · ${pendingPayments} pago${pendingPayments === 1 ? '' : 's'}` : 'A cero';

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <Light />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: listPad(insets.bottom) + (notice ? 56 : 0) }}>
        {embedded ? (
          // In Inicio's detail pane the name sits on the navigation line (Figma «Duo abierto · 2.1»).
          <View style={styles.nav}>
            <View style={{ flex: 1 }}>
              <T v="titleL" color={t.ink} numberOfLines={1}>
                Lisboa 2026
              </T>
              <T v="caption" color={t.inkMuted} style={{ marginTop: 2 }}>
                12–18 nov · 4 personas · en euros
              </T>
            </View>
            <IconButton name="user-plus" label="Invitar al grupo" bg={t.glass} color={t.ink} onPress={() => router.push('/invitar')} />
            <Button label={saldar} kind="control" height={44} leading={<Glyph name="arrowRightLeft" size={20} color={t.lime} weight={1.75} />} onPress={() => router.push('/saldar')} />
          </View>
        ) : (
          <>
            <Nav name="Lisboa 2026">
              <Button label={saldar} kind="control" height={44} leading={<Glyph name="arrowRightLeft" size={20} color={t.lime} weight={1.75} />} onPress={() => router.push('/saldar')} />
            </Nav>
            <Animated.View entering={FadeInDown.duration(220)}>
              <Heading title="Lisboa 2026" meta="12–18 nov · 4 personas · en euros" />
            </Animated.View>
          </>
        )}

        {/* Figma «Contenido»: 16 pt under the status line, 16 pt between blocks. */}
        <View style={{ marginTop: embedded ? 20 : 16, gap: 16 }}>
          {shown ? (
            <Animated.View key={shown.id} entering={FadeInDown.delay(100).duration(280)} exiting={ZoomOut.duration(motion.standard)}>
              <DraftCard draft={shown} onConfirm={onConfirm} onDiscard={onDiscard} />
            </Animated.View>
          ) : null}

          {/* In Inicio's detail pane the balances and the expenses sit side by side. */}
          <View style={embedded ? styles.sideBySide : { gap: 16 }}>
            <Animated.View entering={FadeInDown.delay(180).duration(280)} layout={LinearTransition.duration(motion.standard)} style={embedded && { flex: 1 }}>
              {/* Figma «Saldos»: p16 16 8, the rows 56 tall with a filete above each. */}
              <Card style={{ paddingBottom: 8 }}>
                <T v="label" color={t.inkMuted} style={{ fontWeight: '500' }}>
                  {headline(now.tu)}
                </T>
                <RollingMoney value={Math.abs(now.tu)} size={embedded ? 48 : 56} color={t.ink} duration={motion.numbers} />
                {next && shown ? (
                  <View style={styles.preview}>
                    <Glyph name="arrowRight" size={16} color={t.lime} weight={2} />
                    <T v="caption" color={t.lime} style={{ fontWeight: '600' }}>
                      {eurText(next.tu)} si sumas el {shown.title.toLowerCase()}
                    </T>
                  </View>
                ) : (
                  <T v="caption" color={t.inkMuted} style={{ marginBottom: 10 }}>
                    {eurText(total)} en {expenses.length} gasto{expenses.length === 1 ? '' : 's'}
                  </T>
                )}
                {order.map((id) => (
                  <View key={id}>
                    <Hairline />
                    <Tap
                      onPress={() => router.push(id === 'tu' ? '/saldar' : { pathname: '/persona', params: { id } })}
                      accessibilityRole="button"
                      accessibilityLabel={`${people[id].name}, ${caption(id, now[id])} ${eurText(Math.abs(now[id]))}${next ? `. Si sumas el almuerzo, ${eurText(Math.abs(next[id]))}` : ''}. ${id === 'tu' ? 'Ir a saldar' : `Ver lo vuestro`}`}
                      style={styles.balRow}
                    >
                      <Avatar id={id} size={36} bg={t.faceOnCard} />
                      <View style={{ flex: 1 }}>
                        <T v="bodyStrong" color={t.ink}>
                          {people[id].name}
                        </T>
                        <T v="caption" color={t.inkMuted}>
                          {caption(id, now[id])}
                        </T>
                      </View>
                      <Signed value={now[id]} />
                    </Tap>
                  </View>
                ))}
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(260).duration(280)} layout={LinearTransition.duration(motion.standard)} style={embedded && { flex: 1.2 }}>
              {embedded ? (
                // Figma «Duo abierto · 2.1»: a compact list with its heading inside the card.
                <Card style={{ paddingVertical: 14 }}>
                  <T v="bodyStrong" color={t.ink}>
                    Gastos
                  </T>
                  <T v="caption" color={t.inkMuted} style={{ marginBottom: 6 }}>
                    {eurText(total)} en {expenses.length} gastos
                  </T>
                  {expenses.map((e) => (
                    <Animated.View key={e.id} entering={FadeInDown.duration(motion.standard)}>
                      <Hairline />
                      <Tap
                        onPress={() => router.push({ pathname: '/gasto', params: { grupo: 'lisboa', id: e.id } })}
                        accessibilityRole="button"
                        accessibilityLabel={`${e.title}, ${eurText(e.amountEur)}. ${payerLine(e)}. Ver detalle`}
                        style={styles.compactRow}
                      >
                        <View style={{ flex: 1 }}>
                          <T v="labelStrong" color={t.ink} numberOfLines={1}>
                            {e.title}
                          </T>
                          <T v="caption" color={t.inkMuted} numberOfLines={1}>
                            {payerLine(e)}
                          </T>
                        </View>
                        <T v="bodyStrong" color={t.ink} style={{ fontVariant: ['tabular-nums'] }}>
                          {eurText(e.amountEur)}
                        </T>
                      </Tap>
                    </Animated.View>
                  ))}
                </Card>
              ) : (
                <Expenses list={expenses} group="lisboa" flush />
              )}
            </Animated.View>
          </View>
        </View>
      </ScrollView>

      <CaptureBar bottom={insets.bottom} />

      {notice ? (
        // Figma «Aviso»: glass, 48 tall, 16 pt above the capture bar.
        <Animated.View entering={FadeInDown.duration(motion.standard)} exiting={FadeOutDown.duration(160)} style={[styles.toast, { bottom: bar + BAR + 16 }]} accessibilityLiveRegion="polite">
          <Frost fill={t.glass} radius={24} intensity={20} />
          <T v="label" color={t.ink} style={{ flex: 1, fontWeight: '500' }}>
            {notice.title} {notice.kind}
          </T>
          <Tap onPress={onUndo} accessibilityRole="button" accessibilityLabel="Deshacer" style={[styles.undo, { backgroundColor: t.glass }]}>
            <Glyph name="undo" size={16} color={t.ink} weight={2} />
            <T v="labelStrong" color={t.ink}>
              Deshacer
            </T>
          </Tap>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** A balance in Título XS: lime with «+» when they're owed, ink with «−» when they owe. */
function Signed({ value }: { value: number }) {
  const { t } = useTheme();
  const sign = value > 0.005 ? '+' : value < -0.005 ? '−' : '';
  const style = [typeScale.titleXS, { color: value > 0.005 ? t.lime : t.ink, fontVariant: ['tabular-nums' as const] }];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      {sign ? <Text style={style}>{sign}</Text> : null}
      <RollingAmount value={Math.abs(value)} style={style} />
    </View>
  );
}

/** Figma «Gastos»: Título S, then a card of 62 pt rows. `flush` when the parent already spaces the blocks. */
function Expenses({ list, group, currency = 'EUR', flush }: { list: Expense[]; group: string; currency?: Currency; flush?: boolean }) {
  const { t } = useTheme();
  return (
    <View style={{ marginTop: flush ? 8 : 24, gap: 12 }}>
      <T v="section" color={t.ink} accessibilityRole="header">
        Gastos
      </T>
      <Card style={{ paddingVertical: 4 }}>
        {list.map((e, i) => (
          <Animated.View key={e.id} entering={FadeInDown.duration(motion.standard)}>
            {i > 0 ? <Hairline /> : null}
            <ExpenseRow e={e} group={group} currency={currency} />
          </Animated.View>
        ))}
      </Card>
    </View>
  );
}

function DraftCard({ draft, onConfirm, onDiscard }: { draft: Expense; onConfirm: () => void; onDiscard: () => void }) {
  const { t } = useTheme();
  const ink = light.inkFixed;
  const soft = t.inkMutedFixed;
  const each = draft.amountEur / draft.splitWith.length;
  const who = draft.payer === 'tu' ? 'Pagaste tú' : `Pagó ${people[draft.payer].name}`;
  return (
    // Figma's two shadows: a wide lime glow under the card and a tight dark one.
    <View style={styles.draftGlow}>
      <View style={styles.draftShade}>
        <BrandGradient style={styles.draft} seed={7}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Sparkle color={ink} />
            <T v="caption" color={soft} style={{ fontWeight: '600' }}>
              Por revisar · aún no cuenta
            </T>
          </View>
          <View style={styles.draftTitle}>
            <T v="titleM" color={ink} style={{ flex: 1 }} numberOfLines={1}>
              {draft.title}
            </T>
            <Money value={draft.amountEur} size={36} color={ink} />
          </View>
          <T v="label" color={soft} style={{ fontWeight: '500' }}>
            {who} · {eurText(each)} cada uno, entre {draft.splitWith.length}
          </T>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Button label="No es así" kind="onGradientSoft" height={48} onPress={onDiscard} />
            <Button label="Sí, sumarlo" kind="onGradient" height={48} leading={<Glyph name="check" size={20} color={t.lime} weight={2} />} onPress={onConfirm} style={{ flex: 1 }} />
          </View>
        </BrandGradient>
      </View>
    </View>
  );
}

// «Pagó Luis, entre 4» or, between two, «Pagó Ana, entre Ana y Luis».
function splitLine(e: Expense) {
  const who = e.payer === 'tu' ? 'Pagaste tú' : `Pagó ${people[e.payer].name}`;
  if (e.splitWith.length > 2) return `${who}, entre ${e.splitWith.length}`;
  const names = e.splitWith.map((p) => people[p].name).join(' y ');
  return `${who}, entre ${names}`;
}

function ExpenseRow({ e, group, currency = 'EUR' }: { e: Expense; group: string; currency?: Currency }) {
  const { t } = useTheme();
  const line = splitLine(e);
  // The second line on the right: the original dollars, or the note («propina 15 %»).
  const aside = e.originalUsd ? `${e.originalUsd.toFixed(2).replace('.', ',')} US$` : e.note;
  return (
    <Tap
      onPress={() => router.push({ pathname: '/gasto', params: { grupo: group, id: e.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${e.title}, ${eurText(e.amountEur, currency)}. ${line}. Ver detalle`}
      style={styles.expRow}
    >
      <Avatar id={e.payer} size={36} bg={t.faceOnCard} />
      <View style={{ flex: 1 }}>
        <T v="labelStrong" color={t.ink} numberOfLines={1}>
          {e.title}
        </T>
        <T v="caption" color={t.inkMuted} numberOfLines={1}>
          {line}
        </T>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <T v="titleXS" color={t.ink}>
          {eurText(e.amountEur, currency)}
        </T>
        {aside ? (
          <T v="caption" color={t.inkMuted}>
            {aside}
          </T>
        ) : null}
      </View>
    </Tap>
  );
}

// Figma «Cuéntame un gasto»: 60 pt glass (white 12 % + blur), the keyboard and a
// gradient mic with a lime glow, over the fade that hides the list under it.
function CaptureBar({ bottom, group = 'lisboa' }: { bottom: number; group?: string }) {
  const { t } = useTheme();
  return (
    <>
      <BottomFade height={126} />
      <Tap
        onPress={() => router.push({ pathname: '/nuevo', params: { grupo: group } })}
        accessibilityRole="button"
        accessibilityLabel="Cuéntame un gasto"
        style={[styles.captureWrap, { bottom: barBottom(bottom) }]}
      >
        <Glass fallback={t.glass} style={styles.capture}>
          <T v="body" color={t.inkSoft} style={{ flex: 1 }}>
            Cuéntame un gasto…
          </T>
          <Icon name="keyboard" size={24} color={t.inkSoft} />
          <View style={styles.micGlow}>
            <BrandGradient style={styles.mic} seed={11}>
              <Glyph name="mic" size={24} color={t.inkFixed} weight={2} />
            </BrandGradient>
          </View>
        </Glass>
      </Tap>
    </>
  );
}

const lime = '#CBF26B';

const styles = StyleSheet.create({
  sideBySide: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  joined: { alignSelf: 'stretch', height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 16 },
  example: { height: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 28, paddingBottom: 10 },
  balRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 56 },
  draftGlow: { borderRadius: 28, backgroundColor: lime, shadowColor: '#B6F03A', shadowOpacity: 0.3, shadowRadius: 28, shadowOffset: { width: 0, height: 22 } },
  draftShade: { borderRadius: 28, backgroundColor: lime, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 9, shadowOffset: { width: 0, height: 8 } },
  draft: { borderRadius: 28, padding: 16, gap: 12 },
  draftTitle: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 36 },
  expRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 62 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  toast: { position: 'absolute', left: 20, right: 20, height: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16, paddingRight: 6 },
  undo: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingLeft: 12, paddingRight: 16, borderRadius: 22 },
  captureWrap: { position: 'absolute', left: 20, right: 20, height: BAR, borderRadius: 30 },
  capture: { flex: 1, borderRadius: 30, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 6, gap: 12 },
  micGlow: { width: 48, height: 48, borderRadius: 24, backgroundColor: lime, shadowColor: '#B6F03A', shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 5 } },
  mic: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
