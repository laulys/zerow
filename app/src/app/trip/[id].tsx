import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, LinearTransition, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, AvatarStack } from '../../components/Avatar';
import { BrandGradient } from '../../components/BrandGradient';
import { Glass } from '../../components/Glass';
import { Icon } from '../../components/Icon';
import { Orb } from '../../components/Orb';
import { Money, RollingMoney, useRollingNumber } from '../../components/Money';
import { Button, Card, Hairline, IconButton, T, Tap } from '../../components/ui';
import { PISO_SHARE, balancesFor, eurText, people, pisoGroup, settleUp, transferKey, usePisoBalance, useTrip, type Expense, type Group, type PersonId } from '../../data/trip';
import { font, light, motion } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const order: PersonId[] = ['tu', 'luis', 'ana', 'marta'];

function caption(id: PersonId, v: number) {
  if (Math.abs(v) < 0.005) return 'a mano';
  if (id === 'tu') return v > 0 ? 'te deben' : 'debes';
  return v > 0 ? 'le deben' : 'debe';
}

// 3.1 Lisboa: balances as numbers only (audit option A), the AI draft on the brand
// gradient, and the expense list. Confirming makes every balance roll to its new value.
export default function TripRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { groups } = useTrip();
  const group = groups.find((g) => g.id === id);
  if (id === 'piso') return <PisoGroup />;
  return group ? <EmptyGroup group={group} /> : <Trip />;
}

const kindWord: Record<Group['kind'], string> = {
  viaje: 'del viaje',
  piso: 'del piso',
  evento: 'del evento',
  otro: 'del grupo',
};

// A group created in the app. Empty (6.5), the zero is the hero and the empty list
// teaches the one thing to do next; with expenses, the same balance-and-list layout.
// Piso Calle Mayor (3.3): the sample flat, with its two bills and your share to Ana.
function PisoGroup() {
  const { t } = useTheme();
  const { pisoPaid } = useTrip();
  const mine = usePisoBalance();
  return (
    <EmptyGroup
      group={pisoGroup}
      mine={mine}
      action={
        pisoPaid ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 }}>
            <Icon name="check" size={16} color={t.lime} />
            <T v="caption" color={t.onPanelMuted}>
              Pagaste {eurText(PISO_SHARE)} a Ana
            </T>
          </View>
        ) : (
          <Button label={`Pagar a Ana · ${eurText(PISO_SHARE)}`} height={48} style={{ marginTop: 16 }} onPress={() => router.push('/pagar')} />
        )
      }
    />
  );
}

function EmptyGroup({ group, base = [], mine: fixed, action }: { group: Group; base?: Expense[]; mine?: number; action?: React.ReactNode }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupExpenses } = useTrip();
  const list = [...(groupExpenses[group.id] ?? []), ...base];
  const mine = fixed ?? balancesFor(list).tu;
  const meta = [group.dates, `${group.members.length} personas`, group.currency === 'EUR' ? 'en euros' : 'en dólares'].filter(Boolean).join(' · ');
  if (!list.length) return <ListeningEmpty group={group} />;
  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 150,
        }}
      >
        <View style={styles.header}>
          <IconButton name="chevron-left" label="Volver" bg={t.surface} color={t.ink} onPress={() => router.back()} />
          <IconButton
            name="user-plus"
            label="Invitar al grupo"
            bg={t.surface}
            color={t.ink}
            onPress={() =>
              router.push({
                pathname: '/invitar',
                params: { nombre: group.name },
              })
            }
          />
        </View>
        <T v="titleL" color={t.ink} style={{ marginTop: 16 }}>
          {group.name}
        </T>
        <T v="caption" color={t.inkMuted} style={{ marginTop: 2, marginBottom: 16 }}>
          {meta}
        </T>
        <Card bg={t.panel} style={{ padding: 20 }}>
          <T v="label" color={t.onPanelMuted}>
            {list.length ? (Math.abs(mine) < 0.005 ? 'A mano' : mine > 0 ? 'Te deben' : 'Debes') : `Saldo ${kindWord[group.kind]}`}
          </T>
          <RollingMoney value={Math.abs(mine)} size={64} color={t.onPanel} centsColor={t.onPanelMuted} currency={group.currency} duration={motion.numbers} />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginTop: 14,
            }}
          >
            <AvatarStack ids={group.members} size={30} outline={t.panel} />
            <T v="caption" color={t.onPanelMuted}>
              {list.length ? `${eurText(list.reduce((a, e) => a + e.amountEur, 0))} en ${list.length} gasto${list.length === 1 ? '' : 's'}` : `${group.members.length} personas · todavía nadie debe nada`}
            </T>
          </View>
          {action}
        </Card>
        <T v="titleM" color={t.ink} style={{ marginTop: 28, marginBottom: 12 }}>
          Gastos
        </T>
        {list.length ? (
          <Card bg={t.surface} style={{ paddingVertical: 4 }}>
            {list.map((e, i) => (
              <Animated.View key={e.id} entering={FadeInDown.duration(motion.standard)}>
                <ExpenseRow e={e} group={group.id} />
                {i < list.length - 1 ? <Hairline color={t.line} inset={52} /> : null}
              </Animated.View>
            ))}
          </Card>
        ) : (
        <Card bg={t.surface} style={{ padding: 20, alignItems: 'flex-start' }}>
          <T v="bodyStrong" color={t.ink}>
            Aún no hay gastos
          </T>
          <T v="label" color={t.inkMuted} style={{ marginTop: 4 }}>
            Cuéntale el primero al micro, por ejemplo: «Pagué el taxi, 45 dólares, para Ana y para mí».
          </T>
        </Card>
        )}
      </ScrollView>
      <CaptureBar bottom={insets.bottom} group={group.id} />
    </View>
  );
}

const firstExamples = ['Pagué el hotel, 300 euros, entre todos', 'Pagué el taxi, 45 dólares, para Ana y para mí', 'Pagué la cena, 84 euros, entre todos'];

// 6.5 Viaje sin gastos (option B): an empty group is an invitation to talk.
// Zerow's orb, one sentence, and examples you can tap to try straight away.
function ListeningEmpty({ group }: { group: Group }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const sym = group.currency === 'EUR' ? '€' : 'US$';
  const at = (ms: number) => FadeInDown.delay(ms).duration(300);
  const tryIt = (ejemplo?: string) => router.push({ pathname: '/nuevo', params: { grupo: group.id, ...(ejemplo ? { ejemplo } : {}) } });
  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 150, flexGrow: 1 }}>
        <View style={[styles.header, { gap: 10 }]}>
          <IconButton name="chevron-left" label="Volver" bg={t.surface} color={t.ink} onPress={() => router.back()} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} accessible accessibilityLabel={`${group.name}. ${group.members.length} personas. Saldo 0,00 ${sym}, sin gastos`}>
            <AvatarStack ids={group.members} size={28} outline={t.page} />
            <View style={{ flex: 1 }}>
              <T v="bodyStrong" color={t.ink} numberOfLines={1}>
                {group.name}
              </T>
              <T v="caption" color={t.inkMuted}>
                Saldo 0,00 {sym} · sin gastos
              </T>
            </View>
          </View>
          <IconButton name="user-plus" label="Invitar al grupo" bg={t.surface} color={t.ink} onPress={() => router.push({ pathname: '/invitar', params: { nombre: group.name } })} />
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
          <Orb size={150} state="listening" label="Zerow te escucha" />
          <Animated.View entering={at(150)}>
            <T v="titleL" color={t.ink} style={{ textAlign: 'center', marginTop: 28 }} accessibilityRole="header">
              Cuéntame el primer gasto
            </T>
            <T v="body" color={t.inkMuted} style={{ textAlign: 'center', marginTop: 10, paddingHorizontal: 12 }}>
              Dilo como se lo dirías a un amigo. Yo lo convierto en un borrador y nada cuenta hasta que lo confirmes.
            </T>
          </Animated.View>
          <Animated.View entering={at(280)} style={{ alignItems: 'center', gap: 8, marginTop: 24 }}>
            {firstExamples.map((ex) => (
              <Tap key={ex} onPress={() => tryIt(ex)} accessibilityRole="button" accessibilityLabel={`Probar: ${ex}`} style={[styles.example, { backgroundColor: t.surface }]}>
                <T v="label" color={t.ink} style={{ fontFamily: font.medium }}>
                  «{ex.replace(' euros', ' €')}»
                </T>
              </Tap>
            ))}
          </Animated.View>
        </View>
      </ScrollView>
      <CaptureBar bottom={insets.bottom} group={group.id} />
    </View>
  );
}

function Trip() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, draft, confirmDraft, discardDraft, undoLast, lastSaved } = useTrip();
  const now = balancesFor(expenses);
  const next = draft ? balancesFor([draft, ...expenses]) : null;
  const total = expenses.reduce((s, e) => s + e.amountEur, 0);
  const [toast, setToast] = useState(false);
  const { paid } = useTrip();
  const pendingPayments = settleUp(now).filter((x) => !paid.has(transferKey(x))).length;

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(false), 10000);
    return () => clearTimeout(id);
  }, [toast]);

  const onConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    confirmDraft();
    setToast(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 150,
        }}
      >
        <View style={styles.header}>
          <IconButton name="chevron-left" label="Volver" bg={t.surface} color={t.ink} onPress={() => router.back()} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <IconButton name="user-plus" label="Invitar al grupo" bg={t.surface} color={t.ink} onPress={() => router.push('/invitar')} />
            <Button label={pendingPayments ? `Saldar · ${pendingPayments} pago${pendingPayments === 1 ? '' : 's'}` : 'A mano'} icon="arrow-left-right" kind="secondary" height={44} onPress={() => router.push('/saldar')} />
          </View>
        </View>
        <Animated.View entering={FadeInDown.duration(220)}>
          <T v="titleL" color={t.ink} style={{ marginTop: 16 }}>
            Lisboa 2026
          </T>
          <T v="caption" color={t.inkMuted} style={{ marginTop: 2, marginBottom: 16 }}>
            12–18 nov · 4 personas · en euros
          </T>
        </Animated.View>

        {draft ? (
          <Animated.View key={draft.id} entering={FadeInDown.delay(100).duration(280)} exiting={ZoomOut.duration(motion.standard)} style={{ marginBottom: 12 }}>
            <DraftCard draft={draft} onConfirm={onConfirm} onDiscard={discardDraft} />
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(180).duration(280)} layout={LinearTransition.duration(motion.standard)}>
          <Card bg={t.panel} style={{ padding: 20 }}>
            <T v="label" color={t.onPanelMuted}>
              {caption('tu', now.tu) === 'debes' ? 'Debes' : 'Te deben'}
            </T>
            <RollingMoney value={Math.abs(now.tu)} size={64} color={t.onPanel} centsColor={t.onPanelMuted} duration={motion.numbers} />
            <T v="caption" color={next ? t.lime : t.onPanelMuted} style={{ marginTop: 6 }}>
              {next ? `→ ${eurText(next.tu)} si confirmas el almuerzo` : `${eurText(total)} en ${expenses.length} gastos confirmados`}
            </T>
            <View
              style={{
                height: 1,
                backgroundColor: t.onPanel,
                opacity: 0.1,
                marginVertical: 14,
              }}
            />
            {order.map((id, i) => (
              <View key={id}>
                <Tap
                  onPress={() => router.push(id === 'tu' ? '/saldar' : { pathname: '/persona', params: { id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${people[id].name}, ${caption(id, now[id])} ${eurText(Math.abs(now[id]))}${next ? `. Si confirmas el almuerzo, ${eurText(Math.abs(next[id]))}` : ''}. ${id === 'tu' ? 'Ir a saldar' : `Ver lo vuestro`}`}
                  style={styles.balRow}
                >
                  <Avatar id={id} size={34} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <T v="bodyStrong" color={t.onPanel}>
                      {people[id].name}
                    </T>
                    <T v="caption" color={t.onPanelMuted}>
                      {caption(id, now[id])}
                    </T>
                  </View>
                  <RollingText value={Math.abs(now[id])} color={t.onPanel} />
                </Tap>
                {i < order.length - 1 ? (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: t.onPanel,
                      opacity: 0.08,
                      marginLeft: 46,
                    }}
                  />
                ) : null}
              </View>
            ))}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(280)} layout={LinearTransition.duration(motion.standard)}>
          <T v="titleM" color={t.ink} style={{ marginTop: 28, marginBottom: 12 }}>
            Gastos
          </T>
          <Card bg={t.surface} style={{ paddingVertical: 4 }}>
            {expenses.map((e, i) => (
              <Animated.View key={e.id} entering={FadeInDown.duration(motion.standard)}>
                <ExpenseRow e={e} group={'lisboa'} />
                {i < expenses.length - 1 ? <Hairline color={t.line} inset={52} /> : null}
              </Animated.View>
            ))}
          </Card>
        </Animated.View>
      </ScrollView>

      {toast && lastSaved ? (
        <Animated.View entering={FadeInDown.duration(motion.standard)} exiting={FadeOutDown.duration(160)} style={[styles.toast, { backgroundColor: t.panel, bottom: insets.bottom + 84 }]} accessibilityLiveRegion="polite">
          <T v="label" color={t.onPanel} style={{ flex: 1 }}>
            {lastSaved.title} guardado en Lisboa 2026
          </T>
          <Tap
            onPress={() => {
              undoLast();
              setToast(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="Deshacer"
            style={styles.undo}
          >
            <Icon name="undo" size={16} color={t.onPanel} />
            <T v="labelStrong" color={t.onPanel}>
              Deshacer
            </T>
          </Tap>
        </Animated.View>
      ) : null}

      <CaptureBar bottom={insets.bottom} />
    </View>
  );
}

function RollingText({ value, color }: { value: number; color: string }) {
  return (
    <View style={{ height: 22, justifyContent: 'center' }}>
      <T v="bodyStrong" color={color} style={{ fontVariant: ['tabular-nums'] }}>
        {eurText(useRollingNumber(value, motion.numbers))}
      </T>
    </View>
  );
}

function DraftCard({ draft, onConfirm, onDiscard }: { draft: Expense; onConfirm: () => void; onDiscard: () => void }) {
  const ink = light.inkFixed;
  const each = draft.amountEur / draft.splitWith.length;
  return (
    <BrandGradient style={styles.draft} seed={7}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Orb size={18} onGradient />
        <T v="caption" color={ink}>
          Borrador de Zerow · aún no cuenta
        </T>
      </View>
      <View style={[styles.rowBetween, { marginTop: 10 }]}>
        <T v="titleM" color={ink}>
          {draft.title}
        </T>
        <Money value={draft.amountEur} size={36} color={ink} centsColor={light.inkMutedFixed} />
      </View>
      <T v="caption" color={light.inkMutedFixed} style={{ marginTop: 4 }}>
        Pagó {people[draft.payer].name} · {eurText(each)} cada uno, entre {draft.splitWith.length}
      </T>
      <View style={[styles.rowBetween, { marginTop: 16, gap: 8 }]}>
        <Button label="Descartar" kind="text" color={ink} height={48} onPress={onDiscard} style={{ paddingHorizontal: 12 }} />
        <Button label="Confirmar" icon="check" kind="onGradient" height={48} onPress={onConfirm} style={{ flex: 1 }} />
      </View>
    </BrandGradient>
  );
}

function ExpenseRow({ e, group }: { e: Expense; group: string }) {
  const { t } = useTheme();
  const who = e.splitWith.length > 2 ? `entre ${e.splitWith.length}` : `entre ${e.splitWith.map((p) => people[p].name).join(' y ')}`;
  return (
    <Tap onPress={() => router.push({ pathname: '/gasto', params: { grupo: group, id: e.id } })} accessibilityRole="button" accessibilityLabel={`${e.title}, ${eurText(e.amountEur)}. Pagó ${people[e.payer].name}, ${who}. Ver detalle`} style={styles.expRow}>
      <Avatar id={e.payer} size={40} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <T v="bodyStrong" color={t.ink}>
          {e.title}
        </T>
        <T v="caption" color={t.inkMuted}>
          Pagó {people[e.payer].name} · {who}
          {e.note ? ` · ${e.note}` : ''}
        </T>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <T v="bodyStrong" color={t.ink}>
          {eurText(e.amountEur)}
        </T>
        {e.originalUsd ? (
          <T v="caption" color={t.inkMuted}>
            {e.originalUsd.toFixed(2).replace('.', ',')} US$
          </T>
        ) : null}
      </View>
    </Tap>
  );
}

function CaptureBar({ bottom, group = 'lisboa' }: { bottom: number; group?: string }) {
  const { t } = useTheme();
  return (
    <Tap onPress={() => router.push({ pathname: '/nuevo', params: { grupo: group } })} accessibilityRole="button" accessibilityLabel="Cuéntame un gasto" style={[styles.captureWrap, { bottom: Math.max(bottom - 8, 12) }]}>
      <Glass fallback={t.panel} style={styles.capture}>
      <T v="body" color={t.onPanelMuted} style={{ flex: 1 }}>
        Cuéntame un gasto…
      </T>
      <Icon name="keyboard" size={22} color={t.onPanelMuted} />
      <View style={[styles.mic, { backgroundColor: t.onPanel }]}>
        <Icon name="mic" size={22} color={t.inkFixed} />
      </View>
      </Glass>
    </Tap>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  example: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11 },
  balRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  draft: { borderRadius: 22, padding: 18 },
  expRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 6,
    height: 56,
  },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
  },
  captureWrap: { position: 'absolute', left: 20, right: 20, height: 64, borderRadius: 32, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  capture: { flex: 1, borderRadius: 32, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, gap: 12 },
  mic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
