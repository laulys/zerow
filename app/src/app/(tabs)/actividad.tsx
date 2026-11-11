import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FocusStatusBar } from '../../components/FocusStatusBar';
import { Avatar } from '../../components/Avatar';
import { Card, Hairline, T, Tap } from '../../components/ui';
import { eurText, invite, people, settleUp, balancesFor, transferKey, useTrip, type PersonId } from '../../data/trip';
import { font, motion } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

type Item = { key: string; who: PersonId; title: string; meta: string; amount?: string; sub?: string; to?: string; badge?: string };

const sample = new Set(['hotel', 'taxi', 'cena', 'almuerzo']);
const name = (p: PersonId) => (p === 'tu' ? 'Tú' : people[p].name);

// 2.2 Actividad: what happened, newest first. "Hoy" follows what you do in the
// app (confirming the lunch, new expenses, payments, new groups); "Ayer" is the
// trip's sample history.
export default function Activity() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { draft, expenses, paid, pisoPaid, groups } = useTrip();

  const today: Item[] = [];
  // The invitation (5.2) stays on top until you answer it; once you join, it says so.
  const joined = groups.find((g) => g.name === invite.name);
  const inviter = people[invite.from].name;
  if (joined) today.push({ key: 'invite', who: 'tu', title: `Te uniste a ${invite.name}`, meta: `Por invitación de ${inviter} · ahora`, to: `/trip/${joined.id}` });
  else today.push({ key: 'invite', who: invite.from, title: `${inviter} te invitó a ${invite.name}`, meta: `${invite.dates} · ${invite.inside.length} personas dentro · ${invite.sentAt}`, to: `/t/${invite.code}`, badge: 'Ver' });
  if (pisoPaid) today.push({ key: 'piso', who: 'tu', title: 'Pagaste a Ana', meta: 'Piso Calle Mayor · ahora', amount: eurText(18.4), to: '/grupos' });
  for (const x of settleUp(balancesFor(expenses)).filter((x) => paid.has(transferKey(x)))) {
    today.push({ key: transferKey(x), who: x.from, title: x.to === 'tu' ? `${name(x.from)} te pagó` : `${name(x.from)} pagó a ${name(x.to)}`, meta: 'Lisboa 2026 · ahora', amount: eurText(x.amount), to: '/saldar' });
  }
  for (const e of expenses.filter((e) => !sample.has(e.id))) {
    today.push({ key: e.id, who: e.payer, title: `${e.payer === 'tu' ? 'Añadiste' : `${name(e.payer)} añadió`} ${e.title.toLowerCase()}`, meta: 'Lisboa 2026 · ahora', amount: eurText(e.amountEur), to: '/trip/lisboa' });
  }
  for (const g of groups.filter((g) => g !== joined)) today.push({ key: g.id, who: 'tu', title: `Creaste ${g.name}`, meta: `${g.members.length} personas · ahora`, to: `/trip/${g.id}` });
  const lunchSaved = expenses.some((e) => e.id === 'almuerzo');
  if (draft) today.push({ key: 'almuerzo', who: 'ana', title: 'Ana propuso el almuerzo', meta: 'Lisboa 2026 · 14:05 · borrador', amount: eurText(38), to: '/trip/lisboa' });
  else if (lunchSaved) today.push({ key: 'almuerzo', who: 'tu', title: 'Confirmaste el almuerzo', meta: 'Lisboa 2026 · lo propuso Ana', amount: eurText(38), to: '/trip/lisboa' });
  else today.push({ key: 'almuerzo', who: 'tu', title: 'Descartaste el almuerzo', meta: 'Lisboa 2026 · no cuenta', to: '/trip/lisboa' });
  today.push({ key: 'cena', who: 'tu', title: 'Confirmaste la cena', meta: 'Lisboa 2026 · 00:12 · con propina', amount: eurText(138), to: '/trip/lisboa' });

  const yesterday: Item[] = [
    { key: 'hotel', who: 'luis', title: 'Luis añadió el hotel', meta: 'Hotel Alfama · 18:30', amount: eurText(269.08), sub: '300,00 US$', to: '/trip/lisboa' },
    { key: 'taxi', who: 'ana', title: 'Ana añadió el taxi', meta: 'Taxi al hotel · 16:10', amount: eurText(40.36), sub: '45,00 US$', to: '/trip/lisboa' },
    { key: 'marta', who: 'marta', title: 'Marta se unió al viaje', meta: 'Por invitación de Ana · 11:02', to: '/trip/lisboa' },
  ];

  return (
    <ScrollView style={{ backgroundColor: t.page }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 140 }}>
      <FocusStatusBar style="light" />
      <View style={styles.header}>
        <T v="titleL" color={t.ink} accessibilityRole="header">
          Actividad
        </T>
      </View>
      {[
        { label: 'Hoy', items: today },
        { label: 'Ayer', items: yesterday },
      ].map((g) => (
        <View key={g.label} style={{ marginBottom: 20 }}>
          <T v="labelStrong" color={t.inkMuted} style={{ marginBottom: 8 }}>
            {g.label}
          </T>
          <Card bg={t.surface} style={{ paddingVertical: 4 }}>
            {g.items.map((it, i) => (
              <Animated.View key={it.key} entering={FadeInDown.duration(motion.standard)}>
                <Tap
                  onPress={it.to ? () => router.push(it.to as never) : undefined}
                  accessibilityRole="button"
                  accessibilityLabel={`${it.title}. ${it.meta}${it.amount ? `. ${it.amount}` : ''}`}
                  style={styles.row}
                >
                  <Avatar id={it.who} size={40} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <T v="bodyStrong" color={t.ink} numberOfLines={1}>
                      {it.title}
                    </T>
                    <T v="caption" color={t.inkMuted} numberOfLines={1}>
                      {it.meta}
                    </T>
                  </View>
                  {it.badge ? (
                    <View style={[styles.badge, { backgroundColor: t.lime }]}>
                      <T v="caption" color={t.onLime} style={{ fontFamily: font.medium }}>
                        {it.badge}
                      </T>
                    </View>
                  ) : null}
                  {it.amount ? (
                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                      <T v="bodyStrong" color={t.ink}>
                        {it.amount}
                      </T>
                      {it.sub ? (
                        <T v="caption" color={t.inkMuted}>
                          {it.sub}
                        </T>
                      ) : null}
                    </View>
                  ) : null}
                </Tap>
                {i < g.items.length - 1 ? <Hairline color={t.line} inset={52} /> : null}
              </Animated.View>
            ))}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 44, justifyContent: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  badge: { marginLeft: 8, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
});
