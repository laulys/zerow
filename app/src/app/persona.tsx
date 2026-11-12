import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';
import { Button, T, Tap } from '../components/ui';
import { afterSheet } from '../data/session';
import { eurText, people, usePeopleBalances, type PersonId } from '../data/trip';
import { glassSheets } from '../components/Glass';
import { useTheme } from '../theme/useTheme';

const LIME_DIM = 'rgba(203, 242, 107, 0.6)';

// 2.9 Tú y Ana (sheet): what you and one person owe each other across your open
// groups, netted into one number. Each group row goes to where you'd settle it.
export default function Person() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: PersonId }>();
  const all = usePeopleBalances();
  const p = all.find((x) => x.id === id) ?? all[0];
  const name = people[p.id].name;
  const label = p.net > 0 ? `${name} te debe` : p.net < 0 ? `Le debes a ${name}` : 'Estáis a cero';
  const youOwe = p.parts.find((x) => x.amount < 0);

  const go = (to: string) => {
    Haptics.selectionAsync();
    afterSheet(() => router.push(to as never));
  };

  const remind = () =>
    Share.share({
      message: `Hola ${name}: según Zerow me debes ${eurText(p.net)} (${p.parts
        .filter((x) => x.amount !== 0)
        .map((x) => `${x.group} ${x.amount > 0 ? '+' : '−'}${eurText(Math.abs(x.amount))}`)
        .join(', ')}). ¡Sin prisa!`,
    });

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: Math.max(insets.bottom - 8, 16), backgroundColor: glassSheets ? 'transparent' : t.surface }}>
      <View style={styles.head}>
        <Avatar id={p.id} size={56} />
        <View>
          <T v="titleM" color={t.ink} accessibilityRole="header">
            Tú y {name}
          </T>
          <T v="caption" color={t.inkMuted}>
            {p.parts.length} grupo{p.parts.length === 1 ? '' : 's'} abierto{p.parts.length === 1 ? '' : 's'} en común
          </T>
        </View>
      </View>

      <View style={{ marginTop: 18 }} accessible accessibilityLabel={p.net === 0 ? label : `${label} ${eurText(Math.abs(p.net))}`}>
        <T v="label" color={t.inkMuted} style={{ marginBottom: 6 }}>
          {label}
        </T>
        {/* Owed to you: the whole number in lime and the cents in the same lime, dimmer. */}
        <Money value={Math.abs(p.net)} size={56} color={p.net > 0 ? t.lime : t.ink} centsColor={p.net > 0 ? LIME_DIM : t.inkMuted} />
      </View>

      <View style={[styles.box, { backgroundColor: t.fill }]}>
        {p.parts.map((x, i) => {
          const owe = x.amount < 0;
          const text = x.amount === 0 ? 'A cero' : owe ? `Le debes ${eurText(-x.amount)}` : `Te debe ${eurText(x.amount)}`;
          return (
            <Tap
              key={x.key}
              onPress={() => go(x.to)}
              accessibilityRole="button"
              accessibilityLabel={`${x.group}. ${text}`}
              style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: t.line }]}
            >
              <View style={{ flex: 1 }}>
                <T v="bodyStrong" color={t.ink}>
                  {x.group}
                </T>
                <T v="caption" color={x.amount > 0 ? t.lime : t.inkMuted}>
                  {text}
                </T>
              </View>
              <Icon name="chevron-right" size={18} color={t.inkMuted} />
            </Tap>
          );
        })}
      </View>

      {youOwe ? (
        <Button label={`Pagar ${eurText(-youOwe.amount)} · ${youOwe.group.split(' ')[0]}`} style={{ marginTop: 16 }} onPress={() => go(youOwe.to)} />
      ) : p.net > 0 ? (
        <Button label="Recordárselo" icon="share" style={{ marginTop: 16 }} onPress={remind} />
      ) : (
        <Button label={`Dividir algo con ${name}`} kind="secondary" style={{ marginTop: 16 }} onPress={() => go('/dividir')} />
      )}
      {youOwe && p.net > 0 ? <Button label="Recordárselo" kind="text" height={48} style={{ marginTop: 6 }} onPress={remind} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  box: { borderRadius: 22, marginTop: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 60 },
});
