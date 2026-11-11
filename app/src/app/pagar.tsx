import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { PayPalTile, RevolutTile } from '../components/BrandMarks';
import { Icon, type IconName } from '../components/Icon';
import { Money } from '../components/Money';
import { Button, T, Tap } from '../components/ui';
import { afterSheet } from '../data/session';
import { useTrip } from '../data/trip';
import { font, motion } from '../theme/tokens';
import { glassSheets } from '../components/Glass';
import { useTheme } from '../theme/useTheme';

type Method = { key: string; name: string; sub: string; icon?: IconName };

// Ways to pay Ana. "Tu banco" is the open-banking flow (a provider's sandbox in
// this demo); Revolut and PayPal appear because Ana saved her links.
const methods: Method[] = [
  { key: 'banco', name: 'Tu banco · ••42', sub: 'Lo apruebas en tu banco', icon: 'landmark' },
  { key: 'revolut', name: 'Revolut', sub: 'Ana tiene revolut.me' },
  { key: 'paypal', name: 'PayPal', sub: 'Ana tiene paypal.me' },
];

const AMOUNT = 18.4;

// 2.7 Pagar a Ana (option A): like Apple Pay. The amount, the saved way to pay
// (tap "Cambiar" for the others) and one button. "Ya le pagué de otra forma"
// covers Bizum or cash. Either way you end on the receipt.
export default function Pay() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { payPiso } = useTrip();
  const [method, setMethod] = useState(methods[0]);
  const [choosing, setChoosing] = useState(false);
  const [paying, setPaying] = useState(false);

  const finish = (how: string) => {
    payPiso();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    afterSheet(() => router.push({ pathname: '/pago', params: { para: 'ana', importe: String(AMOUNT), grupo: 'Piso Calle Mayor', concepto: 'Tu parte de noviembre', metodo: how } }));
  };

  const pay = () => {
    if (paying) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaying(true);
    // Stand-in for the provider: in the real flow this opens the bank or the
    // payment link and comes back here when it's done.
    setTimeout(() => finish(method.key === 'banco' ? 'Tu banco' : method.name), 1100);
  };

  const Lead = ({ m }: { m: Method }) =>
    m.key === 'revolut' ? (
      <RevolutTile />
    ) : m.key === 'paypal' ? (
      <PayPalTile />
    ) : (
      <View style={[styles.tile, { backgroundColor: t.fillStrong }]}>
        <Icon name={m.icon ?? 'landmark'} size={20} color={t.ink} />
      </View>
    );

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: Math.max(insets.bottom - 8, 16), backgroundColor: glassSheets ? 'transparent' : t.surface }}>
      <View style={styles.head}>
        <Avatar id="ana" size={44} decorative={false} />
        <View>
          <T v="titleM" color={t.ink} accessibilityRole="header">
            Pagar a Ana
          </T>
          <T v="caption" color={t.inkMuted}>
            Piso Calle Mayor · noviembre
          </T>
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <Money value={AMOUNT} size={64} color={t.ink} centsColor={t.inkMuted} />
      </View>

      <Animated.View layout={LinearTransition.duration(motion.standard)} style={[styles.box, { backgroundColor: t.fill }]}>
        {choosing ? (
          methods.map((m, i) => (
            <Animated.View key={m.key} entering={FadeIn.duration(180)}>
              <Tap
                onPress={() => {
                  Haptics.selectionAsync();
                  setMethod(m);
                  setChoosing(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: m.key === method.key }}
                accessibilityLabel={`${m.name}. ${m.sub}`}
                style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: t.line }]}
              >
                <Lead m={m} />
                <View style={{ flex: 1 }}>
                  <T v="bodyStrong" color={t.ink}>
                    {m.name}
                  </T>
                  <T v="caption" color={t.inkMuted}>
                    {m.sub}
                  </T>
                </View>
                {m.key === method.key ? <Icon name="check" size={20} color={t.lime} /> : null}
              </Tap>
            </Animated.View>
          ))
        ) : (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
            <Tap onPress={() => setChoosing(true)} accessibilityRole="button" accessibilityLabel={`Pagar con ${method.name}. Cambiar`} style={styles.row}>
              <Lead m={method} />
              <View style={{ flex: 1 }}>
                <T v="caption" color={t.inkMuted}>
                  Pagar con
                </T>
                <T v="bodyStrong" color={t.ink}>
                  {method.name}
                </T>
              </View>
              <T v="labelStrong" color={t.ink}>
                Cambiar
              </T>
            </Tap>
          </Animated.View>
        )}
      </Animated.View>

      <Button label={paying ? `Abriendo ${method.key === 'banco' ? 'tu banco' : method.name}…` : 'Pagar 18,40 €'} icon={paying ? undefined : 'check'} style={{ marginTop: 16 }} onPress={pay} disabled={paying} />
      <Tap onPress={() => finish('Otra forma')} accessibilityRole="button" style={styles.other} disabled={paying}>
        <T v="labelStrong" color={t.ink} style={{ fontFamily: font.medium }}>
          Ya le pagué de otra forma
        </T>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  box: { borderRadius: 22, marginTop: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, minHeight: 64 },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  other: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 4 },
});
