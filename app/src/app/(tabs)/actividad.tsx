import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { Card, Hairline, T } from '../../components/ui';
import type { PersonId } from '../../data/trip';
import { useTheme } from '../../theme/useTheme';

type Item = { who: PersonId; title: string; meta: string; amount?: string; sub?: string };

const groups: { label: string; items: Item[] }[] = [
  { label: 'Hoy', items: [{ who: 'ana', title: 'Ana propuso el almuerzo', meta: 'Lisboa 2026 · 14:05 · borrador', amount: '38,00 €' }, { who: 'tu', title: 'Confirmaste la cena', meta: 'Lisboa 2026 · 00:12 · con propina', amount: '138,00 €' }] },
  { label: 'Ayer', items: [{ who: 'luis', title: 'Luis añadió el hotel', meta: 'Hotel Alfama · 18:30', amount: '269,08 €', sub: '300,00 US$' }, { who: 'ana', title: 'Ana añadió el taxi', meta: 'Taxi al hotel · 16:10', amount: '40,36 €', sub: '45,00 US$' }, { who: 'marta', title: 'Marta se unió al viaje', meta: 'Por invitación de Ana · 11:02' }] },
];

export default function Activity() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ backgroundColor: t.page }} contentContainerStyle={{ paddingTop: insets.top + 60, paddingHorizontal: 20, paddingBottom: 140 }}>
      <T v="titleL" color={t.ink} style={{ marginBottom: 20 }}>
        Actividad
      </T>
      {groups.map((g) => (
        <View key={g.label} style={{ marginBottom: 20 }}>
          <T v="labelStrong" color={t.inkMuted} style={{ marginBottom: 8 }}>
            {g.label}
          </T>
          <Card bg={t.surface} style={{ paddingVertical: 4 }}>
            {g.items.map((it, i) => (
              <View key={it.title}>
                <View style={styles.row}>
                  <Avatar id={it.who} size={40} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <T v="bodyStrong" color={t.ink}>
                      {it.title}
                    </T>
                    <T v="caption" color={t.inkMuted}>
                      {it.meta}
                    </T>
                  </View>
                  {it.amount ? (
                    <View style={{ alignItems: 'flex-end' }}>
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
                </View>
                {i < g.items.length - 1 ? <Hairline color={t.line} inset={52} /> : null}
              </View>
            ))}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 } });
