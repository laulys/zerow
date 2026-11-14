import { Spread, SummaryPanes } from '../components/Duo';
import { Aurora } from '../components/Aurora';
import { CLOSES_AT, ZeroRing } from '../components/ZeroRing';
import { makeImageFromView } from '@shopify/react-native-skia';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, Share, StyleSheet, View, type ViewInstance } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition, useReducedMotion, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Avatar, AvatarStack } from '../components/Avatar';
import { BrandGradient } from '../components/BrandGradient';
import { Frost } from '../components/Frost';
import { Icon } from '../components/Icon';
import { Money, RollingMoney } from '../components/Money';
import { Button, Card, Hairline, IconButton, T, Tap } from '../components/ui';
import { DraftCard } from './trip/[id]';
import { UndoNotice } from '../components/Notice';
import { balancesFor, eurText, people, settleUp, transferKey, useTrip, type Expense, type PersonId, type Transfer } from '../data/trip';
import { motion } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const who = (t: Transfer) => (t.to === 'tu' ? `${people[t.from].name} te paga` : t.from === 'tu' ? `Pagas a ${people[t.to].name}` : `${people[t.from].name} paga a ${people[t.to].name}`);

// 4.x Saldar: payments first (audit option A). Paid ones drop to a list with undo.
// When the last one is marked, the trip is "a cero": the app's biggest moment.
function SettleUp() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, draft, paid, markPaid, unmarkPaid, confirmDraft, discardDraft, undoLast } = useTrip();
  // 4.1 → 4.2: after either answer, a notice with «Deshacer» (Figma «Aviso», as on Lisboa).
  // «No contarlo» only hides the draft while the notice is up, so «Deshacer» can bring it back.
  const [notice, setNotice] = useState<{ title: string; kind: 'sumado' | 'descartado' } | null>(null);
  const skipping = notice?.kind === 'descartado';
  const asking = draft && !skipping ? draft : null;
  const balances = balancesFor(expenses);
  const transfers = settleUp(balances);
  const pending = transfers.filter((x) => !paid.has(transferKey(x)));
  const done = transfers.filter((x) => paid.has(transferKey(x)));
  const settled = !draft && transfers.length > 0 && pending.length === 0;
  const total = expenses.reduce((s, e) => s + e.amountEur, 0);
  const [showBalances, setShowBalances] = useState(false);
  const reduceMotion = useReducedMotion();
  const [summary, setSummary] = useState(false);

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
    }, 10000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);
  const onUndo = () => {
    if (notice?.kind === 'sumado') undoLast();
    setNotice(null);
  };

  // Only the person who pays gets a receipt (it's theirs to keep and share).
  // When someone pays you, it just moves to "Pagado" with undo.
  // The last payment marked: «A cero» counts down from it.
  const [lastPaid, setLastPaid] = useState(0);
  const pay = (x: Transfer) => {
    setLastPaid(x.amount);
    markPaid(x);
    if (x.from === 'tu') router.push({ pathname: '/pago', params: { para: x.to, importe: String(x.amount), grupo: 'Lisboa 2026' } });
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const celebrated = useRef(false);
  useEffect(() => {
    if (settled && !celebrated.current) {
      celebrated.current = true;
      // The success tap lands when the two halves meet, not when the screen appears.
      const id = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), CLOSES_AT);
      return () => clearTimeout(id);
    }
    if (!settled) celebrated.current = false;
  }, [settled]);

  const subtitle = settled ? 'Todos estáis a cero. Buen viaje.' : `Falta${pending.length === 1 ? '' : 'n'} ${pending.length} pago${pending.length === 1 ? '' : 's'} para quedar a cero`;

  // 4.5 Resumen, from «Ver el resumen del viaje»; closing it goes back to «A cero».
  if (settled && summary) return <TripSummary expenses={expenses} payments={transfers.length} onClose={() => setSummary(false)} />;
  // 4.4 A cero: the app's biggest moment gets the whole screen. The ring of
  // light closes around 0,00 €, then the words and the people who made it.
  if (settled) {
    const share = () => Share.share({ message: `Lisboa 2026 quedó a cero: ${eurText(total)} en ${expenses.length} gastos, saldado con ${transfers.length} pagos. Hecho con Zerow.` });
    const at = (ms: number) => (reduceMotion ? undefined : riseIn(ms, 12));
    const close = <IconButton name="x" label="Cerrar" bg={t.glass} color={t.ink} onPress={() => router.back()} />;
    // Figma «Cero de luz»: a 256 pt square with the 216 pt ring (17 pt thick) in it.
    const ring = (
      <View style={styles.ringBox}>
        <ZeroRing size={218} stroke={17}>
          <View accessible accessibilityLabel="0,00 euros pendientes" style={{ alignItems: 'center' }}>
            <ZeroAmount from={lastPaid} />
            <T v="caption" color={t.inkSoft}>
              pendientes
            </T>
          </View>
        </ZeroRing>
      </View>
    );
    const words = (
      <>
        <Animated.View entering={at(CLOSES_AT + 80)} style={{ alignItems: 'center', marginTop: 20 }}>
          <T v="display" color={t.ink} style={styles.aCero} accessibilityRole="header">
            A cero
          </T>
          <T v="body" color={t.inkSoft} style={{ marginTop: 12, textAlign: 'center' }}>
            Lisboa 2026 quedó saldado:{'\n'}
            {eurText(total)} entre 4, en {transfers.length} pagos.
          </T>
        </Animated.View>
        {/* The people who made it, popping in one after another once the words are in. */}
        <View style={styles.faces} importantForAccessibility="no-hide-descendants">
          {(['tu', 'ana', 'luis', 'marta'] as PersonId[]).map((id, i) => (
            <Animated.View key={id} entering={reduceMotion ? undefined : popIn(CLOSES_AT + 200 + i * 60)}>
              <Avatar id={id} size={48} bg={t.disc} inset />
            </Animated.View>
          ))}
        </View>
      </>
    );
    const actions = (
      <Animated.View entering={at(CLOSES_AT + 420)}>
        <Button label="Compartir resumen" icon="share" onPress={share} />
        <TextButton label="Ver el resumen del viaje" style={{ marginTop: 12 }} onPress={() => setSummary(true)} />
      </Animated.View>
    );
    // Open iPhone Duo (Figma «Duo abierto · 4.4»): the ring on the left; the words, the people and the buttons on the right.
    return (
      <Spread
        phone={
          // A short cross-fade from the last payment instead of a hard cut.
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(220)} style={{ flex: 1, backgroundColor: t.page, paddingTop: insets.top, paddingBottom: insets.bottom }}>
            <Aurora preset="zero" />
            <View style={{ paddingHorizontal: 20 }}>{close}</View>
            <View style={{ alignItems: 'center', paddingHorizontal: 20, marginTop: 16 }}>
              {ring}
              {words}
            </View>
            <View style={{ flex: 1 }} />
            <View style={{ paddingHorizontal: 20 }}>{actions}</View>
          </Animated.View>
        }
        left={
          <>
            {close}
            <View style={{ alignItems: 'center', marginTop: 50 }}>{ring}</View>
          </>
        }
        right={<View style={{ marginTop: 40 }}>{words}</View>}
        footer={actions}
      />
    );
  }

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
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: insets.bottom + 40 + (notice ? 64 : 0) }}>
        <Aurora preset="task" />
        <IconButton name="chevron-left" label="Volver" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        <T v="titleL" color={t.ink} style={{ marginTop: 16 }} accessibilityRole="header">
          Saldar cuentas
        </T>
        <T v="label" color={t.inkSoft} style={{ marginTop: 4 }}>
          {subtitle}
        </T>

        <View style={{ marginTop: 16, gap: 16 }}>
          {pending.map((x) => (
            <Animated.View key={transferKey(x)} entering={FadeInDown.duration(motion.standard)} exiting={FadeOut.duration(160)} layout={LinearTransition.duration(motion.standard)}>
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
                  <Button label="Marcar como pagado" height={48} onPress={() => pay(x)} />
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
                  <Animated.View key={transferKey(x)} entering={FadeIn.duration(motion.standard)}>
                    <View style={styles.paidRow}>
                      <Check color={t.lime} />
                      <T v="label" color={t.inkSoft} style={{ flex: 1 }}>
                        {people[x.from].name} → {people[x.to].name} · {eurText(x.amount)}
                      </T>
                      <Tap onPress={() => unmarkPaid(x)} accessibilityRole="button" accessibilityLabel={`Deshacer el pago de ${people[x.from].name}`} style={styles.quiet}>
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
            <Animated.View entering={FadeInDown.duration(motion.standard)} style={{ marginTop: -8 }}>
              <Card style={{ paddingVertical: 4 }}>
                {(['tu', 'luis', 'ana', 'marta'] as PersonId[]).map((id, i) => (
                  <View key={id}>
                    <View style={styles.line}>
                      <Avatar id={id} size={30} bg={t.disc} inset />
                      <T v="labelStrong" color={t.ink} style={{ flex: 1 }}>
                        {people[id].name}
                      </T>
                      <T v="titleXS" color={t.ink}>
                        {balances[id] >= 0 ? '+' : '−'}
                        {eurText(Math.abs(balances[id]))}
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
  const average = `en ${expenses.length} gastos · ${eurText(total / LISBOA_ORDER.length)} de media por persona`;
  const text = [
    'Lisboa 2026 · 12–18 nov · 4 personas',
    `${eurText(total)} ${average}`,
    'Lo que le tocó a cada uno:',
    ...LISBOA_ORDER.map((id) => `${people[id].name}: ${eurText(part[id])}`),
    `Saldado con ${payments} pagos · Zerow`,
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
                    {people[id].name}
                  </T>
                  <T v="titleXS" color={t.inkFixed}>
                    {eurText(part[id])}
                  </T>
                </View>
              ))}
              <T v="caption" color={t.inkMutedFixed}>
                Saldado con {payments} pagos · Zerow
              </T>
            </LimeCard>
          </View>
        </Animated.View>
      </ScrollView>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom }}>
        <Fade />
        <Button label="Compartir imagen" icon="share" onPress={shareImage} />
        <TextButton label={copied ? 'Copiado' : 'Copiar como texto'} style={{ marginTop: 12 }} onPress={copy} />
      </View>
    </View>
  );
}

/** Figma «Fundido»: the page fades in under the buttons at the bottom. */
function Fade() {
  const { t } = useTheme();
  return (
    <Svg pointerEvents="none" style={styles.fade} width="100%" height="100%">
      <Defs>
        <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.page} stopOpacity={0} />
          <Stop offset="0.6" stopColor={t.page} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#fade)" />
    </Svg>
  );
}

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** Fades in while rising `distance` pt, on a strong ease-out. */
const riseIn = (delay: number, distance: number) => () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: distance }] },
    animations: {
      opacity: withDelay(delay, withTiming(1, { duration: 320, easing: EASE_OUT })),
      transform: [{ translateY: withDelay(delay, withTiming(0, { duration: 420, easing: EASE_OUT })) }],
    },
  };
};
/** A face arriving: from 80 % and clear to full size, with a soft spring. */
const popIn = (delay: number) => () => {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.8 }] },
    animations: {
      opacity: withDelay(delay, withTiming(1, { duration: 200, easing: EASE_OUT })),
      transform: [{ scale: withDelay(delay, withSpring(1, { damping: 13, stiffness: 220 })) }],
    },
  };
};

/** «0,00 € pendientes»: it starts at the last payment and rolls down to zero as the ring closes. */
function ZeroAmount({ from }: { from: number }) {
  const { t } = useTheme();
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? 0 : from);
  useEffect(() => {
    if (reduce || !from) return;
    const id = setTimeout(() => setValue(0), 160);
    return () => clearTimeout(id);
  }, [from, reduce]);
  return <RollingMoney value={value} size={56} color={t.ink} />;
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
  const at = (ms: number) => FadeInDown.delay(ms).duration(motion.standard);
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

/** The paid check, 16 pt with Figma's heavier 2.25 stroke (2.5 on the «A cero» badge). */
function Check({ color, heavy }: { color: string; heavy?: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={heavy ? 3.75 : 3.375} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  lime: { borderRadius: 28, padding: 16, gap: 12 },
  glowLime: { borderRadius: 28, backgroundColor: '#B6F03A', shadowColor: '#B6F03A', shadowOpacity: 0.3, shadowRadius: 28, shadowOffset: { width: 0, height: 22 } },
  glowDark: { borderRadius: 28, backgroundColor: '#1E1E22', shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 9, shadowOffset: { width: 0, height: 8 } },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58 },
  quiet: { height: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  paidCard: { borderRadius: 28, paddingLeft: 16, paddingRight: 6 },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  balancesToggle: { height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  ringBox: { width: 256, height: 256, alignItems: 'center', justifyContent: 'center' },
  aCero: { fontSize: 52, lineHeight: 56, letterSpacing: -1.56 },
  faces: { flexDirection: 'row', gap: 8, marginTop: 28 },
  summary: { padding: 20, gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, borderRadius: 15, paddingHorizontal: 12 },
  share: { flexDirection: 'row', alignItems: 'center', height: 38 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 },
  notice: { position: 'absolute', left: 20, right: 20 },
  centred: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 64 },
  textButton: { height: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
});

// On the open iPhone Duo the group stays in view in the list pane (Figma «Resumen»).
export default function SettleUpRoute() {
  // «A cero» (4.4) is the big moment: it takes the whole screen, as a spread, not the detail pane.
  const { expenses, draft, paid } = useTrip();
  const transfers = settleUp(balancesFor(expenses));
  const settled = !draft && transfers.length > 0 && transfers.every((x) => paid.has(transferKey(x)));
  return (
    <SummaryPanes group="lisboa" off={settled}>
      <SettleUp />
    </SummaryPanes>
  );
}
