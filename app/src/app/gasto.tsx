import { SummaryPanes } from '../components/Duo';
import { useScreen } from '../components/Screen';
import { Aurora } from '../components/Aurora';
import { Frost } from '../components/Frost';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { BottomFade } from '../components/BottomFade';
import { Money } from '../components/Money';
import { surface } from '../components/motion';
import { useStatusVeil } from '../components/StatusVeil';
import { Button, Card, Hairline, IconButton, T } from '../components/ui';
import { eurText, people, personName, useTrip, type Expense, type GroupKind, type PersonId } from '../data/trip';
import { sheetFill } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Glyph } from './trip/[id]';

const EUR_TO_USD = 1.1149; // what one euro bought in dollars on the day of the sample expenses (300 US$ ≈ 269,08 €)

// When the sample expenses were added and by whom (Figma 3.7: «13 nov · pagó Luis · lo sumó Luis»).
// Anything else was added or confirmed by you in the app, today.
const added: Record<string, { day: string; by: PersonId }> = {
  hotel: { day: '13 nov', by: 'luis' },
  taxi: { day: '13 nov', by: 'ana' },
  cena: { day: '14 nov', by: 'tu' },
  luz: { day: '1 nov', by: 'ana' },
  wifi: { day: '1 nov', by: 'luis' },
};

const inGroup: Record<GroupKind, string> = { viaje: 'del viaje', piso: 'del piso', evento: 'del evento', otro: 'del grupo' };

// 3.7 Detalle del gasto: who paid, what it cost (in the original currency when it
// wasn't euros) and how it splits, payer first. "Editar" goes back to Zerow (you say
// what changed); "Eliminar" asks first (3.9).
function ExpenseDetail() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const split = useScreen().form === 'split';
  const { grupo = 'lisboa', id } = useLocalSearchParams<{ grupo?: string; id: string }>();
  const { expenses, groups, groupExpenses, removeExpense } = useTrip();
  const [asking, setAsking] = useState(false);
  const veil = useStatusVeil();
  const ledger: Expense[] = grupo === 'lisboa' ? expenses : (groupExpenses[grupo] ?? []);
  const e = ledger.find((x) => x.id === id);
  const created = groups.find((g) => g.id === grupo);
  const groupName = grupo === 'lisboa' ? 'Lisboa 2026' : grupo === 'piso' ? 'Piso Calle Mayor' : (created?.name ?? '');
  const kind: GroupKind = grupo === 'lisboa' ? 'viaje' : grupo === 'piso' ? 'piso' : (created?.kind ?? 'otro');
  const currency = created?.currency ?? 'EUR';

  if (!e) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, paddingHorizontal: 20, backgroundColor: t.page }}>
        <IconButton name="chevron-left" label="Volver" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        <T v="titleL" color={t.ink} style={{ marginTop: 16 }}>
          Este gasto ya no está
        </T>
        <T v="label" color={t.inkSoft} style={{ marginTop: 4 }}>
          Puede que alguien lo haya quitado del grupo.
        </T>
      </View>
    );
  }

  const share = e.amountEur / e.splitWith.length;
  const order = [e.payer, ...e.splitWith.filter((p) => p !== e.payer)];
  const when = added[e.id] ?? { day: 'hoy', by: 'tu' as PersonId };
  const meta = [when.day, e.payer === 'tu' ? 'pagaste tú' : `pagó ${people[e.payer].name}`, when.by === 'tu' ? 'lo sumaste tú' : `lo sumó ${people[when.by].name}`, e.note].filter(Boolean).join(' · ');

  const remove = () => {
    setAsking(false);
    removeExpense(grupo, e.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      {/* On the open Duo the summary pane brings its own light. */}
      {split ? null : <Aurora preset="task" />}
      <ScrollView {...veil.scroll} contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: insets.bottom + 56 + 40 }}>
        <IconButton name="chevron-left" label="Volver" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        <T v="titleL" color={t.ink} style={{ marginTop: 16 }} accessibilityRole="header">
          {e.title}
        </T>
        <T v="label" color={t.inkSoft} style={{ marginTop: 4 }}>
          {meta}
        </T>

        {/* Figma «Importe»: p16, 2 pt between lines, 6 pt of air under the amount. */}
        <Card style={{ marginTop: 16, gap: 2 }}>
          {e.originalUsd ? (
            <>
              <Money value={e.originalUsd} size={56} color={t.ink} currency="USD" />
              <T v="labelStrong" color={t.ink} style={{ marginTop: 8 }}>
                ≈ {eurText(e.amountEur)} en la moneda {inGroup[kind]}
              </T>
              <T v="caption" color={t.inkMuted}>
                {`1\u00A0€ = ${String(EUR_TO_USD).replace('.', ',')}\u00A0US$, ${when.day === 'hoy' ? 'cambio de hoy' : `cambio del ${when.day}`}`}
              </T>
            </>
          ) : (
            <>
              <Money value={e.amountEur} size={56} color={t.ink} currency={currency} />
              <T v="labelStrong" color={t.ink} style={{ marginTop: 8 }}>
                {eurText(share, currency)} cada uno
              </T>
              <T v="caption" color={t.inkMuted}>
                Entre {e.splitWith.length === 1 ? 'una persona' : `los ${e.splitWith.length}`} {inGroup[kind]}
              </T>
            </>
          )}
        </Card>

        <View style={{ marginTop: 24, gap: 12 }}>
          <T v="section" color={t.ink} accessibilityRole="header">
            Cómo se reparte
          </T>
          <Card style={{ paddingVertical: 4 }}>
            {order.map((p, i) => {
              const inSplit = e.splitWith.includes(p);
              return (
                <View key={p}>
                  {i > 0 ? <Hairline /> : null}
                  <View
                    style={styles.row}
                    accessible
                    accessibilityLabel={`${personName(p)}${p === e.payer ? `, ${p === 'tu' ? 'pagaste' : 'pagó'} ${eurText(e.amountEur, currency)}` : ''}. ${p === 'tu' ? 'Tu' : 'Su'} parte: ${inSplit ? eurText(share, currency) : 'nada'}`}
                  >
                    <Avatar id={p} size={36} bg={t.disc} inset />
                    <View style={{ flex: 1 }}>
                      <T v="bodyStrong" color={t.ink}>
                        {personName(p)}
                      </T>
                      {p === e.payer ? (
                        <T v="caption" color={t.inkMuted}>
                          {p === 'tu' ? 'pagaste' : 'pagó'} {eurText(e.amountEur, currency)}
                        </T>
                      ) : null}
                    </View>
                    <T v="titleXS" color={t.ink}>
                      {inSplit ? eurText(share, currency) : '—'}
                    </T>
                  </View>
                </View>
              );
            })}
          </Card>
        </View>
      </ScrollView>
      {veil.veil}

      <BottomFade height={insets.bottom + 96} />
      {/* Figma «Acciones»: a red text button and the lime «Editar», 12 apart, on the home indicator's line. */}
      <View style={[styles.foot, { bottom: insets.bottom }]}>
        {/* 48 picks the 17 pt label; Figma draws this text button 44 tall. */}
        <Button label="Eliminar" kind="text" height={48} color={t.danger} onPress={() => setAsking(true)} style={{ height: 44, paddingHorizontal: 12 }} />
        <Button
          label="Editar"
          leading={<Glyph name="pen" size={20} color={t.onAction} weight={2} />}
          style={{ flex: 1 }}
          onPress={() => router.push({ pathname: '/nuevo', params: { grupo, editar: e.id } })}
        />
      </View>

      {asking ? <ConfirmDelete title={e.title} group={groupName} onCancel={() => setAsking(false)} onDelete={remove} /> : null}
    </View>
  );
}

// 3.9: Figma's own alert (glass «sheet» over a 32 % black veil), not the system one. Figma's
// 50 % drop shadow is left out: on a translucent view iOS would draw it through the glass too.
function ConfirmDelete({ title, group, onCancel, onDelete }: { title: string; group: string; onCancel: () => void; onDelete: () => void }) {
  const reduce = useReducedMotion();
  const { t } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.veil} accessibilityViewIsModal>
      {/* The alert comes forward from just behind (0.96), never from nothing. */}
      <Animated.View entering={surface(reduce)} style={[styles.alert, { borderColor: 'rgba(255,255,255,0.08)' }]} accessibilityRole="alert">
        <Frost fill={sheetFill} radius={28} intensity={34} />
        <T v="bodyStrong" color={t.ink} style={{ textAlign: 'center' }}>
          ¿Eliminar «{title}»?
        </T>
        <T v="caption" color={t.inkSoft} style={{ textAlign: 'center' }}>
          Se quita de {group} y las cuentas se recalculan para todos.
        </T>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
          <Button label="Cancelar" kind="secondary" height={44} onPress={onCancel} style={{ flex: 1 }} />
          <Button label="Eliminar" kind="secondary" height={44} color={t.danger} onPress={onDelete} style={{ flex: 1 }} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 8 },
  foot: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.32)', alignItems: 'center', justifyContent: 'center' },
  alert: {
    width: 300,
    borderRadius: 28,
    borderWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
});

// On the open iPhone Duo the group stays in view in the list pane (Figma «Resumen»).
export default function ExpenseDetailRoute() {
  return (
    <SummaryPanes group={useLocalSearchParams<{ grupo?: string }>().grupo ?? 'lisboa'}>
      <ExpenseDetail />
    </SummaryPanes>
  );
}
