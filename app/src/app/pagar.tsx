import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Money } from '../components/Money';
import { Button, T } from '../components/ui';
import { afterSheet } from '../data/session';
import { useTrip } from '../data/trip';
import { useTheme } from '../theme/useTheme';

// Pagar (sheet): confirm a payment you made outside the app before Zerow marks
// it. Zerow never moves money; it records that you paid and gives you a receipt.
export default function Pay() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { payPiso } = useTrip();

  const confirm = () => {
    payPiso();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    afterSheet(() => router.push({ pathname: '/pago', params: { para: 'ana', importe: '18.4', grupo: 'Piso Calle Mayor', concepto: 'Tu parte de noviembre' } }));
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: Math.max(insets.bottom - 8, 16), backgroundColor: t.surface }}>
      <View style={styles.head}>
        <Avatar id="ana" size={56} decorative={false} />
        <View style={{ flex: 1 }}>
          <T v="titleM" color={t.ink} accessibilityRole="header">
            Pagas a Ana
          </T>
          <T v="label" color={t.inkMuted}>
            Piso Calle Mayor · tu parte de noviembre
          </T>
        </View>
      </View>
      <View style={{ marginTop: 18 }}>
        <Money value={18.4} size={64} color={t.ink} centsColor={t.inkMuted} />
      </View>
      <T v="label" color={t.inkMuted} style={{ marginTop: 8 }}>
        Págale como siempre (Bizum, transferencia o en mano) y márcalo aquí. Zerow no mueve dinero: lo apunta y te da el comprobante.
      </T>
      <Button label="Marcar como pagado" icon="check" style={{ marginTop: 22 }} onPress={confirm} />
      <Button label="Ahora no" kind="text" height={48} style={{ marginTop: 6 }} onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
