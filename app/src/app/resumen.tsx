import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '../components/Aurora';
import { FocusStatusBar } from '../components/FocusStatusBar';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';
import { Card, IconButton, T, Tap } from '../components/ui';
import { eurText, pastGroups, useTrip } from '../data/trip';
import { useTheme } from '../theme/useTheme';

// A settled group, read-only (4.6): what it was, what it came to and that it ended
// «a cero». Tapping a past group opens this, not its emoji picker; the emoji is one row here.
export default function PastSummary() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = pastGroups.find((x) => x.id === id) ?? pastGroups[0];
  const { pastEmoji } = useTrip();
  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <Aurora preset="task" />
      <FocusStatusBar style="light" />
      <View style={{ paddingTop: insets.top, paddingHorizontal: 20 }}>
        <IconButton name="chevron-left" label="Volver" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        <T v="titleL" color={t.ink} style={{ marginTop: 16 }} accessibilityRole="header">
          {g.name}
        </T>
        <T v="label" color={t.inkSoft} style={{ marginTop: 4 }}>
          {g.meta} · a cero
        </T>
        <Card style={{ marginTop: 16, gap: 4 }}>
          <T v="label" color={t.inkMuted} style={{ fontWeight: '500' }}>
            En total
          </T>
          <Money value={g.total} size={56} color={t.ink} />
          <T v="caption" color={t.inkMuted}>
            {eurText(g.total / g.people)} de media por persona
          </T>
        </Card>
        <Tap highlight onPress={() => router.push({ pathname: '/emoji', params: { id: g.id } })} accessibilityRole="button" accessibilityLabel="Cambiar el emoji del grupo" style={{ marginTop: 16 }}>
          <Card style={styles.row}>
            <View style={[styles.tile, { backgroundColor: t.disc }]}>{pastEmoji[g.id] ? <Text style={styles.emoji}>{pastEmoji[g.id]}</Text> : <Icon name="shapes" size={20} color={t.ink} />}</View>
            <T v="bodyStrong" color={t.ink} style={{ flex: 1 }}>
              Emoji del grupo
            </T>
            <Icon name="chevron-right" size={16} color={t.inkMuted} />
          </Card>
        </Tap>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 23, lineHeight: 28 },
});
