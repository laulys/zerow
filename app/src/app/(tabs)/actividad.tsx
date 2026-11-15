import { Aurora } from '../../components/Aurora';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { LayoutAnimationConfig, LinearTransition, useAnimatedScrollHandler, useReducedMotion, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusStatusBar } from '../../components/FocusStatusBar';
import { useScreen } from '../../components/Screen';
import { StatusVeil } from '../../components/StatusVeil';
import { Avatar } from '../../components/Avatar';
import { Tile } from '../../components/Tile';
import { rise, EASE } from '../../components/motion';
import { useMinimizeOnScroll } from '../../components/TabChrome';
import { Card, Hairline, T, Tap } from '../../components/ui';
import { eurText, invite, pastGroups, people, personName, plural, transferKey, useTrip, type Expense, type PersonId } from '../../data/trip';
import { motion } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

type Item = { key: string; who?: PersonId; emoji?: string; title: string; meta: string; amount?: string; sub?: string; to?: string; badge?: string; tag?: string };

const sample = new Set(['hotel', 'taxi', 'cena', 'almuerzo']);
const roma = pastGroups.find((g) => g.id === 'roma')!;

// 2.2 Actividad: what happened, newest first. "Hoy" follows what you do in the
// app (adding the lunch, new expenses, payments, new groups); "Ayer" is the
// trip's sample history; the last block is an older group that reached zero.
export default function Activity() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { draft, expenses, paid, pisoPaid, pisoPaidAmount, groups, groupExpenses, pastEmoji } = useTrip();
  // You open this tab many times a day, so the page itself doesn't perform: the tab
  // cross-fades in (see the tabs layout). Only what changes moves: a new entry rises
  // into place and the ones below make room.
  const reduce = useReducedMotion();
  const minimize = useMinimizeOnScroll();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
    minimize(e.contentOffset.y, e.contentSize.height, e.layoutMeasurement.height);
  });
  // Open iPhone Duo (Figma «Duo abierto · 2.2»): «Hoy» and «Ayer» side by side, 353 each.
  const { form } = useScreen();
  const split = form === 'split';
  // On the Duo the light reaches into the control column instead of stopping at its edge.
  const wide = form !== 'compact';

  const today: Item[] = [];
  // The invitation (5.2) stays on top until you answer it; once you join, it says so.
  const joined = groups.find((g) => g.name === invite.name);
  const inviter = people[invite.from].name;
  if (joined) today.push({ key: 'invite', who: 'tu', title: `Te has unido a ${invite.name}`, meta: `Por invitación de ${inviter} · ahora`, to: `/trip/${joined.id}` });
  else
    today.push({
      key: 'invite',
      who: invite.from,
      title: `${inviter} te invitó a ${invite.name}`,
      meta: `${invite.dates} · ${invite.inside.length} personas dentro · ${invite.sentAt}`,
      to: `/t/${invite.code}`,
      badge: 'Ver',
    });
  if (pisoPaid) today.push({ key: 'piso', who: 'tu', title: 'Pagaste a Ana', meta: 'Piso Calle Mayor · ahora', amount: eurText(pisoPaidAmount), to: '/trip/piso' });
  for (const [i, x] of paid.entries()) {
    today.push({
      key: `${transferKey(x)}-${i}`,
      who: x.from,
      title: x.from === 'tu' ? `Pagaste a ${personName(x.to)}` : x.to === 'tu' ? `${personName(x.from)} te pagó` : `${personName(x.from)} pagó a ${personName(x.to)}`,
      meta: 'Lisboa 2026 · ahora',
      amount: eurText(x.amount),
      to: '/saldar',
    });
  }
  for (const e of expenses.filter((e) => !sample.has(e.id))) {
    today.push({
      key: e.id,
      // Whatever you dictate or save is summed by you, whoever paid it.
      who: 'tu',
      title: `Sumaste «${e.title}»`,
      meta: `Lisboa 2026 · ${e.payer === 'tu' ? 'pagaste tú' : `pagó ${personName(e.payer)}`} · ahora`,
      amount: eurText(e.amountEur),
      to: '/trip/lisboa',
    });
  }
  // What you sum in the flat or in the groups you made shows here too, not only Lisboa.
  const elsewhere: [string, string, Expense[]][] = [
    ['piso', 'Piso Calle Mayor', (groupExpenses.piso ?? []).filter((e) => e.id !== 'luz' && e.id !== 'wifi')],
    ...groups.map((g) => [g.id, g.name, groupExpenses[g.id] ?? []] as [string, string, Expense[]]),
  ];
  for (const [gid, gname, list] of elsewhere)
    for (const e of list)
      today.push({
        key: gid + e.id,
        who: 'tu',
        title: `Sumaste «${e.title}»`,
        meta: `${gname} · ${e.payer === 'tu' ? 'pagaste tú' : `pagó ${personName(e.payer)}`} · ahora`,
        amount: eurText(e.amountEur),
        to: `/trip/${gid}`,
      });
  for (const g of groups.filter((g) => g !== joined)) today.push({ key: g.id, who: 'tu', title: `Creaste ${g.name}`, meta: `${plural(g.members.length, 'persona')} · ahora`, to: `/trip/${g.id}` });
  const lunchSaved = expenses.some((e) => e.id === 'almuerzo');
  // The lunch waits for review with a «Por revisar» tag under its amount (Figma); once added it reads like the dinner.
  if (draft) today.push({ key: 'almuerzo', who: 'ana', title: 'Ana propuso el almuerzo', meta: 'Lisboa 2026 · 14:05', amount: eurText(38), tag: 'Por revisar', to: '/trip/lisboa' });
  else if (lunchSaved) today.push({ key: 'almuerzo', who: 'tu', title: 'Sumaste el almuerzo', meta: 'Lisboa 2026 · lo propuso Ana', amount: eurText(38), to: '/trip/lisboa' });
  else today.push({ key: 'almuerzo', who: 'tu', title: 'Descartaste el almuerzo', meta: 'Lisboa 2026 · no cuenta', to: '/trip/lisboa' });
  today.push({ key: 'cena', who: 'tu', title: 'Sumaste la cena', meta: 'Lisboa 2026 · 00:12 · con propina', amount: eurText(138), to: '/trip/lisboa' });

  const yesterday: Item[] = [
    { key: 'hotel', who: 'luis', title: 'Luis añadió el hotel', meta: 'Hotel Alfama · 18:30', amount: eurText(269.08), sub: '300,00\u00A0US$', to: '/trip/lisboa' },
    { key: 'taxi', who: 'ana', title: 'Ana añadió el taxi', meta: 'Taxi al hotel · 16:10', amount: eurText(40.36), sub: '45,00\u00A0US$', to: '/trip/lisboa' },
    { key: 'marta', who: 'marta', title: 'Marta se unió al viaje', meta: 'Por invitación de Ana · 11:02', to: '/trip/lisboa' },
  ];

  const older: Item[] = [{ key: 'roma', emoji: pastEmoji.roma, title: 'Roma quedó a cero', meta: '3 pagos marcados · 14 mar 2025', amount: eurText(roma.total), to: '/resumen?id=roma' }];

  const sections = [
    { label: 'Hoy', items: today },
    { label: 'Ayer', items: yesterday },
    { label: 'Marzo de 2025', items: older },
  ];

  const section = (g: (typeof sections)[number]) => (
    <View key={g.label} style={styles.section}>
      <T v="labelStrong" color={t.inkMuted}>
        {g.label}
      </T>
      <Card style={{ paddingVertical: 4 }}>
        {g.items.map((it, i) => (
          <Animated.View key={it.key} entering={rise(0, 8, reduce)} layout={LinearTransition.duration(motion.standard).easing(EASE)}>
            <Tap
              highlight
              onPress={it.to ? () => router.push(it.to as never) : undefined}
              accessibilityRole="button"
              accessibilityLabel={`${it.title}. ${it.meta}${it.amount ? `. ${it.amount}` : ''}${it.tag ? `. ${it.tag}` : ''}`}
              style={styles.row}
            >
              {it.who ? (
                <Avatar id={it.who} size={40} bg={t.disc} inset />
              ) : (
                // Figma «Emoji»: the group's emoji on a white 8 % tile.
                <Tile>
                  <Text style={styles.emoji} maxFontSizeMultiplier={1.3}>
                    {it.emoji}
                  </Text>
                </Tile>
              )}
              <View style={{ flex: 1 }}>
                {/* The title wraps (Figma lets it take two lines); the detail line ends in «…». */}
                <T v="labelStrong" color={t.ink}>
                  {it.title}
                </T>
                <T v="caption" color={t.inkMuted} numberOfLines={1}>
                  {it.meta}
                </T>
              </View>
              {it.badge ? <Tag label={it.badge} /> : null}
              {it.amount ? (
                <View style={{ alignItems: 'flex-end', gap: it.tag ? 4 : 0 }}>
                  <T v="titleXS" color={t.ink}>
                    {it.amount}
                  </T>
                  {it.sub ? (
                    <T v="caption" color={t.inkMuted}>
                      {it.sub}
                    </T>
                  ) : null}
                  {it.tag ? <Tag label={it.tag} /> : null}
                </View>
              ) : null}
            </Tap>
            {i < g.items.length - 1 ? <Hairline /> : null}
          </Animated.View>
        ))}
      </Card>
    </View>
  );

  return (
    <View style={[{ flex: 1, backgroundColor: t.page }, wide && styles.unclipped]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={[{ flex: 1, backgroundColor: t.page }, wide && styles.unclipped]}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingLeft: split ? 50 : 20, paddingRight: split ? 40 : 20, paddingBottom: 140 }}
      >
        <Aurora preset="tab" />
        <FocusStatusBar style="light" />
        <T v="titleL" color={t.ink} accessibilityRole="header" style={styles.title}>
          Actividad
        </T>
        {/* On the first render nothing enters: the rows are simply there. */}
        <LayoutAnimationConfig skipEntering>
          {split ? (
            // Two columns on the open Duo: today on the left, the rest on the right.
            <View style={styles.spread}>
              <View style={{ flex: 1 }}>{section(sections[0])}</View>
              <View style={{ flex: 1, gap: 20 }}>{sections.slice(1).map((g) => section(g))}</View>
            </View>
          ) : (
            <View style={{ gap: 20 }}>{sections.map((g) => section(g))}</View>
          )}
        </LayoutAnimationConfig>
      </Animated.ScrollView>
      <StatusVeil y={y} />
    </View>
  );
}

/**
 * Figma «Ver» / «Por revisar»: a 26 pt lime tag with dark 13 pt text. It marks what's
 * waiting on you; the colour already says so, so it doesn't move.
 */
function Tag({ label }: { label: string }) {
  const { t } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: t.lime }]}>
      <T v="caption" color={t.inkFixed} style={{ fontWeight: '600' }}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 20 },
  section: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  emoji: { fontSize: 23, lineHeight: 28 },
  unclipped: { overflow: 'visible' },
  spread: { flexDirection: 'row', alignItems: 'flex-start', gap: 71 },
  pill: { minHeight: 26, borderRadius: 13, paddingHorizontal: 12, justifyContent: 'center' },
});
