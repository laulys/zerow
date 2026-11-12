import { Aurora } from '../components/Aurora';
import { ZeroRing } from '../components/ZeroRing';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, AvatarStack } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';
import { Button, Card, Hairline, IconButton, T, Tap } from '../components/ui';
import { balancesFor, eurText, people, settleUp, transferKey, useTrip, type PersonId, type Transfer } from '../data/trip';
import { motion } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const who = (t: Transfer) => (t.to === 'tu' ? `${people[t.from].name} te paga` : t.from === 'tu' ? `Pagas a ${people[t.to].name}` : `${people[t.from].name} paga a ${people[t.to].name}`);

// 4.x Saldar: payments first (audit option A). Paid ones drop to a list with undo.
// When the last one is marked, the trip is "a mano": the app's biggest moment.
export default function SettleUp() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, draft, paid, markPaid, unmarkPaid } = useTrip();
  const balances = balancesFor(expenses);
  const transfers = settleUp(balances);
  const pending = transfers.filter((x) => !paid.has(transferKey(x)));
  const done = transfers.filter((x) => paid.has(transferKey(x)));
  const settled = !draft && transfers.length > 0 && pending.length === 0;
  const total = expenses.reduce((s, e) => s + e.amountEur, 0);
  const [showBalances, setShowBalances] = useState(false);

  // Only the person who pays gets a receipt (it's theirs to keep and share).
  // When someone pays you, it just moves to "Pagado" with undo.
  const pay = (x: Transfer) => {
    markPaid(x);
    if (x.from === 'tu') router.push({ pathname: '/pago', params: { para: x.to, importe: String(x.amount), grupo: 'Lisboa 2026' } });
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const celebrated = useRef(false);
  useEffect(() => {
    if (settled && !celebrated.current) {
      celebrated.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (!settled) celebrated.current = false;
  }, [settled]);

  const subtitle = draft
    ? 'Primero, revisa el gasto pendiente'
    : settled
      ? 'Todos estáis a cero. Buen viaje.'
      : `Falta${pending.length === 1 ? '' : 'n'} ${pending.length} pago${pending.length === 1 ? '' : 's'} para quedar a cero`;

  // 4.4 A cero: the app's biggest moment gets the whole screen. The ring of
  // light closes around 0,00 €, then the words and the people who made it.
  if (settled) {
    const share = () => Share.share({ message: `Lisboa 2026 quedó a cero: ${eurText(total)} en ${expenses.length} gastos, saldado con ${transfers.length} pagos. Hecho con Zerow.` });
    const at = (ms: number) => FadeInDown.delay(ms).duration(350);
    return (
      <View style={{ flex: 1, backgroundColor: t.page, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }}>
        <Aurora height={460} strength={0.9} />
        <View style={{ paddingHorizontal: 20 }}>
          <IconButton name="x" label="Cerrar" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
          <ZeroRing>
            <View accessible accessibilityLabel="0,00 euros pendientes" style={{ alignItems: 'center' }}>
              <Money value={0} size={56} color={t.ink} centsColor={t.inkMuted} />
              <T v="caption" color={t.inkMuted} style={{ marginTop: 2 }}>
                pendientes
              </T>
            </View>
          </ZeroRing>
          <Animated.View entering={at(900)} style={{ alignItems: 'center' }}>
            <T v="display" color={t.ink} style={{ fontSize: 52, lineHeight: 56, letterSpacing: -1, marginTop: 36 }} accessibilityRole="header">
              A cero
            </T>
            <T v="body" color={t.inkMuted} style={{ marginTop: 12, textAlign: 'center' }}>
              Lisboa 2026 quedó saldado:{'\n'}
              {eurText(total)} entre 4, en {transfers.length} pagos.
            </T>
          </Animated.View>
          <Animated.View entering={at(1100)} style={{ marginTop: 24 }}>
            <AvatarStack ids={['tu', 'ana', 'luis', 'marta']} size={40} />
          </Animated.View>
        </View>
        <Animated.View entering={at(1300)} style={{ paddingHorizontal: 20 }}>
          <Button label="Compartir resumen" icon="share" onPress={share} />
          <Button label="Ver el resumen del viaje" kind="text" height={48} style={{ marginTop: 4 }} onPress={() => router.navigate('/trip/lisboa')} />
        </Animated.View>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: t.page }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
      <Aurora height={380} strength={0.75} />
      <IconButton name="chevron-left" label="Volver" bg={t.glass} color={t.ink} onPress={() => router.back()} />
      <T v="titleL" color={t.ink} style={{ marginTop: 16 }}>
        Saldar cuentas
      </T>
      <T v="label" color={t.inkMuted} style={{ marginTop: 4, marginBottom: 20 }}>
        {subtitle}
      </T>

      {draft ? (
        <>
          <Card bg={t.lime} style={{ padding: 18 }}>
            <T v="body" color={t.onLime}>
              El {draft.title.toLowerCase()} ({eurText(draft.amountEur)}) está por revisar. Súmalo o descártalo antes de marcar pagos: si no, las cuentas cambiarían después.
            </T>
            <Button label="Revisar el gasto" kind="onGradient" height={48} style={{ marginTop: 14 }} onPress={() => router.navigate('/trip/lisboa')} />
          </Card>
          <T v="labelStrong" color={t.inkMuted} style={{ marginTop: 24, marginBottom: 8 }}>
            Pagos previstos · cambian al confirmarlo
          </T>
          <Card bg={t.surface} style={{ paddingVertical: 4 }}>
            {transfers.map((x, i) => (
              <View key={transferKey(x)}>
                <TransferLine x={x} />
                {i < transfers.length - 1 ? <Hairline color={t.line} inset={0} /> : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {!draft &&
        pending.map((x) => (
          <Animated.View
            key={transferKey(x)}
            entering={FadeInDown.duration(motion.standard)}
            exiting={FadeOut.duration(160)}
            layout={LinearTransition.duration(motion.standard)}
            style={{ marginBottom: 12 }}
          >
            <Card bg={t.surface}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Avatar id={x.from} size={28} />
                <Icon name="arrow-right" size={16} color={t.inkMuted} />
                <Avatar id={x.to} size={28} />
                <T v="bodyStrong" color={t.ink} style={{ marginLeft: 4 }}>
                  {who(x)}
                </T>
              </View>
              <View style={{ marginTop: 10, marginBottom: 14 }}>
                <Money value={x.amount} size={40} color={t.ink} centsColor={t.inkMuted} />
              </View>
              {x.to === 'tu' ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    label="Recordárselo"
                    kind="secondary"
                    height={48}
                    onPress={() => Share.share({ message: `Hola ${people[x.from].name}: de Lisboa 2026 me quedan ${eurText(x.amount)} por cobrarte. Lo tienes en Zerow, ¡sin prisa!` })}
                  />
                  <Button label="Ya me ha pagado" height={48} style={{ flex: 1 }} onPress={() => pay(x)} />
                </View>
              ) : (
                <Button label="Marcar como pagado" height={48} onPress={() => pay(x)} />
              )}
            </Card>
          </Animated.View>
        ))}

      {!draft && done.length ? (
        <Animated.View layout={LinearTransition.duration(motion.standard)} style={{ marginTop: settled ? 24 : 8 }}>
          <T v="labelStrong" color={t.inkMuted} style={{ marginBottom: 8 }}>
            Pagado
          </T>
          <Card bg={t.surface} style={{ paddingVertical: 2, paddingRight: 4 }}>
            {done.map((x, i) => (
              <Animated.View key={transferKey(x)} entering={FadeIn.duration(motion.standard)}>
                <View style={styles.paidRow}>
                  <Icon name="check" size={18} color={t.inkMuted} />
                  <T v="label" color={t.inkMuted} style={{ flex: 1, marginLeft: 10 }}>
                    {people[x.from].name} → {people[x.to].name} · {eurText(x.amount)}
                  </T>
                  {!settled ? (
                    <Tap onPress={() => unmarkPaid(x)} accessibilityRole="button" accessibilityLabel={`Deshacer el pago de ${people[x.from].name}`} style={styles.undo}>
                      <T v="labelStrong" color={t.ink}>
                        Deshacer
                      </T>
                    </Tap>
                  ) : null}
                </View>
                {i < done.length - 1 ? <Hairline color={t.line} /> : null}
              </Animated.View>
            ))}
          </Card>
        </Animated.View>
      ) : null}

      {settled ? (
        <Button
          label="Compartir resumen"
          icon="share"
          style={{ marginTop: 20 }}
          onPress={() => Share.share({ message: `Lisboa 2026 quedó a cero: ${eurText(total)} en ${expenses.length} gastos, saldado con ${transfers.length} pagos. Hecho con Zerow.` })}
        />
      ) : (
        <Tap onPress={() => setShowBalances((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showBalances }} style={[styles.balancesToggle, { backgroundColor: t.surface }]}>
          <T v="labelStrong" color={t.ink} style={{ flex: 1 }}>
            Ver saldos de cada uno
          </T>
          <Icon name={showBalances ? 'chevron-left' : 'chevron-right'} size={18} color={t.inkMuted} />
        </Tap>
      )}
      {showBalances && !settled ? (
        <Animated.View entering={FadeInDown.duration(motion.standard)}>
          <Card bg={t.surface} style={{ marginTop: 8, paddingVertical: 4 }}>
            {(['tu', 'luis', 'ana', 'marta'] as PersonId[]).map((id) => (
              <View key={id} style={styles.paidRow}>
                <Avatar id={id} size={28} />
                <T v="bodyStrong" color={t.ink} style={{ flex: 1, marginLeft: 10 }}>
                  {people[id].name}
                </T>
                <T v="bodyStrong" color={t.ink}>
                  {balances[id] >= 0 ? '+' : '−'}
                  {eurText(Math.abs(balances[id]))}
                </T>
              </View>
            ))}
          </Card>
        </Animated.View>
      ) : null}
    </ScrollView>
  );
}

function TransferLine({ x }: { x: Transfer }) {
  const { t } = useTheme();
  return (
    <View style={styles.paidRow}>
      <Avatar id={x.from} size={26} />
      <Icon name="arrow-right" size={14} color={t.inkMuted} />
      <Avatar id={x.to} size={26} />
      <T v="label" color={t.ink} style={{ flex: 1, marginLeft: 8 }}>
        {who(x)}
      </T>
      <T v="labelStrong" color={t.ink}>
        {eurText(x.amount)}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mano: { borderRadius: 28, padding: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 52, paddingLeft: 14, paddingRight: 10 },
  undo: { height: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  balancesToggle: { marginTop: 4, height: 52, borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
});
