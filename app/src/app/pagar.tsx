import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Avatar } from '../components/Avatar';
import { PayPalTile, RevolutTile } from '../components/BrandMarks';
import { Icon, type IconName } from '../components/Icon';
import { Money } from '../components/Money';
import { SheetBody } from '../components/Sheet';
import { Button, Card, T, Tap } from '../components/ui';
import { afterSheet } from '../data/session';
import { useTrip } from '../data/trip';
import { motion } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Method = { key: string; name: string; sub: string; icon?: IconName };

// Ways to pay Ana. "Tu banco" is the open-banking flow (a provider's sandbox in
// this demo); Revolut and PayPal appear because Ana saved her links.
const methods: Method[] = [
  { key: 'banco', name: 'Tu banco · ··42', sub: 'Lo apruebas en la app de tu banco', icon: 'landmark' },
  { key: 'revolut', name: 'Revolut', sub: 'Ana tiene revolut.me' },
  { key: 'paypal', name: 'PayPal', sub: 'Ana tiene paypal.me' },
];

const AMOUNT = 18.4;

// 2.7 Pagar a Ana (option A): like Apple Pay. The amount, the saved way to pay
// (tap "Cambiar" for the others) and one button. "Ya le pagué de otra forma"
// covers Bizum or cash. Either way you end on the receipt.
export default function Pay() {
  const { t } = useTheme();
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
      <View style={[styles.tile, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
        <Icon name={m.icon ?? 'landmark'} size={20} color={t.ink} />
      </View>
    );

  return (
    // Figma 2.7: who and why, the amount (Importe L), the saved way to pay in a list card, the button and a text button.
    <SheetBody>
      <View style={styles.head}>
        <Avatar id="ana" size={48} decorative={false} bg={t.disc} inset />
        <View>
          <T v="titleM" color={t.ink} accessibilityRole="header">
            Pagar a Ana
          </T>
          <T v="caption" color={t.inkMuted}>
            Piso Calle Mayor · noviembre
          </T>
        </View>
      </View>

      <Money value={AMOUNT} size={56} color={t.ink} />

      <Animated.View layout={LinearTransition.duration(motion.standard)}>
        <Card style={styles.box}>
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
                  style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: t.hairline }]}
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
              <Tap highlight onPress={() => setChoosing(true)} accessibilityRole="button" accessibilityLabel={`Pagar con ${method.name}. Cambiar`} style={styles.row}>
                <Lead m={method} />
                <View style={{ flex: 1 }}>
                  <T v="bodyStrong" color={t.ink} numberOfLines={1}>
                    {method.name}
                  </T>
                  <T v="caption" color={t.inkMuted} numberOfLines={1}>
                    {method.sub}
                  </T>
                </View>
                <View style={styles.change}>
                  <T v="labelStrong" color={t.ink}>
                    Cambiar
                  </T>
                </View>
              </Tap>
            </Animated.View>
          )}
        </Card>
      </Animated.View>

      <Button label={paying ? `Abriendo ${method.key === 'banco' ? 'tu banco' : method.name}…` : 'Pagar 18,40 €'} icon={paying ? undefined : 'check'} onPress={pay} disabled={paying} />
      <Button label="Ya le pagué de otra forma" kind="text" height={44} onPress={() => finish('Otra forma')} disabled={paying} />
    </SheetBody>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  box: { paddingTop: 4, paddingBottom: 4, paddingLeft: 16, paddingRight: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 66 },
  change: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
  tile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
