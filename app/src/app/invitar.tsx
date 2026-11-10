import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarStack } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Button, IconButton, T, Tap } from '../components/ui';
import { useTheme } from '../theme/useTheme';

// 5.1 Invitar: a link, not a form. The promise that matters to the new person
// ("you start at zero") is said before the link.
export default function Invite() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { nombre } = useLocalSearchParams<{ nombre?: string }>();
  const group = nombre ?? 'Lisboa 2026';
  const link = nombre ? `zerow.app/t/${slug(nombre)}` : 'zerow.app/t/lisboa-7k2q';
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    await Clipboard.setStringAsync(`https://${link}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: Math.max(insets.bottom - 8, 16), backgroundColor: t.surface }}>
      <View style={styles.rowBetween}>
        <T v="titleM" color={t.ink} accessibilityRole="header" style={{ flex: 1 }}>
          Invita a {group}
        </T>
        <IconButton name="x" label="Cerrar" bg={t.page} color={t.ink} onPress={() => router.back()} />
      </View>
      <T v="body" color={t.inkMuted} style={{ marginTop: 12 }}>
        Quien entra empieza en cero. Solo le cuentan los gastos en los que le incluyáis.
      </T>

      <View style={[styles.link, { backgroundColor: t.page }]}>
        <Icon name="link" size={18} color={t.inkMuted} />
        <T v="bodyStrong" color={t.ink} style={{ flex: 1 }} numberOfLines={1}>
          {link}
        </T>
        <Tap onPress={copy} accessibilityRole="button" accessibilityLabel={copied ? 'Enlace copiado' : 'Copiar enlace'} style={[styles.copy, { backgroundColor: t.surface }]}>
          <Icon name={copied ? 'check' : 'copy'} size={16} color={t.ink} />
          <T v="labelStrong" color={t.ink} accessibilityLiveRegion="polite">
            {copied ? 'Copiado' : 'Copiar'}
          </T>
        </Tap>
      </View>

      {nombre ? null : (
        <View style={[styles.rowBetween, { marginTop: 16, justifyContent: 'flex-start', gap: 12 }]}>
          <AvatarStack ids={['tu', 'ana', 'luis', 'marta']} size={30} outline={t.surface} />
          <T v="label" color={t.inkMuted}>
            4 personas ya dentro
          </T>
        </View>
      )}

      <Button label="Compartir enlace" icon="share" style={{ marginTop: 20 }} onPress={() => Share.share({ message: `Únete a ${group} en Zerow: https://${link}` })} />
    </View>
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingLeft: 16, paddingRight: 6, height: 56, marginTop: 20 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 12, borderRadius: 12 },
});
