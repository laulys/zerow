import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { Button, Card, T } from '../../components/ui';
import { balancesFor, useTrip, type PersonId } from '../../data/trip';
import { motion } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const others: PersonId[] = ['luis', 'ana', 'marta'];

// 5.2 Te invitaron: opened from a zerow.app/t/… link. The one thing a new member
// worries about ("do I owe for what happened before me?") is answered visually:
// everyone else sits where their balance is, you land exactly on zero.
export default function Invited() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses } = useTrip();
  const b = balancesFor(expenses);
  const max = Math.max(...others.map((p) => Math.abs(b[p])), 1);

  const join = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/trip/lisboa');
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 24 }}>
        <Avatar id="ana" size={80} />
        <T v="label" color={t.inkMuted} style={{ marginTop: 20 }}>
          Ana te invitó a
        </T>
        <T v="titleL" color={t.ink} style={styles.big} accessibilityRole="header">
          Lisboa 2026
        </T>
        <T v="caption" color={t.inkMuted}>
          12–18 nov · 4 personas · en euros
        </T>

        <Card bg={t.panel} style={{ marginTop: 28, padding: 18 }}>
          <T v="bodyStrong" color={t.onPanel}>
            Entras en cero
          </T>
          <T v="caption" color={t.onPanelMuted} style={{ marginTop: 2 }}>
            Lo que ya pagaron antes no te toca.
          </T>
          <View style={styles.plot} accessible accessibilityLabel="Luis, Ana y Marta tienen saldos de antes. Tú empiezas en cero.">
            <View style={[styles.zero, { backgroundColor: t.lime }]} />
            {others.map((p, i) => (
              <Animated.View key={p} entering={FadeIn.delay(i * 80).duration(motion.standard)} style={[styles.dot, { top: 8 + i * 34, left: `${50 + (b[p] / max) * 30}%` }]}>
                <Avatar id={p} size={28} />
              </Animated.View>
            ))}
            <Animated.View entering={FadeInDown.delay(350).duration(motion.bigMoment)} style={[styles.dot, styles.you]}>
              <Avatar id="tu" size={28} />
              <T v="caption" color={t.onPanel}>
                Tú
              </T>
            </Animated.View>
          </View>
        </Card>

        <T v="body" color={t.ink} style={{ marginTop: 20 }}>
          Verás los gastos del viaje y podrás añadir los tuyos. Nada cuenta hasta que alguien lo confirma.
        </T>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 8 }}>
        <Button label="Unirme al viaje" icon="check" onPress={join} />
        <Button label="Ahora no" kind="text" height={48} style={{ marginTop: 6 }} onPress={() => (router.canGoBack() ? router.back() : router.replace('/grupos'))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 48, lineHeight: 52, letterSpacing: -1.4, marginTop: 4, marginBottom: 6 },
  plot: { height: 150, marginTop: 12 },
  zero: { position: 'absolute', left: '50%', top: 4, bottom: 14, width: 3, marginLeft: -1.5, borderRadius: 2 },
  dot: { position: 'absolute', marginLeft: -14 },
  you: { left: '50%', bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
