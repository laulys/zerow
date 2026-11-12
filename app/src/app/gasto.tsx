import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Money } from '../components/Money';
import { Button, Card, Hairline, IconButton, T } from '../components/ui';
import { eurText, people, useTrip, type Expense, type PersonId } from '../data/trip';
import { useTheme } from '../theme/useTheme';

const name = (p: PersonId) => (p === 'tu' ? 'Tú' : people[p].name);
const RATE = 0.8969; // USD → EUR on the day of the trip's sample expenses

// 3.7 Detalle del gasto: who paid, what it cost (in the original currency when it
// wasn't euros) and how it splits, payer first. "Editar" goes back to Zerow (you say
// what changed); "Eliminar" asks first.
export default function ExpenseDetail() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { grupo = 'lisboa', id } = useLocalSearchParams<{ grupo?: string; id: string }>();
  const { expenses, groups, groupExpenses, removeExpense } = useTrip();
  const ledger: Expense[] = grupo === 'lisboa' ? expenses : (groupExpenses[grupo] ?? []);
  const e = ledger.find((x) => x.id === id);
  const groupName = grupo === 'lisboa' ? 'Lisboa 2026' : grupo === 'piso' ? 'Piso Calle Mayor' : (groups.find((g) => g.id === grupo)?.name ?? '');
  const currency = groups.find((g) => g.id === grupo)?.currency ?? 'EUR';

  if (!e) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingHorizontal: 20, backgroundColor: t.page }}>
        <IconButton name="chevron-left" label="Volver" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        <T v="titleL" color={t.ink} style={{ marginTop: 16 }}>
          Este gasto ya no está
        </T>
        <T v="label" color={t.inkMuted} style={{ marginTop: 4 }}>
          Puede que alguien lo haya quitado del grupo.
        </T>
      </View>
    );
  }

  const share = e.amountEur / e.splitWith.length;
  const order = [e.payer, ...e.splitWith.filter((p) => p !== e.payer)];

  const remove = () =>
    Alert.alert(`¿Eliminar «${e.title}»?`, `Se quita de ${groupName} y las cuentas se recalculan para todos.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          removeExpense(grupo, e.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 140 }}>
        <IconButton name="chevron-left" label="Volver" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        <T v="titleL" color={t.ink} style={{ marginTop: 16 }} accessibilityRole="header">
          {e.title}
        </T>
        <T v="caption" color={t.inkMuted} style={{ marginTop: 2 }}>
          {groupName} · pagó {e.payer === 'tu' ? 'tú' : name(e.payer)}
          {e.note ? ` · ${e.note}` : ''}
        </T>

        <Card bg={t.panel} style={{ padding: 20, marginTop: 16 }}>
          {e.originalUsd ? (
            <>
              <Money value={e.originalUsd} size={64} color={t.onPanel} centsColor={t.onPanelMuted} currency="USD" />
              <T v="bodyStrong" color={t.onPanel} style={{ marginTop: 6 }}>
                ≈ {eurText(e.amountEur)} en el grupo
              </T>
              <T v="caption" color={t.onPanelMuted} style={{ marginTop: 2 }}>
                1 USD = {String(RATE).replace('.', ',')} EUR, al cambio del día
              </T>
            </>
          ) : (
            <>
              <Money value={e.amountEur} size={64} color={t.onPanel} centsColor={t.onPanelMuted} currency={currency} />
              <T v="caption" color={t.onPanelMuted} style={{ marginTop: 6 }}>
                Entre {e.splitWith.length} · {eurText(share, currency)} cada uno
              </T>
            </>
          )}
        </Card>

        <T v="titleM" color={t.ink} style={{ marginTop: 28, marginBottom: 12 }}>
          Cómo se reparte
        </T>
        <Card bg={t.surface} style={{ paddingVertical: 4 }}>
          {order.map((p, i) => {
            const inSplit = e.splitWith.includes(p);
            return (
              <View key={p}>
                <View
                  style={styles.row}
                  accessible
                  accessibilityLabel={`${name(p)}${p === e.payer ? `, pagó ${eurText(e.amountEur, currency)}` : ''}. Su parte: ${inSplit ? eurText(share, currency) : 'nada'}`}
                >
                  <Avatar id={p} size={40} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <T v="bodyStrong" color={t.ink}>
                      {name(p)}
                    </T>
                    {p === e.payer ? (
                      <T v="caption" color={t.inkMuted}>
                        pagó {eurText(e.amountEur, currency)}
                      </T>
                    ) : null}
                  </View>
                  <T v="bodyStrong" color={p === 'tu' ? t.lime : t.ink}>
                    {inSplit ? eurText(share, currency) : '—'}
                  </T>
                </View>
                {i < order.length - 1 ? <Hairline color={t.line} inset={52} /> : null}
              </View>
            );
          })}
        </Card>
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: insets.bottom + 8, backgroundColor: t.page }]}>
        <Button label="Eliminar" kind="text" height={56} onPress={remove} style={{ paddingHorizontal: 16 }} />
        <Button label="Editar" icon="pen" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/nuevo', params: { grupo } })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  foot: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 12 },
});
