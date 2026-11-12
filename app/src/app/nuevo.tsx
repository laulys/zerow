import { SummaryPanes } from '../components/Duo';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Aurora } from '../components/Aurora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandGradient } from '../components/BrandGradient';
import { Frost } from '../components/Frost';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';
import { Orb } from '../components/Orb';
import { Button, Card, Chip, IconButton, T, Tap } from '../components/ui';
import { interpret, missing, type Partial } from '../data/interpret';
import { balancesFor, eurText, people, useTrip, type Expense, type PersonId } from '../data/trip';
import { motion } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Msg = { id: number; from: 'me' | 'zerow'; text: string; unsure?: boolean };
type Heard = Partial & { payer?: PersonId };

// «Por ejemplo» (Figma 3.4, 3.4b): said the short way people say them.
const examples = ['Cena 80 euros, pagó Ana, entre todos', 'Taxi 45 dólares para Luis y para mí'];
// There is no speech recognition in this build yet: dictation writes this out word by word (3.4).
const spoken = 'Pagué el tranvía de todos';
// 6.6: when Zerow can't tell which expense it is, it offers its best guesses.
const guesses = [
  { label: 'La cena', says: 'Pagué la cena' },
  { label: 'El taxi', says: 'Pagué el taxi' },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// The local interpreter only reads «Pagué el…». This adds the short way («Cena 80
// euros, pagó Ana»): the words before the amount are the concept and «pagó Ana»
// says who paid. In Lisboa it names the tram as the agent does (the 28 is the trip's tram).
function understand(text: string, prev: Heard, group: string): Heard {
  const lower = text.toLowerCase();
  const out: Heard = { ...interpret(text, prev), payer: prev.payer };
  if (!/pagu[eé]/.test(lower)) {
    const lead = lower.replace(/pag[oó]\s+\S+\s*/, '').match(/^\s*(?:el|la|los|las|un|una)?\s*([a-záéíóúñü ]+?)\s+\d/);
    if (lead) out.title = cap(lead[1].trim());
  }
  const who = lower.match(/pag[oó]\s+(ana|luis|marta)/);
  if (who) out.payer = who[1] as PersonId;
  if (group === 'lisboa' && out.title === 'Tranvía') out.title = 'Tranvía 28';
  return out;
}

// «te deberán 45,23 €» before saving, «Te deben 45,23 €» once it's in.
const willBe = (n: number) => (n > 0 ? `te deberán ${eurText(n)}` : n < 0 ? `deberás ${eurText(-n)}` : 'quedarás a cero');
const nowIs = (n: number) => (n > 0 ? `Te deben ${eurText(n)}` : n < 0 ? `Debes ${eurText(-n)}` : 'Estás a cero');

// 3.4 Dictando → 3.5 the conversation → 3.6 Gasto sumado. Say or type what you paid;
// Zerow asks for what's missing instead of guessing (6.6), shows a skeleton while it
// prepares the draft (6.3), then the draft to review. Nothing counts until you confirm.
function NewExpense() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, addExpense, removeExpense, groups, groupExpenses, addToGroup } = useTrip();
  const params = useLocalSearchParams<{ grupo?: string; ejemplo?: string }>();
  const options = [{ id: 'lisboa', name: 'Lisboa 2026' }, { id: 'piso', name: 'Piso Calle Mayor' }, ...groups.map((g) => ({ id: g.id, name: g.name }))];
  const [groupId, setGroupId] = useState(options.some((o) => o.id === params.grupo) ? params.grupo! : 'lisboa');
  const [picking, setPicking] = useState(false);
  const groupName = options.find((o) => o.id === groupId)?.name ?? 'Lisboa 2026';
  const members =
    groupId === 'lisboa'
      ? (['tu', 'ana', 'luis', 'marta'] as Expense['splitWith'])
      : groupId === 'piso'
        ? (['tu', 'ana', 'luis'] as Expense['splitWith'])
        : (groups.find((g) => g.id === groupId)?.members ?? ['tu']);
  const ledger = groupId === 'lisboa' ? expenses : (groupExpenses[groupId] ?? []);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [partial, setPartial] = useState<Heard>({});
  const [preparing, setPreparing] = useState(false);
  const [draft, setDraft] = useState<Expense | null>(null);
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const id = useRef(0);
  // The message that tells you how you'd stand; it turns into «Sumado…» once you confirm (3.6).
  const standing = useRef(0);
  const input = useRef<TextInputInstance>(null);
  const scroll = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // 3.4 Dictando: the screen opens listening (the mic in the tab bar is «Dictar un gasto»),
  // except when it comes with an example to send.
  const [listening, setListening] = useState(!params.ejemplo);
  const [heard, setHeard] = useState('');
  useEffect(() => {
    if (!listening) return;
    const words = spoken.split(' ');
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setHeard(words.slice(0, i).join(' '));
      if (i >= words.length) clearInterval(timer);
    }, 320);
    return () => clearInterval(timer);
  }, [listening]);
  const listen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setHeard('');
    setPicking(false);
    setListening(true);
  };
  const stop = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setListening(false);
    if (heard) send(heard);
  };
  const write = () => {
    setListening(false);
    setTimeout(() => input.current?.focus(), 80);
  };

  const say = (from: Msg['from'], body: string, unsure?: boolean) => {
    const m = { id: ++id.current, from, text: body, unsure };
    setMessages((list) => [...list, m]);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return m.id;
  };

  // `said` is what shows in your bubble; `meant` what Zerow reads (a guess chip says «La cena»).
  const send = (said?: string, meant?: string) => {
    const body = (said ?? text).trim();
    if (!body || preparing) return;
    setListening(false);
    setText('');
    setDraft(null);
    setSaved(false);
    say('me', body);
    const next = understand(meant ?? body, partial, groupId);
    setPartial(next);
    const gap = missing(next);
    if (gap === 'title') return setTimeout(() => (next.amountEur === undefined ? say('zerow', 'No sé qué gasto es. ¿Qué pagaste y cuánto fue?', true) : say('zerow', '¿Qué pagaste?')), 350);
    if (gap === 'amount') return setTimeout(() => say('zerow', '¿Cuánto fue?'), 350);
    setPreparing(true);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    setTimeout(() => {
      const e: Expense = {
        id: `n${Date.now()}`,
        title: next.title!,
        payer: next.payer && members.includes(next.payer) ? next.payer : 'tu',
        amountEur: next.amountEur!,
        originalUsd: next.originalUsd,
        splitWith: (next.splitWith ?? members).filter((p) => members.includes(p)),
      };
      if (!e.splitWith.length) e.splitWith = members;
      const before = balancesFor(ledger).tu;
      const after = balancesFor([e, ...ledger]).tu;
      setPreparing(false);
      setDraft(e);
      const same = Math.sign(before) === Math.sign(after) && before !== 0;
      standing.current = say('zerow', `Así quedas: ${willBe(after)}${same ? ` en vez de ${eurText(Math.abs(before))}` : ''}.`);
    }, 900);
  };

  // Opened from a tapped example (6.5): send it as if the user had said it.
  const sentExample = useRef(false);
  useEffect(() => {
    if (!params.ejemplo || sentExample.current) return;
    sentExample.current = true;
    const id = setTimeout(() => send(params.ejemplo), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.ejemplo]);

  const rewrite = (msgId: number, body: string) => setMessages((list) => list.map((m) => (m.id === msgId ? { ...m, text: body } : m)));

  const confirm = () => {
    if (!draft) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (groupId === 'lisboa') addExpense(draft);
    else addToGroup(groupId, draft);
    setSaved(true);
    setPartial({});
    rewrite(standing.current, `Sumado. ${nowIs(balancesFor([draft, ...ledger]).tu)}.`);
  };

  // «Deshacer» on the notice (3.6): the expense goes back to being a draft to review.
  const undo = () => {
    if (!draft) return;
    removeExpense(groupId, draft.id);
    setSaved(false);
    const before = balancesFor(ledger.filter((e) => e.id !== draft.id)).tu;
    const after = balancesFor([draft, ...ledger.filter((e) => e.id !== draft.id)]).tu;
    const same = Math.sign(before) === Math.sign(after) && before !== 0;
    rewrite(standing.current, `Así quedas: ${willBe(after)}${same ? ` en vez de ${eurText(Math.abs(before))}` : ''}.`);
  };

  const discard = () => {
    setDraft(null);
    setPartial({});
    say('zerow', 'Descartado. No he guardado nada.');
  };

  const split = (e: Expense) => {
    const who = e.payer === 'tu' ? 'Pagaste tú' : `Pagó ${people[e.payer].name}`;
    const among = e.splitWith.length === members.length ? String(members.length) : e.splitWith.map((p) => (p === 'tu' ? 'tú' : people[p].name)).join(' y ');
    const usd = e.originalUsd ? ` · ${e.originalUsd.toFixed(2).replace('.', ',')} US$` : '';
    return `${who} · ${eurText(e.amountEur / e.splitWith.length)} cada uno, entre ${among}${usd}`;
  };

  const chat = messages.length > 0;
  const typing = focused || !!text;
  const last = messages[messages.length - 1];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {listening ? (
        // 3.4: the glow rises from the bottom while Zerow listens (Figma's 852 pt frame, pinned to the bottom of the sheet).
        <View pointerEvents="none" style={styles.listenGlow}>
          <Aurora preset="dictation" />
        </View>
      ) : chat ? (
        <Aurora preset="task" />
      ) : null}

      {/* Full screen (Figma 3.4–3.6): the header row sits at the top inset. */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <IconButton name="x" label="Cerrar" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
          <T v="section" color={t.ink} accessibilityRole="header">
            Nuevo gasto
          </T>
          <Tap
            onPress={() => setPicking((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={`Grupo: ${groupName}. Cambiar`}
            accessibilityState={{ expanded: picking }}
            style={[styles.picker, { borderColor: t.controlStroke }]}
          >
            <Frost fill={t.control} radius={22} intensity={16} />
            <T v="labelStrong" color={t.ink}>
              {groupName}
            </T>
            <View style={{ transform: [{ rotate: picking ? '-90deg' : '90deg' }] }}>
              <Icon name="chevron-right" size={16} color={t.inkSoft} />
            </View>
          </Tap>
        </View>
        <View style={{ width: 44 }} />
      </View>
      {picking ? (
        <Animated.View entering={FadeInDown.duration(motion.standard)} exiting={FadeOut.duration(120)} style={[styles.menu, { backgroundColor: t.panelRaised }]}>
          {options.map((o) => (
            <Tap
              key={o.id}
              onPress={() => {
                setPicking(false);
                if (o.id === groupId) return;
                setGroupId(o.id);
                if (draft && !saved) {
                  setDraft(null);
                  setPartial({});
                  say('zerow', `Ahora apunto en ${o.name}. Repíteme el gasto y lo preparo allí para que lo revises.`);
                }
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: o.id === groupId }}
              style={styles.menuRow}
            >
              <T v="bodyStrong" color={t.ink} style={{ flex: 1 }}>
                {o.name}
              </T>
              {o.id === groupId ? <Icon name="check" size={18} color={t.lime} /> : null}
            </Tap>
          ))}
        </Animated.View>
      ) : null}

      {listening ? (
        <Animated.View entering={FadeIn.duration(motion.standard)} style={{ flex: 1, paddingHorizontal: 20, paddingBottom: insets.bottom }}>
          <T v="label" color={t.inkMuted} style={{ marginTop: 21 }}>
            Di qué pagaste, cuánto y para quién.
          </T>
          <T v="titleL" color={heard ? t.ink : t.inkMuted} style={{ marginTop: 12, minHeight: 68 }} accessibilityLiveRegion="polite">
            {heard || 'Te escucho…'}
          </T>
          <Examples style={{ marginTop: 64 }} onPick={(ex) => send(ex)} />
          <View style={{ flex: 1 }} />
          <View style={{ alignItems: 'center' }}>
            <Orb size={112} state="listening" label="Zerow te escucha" />
            <T v="label" color={t.inkSoft} style={{ marginTop: 12 }}>
              Zerow te escucha…
            </T>
            <Tap onPress={stop} accessibilityRole="button" accessibilityLabel="Parar y enviar" style={[styles.stop, { backgroundColor: t.lime, shadowColor: t.lime }]}>
              <View style={[styles.stopSquare, { backgroundColor: t.inkFixed }]} />
            </Tap>
            <Tap onPress={write} accessibilityRole="button" accessibilityLabel="Escribir en vez de dictar" style={styles.write}>
              <Icon name="keyboard" size={20} color={t.ink} />
              <T v="labelStrong" color={t.ink}>
                Escribir
              </T>
            </Tap>
          </View>
        </Animated.View>
      ) : (
        <>
          <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: chat ? 17 : 21, paddingBottom: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
            {!chat ? (
              // 3.4b Escribiendo.
              <View style={{ gap: 12 }}>
                <T v="label" color={t.inkMuted}>
                  Escribe qué pagaste, cuánto y para quién.
                </T>
                <Examples onPick={(ex) => send(ex)} />
              </View>
            ) : null}

            {messages.map((m) => (
              <Animated.View key={m.id} entering={FadeInDown.duration(motion.standard)} style={{ gap: 12 }}>
                {m.from === 'zerow' ? <Speaker /> : null}
                <View style={[styles.bubble, m.from === 'me' ? { alignSelf: 'flex-end', backgroundColor: t.lime } : { alignSelf: 'flex-start', backgroundColor: t.panelRaised }]}>
                  <T v="body" color={m.from === 'me' ? t.inkFixed : t.ink}>
                    {m.text}
                  </T>
                </View>
                {m.unsure && m === last && !preparing ? (
                  // 6.6: its best guesses, or typing it in yourself.
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {guesses.map((g) => (
                      <Chip key={g.label} label={g.label} onPress={() => send(g.label, g.says)} />
                    ))}
                    <Chip label="Añadirlo a mano" onPress={() => input.current?.focus()} />
                  </View>
                ) : null}
              </Animated.View>
            ))}

            {preparing ? (
              // 6.3: what Zerow is doing, and the shape of the card that's coming.
              <Animated.View entering={FadeIn.duration(motion.standard)} exiting={FadeOut.duration(120)} style={{ gap: 12 }}>
                <Speaker />
                <View style={[styles.bubble, styles.preparing, { backgroundColor: t.panelRaised }]}>
                  <Orb size={20} state="composing" label="Zerow está preparando el gasto" />
                  <T v="body" color={t.inkSoft}>
                    Preparando el gasto…
                  </T>
                </View>
                <Card style={{ gap: 12 }}>
                  <Skel w={170} h={14} r={8} />
                  <View style={styles.rowBetween}>
                    <Skel w={130} h={24} r={8} />
                    <Skel w={90} h={34} r={12} />
                  </View>
                  <Skel w={220} h={14} r={8} />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <Skel w={110} h={48} r={24} />
                    <Skel h={48} r={24} />
                  </View>
                </Card>
              </Animated.View>
            ) : null}

            {draft ? (
              <Animated.View entering={FadeInDown.duration(motion.standard)}>
                {saved ? (
                  // 3.6 Gasto sumado.
                  <Card style={{ gap: 12 }}>
                    <View style={styles.status}>
                      <Check color={t.lime} />
                      <T v="caption" color={t.inkMuted} style={{ fontWeight: '600' }}>
                        Sumado por ti
                      </T>
                    </View>
                    <View style={[styles.rowBetween, { alignItems: 'flex-end' }]}>
                      <T v="titleM" color={t.ink} style={{ flex: 1 }}>
                        {draft.title}
                      </T>
                      <Money value={draft.amountEur} size={36} color={t.ink} />
                    </View>
                    <T v="label" color={t.inkMuted}>
                      {split(draft)}
                    </T>
                  </Card>
                ) : (
                  // 3.5 Gasto por revisar.
                  <LimeCard>
                    <View style={styles.status}>
                      <Sparkle color={t.inkFixed} />
                      <T v="caption" color={t.inkMutedFixed} style={{ fontWeight: '600' }}>
                        Por revisar · aún no cuenta
                      </T>
                    </View>
                    <View style={[styles.rowBetween, { alignItems: 'flex-end' }]}>
                      <T v="titleM" color={t.inkFixed} style={{ flex: 1 }}>
                        {draft.title}
                      </T>
                      <Money value={draft.amountEur} size={36} color={t.inkFixed} />
                    </View>
                    <T v="label" color={t.inkMutedFixed} style={{ fontWeight: '500' }}>
                      {split(draft)}
                    </T>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Button label="No es así" kind="onGradientSoft" height={48} onPress={discard} />
                      <Button label="Sí, sumarlo" icon="check" iconColor={t.lime} kind="onGradient" height={48} onPress={confirm} style={{ flex: 1 }} />
                    </View>
                  </LimeCard>
                )}
              </Animated.View>
            ) : null}
          </ScrollView>

          <View style={{ paddingHorizontal: 20, paddingBottom: keyboard ? 8 : Math.max(insets.bottom - 12, 12) }}>
            {chat ? (
              // Figma «Fundido»: the conversation fades into the page under the bar.
              <Svg pointerEvents="none" style={styles.fade} width="100%" height="100%">
                <Defs>
                  <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={t.page} stopOpacity={0} />
                    <Stop offset="0.6" stopColor={t.page} stopOpacity={1} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#fade)" />
              </Svg>
            ) : null}
            {saved && draft ? (
              <Animated.View entering={FadeInDown.duration(motion.standard)} exiting={FadeOut.duration(120)} style={styles.notice}>
                <Frost fill={t.glass} radius={24} intensity={20} />
                <T v="label" color={t.ink} style={{ flex: 1, fontWeight: '500' }}>
                  Sumado en {groupName}
                </T>
                <Tap onPress={undo} accessibilityRole="button" accessibilityLabel={`Deshacer: quitar ${draft.title}`} style={[styles.undo, { backgroundColor: t.glass }]}>
                  <Icon name="undo" size={16} color={t.ink} />
                  <T v="labelStrong" color={t.ink}>
                    Deshacer
                  </T>
                </Tap>
              </Animated.View>
            ) : null}
            <View style={[styles.bar, typing && styles.barTyping]}>
              <Frost fill={t.glass} radius={typing ? 28 : 30} intensity={20} />
              <TextInput
                ref={input}
                value={text}
                onChangeText={setText}
                onSubmitEditing={() => send()}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={saved ? 'Cuéntame otro gasto…' : chat ? 'Responde o dicta…' : 'Cuéntame un gasto…'}
                placeholderTextColor={t.inkSoft}
                selectionColor={t.lime}
                style={[styles.input, { color: t.ink, marginRight: typing ? 0 : 12 }]}
                returnKeyType="send"
                accessibilityLabel="Cuéntame un gasto"
              />
              {typing ? (
                // 3.4b: dictate instead, or send what you wrote.
                <>
                  <Tap onPress={listen} accessibilityRole="button" accessibilityLabel="Dictar" style={styles.round}>
                    <Icon name="mic" size={24} color={t.inkSoft} />
                  </Tap>
                  <Tap onPress={() => send()} accessibilityRole="button" accessibilityLabel="Enviar" style={[styles.round, { backgroundColor: t.lime }]}>
                    <ArrowUp color={t.inkFixed} />
                  </Tap>
                </>
              ) : (
                <>
                  <Tap onPress={() => input.current?.focus()} accessibilityRole="button" accessibilityLabel="Escribir" hitSlop={10} style={{ marginRight: 12 }}>
                    <Icon name="keyboard" size={24} color={t.inkSoft} />
                  </Tap>
                  <Tap onPress={listen} accessibilityRole="button" accessibilityLabel="Dictar" style={styles.micGlow}>
                    <BrandGradient style={styles.mic} seed={5}>
                      <Icon name="mic" size={24} color={t.inkFixed} />
                    </BrandGradient>
                  </Tap>
                </>
              )}
            </View>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

/** «Por ejemplo» and the example chips (3.4, 3.4b). Tapping one sends it. */
function Examples({ onPick, style }: { onPick: (example: string) => void; style?: object }) {
  const { t } = useTheme();
  return (
    <View style={[{ gap: 12, alignItems: 'flex-start' }, style]}>
      <T v="caption" color={t.inkMuted} style={{ fontWeight: '600' }}>
        Por ejemplo
      </T>
      {examples.map((ex) => (
        <Chip key={ex} label={`«${ex}»`} onPress={() => onPick(ex)} />
      ))}
    </View>
  );
}

/** Who's talking: Zerow's orb and its name above each of its messages. */
function Speaker() {
  const { t } = useTheme();
  return (
    <View style={styles.status}>
      <Orb size={18} />
      <T v="caption" color={t.inkMuted}>
        Zerow
      </T>
    </View>
  );
}

/** Figma's lime glow under the cards on the gradient (#B6F03A 30 %, blur 56, 22 down, over black 40 %, blur 18, 8 down). */
function LimeCard({ children }: { children: ReactNode }) {
  return (
    <View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glowLime]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glowDark]} />
      <BrandGradient style={styles.draft} seed={9}>
        {children}
      </BrandGradient>
    </View>
  );
}

function Skel({ w, h, r }: { w?: number; h: number; r: number }) {
  return <View style={{ width: w, flex: w ? undefined : 1, height: h, borderRadius: r, backgroundColor: 'rgba(255,255,255,0.08)' }} />;
}

/** Figma «Destello»: the four-point star of «Por revisar». */
function Sparkle({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Path d="M7 0 L8.58 5.42 L14 7 L8.58 8.58 L7 14 L5.42 8.58 L0 7 L5.42 5.42 Z" fill={color} />
    </Svg>
  );
}

/** The check of «Sumado por ti», 16 pt with Figma's heavier 2.25 stroke. */
function Check({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3.375} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

/** Lucide arrow-up at 20 pt with a 2 pt stroke (the send button, 3.4b). */
function ArrowUp({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m5 12 7-7 7 7" />
      <Path d="M12 19V5" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 22, borderWidth: 1, paddingLeft: 16, paddingRight: 12 },
  menu: { marginHorizontal: 20, marginTop: 8, borderRadius: 20, paddingVertical: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 16 },
  listenGlow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 852, overflow: 'hidden' },
  stop: { width: 72, height: 72, borderRadius: 36, marginTop: 36, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.22, shadowRadius: 11, shadowOffset: { width: 0, height: 6 } },
  stopSquare: { width: 22, height: 22, borderRadius: 6 },
  write: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, marginTop: 12 },
  bubble: { maxWidth: '80%', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 },
  preparing: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  draft: { borderRadius: 28, padding: 16, gap: 12 },
  glowLime: { borderRadius: 28, backgroundColor: '#B6F03A', shadowColor: '#B6F03A', shadowOpacity: 0.3, shadowRadius: 28, shadowOffset: { width: 0, height: 22 } },
  glowDark: { borderRadius: 28, backgroundColor: '#1E1E22', shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 9, shadowOffset: { width: 0, height: 8 } },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 126 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 48, borderRadius: 24, paddingLeft: 16, paddingRight: 6, marginBottom: 16 },
  undo: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 22, paddingLeft: 12, paddingRight: 16 },
  bar: { height: 60, borderRadius: 30, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 6 },
  barTyping: { height: 56, borderRadius: 28, gap: 8 },
  input: { flex: 1, fontSize: 17, height: 48 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  micGlow: { borderRadius: 24, shadowColor: '#B6F03A', shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 5 } },
  mic: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});

// On the open iPhone Duo the group stays in view in the list pane (Figma «Resumen»).
export default function NewExpenseRoute() {
  return (
    <SummaryPanes group={useLocalSearchParams<{ grupo?: string }>().grupo ?? 'lisboa'}>
      <NewExpense />
    </SummaryPanes>
  );
}
