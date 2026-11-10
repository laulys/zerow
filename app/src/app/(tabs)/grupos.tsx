import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, AvatarStack } from '../../components/Avatar';
import { Icon, type IconName } from '../../components/Icon';
import { RollingMoney } from '../../components/Money';
import { Card, Hairline, IconButton, T, Tap } from '../../components/ui';
import { balancesFor, eurText, useTrip, type GroupKind } from '../../data/trip';

const kindIcon: Record<GroupKind, IconName> = { viaje: 'plane', piso: 'house', evento: 'gift', otro: 'shapes' };
import { useTheme } from '../../theme/useTheme';

const past = [
  { tag: '’25', name: 'Roma', meta: 'Mar 2025 · saldado', total: 612.4 },
  { tag: '’24', name: 'Oaxaca', meta: 'Dic 2024 · saldado', total: 1284.9 },
  { tag: '’24', name: 'Oporto', meta: 'Jun 2024 · saldado', total: 356.1 },
  { tag: '’23', name: 'Berlín', meta: 'Oct 2023 · saldado', total: 702.85 },
];

// 2.1 Inicio: your groups. Lisboa is the open trip; its balance rolls when it changes.
export default function Home() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, draft, groups } = useTrip();
  const mine = balancesFor(expenses).tu;

  return (
    <ScrollView style={{ backgroundColor: t.page }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 140 }}>
      <View style={styles.header}>
        <Tap onPress={() => router.navigate('/perfil')} accessibilityRole="button" accessibilityLabel="Tu perfil">
          <Avatar id="tu" size={44} />
        </Tap>
        <IconButton name="plus" label="Dividir algo nuevo" bg={t.surface} color={t.ink} onPress={() => router.push('/dividir')} />
      </View>
      <T v="titleL" color={t.ink} style={{ marginTop: 16, marginBottom: 20 }}>
        Tus grupos
      </T>

      <Tap onPress={() => router.push('/trip/lisboa')} accessibilityRole="button" accessibilityLabel={`Lisboa 2026. Te deben ${eurText(mine)}`}>
        <Card bg={t.panel} style={{ padding: 20 }}>
          <View style={styles.rowBetween}>
            <View>
              <T v="titleM" color={t.onPanel}>
                Lisboa 2026
              </T>
              <T v="caption" color={t.onPanelMuted} style={{ marginTop: 2 }}>
                12–18 nov, en curso
              </T>
            </View>
            <Icon name="chevron-right" size={22} color={t.onPanelMuted} />
          </View>
          <T v="label" color={t.onPanelMuted} style={{ marginTop: 28 }}>
            Te deben
          </T>
          <View style={styles.rowBetween}>
            <RollingMoney value={mine} size={56} color={t.onPanel} centsColor={t.onPanelMuted} />
            <AvatarStack ids={['tu', 'ana', 'luis', 'marta']} size={30} />
          </View>
          {draft ? (
            <View style={[styles.chip, { backgroundColor: t.lime }]}>
              <T v="caption" color={t.onLime} style={{ fontFamily: 'SpaceGrotesk_500Medium' }}>
                1 borrador por confirmar
              </T>
            </View>
          ) : null}
        </Card>
      </Tap>

      {groups.map((g) => (
        <Tap key={g.id} onPress={() => router.push({ pathname: '/trip/[id]', params: { id: g.id } })} accessibilityRole="button" accessibilityLabel={`${g.name}. ${g.members.length} personas, sin gastos`}>
          <Card bg={t.surface} style={[styles.rowBetween, { marginTop: 12, paddingVertical: 12 }]}>
            <View style={[styles.tile, { backgroundColor: t.page }]}>
              <Icon name={kindIcon[g.kind]} size={20} color={t.ink} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <T v="bodyStrong" color={t.ink}>
                {g.name}
              </T>
              <T v="caption" color={t.inkMuted}>
                {g.members.length} personas · sin gastos todavía
              </T>
            </View>
            <Icon name="chevron-right" size={20} color={t.inkMuted} />
          </Card>
        </Tap>
      ))}

      <Card bg={t.surface} style={[styles.rowBetween, { marginTop: 12, paddingVertical: 12 }]}>
        <View style={[styles.tile, { backgroundColor: t.page }]}>
          <Icon name="house" size={20} color={t.ink} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <T v="bodyStrong" color={t.ink}>
            Piso Calle Mayor
          </T>
          <T v="caption" color={t.inkMuted}>
            3 personas · 2 gastos este mes
          </T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T v="caption" color={t.inkMuted}>
            debes
          </T>
          <T v="bodyStrong" color={t.ink}>
            18,40 €
          </T>
        </View>
      </Card>

      <T v="titleM" color={t.ink} style={{ marginTop: 28, marginBottom: 12 }}>
        Anteriores
      </T>
      <Card bg={t.surface} style={{ paddingVertical: 4 }}>
        {past.map((p, i) => (
          <View key={p.name}>
            <View style={[styles.rowBetween, { paddingVertical: 12 }]}>
              <View style={[styles.tile, { backgroundColor: t.page }]}>
                <T v="caption" color={t.ink}>
                  {p.tag}
                </T>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <T v="bodyStrong" color={t.ink}>
                  {p.name}
                </T>
                <T v="caption" color={t.inkMuted}>
                  {p.meta}
                </T>
              </View>
              <T v="bodyStrong" color={t.ink}>
                {eurText(p.total)}
              </T>
            </View>
            {i < past.length - 1 ? <Hairline color={t.line} inset={52} /> : null}
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { alignSelf: 'flex-start', marginTop: 18, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
