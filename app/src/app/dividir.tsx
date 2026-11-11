import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../components/Icon';
import { T, Tap } from '../components/ui';
import { afterSheet } from '../data/session';
import type { GroupKind } from '../data/trip';
import { glassSheets } from '../components/Glass';
import { useTheme } from '../theme/useTheme';

const options: { icon: IconName; title: string; hint: string; go: () => void }[] = [
  { icon: 'receipt', title: 'Una cuenta ahora', hint: 'Una cena, una compra, un taxi', go: () => afterSheet(() => router.push('/cuenta')) },
  { icon: 'plane', title: 'Un viaje', hint: 'Varios días, muchos gastos', go: () => newGroup('viaje') },
  { icon: 'house', title: 'Piso o casa', hint: 'Alquiler, súper, facturas', go: () => newGroup('piso') },
  { icon: 'gift', title: 'Un evento o un regalo', hint: 'Cumpleaños, despedidas, bodas', go: () => newGroup('evento') },
];

function newGroup(tipo: GroupKind) {
  afterSheet(() => router.push({ pathname: '/grupo-nuevo', params: { tipo } }));
}

// 2.4 ¿Qué quieres dividir?: the "+" on Inicio. Splitting isn't only for trips:
// a one-off bill needs no group at all.
export default function WhatToSplit() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 28, paddingBottom: Math.max(insets.bottom - 8, 16), backgroundColor: glassSheets ? 'transparent' : t.surface }}>
      <T v="titleM" color={t.ink} style={{ marginBottom: 14, marginLeft: 4 }} accessibilityRole="header">
        ¿Qué quieres dividir?
      </T>
      {options.map((o) => (
        <Tap key={o.title} onPress={o.go} accessibilityRole="button" accessibilityLabel={`${o.title}. ${o.hint}`} style={[styles.row, { backgroundColor: t.fill }]}>
          <View style={[styles.tile, { backgroundColor: t.fillStrong }]}>
            <Icon name={o.icon} size={20} color={t.ink} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <T v="bodyStrong" color={t.ink}>
              {o.title}
            </T>
            <T v="caption" color={t.inkMuted}>
              {o.hint}
            </T>
          </View>
          <Icon name="chevron-right" size={20} color={t.inkMuted} />
        </Tap>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: 12, paddingRight: 16, marginBottom: 8, minHeight: 64 },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
