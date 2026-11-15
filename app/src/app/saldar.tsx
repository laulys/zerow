import { SummaryPanes } from '../components/Duo';
import { Aurora } from '../components/Aurora';
import { makeImageFromView } from '@shopify/react-native-skia';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, Share, StyleSheet, View, type ViewInstance } from 'react-native';
import Animated, { FadeIn, FadeInDown, LayoutAnimationConfig, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, AvatarStack } from '../components/Avatar';
import { BottomFade } from '../components/BottomFade';
import { BrandGradient } from '../components/BrandGradient';
import { Check } from '../components/Check';
import { Frost } from '../components/Frost';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';
import { EASE, recede, rise } from '../components/motion';
import { announce, undoWindow, useScreenReader } from '../components/announce';
import { useStatusVeil } from '../components/StatusVeil';
import { Button, Card, Hairline, IconButton, T, Tap } from '../components/ui';
import { DraftCard } from './trip/[id]';
import { UndoNotice } from '../components/Notice';
import { balancesFor, eurText, people, plural, settledBalances, settleUp, transferKey, useTrip, type Expense, type PersonId, type Transfer } from '../data/trip';
import { aurora, motion } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const who = (t: Transfer) => (t.to === 'tu' ? `${people[t.from].name} te paga` : t.from === 'tu' ? `Pagas a ${people[t.to].name}` : `${people[t.from].name} paga a ${people[t.to].name}`);

// 4.x Saldar: payments first (audit option A). Paid ones drop to a list with undo.
// When the last one is marked, the trip is "a cero": the app's biggest moment.
function SettleUp() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, draft, paid, markPaid, unmarkPaid, confirmDraft, discardDraft, undoLast } = useTrip();
  const veil = useStatusVeil();
  // 4.1 → 4.2: after either answer, a notice with «Deshacer» (Figma «Aviso», as on Lisboa).
  // «No contarlo» only hides the draft while the notice is up, so «Deshacer» can bring it back.
  const [notice, setNotice] = useState<{ title: string; kind: 'sumado' | 'descartado' } | null>(null);
  const skipping = notice?.kind === 'descartado';
  const asking = draft && !skipping ? draft : null;
  // What is left to pay is worked out from where people stand after the payments already made.
  const current = settledBalances(expenses, paid);
  const pending = settleUp(current);
  const done = paid;
  const settled = !draft && done.length > 0 && pending.length === 0;
  const total = expenses.reduce((s, e) => s + e.amountEur, 0);
  const [showBalances, setShowBalances] = useState(false);
  const reduceMotion = useReducedMotion();
  const [summary, setSummary] = useState(false);
  const [settledOnOpen] = useState(settled);
  const screenReader = useScreenReader();

  const leaving = useRef(false);
  useEffect(() => {
    leaving.current = skipping;
  }, [skipping]);
  // Leaving with a «No es así» still undoable makes it final.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => (leaving.current ? discardDraft() : undefined), []);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => {
      if (notice.kind === 'descartado') discardDraft();
      setNotice(null);
    }, undoWindow(screenReader));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);
  const onUndo = () => {
    if (notice?.kind === 'sumado') undoLast();
    setNotice(null);
  };

  // Only the person who pays gets a receipt (it's theirs to keep and share).
  // When someone pays you, it just moves to "Pagado" with undo.
  // The trip reaches zero here: one success tap as the mark on the card closes.
  useEffect(() => {
    if (!settled || settledOnOpen) return;
    // The app's biggest moment is also said aloud (iOS has no live regions).
    announce(`A cero. Lisboa 2026 quedó saldado: ${eurText(total)} entre 4.`);
    const id = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 120 + motion.standard);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, settledOnOpen]);

  const pay = (x: Transfer) => {
    markPaid(x);
    if (x.from === 'tu') router.push({ pathname: '/pago', params: { para: x.to, importe: String(x.amount), grupo: 'Lisboa 2026' } });
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const subtitle = settled
    ? 'Ya no queda ningún pago.'
    : pending.length === 0
      ? 'No hay pagos pendientes.'
      : `Falta${pending.length === 1 ? '' : 'n'} ${pending.length} pago${pending.length === 1 ? '' : 's'} para quedar a cero`;

  // 4.5 Resumen, from «Ver resumen» on the «A cero» card; closing it goes back to Saldar.
  if (settled && summary) return <TripSummary expenses={expenses} payments={done.length} onClose={() => setSummary(false)} />;

  // 4.1: an expense is still unreviewed, so the screen asks just that, one question, before any payment.
  if (asking)
    return (
      <AddFirst
        draft={asking}
        expenses={expenses}
        onAdd={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          confirmDraft();
          setNotice({ title: asking.title, kind: 'sumado' });
        }}
        onSkip={() => {
          Haptics.selectionAsync();
          setNotice({ title: asking.title, kind: 'descartado' });
        }}
      />
    );

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <ScrollView {...veil.scroll} contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 + (notice ? 64 : 0) }}>
        <Aurora preset="task" />
        <IconButton name="chevron-left" label="Volver" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        <T v="titleL" color={t.ink} style={{ marginTop: 16 }} accessibilityRole="header">
          Saldar cuentas
        </T>
        <T v="label" color={t.inkSoft} style={{ marginTop: 4 }}>
          {subtitle}
        </T>

        <View style={{ marginTop: 16, gap: 16 }}>
          {/* 4.4 A cero, on this same page: when the last payment is marked its card steps back
              and this one rises into the same place (no screen of its own: asked 2026-11-14). */}
          {settled ? (
            <Animated.View entering={rise(120, 12, reduceMotion)}>
              <ZeroCard total={total} onSummary={() => setSummary(true)} />
            </Animated.View>
          ) : null}
          {pending.map((x) => (
            <Animated.View key={transferKey(x)} entering={rise(0, 8, reduceMotion)} exiting={recede(reduceMotion)} layout={LinearTransition.duration(motion.standard).easing(EASE)}>
              <Card style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Avatar id={x.from} size={32} bg={t.disc} inset />
                  <Icon name="arrow-right" size={16} color={t.inkMuted} />
                  <Avatar id={x.to} size={32} bg={t.disc} inset />
                  <T v="bodyStrong" color={t.ink}>
                    {who(x)}
                  </T>
                </View>
                <Money value={x.amount} size={44} color={t.ink} />
                {x.to === 'tu' ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Tap
                      onPress={() => Share.share({ message: `Hola ${people[x.from].name}: de Lisboa 2026 me quedan ${eurText(x.amount)} por cobrarte. Lo tienes en Zerow, ¡sin prisa!` })}
                      accessibilityRole="button"
                      style={styles.quiet}
                    >
                      <T v="labelStrong" color={t.ink}>
                        Recordárselo
                      </T>
                    </Tap>
                    <Button label="Ya me ha pagado" height={48} style={{ flex: 1 }} onPress={() => pay(x)} />
                  </View>
                ) : (
                  // Lime is for your own step: a payment between two other people is a quieter glass button.
                  <Button label="Marcar como pagado" kind={x.from === 'tu' ? 'primary' : 'secondary'} height={48} onPress={() => pay(x)} />
                )}
              </Card>
            </Animated.View>
          ))}

          {done.length ? (
            <Animated.View layout={LinearTransition.duration(motion.standard)} style={{ gap: 12 }}>
              <T v="labelStrong" color={t.inkMuted}>
                Pagado
              </T>
              {/* Figma draws a single paid row on glass and two or more on a card. */}
              <View style={[styles.paidCard, { paddingVertical: done.length === 1 ? 2 : 4 }]}>
                <Frost fill={done.length === 1 ? t.glass : t.card} radius={28} intensity={done.length === 1 ? 20 : 28} />
                {done.map((x, i) => (
                  <Animated.View key={x.id} entering={FadeIn.duration(motion.standard)}>
                    <View style={styles.paidRow}>
                      <Check color={t.lime} />
                      <T v="label" color={t.inkSoft} style={{ flex: 1 }}>
                        {people[x.from].name} → {people[x.to].name} · {eurText(x.amount)}
                      </T>
                      <Tap
                        onPress={() => unmarkPaid(x)}
                        accessibilityRole="button"
                        accessibilityLabel={x.from === 'tu' ? 'Deshacer tu pago' : `Deshacer el pago de ${people[x.from].name}`}
                        style={styles.quiet}
                      >
                        <T v="labelStrong" color={t.ink}>
                          Deshacer
                        </T>
                      </Tap>
                    </View>
                    {i < done.length - 1 ? <Hairline /> : null}
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          ) : null}

          <Tap onPress={() => setShowBalances((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showBalances }} style={styles.balancesToggle}>
            <Frost fill={t.glass} radius={28} intensity={20} />
            <T v="labelStrong" color={t.ink} style={{ flex: 1 }}>
              Ver saldos de cada uno
            </T>
            <View style={{ transform: [{ rotate: showBalances ? '90deg' : '0deg' }] }}>
              <Icon name="chevron-right" size={16} color={t.inkMuted} />
            </View>
          </Tap>
          {showBalances ? (
            <Animated.View entering={rise(0, 8, reduceMotion)} style={{ marginTop: -8 }}>
              <Card style={{ paddingVertical: 4 }}>
                {(['tu', 'luis', 'ana', 'marta'] as PersonId[]).map((id, i) => (
                  <View key={id}>
                    <View style={styles.line}>
                      <Avatar id={id} size={30} bg={t.disc} inset />
                      <T v="labelStrong" color={t.ink} style={{ flex: 1 }}>
                        {people[id].name}
                      </T>
                      <T v="titleXS" color={t.ink}>
                        {Math.abs(current[id]) < 0.005 ? '' : current[id] > 0 ? '+' : '−'}
                        {eurText(Math.abs(current[id]))}
                      </T>
                    </View>
                    {i < 3 ? <Hairline /> : null}
                  </View>
                ))}
              </Card>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
      {veil.veil}
      {notice ? <UndoNotice text={`${notice.title} ${notice.kind}`} onUndo={onUndo} style={[styles.notice, { bottom: insets.bottom + 16 }]} /> : null}
    </View>
  );
}

const LISBOA_ORDER: PersonId[] = ['luis', 'tu', 'ana', 'marta'];

/**
 * 4.5 Resumen: the settled trip as a card to keep or share. What everyone's
 * part came to (not what they paid), the total and the average. «Compartir
 * imagen» shares the card itself as a picture; «Copiar como texto» the same in words.
 */
function TripSummary({ expenses, payments, onClose }: { expenses: Expense[]; payments: number; onClose: () => void }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const card = useRef<ViewInstance>(null);
  const [copied, setCopied] = useState(false);
  const total = expenses.reduce((s, e) => s + e.amountEur, 0);
  const part = Object.fromEntries(LISBOA_ORDER.map((id) => [id, 0])) as Record<PersonId, number>;
  for (const e of expenses) for (const p of e.splitWith) part[p] += e.amountEur / e.splitWith.length;
  const average = `en ${plural(expenses.length, 'gasto')} · ${eurText(total / LISBOA_ORDER.length)} de media por persona`;
  const text = [
    'Lisboa 2026 · 12–18 nov · 4 personas',
    `${eurText(total)} ${average}`,
    'Lo que le tocó a cada uno:',
    // What you share is read by the others: there «Tú» would be them, so it carries your name.
    ...LISBOA_ORDER.map((id) => `${id === 'tu' ? 'Laura' : people[id].name}: ${eurText(part[id])}`),
    `Saldado con ${plural(payments, 'pago')} · Zerow`,
  ].join('\n');

  const shareImage = async () => {
    try {
      const image = await makeImageFromView(card as never);
      const png = image?.encodeToBase64();
      if (png) return void Share.share({ url: `data:image/png;base64,${png}` });
    } catch {
      // Falls back to the words below if the card can't be drawn into a picture.
    }
    Share.share({ message: text });
  };
  const copy = async () => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <Aurora preset="task" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: 24 }}>
        <IconButton name="x" label="Cerrar" bg={t.glass} color={t.ink} onPress={onClose} />
        <T v="titleL" color={t.ink} style={{ marginTop: 16 }} accessibilityRole="header">
          Resumen
        </T>
        <Animated.View entering={FadeInDown.duration(motion.sheet)} style={{ marginTop: 16 }}>
          <View ref={card} collapsable={false}>
            <LimeCard radius={32} style={styles.summary}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <T v="titleM" color={t.inkFixed}>
                    Lisboa 2026
                  </T>
                  <T v="caption" color={t.inkMutedFixed} style={{ fontWeight: '500' }}>
                    12–18 nov · 4 personas
                  </T>
                </View>
                <View style={[styles.badge, { backgroundColor: t.onLimeButton }]}>
                  <Check color={t.lime} heavy />
                  <T v="caption" color={t.lime} style={{ fontWeight: '600' }}>
                    A cero
                  </T>
                </View>
              </View>
              <Money value={total} size={76} color={t.inkFixed} />
              <AvatarStack ids={LISBOA_ORDER} size={34} gap={-10} on="lime" />
              <T v="caption" color={t.inkMutedFixed} style={{ fontWeight: '500' }}>
                {average}
              </T>
              <View style={{ height: 1, backgroundColor: 'rgba(17,17,18,0.18)' }} />
              <T v="caption" color={t.inkMutedFixed} style={{ fontWeight: '500' }}>
                Lo que le tocó a cada uno
              </T>
              {LISBOA_ORDER.map((id) => (
                <View key={id} style={styles.share}>
                  <T v="labelStrong" color={t.inkFixed} style={{ flex: 1 }}>
                    {id === 'tu' ? 'Laura' : people[id].name}
                  </T>
                  <T v="titleXS" color={t.inkFixed}>
                    {eurText(part[id])}
                  </T>
                </View>
              ))}
              <T v="caption" color={t.inkMutedFixed}>
                Saldado con {plural(payments, 'pago')} · Zerow
              </T>
            </LimeCard>
          </View>
        </Animated.View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom }}>
        <BottomFade style={styles.fade} />
        <Button label="Compartir imagen" icon="share" onPress={shareImage} />
        <TextButton label={copied ? 'Copiado' : 'Copiar como texto'} style={{ marginTop: 12 }} onPress={copy} />
      </View>
    </View>
  );
}

/**
 * 4.4 «A cero» as a card at the top of Saldar, on the brand gradient: the words, the
 * trip's total and the way to its summary. It rises into the place of the last payment
 * with one success tap, and stays there, so the trip reads as closed whenever you come back.
 */
function ZeroCard({ total, onSummary }: { total: number; onSummary: () => void }) {
  return (
    <LimeCard style={{ padding: 20, gap: 8 }}>
      <T v="titleL" color={aurora.inkFixed} accessibilityRole="header">
        A cero
      </T>
      <T v="label" color={aurora.inkMutedFixed}>
        Lisboa 2026 quedó saldado:{'\n'}
        {eurText(total)} entre 4.
      </T>
      <Button label="Ver el resumen del viaje" kind="onGradient" height={48} style={{ marginTop: 8 }} onPress={onSummary} />
    </LimeCard>
  );
}

/** «te deberán 26,73 €», «deberás 12,00 €» or «quedarás a cero», for the line under the draft. */
function yourBalance(v: number, future: boolean) {
  if (Math.abs(v) < 0.005) return future ? 'quedarás a cero' : 'estás a cero';
  return v > 0 ? `${future ? 'te deberán' : 'te deben'} ${eurText(v)}` : `${future ? 'deberás' : 'debes'} ${eurText(-v)}`;
}

/**
 * 4.1, option A (chosen 2026-11-13): Saldar's own header, then the same draft card
 * as on Lisboa (3.1), decided right there with «No es así» / «Sí, sumarlo», and one
 * line under it with what it changes for you. Payments appear once it's decided.
 */
function AddFirst({ draft, expenses, onAdd, onSkip }: { draft: Expense; expenses: Expense[]; onAdd: () => void; onSkip: () => void }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const now = balancesFor(expenses).tu;
  const next = balancesFor([draft, ...expenses]).tu;
  // Opening Saldar, the page slides in and the question is simply there; if «Deshacer»
  // brings it back, the card and the line under it rise into place, 80 ms apart.
  const reduce = useReducedMotion();
  const at = (ms: number) => rise(ms, 8, reduce);
  return (
    // Centred on the page (asked 2026-11-13): the decision sits in the middle, lifted a little for the optical centre.
    <ScrollView style={{ backgroundColor: t.page }} contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
      <Aurora preset="task" />
      <IconButton name="chevron-left" label="Volver" bg={t.glass} color={t.ink} onPress={() => router.back()} />
      <View style={styles.centred}>
        <T v="titleL" color={t.ink} style={{ textAlign: 'center' }} accessibilityRole="header">
          Saldar cuentas
        </T>
        <T v="label" color={t.inkSoft} style={{ marginTop: 4, textAlign: 'center' }}>
          Antes, decide este gasto: aún no cuenta.
        </T>
        <Animated.View entering={at(80)} style={{ marginTop: 20, alignSelf: 'stretch' }}>
          <DraftCard draft={draft} onConfirm={onAdd} onDiscard={onSkip} />
        </Animated.View>
        <Animated.View entering={at(160)}>
          <T v="label" color={t.inkSoft} style={{ marginTop: 16, textAlign: 'center' }}>
            Si lo sumas, {yourBalance(next, true)} ({`ahora ${yourBalance(now, false).replace(/^te deben |^debes /, '')}`}).
          </T>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

/** A text-only button, 44 pt tall with 17 pt semibold (Figma «Listo», «Ver el resumen del viaje»). */
function TextButton({ label, onPress, style }: { label: string; onPress: () => void; style?: object }) {
  const { t } = useTheme();
  return (
    <Tap onPress={onPress} accessibilityRole="button" style={[styles.textButton, style]}>
      <T v="bodyStrong" color={t.ink}>
        {label}
      </T>
    </Tap>
  );
}

/** Figma's lime glow under the cards on the gradient (#B6F03A 30 %, blur 56, 22 down, over black 40 %, blur 18, 8 down). */
function LimeCard({ children, radius = 28, style }: { children: ReactNode; radius?: number; style?: object }) {
  return (
    <View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glowLime, { borderRadius: radius }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glowDark, { borderRadius: radius }]} />
      <BrandGradient style={{ ...styles.lime, borderRadius: radius, ...style }} seed={4}>
        {children}
      </BrandGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  lime: { borderRadius: 28, padding: 16, gap: 12 },
  glowLime: { borderRadius: 28, backgroundColor: aurora.glow, shadowColor: aurora.glow, shadowOpacity: 0.3, shadowRadius: 28, shadowOffset: { width: 0, height: 22 } },
  glowDark: { borderRadius: 28, backgroundColor: '#1E1E22', shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 9, shadowOffset: { width: 0, height: 8 } },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58 },
  quiet: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  paidCard: { borderRadius: 28, paddingLeft: 16, paddingRight: 6 },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  balancesToggle: { minHeight: 56, paddingVertical: 8, borderRadius: 28, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  summary: { padding: 20, gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 30, borderRadius: 15, paddingHorizontal: 12 },
  share: { flexDirection: 'row', alignItems: 'center', minHeight: 38 },
  // Figma «Fundido»: the page fades in under the buttons at the bottom.
  fade: { height: 150 },
  notice: { position: 'absolute', left: 20, right: 20 },
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 64 },
  textButton: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
});

// On the open iPhone Duo the group stays in view in the list pane (Figma «Resumen»).
export default function SettleUpRoute() {
  // Nothing stages an entrance on top of the push; what changes afterwards (a payment,
  // the balances opening, the «A cero» card) still moves. «A cero» lives on this page,
  // so on the open iPhone Duo Saldar keeps its place in the detail pane.
  return (
    <LayoutAnimationConfig skipEntering>
      <SummaryPanes group="lisboa">
        <SettleUp />
      </SummaryPanes>
    </LayoutAnimationConfig>
  );
}
