import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { AvatarStack } from '../components/Avatar';
import { useTrip, type PersonId } from '../data/trip';
import { Icon } from '../components/Icon';
import { SheetBody } from '../components/Sheet';
import { announce } from '../components/announce';
import { Button, Chip, T, Tap } from '../components/ui';
import { useTheme } from '../theme/useTheme';

// 5.1 Invitar: a link, not a form. The promise that matters to the new person
// ("you start at zero") is said before the link.
export default function Invite() {
  const { t } = useTheme();
  const { nombre, elegir } = useLocalSearchParams<{ nombre?: string; elegir?: string }>();
  const { groups } = useTrip();
  // From Inicio ("+ Invitar") you choose the group first; from inside a group it's that one.
  const choices: { name: string; link: string; members: PersonId[] }[] = [
    { name: 'Lisboa 2026', link: 'zerow.app/t/lisboa-7k2q', members: ['tu', 'ana', 'luis', 'marta'] },
    { name: 'Piso Calle Mayor', link: 'zerow.app/t/piso-calle-mayor-3m8d', members: ['tu', 'ana', 'luis'] },
    ...groups.map((g) => ({ name: g.name, link: `zerow.app/t/${slug(g.name)}`, members: g.members })),
  ];
  const [pick, setPick] = useState(0);
  // From inside a group it is that group, with the same link and people as from Inicio.
  const chosen = elegir ? choices[pick] : (choices.find((c) => c.name === nombre) ?? null);
  const group = chosen?.name ?? nombre ?? 'Lisboa 2026';
  const link = chosen?.link ?? (nombre ? `zerow.app/t/${slug(nombre)}` : 'zerow.app/t/lisboa-7k2q');
  const inside = chosen?.members ?? (nombre ? null : (['tu', 'ana', 'luis', 'marta'] as PersonId[]));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    await Clipboard.setStringAsync(`https://${link}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    announce('Enlace copiado');
    setCopied(true);
  };

  // Figma 5.1 / 2.10: title, (group chips when choosing), the rule in Nota, the link field with «Copiar»,
  // who's already in, and the share button. No close button: the sheet closes by swiping down.
  return (
    <SheetBody>
      <T v="titleM" color={t.ink} accessibilityRole="header">
        Invita gente a {group}
      </T>
      {elegir ? (
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Grupo">
          {choices.map((c, i) => (
            <Chip
              key={c.link}
              label={c.name}
              selected={i === pick}
              onPress={() => {
                Haptics.selectionAsync();
                setPick(i);
                setCopied(false);
              }}
            />
          ))}
        </View>
      ) : null}
      <T v="label" color={t.inkMuted}>
        Quien entra empieza en cero. Solo le cuentan los gastos en los que lo incluyáis.
      </T>

      <View style={[styles.link, { backgroundColor: t.card }]}>
        <Icon name="link" size={20} color={t.inkMuted} />
        <T v="label" color={t.ink} style={{ flex: 1, fontWeight: '500' }} numberOfLines={1}>
          {link}
        </T>
        <Tap onPress={copy} accessibilityRole="button" accessibilityLabel={copied ? 'Enlace copiado' : 'Copiar enlace'} style={[styles.copy, { backgroundColor: t.glass }]}>
          <Icon name={copied ? 'check' : 'copy'} size={16} color={t.ink} />
          <T v="labelStrong" color={t.ink} accessibilityLiveRegion="polite">
            {copied ? 'Copiado' : 'Copiar'}
          </T>
        </Tap>
      </View>

      {inside ? (
        <View style={[styles.rowBetween, { justifyContent: 'flex-start', gap: 12 }]}>
          <AvatarStack ids={inside} size={32} />
          <T v="caption" color={t.inkMuted}>
            {inside.length} persona{inside.length === 1 ? '' : 's'} ya dentro
          </T>
        </View>
      ) : null}

      <Button label="Compartir enlace" icon="share" onPress={() => Share.share({ message: `Únete a ${group} en Zerow: https://${link}` })} />
    </SheetBody>
  );
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingLeft: 16, paddingRight: 8, minHeight: 60 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingLeft: 12, paddingRight: 16, borderRadius: 16 },
});
