import { Aurora } from '../components/Aurora';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Frost } from '../components/Frost';
import { useScreen } from '../components/Screen';
import { Icon, type IconName } from '../components/Icon';
import { Card, Hairline, T, Tap } from '../components/ui';
import { eurText, kindEmoji, openEmoji, pastGroups, people, usePeopleBalances, usePisoBalance, useTrip, balancesFor, settledBalances, type Expense, type PersonId } from '../data/trip';
import { useTheme } from '../theme/useTheme';

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Where `term` (already folded) starts a word of `title`, or −1. Folding keeps one character per letter, so the index fits the title. */
function wordStart(title: string, term: string) {
  const f = fold(title.normalize('NFC'));
  for (let i = f.indexOf(term); i >= 0; i = f.indexOf(term, i + 1)) if (i === 0 || f[i - 1] === ' ') return i;
  return -1;
}

type Row = {
  key: string;
  title: string;
  sub: string;
  /** The line under the title reads lime when the money comes to you (Figma). */
  good?: boolean;
  right?: string;
  lead: { avatar?: PersonId; emoji?: string; icon?: IconName };
  go: () => void;
};

// 2.12 Buscar: one field for everything you might look for: a group (open or
// settled), a person, or an expense. Empty, it shows your groups and people.
export default function Search() {
  const split = useScreen().form === 'split';
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const { expenses, groups, groupExpenses, pastEmoji, paid } = useTrip();
  const between = usePeopleBalances();
  const piso = usePisoBalance();
  const lisboa = settledBalances(expenses, paid).tu;
  const owe = (v: number) => (Math.abs(v) < 0.005 ? 'A cero' : v > 0 ? `Te deben ${eurText(v)}` : `Debes ${eurText(-v)}`);

  const groupRows: Row[] = [
    {
      key: 'lisboa',
      title: 'Lisboa 2026',
      sub: owe(lisboa),
      good: lisboa > 0.005,
      lead: { emoji: openEmoji.lisboa, icon: 'plane' },
      go: () => router.push('/trip/lisboa'),
    },
    {
      key: 'piso',
      title: 'Piso Calle Mayor',
      sub: owe(piso),
      good: piso > 0.005,
      lead: { emoji: openEmoji.piso, icon: 'house' },
      go: () => router.push('/trip/piso'),
    },
    ...groups.map((g) => ({
      key: g.id,
      title: g.name,
      sub: owe(balancesFor(groupExpenses[g.id] ?? []).tu),
      good: balancesFor(groupExpenses[g.id] ?? []).tu > 0.005,
      lead: { emoji: kindEmoji[g.kind], icon: 'shapes' as IconName },
      go: () => router.push({ pathname: '/trip/[id]', params: { id: g.id } }),
    })),
    ...pastGroups.map((p) => ({
      key: p.id,
      title: p.name,
      sub: `${p.meta} · a cero`,
      lead: { emoji: pastEmoji[p.id], icon: 'shapes' as IconName },
      go: () => router.push({ pathname: '/emoji', params: { id: p.id } }),
    })),
  ];
  const personRows: Row[] = between.map((p) => ({
    key: p.id,
    title: people[p.id].name,
    sub: p.net > 0 ? `Te debe ${eurText(p.net)}` : p.net < 0 ? `Le debes ${eurText(-p.net)}` : 'A cero',
    good: p.net > 0.005,
    lead: { avatar: p.id },
    go: () => router.push({ pathname: '/persona', params: { id: p.id } }),
  }));
  const ledgers: [string, string, Expense[]][] = [
    ['lisboa', 'Lisboa 2026', expenses],
    ['piso', 'Piso Calle Mayor', groupExpenses.piso ?? []],
    ...groups.map((g) => [g.id, g.name, groupExpenses[g.id] ?? []] as [string, string, Expense[]]),
  ];
  const expenseRows: Row[] = ledgers.flatMap(([gid, gname, list]) =>
    list.map((e) => ({
      key: gid + e.id,
      title: e.title,
      sub: `${gname} · pagó ${e.payer === 'tu' ? 'tú' : people[e.payer].name}`,
      right: eurText(e.amountEur),
      lead: { avatar: e.payer },
      go: () => router.push({ pathname: '/gasto', params: { grupo: gid, id: e.id } }),
    })),
  );

  const term = fold(q.trim());
  // Figma 2.12b/c: what you type matches the start of a word in the name («L» finds Lisboa and Luis, not Calle).
  const match = (r: Row) => !term || wordStart(r.title, term) >= 0;
  const sections = [
    { title: 'Grupos', rows: groupRows.filter(match) },
    { title: 'Contactos', rows: personRows.filter(match) },
    // Expenses join in from the second letter, so one letter only finds groups and people (Figma 2.12b).
    { title: 'Gastos', rows: term.length > 1 ? expenseRows.filter(match) : [] },
  ].filter((s) => s.rows.length);

  return (
    <View style={{ flex: 1, backgroundColor: t.page, paddingTop: insets.top }}>
      <Aurora preset="task" />
      <View style={[styles.bar, split && { paddingLeft: 50, paddingRight: 40 }]}>
        {/* Figma «Campo»: the navigation glass (white 10 % + 8 % edge over a blur). */}
        <View style={[styles.field, { borderColor: t.controlStroke, paddingRight: q ? 10 : 16 }]}>
          <Frost fill={t.control} radius={22} intensity={16} />
          <Icon name="search" size={20} color={t.inkSoft} />
          <TextInput
            value={q}
            onChangeText={setQ}
            autoFocus
            placeholder="Buscar"
            placeholderTextColor={t.inkMuted}
            selectionColor={t.lime}
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.input, { color: t.ink }]}
            accessibilityLabel="Buscar"
          />
          {q ? (
            <Tap onPress={() => setQ('')} accessibilityRole="button" accessibilityLabel="Borrar búsqueda" hitSlop={10} style={styles.clear}>
              <Icon name="x" size={12} color={t.ink} />
            </Tap>
          ) : null}
        </View>
        <Tap onPress={() => router.back()} accessibilityRole="button" style={styles.cancel}>
          <T v="bodyStrong" color={t.ink}>
            Cancelar
          </T>
        </Tap>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          // Figma: 24 under the field; groups 30 apart before you type, 12 apart in the results.
          { paddingHorizontal: 20, paddingTop: 24, paddingBottom: insets.bottom + 24, gap: term ? 12 : 30 },
          // Open iPhone Duo (Figma «Duo abierto · 2.12»): the result groups side by side, 353 each.
          split && { paddingLeft: 50, paddingRight: 40, flexDirection: 'row', flexWrap: 'wrap', columnGap: 71 },
        ]}
      >
        {sections.length ? (
          sections.map((s) => (
            <Animated.View key={s.title} entering={FadeIn.duration(160)} style={[{ gap: 12 }, split && { width: 353 }]}>
              <T v="labelStrong" color={t.inkMuted}>
                {s.title}
              </T>
              <Card style={{ paddingVertical: 4 }}>
                {s.rows.map((r, i) => (
                  <View key={r.key}>
                    <Tap highlight onPress={r.go} accessibilityRole="button" accessibilityLabel={`${r.title}. ${r.sub}${r.right ? `. ${r.right}` : ''}`} style={styles.row}>
                      {r.lead.avatar ? (
                        <Avatar id={r.lead.avatar} size={40} bg={t.disc} inset />
                      ) : (
                        // Figma «Emoji»: the group's emoji on a white 8 % tile.
                        <View style={styles.tile}>{r.lead.emoji ? <Text style={styles.emoji}>{r.lead.emoji}</Text> : <Icon name={r.lead.icon ?? 'shapes'} size={20} color={t.ink} />}</View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Title text={r.title} term={term} />
                        <T v="caption" color={r.good ? t.lime : t.inkMuted} numberOfLines={1}>
                          {r.sub}
                        </T>
                      </View>
                      {r.right ? (
                        <T v="titleXS" color={t.ink}>
                          {r.right}
                        </T>
                      ) : null}
                    </Tap>
                    {i < s.rows.length - 1 ? <Hairline /> : null}
                  </View>
                ))}
              </Card>
            </Animated.View>
          ))
        ) : (
          <View style={{ marginTop: 16, alignItems: 'center' }}>
            <T v="bodyStrong" color={t.ink}>
              Nada con «{q.trim()}»
            </T>
            <T v="label" color={t.inkMuted} style={{ marginTop: 4, textAlign: 'center' }}>
              Prueba con el nombre de un grupo, de un contacto o de un gasto.
            </T>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/** A result's name, with what you typed in lime (Figma 2.12b). */
function Title({ text, term }: { text: string; term: string }) {
  const { t } = useTheme();
  const at = term ? wordStart(text, term) : -1;
  const name = text.normalize('NFC');
  return (
    <T v="bodyStrong" color={t.ink} numberOfLines={1}>
      {at < 0 ? (
        name
      ) : (
        <>
          {name.slice(0, at)}
          <Text style={{ color: t.lime }}>{name.slice(at, at + term.length)}</Text>
          {name.slice(at + term.length)}
        </>
      )}
    </T>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 48, paddingHorizontal: 20 },
  field: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16 },
  input: { flex: 1, height: 44, fontSize: 17, paddingVertical: 0 },
  clear: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  cancel: { height: 44, justifyContent: 'center', paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62 },
  tile: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 23, lineHeight: 28 },
});
