import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { balancesFor, eurText, people, personName, pisoExpenses, pisoGroup, plural, settledBalances, usePisoBalance, useTrip, type Expense, type PersonId } from '../data/trip';
import { useTheme } from '../theme/useTheme';
import { Aurora } from './Aurora';
import { Avatar } from './Avatar';
import { Money } from './Money';
import { LIST_PANE, useScreen } from './Screen';
import { Card, Hairline, IconButton, T } from './ui';

/**
 * iPhone Duo open, Figma pattern «Resumen»: while you add an expense, look at
 * one or settle up, the list pane keeps the group in view (its balance, who's
 * up or down, and the expenses) and the task takes the detail pane. On any
 * other screen size this is just the task.
 */
export function SummaryPanes({ group = 'lisboa', children }: { group?: string; children: ReactNode }) {
  const { t } = useTheme();
  const { form } = useScreen();
  if (form !== 'split') return <>{children}</>;
  return (
    <View style={[styles.row, { backgroundColor: t.page }]}>
      <Aurora height={380} strength={0.75} />
      <View style={{ width: LIST_PANE }}>
        <GroupSummary id={group} />
      </View>
      <View style={[styles.fold, { backgroundColor: t.line }]} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export function payerLine(e: Expense) {
  const who = e.payer === 'tu' ? 'Pagaste tú' : `Pagó ${people[e.payer].name}`;
  const n = e.splitWith.length;
  const between = n === 2 ? e.splitWith.map((p) => (p === 'tu' ? 'tú' : people[p].name)).join(' y ') : `entre ${n}`;
  return `${who} · ${between}`;
}

/** The group at a glance (Figma «Resumen», 300 wide): name, your balance, everyone's, and the expenses. */
export function GroupSummary({ id }: { id: string }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, groups, groupExpenses, paid } = useTrip();
  const piso = usePisoBalance();
  const created = groups.find((g) => g.id === id);
  const g = id === 'piso' ? pisoGroup : created;
  const name = g ? g.name : 'Lisboa 2026';
  const members: PersonId[] = g ? g.members : ['tu', 'luis', 'ana', 'marta'];
  const meta = g ? [g.dates, plural(g.members.length, 'persona')].filter(Boolean).join(' · ') : '12–18 nov · 4 personas';
  const list = id === 'piso' ? [...(groupExpenses.piso ?? []), ...pisoExpenses] : g ? (groupExpenses[g.id] ?? []) : expenses;
  const currency = g?.currency ?? 'EUR';
  // Lisboa counts the payments already marked in Saldar.
  const bal = id === 'piso' || g ? balancesFor(list) : settledBalances(list, paid);
  if (id === 'piso') bal.tu = piso;
  const mine = bal.tu;
  const signed = (v: number) => (Math.abs(v) < 0.005 ? eurText(0, currency) : `${v > 0 ? '+' : '−'}${eurText(Math.abs(v), currency)}`);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View style={styles.head}>
        <IconButton name="chevron-left" label={`Volver a ${name}`} bg={t.glass} color={t.ink} onPress={() => router.navigate({ pathname: '/trip/[id]', params: { id } })} />
        <View style={{ flex: 1 }}>
          <T v="titleM" color={t.ink} numberOfLines={1}>
            {name}
          </T>
          <T v="caption" color={t.inkMuted} numberOfLines={1}>
            {meta}
          </T>
        </View>
      </View>

      <Card style={{ marginTop: 24, paddingVertical: 14 }}>
        <T v="caption" color={t.inkMuted}>
          {Math.abs(mine) < 0.005 ? 'Estás a cero' : mine > 0 ? 'Te deben' : 'Debes'}
        </T>
        <Money value={Math.abs(mine)} size={36} color={t.ink} currency={currency} />
        <View style={{ marginTop: 8 }}>
          {members.map((p) => (
            <View key={p}>
              <Hairline />
              <View style={styles.line} accessible accessibilityLabel={`${personName(p)}: ${signed(bal[p] ?? 0)}`}>
                <Avatar id={p} size={28} bg={t.disc} inset />
                <T v="body" color={t.ink} style={{ flex: 1 }}>
                  {personName(p)}
                </T>
                <T v="bodyStrong" color={(bal[p] ?? 0) > 0.005 ? t.lime : t.ink} style={styles.tabular}>
                  {signed(bal[p] ?? 0)}
                </T>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {list.length ? (
        <Card style={{ marginTop: 12, paddingVertical: 14 }}>
          <T v="bodyStrong" color={t.ink} style={{ marginBottom: 6 }}>
            Gastos
          </T>
          {list.map((e) => (
            <View key={e.id}>
              <Hairline />
              <View style={[styles.line, { paddingVertical: 8 }]}>
                <View style={{ flex: 1 }}>
                  <T v="label" color={t.ink} style={{ fontWeight: '600' }} numberOfLines={1}>
                    {e.title}
                  </T>
                  <T v="caption" color={t.inkMuted} numberOfLines={1}>
                    {payerLine(e)}
                  </T>
                </View>
                <T v="bodyStrong" color={t.ink} style={styles.tabular}>
                  {eurText(e.amountEur, currency)}
                </T>
              </View>
            </View>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

/**
 * iPhone Duo open, Figma pattern «pliego»: two columns of 353 (at 50 and 474),
 * the visual on the left and the words and actions on the right. Elsewhere the
 * `phone` layout is used unchanged.
 */
export function Spread({ left, right, footer, phone }: { left: ReactNode; right: ReactNode; footer?: ReactNode; phone: ReactNode }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { form } = useScreen();
  if (form !== 'split') return <>{phone}</>;
  return (
    <View style={[styles.row, { backgroundColor: t.page, paddingTop: insets.top + 8 }]}>
      <Aurora height={420} strength={0.85} />
      <ScrollView style={{ width: 353 + 50 + 30 }} contentContainerStyle={{ paddingLeft: 50, paddingRight: 30, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {left}
      </ScrollView>
      <View style={{ width: 353, marginLeft: 41 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          {right}
        </ScrollView>
        {footer ? <View style={{ paddingBottom: Math.max(insets.bottom, 16) }}>{footer}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  // The Duo's hinge between the two panes.
  fold: { width: StyleSheet.hairlineWidth * 2, opacity: 0.6 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  tabular: { fontVariant: ['tabular-nums'] },
});
