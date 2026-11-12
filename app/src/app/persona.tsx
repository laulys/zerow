import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { Money } from '../components/Money';
import { SheetBody, SheetList } from '../components/Sheet';
import { Button, T } from '../components/ui';
import { afterSheet } from '../data/session';
import { eurText, openEmoji, people, usePeopleBalances, type PersonId } from '../data/trip';
import { useTheme } from '../theme/useTheme';

// 2.9 Tú y Ana (sheet): what you and one person owe each other across your open
// groups, netted into one number. Each group row goes to where you'd settle it.
export default function Person() {
  const { t } = useTheme();
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

  // Figma 2.9: face 56 and title, the net in Importe L (lime when owed to you), the shared groups as a
  // list card with their emoji, then the button and «Recordárselo» as a text button.
  return (
    <SheetBody>
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

      <View accessible accessibilityLabel={p.net === 0 ? label : `${label} ${eurText(Math.abs(p.net))}`}>
        <T v="label" color={t.inkMuted} style={{ fontWeight: '500' }}>
          {label}
        </T>
        <Money value={Math.abs(p.net)} size={56} color={p.net > 0 ? t.lime : t.ink} />
      </View>

      <SheetList
        rows={p.parts.map((x) => {
          const owe = x.amount < 0;
          const text = x.amount === 0 ? 'A cero' : owe ? `Le debes ${eurText(-x.amount)}` : `Te debe ${eurText(x.amount)}`;
          return { key: x.key, title: x.group, sub: text, subColor: x.amount > 0 ? t.lime : undefined, emoji: openEmoji[x.key] ?? '🧾', onPress: () => go(x.to) };
        })}
      />

      {youOwe ? (
        <Button label={`Pagar ${eurText(-youOwe.amount)} · ${youOwe.group.split(' ')[0]}`} onPress={() => go(youOwe.to)} />
      ) : p.net > 0 ? (
        <Button label="Recordárselo" icon="share" onPress={remind} />
      ) : (
        <Button label={`Dividir algo con ${name}`} kind="secondary" onPress={() => go('/dividir')} />
      )}
      {youOwe && p.net > 0 ? <Button label="Recordárselo" kind="text" height={44} onPress={remind} /> : null}
    </SheetBody>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
