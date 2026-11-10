import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, AvatarStack } from '../../components/Avatar';
import { Icon, type IconName } from '../../components/Icon';
import { BrandGradient } from '../../components/BrandGradient';
import { Money, RollingMoney } from '../../components/Money';
import { Orb } from '../../components/Orb';
import { WalletStack, type WalletCard } from '../../components/WalletStack';
import { Card, Hairline, IconButton, T, Tap } from '../../components/ui';
import { balancesFor, eurText, useTrip, type GroupKind, type PersonId } from '../../data/trip';
import { font, light } from '../../theme/tokens';

const kindIcon: Record<GroupKind, IconName> = { viaje: 'plane', piso: 'house', evento: 'gift', otro: 'shapes' };
import { useTheme } from '../../theme/useTheme';

// Settled groups of every kind: the icon says what it was (trip, flat, gift, one bill).
const past: { icon: IconName; kind: string; name: string; meta: string; total: number }[] = [
  { icon: 'plane', kind: 'Viaje', name: 'Roma', meta: 'Mar 2025 · 4 personas', total: 612.4 },
  { icon: 'house', kind: 'Piso', name: 'Piso Malasaña', meta: '2023–24 · 3 personas', total: 4812.3 },
  { icon: 'gift', kind: 'Regalo', name: 'Regalo de Marta', meta: 'Feb 2025 · entre 3', total: 96 },
  { icon: 'receipt', kind: 'Una cuenta', name: 'Cena de Navidad', meta: 'Dic 2024 · 6 personas', total: 245.6 },
];

// 2.1 Inicio: your groups. Lisboa is the open trip; its balance rolls when it changes.
export default function Home() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, draft, groups, groupExpenses } = useTrip();
  const mine = balancesFor(expenses).tu;

  // Open groups, front to back: the trip in progress first, on the brand gradient.
  const cards: WalletCard[] = [
    {
      key: 'lisboa',
      title: `Lisboa 2026. ${mine >= 0 ? 'Te deben' : 'Debes'} ${eurText(Math.abs(mine))}${draft ? '. 1 borrador por confirmar' : ''}`,
      onPress: () => router.push('/trip/lisboa'),
      content: (
        <BrandGradient style={styles.cardBody} seed={3}>
          <CardTop title="Lisboa 2026" meta="12–18 nov · en curso" color={light.inkFixed} muted={light.inkMutedFixed} people={['tu', 'ana', 'luis', 'marta']} outline="#D3F27F" />
          <T v="label" color={light.inkMutedFixed} style={{ marginTop: 'auto' }}>
            {mine >= 0 ? 'Te deben' : 'Debes'}
          </T>
          <RollingMoney value={Math.abs(mine)} size={60} color={light.inkFixed} centsColor={light.inkMutedFixed} />
          <View style={styles.cardFoot}>
            {draft ? (
              <>
                <Orb size={16} onGradient />
                <T v="caption" color={light.inkFixed} style={{ fontFamily: font.medium }}>
                  1 borrador por confirmar
                </T>
              </>
            ) : (
              <T v="caption" color={light.inkMutedFixed}>
                {eurText(expenses.reduce((a, e) => a + e.amountEur, 0))} en {expenses.length} gastos
              </T>
            )}
          </View>
        </BrandGradient>
      ),
    },
    {
      key: 'piso',
      title: 'Piso Calle Mayor. Debes 18,40 €',
      content: (
        <View style={[styles.cardBody, { backgroundColor: t.panelRaised }]}>
          <CardTop title="Piso Calle Mayor" meta="3 personas · 2 gastos este mes" color={t.onPanel} muted={t.onPanelMuted} people={['tu', 'ana', 'luis']} outline={t.panelRaised} />
          <T v="label" color={t.onPanelMuted} style={{ marginTop: 'auto' }}>
            Debes
          </T>
          <Money value={18.4} size={60} color={t.onPanel} centsColor={t.onPanelMuted} />
          <View style={styles.cardFoot}>
            <Icon name="house" size={16} color={t.onPanelMuted} />
            <T v="caption" color={t.onPanelMuted}>
              Alquiler, súper y facturas
            </T>
          </View>
        </View>
      ),
    },
    ...groups.map((g) => {
      const list = groupExpenses[g.id] ?? [];
      const bal = balancesFor(list).tu;
      return {
        key: g.id,
        title: `${g.name}. ${list.length ? `${bal >= 0 ? 'Te deben' : 'Debes'} ${eurText(Math.abs(bal), g.currency)}` : 'Sin gastos todavía'}`,
        onPress: () => router.push({ pathname: '/trip/[id]', params: { id: g.id } }),
        content: (
          <View style={[styles.cardBody, { backgroundColor: t.panelRaised }]}>
            <CardTop title={g.name} meta={`${g.members.length} personas${g.dates ? ' · ' + g.dates : ''}`} color={t.onPanel} muted={t.onPanelMuted} people={g.members} outline={t.panelRaised} />
            <T v="label" color={t.onPanelMuted} style={{ marginTop: 'auto' }}>
              {list.length ? (bal >= 0 ? 'Te deben' : 'Debes') : 'Saldo'}
            </T>
            <Money value={Math.abs(bal)} size={60} color={t.onPanel} centsColor={t.onPanelMuted} currency={g.currency} />
            <View style={styles.cardFoot}>
              <Icon name={kindIcon[g.kind]} size={16} color={t.onPanelMuted} />
              <T v="caption" color={t.onPanelMuted}>
                {list.length ? `${list.length} gasto${list.length === 1 ? '' : 's'}` : 'Sin gastos todavía'}
              </T>
            </View>
          </View>
        ),
      };
    }),
  ];

  return (
    <ScrollView style={{ backgroundColor: t.page }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 140 }}>
      <View style={styles.header}>
        <T v="titleL" color={t.ink} accessibilityRole="header">
          Tus grupos
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <IconButton name="plus" label="Dividir algo nuevo" bg={t.surface} color={t.ink} onPress={() => router.push('/dividir')} />
          <Tap onPress={() => router.navigate('/perfil')} accessibilityRole="button" accessibilityLabel="Tu perfil">
            <Avatar id="tu" size={40} />
          </Tap>
        </View>
      </View>

      <View style={{ marginTop: 20 }}>
        <WalletStack cards={cards} />
      </View>

      <T v="titleM" color={t.ink} style={{ marginTop: 24, marginBottom: 12 }}>
        Anteriores
      </T>
      <Card bg={t.surface} style={{ paddingVertical: 4 }}>
        {past.map((p, i) => (
          <View key={p.name}>
            <View style={[styles.rowBetween, { paddingVertical: 12 }]} accessible accessibilityLabel={`${p.kind}: ${p.name}. ${p.meta}. ${eurText(p.total)}, saldado`}>
              <View style={[styles.tile, { backgroundColor: t.page }]}>
                <Icon name={p.icon} size={20} color={t.ink} />
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

function CardTop({ title, meta, color, muted, people, outline }: { title: string; meta: string; color: string; muted: string; people: PersonId[]; outline: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View style={{ flex: 1 }}>
        <T v="titleM" color={color}>
          {title}
        </T>
        <T v="caption" color={muted} style={{ marginTop: 2 }}>
          {meta}
        </T>
      </View>
      <AvatarStack ids={people} size={32} outline={outline} />
    </View>
  );
}

const styles = StyleSheet.create({
  cardBody: { flex: 1, padding: 20, paddingBottom: 18 },
  cardFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { alignSelf: 'flex-start', marginTop: 18, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
