import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Icon, type IconName } from '../components/Icon';
import { Card, Hairline, T, Tap } from '../components/ui';
import { eurText, kindEmoji, openEmoji, pastGroups, people, usePeopleBalances, usePisoBalance, useTrip, balancesFor, type Expense, type PersonId } from '../data/trip';
import { font } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

type Row = {
  key: string;
  title: string;
  sub: string;
  right?: string;
  lead: { avatar?: PersonId; emoji?: string; icon?: IconName };
  go: () => void;
};

// 2.12 Buscar: one field for everything you might look for: a group (open or
// settled), a person, or an expense. Empty, it shows your groups and people.
export default function Search() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const { expenses, groups, groupExpenses, pastEmoji } = useTrip();
  const between = usePeopleBalances();
  const piso = usePisoBalance();
  const lisboa = balancesFor(expenses).tu;
  const owe = (v: number) => (Math.abs(v) < 0.005 ? 'A mano' : v > 0 ? `Te deben ${eurText(v)}` : `Debes ${eurText(-v)}`);

  const groupRows: Row[] = [
    {
      key: 'lisboa',
      title: 'Lisboa 2026',
      sub: owe(lisboa),
      lead: { emoji: openEmoji.lisboa, icon: 'plane' },
      go: () => router.push('/trip/lisboa'),
    },
    {
      key: 'piso',
      title: 'Piso Calle Mayor',
      sub: owe(piso),
      lead: { emoji: openEmoji.piso, icon: 'house' },
      go: () => router.push('/trip/piso'),
    },
    ...groups.map((g) => ({
      key: g.id,
      title: g.name,
      sub: owe(balancesFor(groupExpenses[g.id] ?? []).tu),
      lead: { emoji: kindEmoji[g.kind], icon: 'shapes' as IconName },
      go: () => router.push({ pathname: '/trip/[id]', params: { id: g.id } }),
    })),
    ...pastGroups.map((p) => ({
      key: p.id,
      title: p.name,
      sub: `${p.meta} · saldado`,
      lead: { emoji: pastEmoji[p.id], icon: 'shapes' as IconName },
      go: () => router.push({ pathname: '/emoji', params: { id: p.id } }),
    })),
  ];
  const personRows: Row[] = between.map((p) => ({
    key: p.id,
    title: people[p.id].name,
    sub: p.net > 0 ? `Te debe ${eurText(p.net)}` : p.net < 0 ? `Le debes ${eurText(-p.net)}` : 'A mano',
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
  const match = (r: Row) => !term || fold(`${r.title} ${r.sub}`).includes(term);
  const sections = [
    { title: 'Grupos', rows: groupRows.filter(match) },
    { title: 'Contactos', rows: personRows.filter(match) },
    { title: 'Gastos', rows: term ? expenseRows.filter(match) : [] },
  ].filter((s) => s.rows.length);

  return (
    <View style={{ flex: 1, backgroundColor: t.page, paddingTop: insets.top + 8 }}>
      <View style={styles.bar}>
        <View style={[styles.field, { backgroundColor: t.surface }]}>
          <Icon name="search" size={18} color={t.inkMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            autoFocus
            placeholder="Grupos, contactos o gastos"
            placeholderTextColor={t.inkMuted}
            selectionColor={t.lime}
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.input, { color: t.ink }]}
            accessibilityLabel="Buscar"
          />
          {q ? (
            <Tap onPress={() => setQ('')} accessibilityRole="button" accessibilityLabel="Borrar búsqueda" style={styles.clear}>
              <Icon name="x" size={16} color={t.inkMuted} />
            </Tap>
          ) : null}
        </View>
        <Tap onPress={() => router.back()} accessibilityRole="button" style={styles.cancel}>
          <T v="labelStrong" color={t.ink}>
            Cancelar
          </T>
        </Tap>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {sections.length ? (
          sections.map((s) => (
            <Animated.View key={s.title} entering={FadeIn.duration(160)} style={{ marginTop: 16 }}>
              <T v="labelStrong" color={t.inkMuted} style={{ marginBottom: 8 }}>
                {s.title}
              </T>
              <Card bg={t.surface} style={{ paddingVertical: 4 }}>
                {s.rows.map((r, i) => (
                  <View key={r.key}>
                    <Tap onPress={r.go} accessibilityRole="button" accessibilityLabel={`${r.title}. ${r.sub}${r.right ? `. ${r.right}` : ''}`} style={styles.row}>
                      {r.lead.avatar ? (
                        <Avatar id={r.lead.avatar} size={40} bg={t.panelRaised} />
                      ) : (
                        // Solid, one step above the card, no border: same as the faces in Contactos.
                        <View style={[styles.tile, { backgroundColor: t.panelRaised }]}>
                          {r.lead.emoji ? <Text style={styles.emoji}>{r.lead.emoji}</Text> : <Icon name={r.lead.icon ?? 'shapes'} size={20} color={t.ink} />}
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <T v="bodyStrong" color={t.ink} numberOfLines={1}>
                          {r.title}
                        </T>
                        <T v="caption" color={t.inkMuted} numberOfLines={1}>
                          {r.sub}
                        </T>
                      </View>
                      {r.right ? (
                        <T v="bodyStrong" color={t.ink} style={{ marginLeft: 8 }}>
                          {r.right}
                        </T>
                      ) : null}
                    </Tap>
                    {i < s.rows.length - 1 ? <Hairline color={t.line} inset={52} /> : null}
                  </View>
                ))}
              </Card>
            </Animated.View>
          ))
        ) : (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
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

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  field: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 16,
    paddingRight: 6,
  },
  input: { flex: 1, height: 44, fontFamily: font.regular, fontSize: 16 },
  clear: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22, lineHeight: 28 },
});
