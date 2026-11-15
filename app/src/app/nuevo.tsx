import { SummaryPanes } from '../components/Duo';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Aurora } from '../components/Aurora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomFade } from '../components/BottomFade';
import { BrandGradient } from '../components/BrandGradient';
import { Frost } from '../components/Frost';
import { EASE, recede, surface } from '../components/motion';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';
import { Orb } from '../components/Orb';
import { Sparkle } from '../components/Sparkle';
import { Check } from '../components/Check';
import { announce } from '../components/announce';
import { Button, Card, Chip, IconButton, T, Tap, type } from '../components/ui';
import { interpret, missing, type Partial } from '../data/interpret';
import { balancesFor, eurText, nameList, people, plural, useTrip, type Expense, type PersonId } from '../data/trip';
import { aurora, motion } from '../theme/tokens';
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
    const lead = lower.replace(/pag[oó]\s+\S+\s*/, '').match(/^\s*(?:(?:el|la|los|las|un|una|unos|unas)\s+)?([a-záéíóúñü ]+?)\s+\d/);
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
  const { expenses, addExpense, removeExpense, groups, groupExpenses, addToGroup, ask } = useTrip();
  const params = useLocalSearchParams<{ grupo?: string; ejemplo?: string; editar?: string }>();
  const options = [{ id: 'lisboa', name: 'Lisboa 2026', people: 4 }, { id: 'piso', name: 'Piso Calle Mayor', people: 3 }, ...groups.map((g) => ({ id: g.id, name: g.name, people: g.members.length }))];
  const [groupId, setGroupId] = useState(options.some((o) => o.id === params.grupo) ? params.grupo! : 'lisboa');
  const [picking, setPicking] = useState(false);
  const [menuTop, setMenuTop] = useState(0);
  const reduceMotion = useReducedMotion();
  const groupName = options.find((o) => o.id === groupId)?.name ?? 'Lisboa 2026';
  const members =
    groupId === 'lisboa'
      ? (['tu', 'ana', 'luis', 'marta'] as Expense['splitWith'])
      : groupId === 'piso'
        ? (['tu', 'ana', 'luis'] as Expense['splitWith'])
        : (groups.find((g) => g.id === groupId)?.members ?? ['tu']);
  const all = groupId === 'lisboa' ? expenses : (groupExpenses[groupId] ?? []);
  // Editing (from «Editar» on an expense): you say what changes and the new version takes the old one's place.
  const [editing] = useState(() => all.find((e) => e.id === params.editar) ?? null);
  const ledger = editing ? all.filter((e) => e.id !== editing.id) : all;
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
  const [listening, setListening] = useState(!params.ejemplo && !params.editar);
  const [heard, setHeard] = useState('');
  // Words arrive at the pace of speech: a short pause before the first one, then
  // longer words take a little longer, like live dictation.
  useEffect(() => {
    if (!listening) return;
    const words = spoken.split(' ');
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 450;
    words.forEach((w, i) => {
      timers.push(setTimeout(() => setHeard(words.slice(0, i + 1).join(' ')), at));
      at += 150 + w.length * 28;
    });
    return () => timers.forEach(clearTimeout);
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
    // VoiceOver hears Zerow answer (your own bubble is what you just said).
    if (from !== 'me') announce(body);
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
    // Connected to the engine, a new expense in Lisboa goes to the real agent: it answers and may
    // propose the card. (Editing stays local: you say what changes and the card is rebuilt here.)
    if (ask && groupId === 'lisboa' && !editing) {
      setPreparing(true);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
      ask(meant ?? body)
        .then(({ reply, draft: proposed }) => {
          setPreparing(false);
          if (proposed) setDraft(proposed);
          const said = say('zerow', reply);
          if (proposed) standing.current = said;
        })
        .catch(() => {
          setPreparing(false);
          say('zerow', 'Ahora no puedo hablar con Zerow. Inténtalo de nuevo en un momento.');
        });
      return;
    }
    const next = understand(meant ?? body, partial, groupId);
    setPartial(next);
    const gap = missing(next);
    if (gap === 'title') return setTimeout(() => (next.amountEur === undefined ? say('zerow', 'No sé qué gasto es. ¿Qué pagaste y cuánto fue?', true) : say('zerow', '¿Qué pagaste?')), 350);
    if (gap === 'amount') return setTimeout(() => say('zerow', '¿Cuánto fue?'), 350);
    setPreparing(true);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    setTimeout(() => {
      const e: Expense = {
        id: editing ? editing.id : `n${Date.now()}`,
        // Editing «Cena en Bairro Alto» by saying «la cena, 150 euros» keeps its full name (and its note).
        title: editing && editing.title.toLowerCase().includes(next.title!.toLowerCase()) ? editing.title : next.title!,
        note: editing?.note,
        payer: next.payer && members.includes(next.payer) ? next.payer : 'tu',
        amountEur: next.amountEur!,
        originalUsd: next.originalUsd,
        splitWith: (next.splitWith ?? members).filter((p) => members.includes(p)),
      };
      if (!e.splitWith.length) e.splitWith = members;
      const before = balancesFor(all).tu;
      const after = balancesFor([e, ...ledger]).tu;
      setPreparing(false);
      setDraft(e);
      const same = Math.sign(before) === Math.sign(after) && before !== 0;
      standing.current = say('zerow', `Así quedas: ${willBe(after)}${same ? ` en vez de ${eurText(Math.abs(before))}` : ''}.`);
    }, 900);
  };

  // Editing opens on the conversation, with Zerow asking what changes.
  const asked = useRef(false);
  useEffect(() => {
    if (!editing || asked.current) return;
    asked.current = true;
    say('zerow', `Dime qué cambia de «${editing.title}»: el importe, quién pagó o entre quiénes.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opened from a tapped example (6.5): send it as if the user had said it.
  const sentExample = useRef(false);
  useEffect(() => {
    if (!params.ejemplo || sentExample.current) return;
    sentExample.current = true;
    const id = setTimeout(() => send(params.ejemplo), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.ejemplo]);

  const rewrite = (msgId: number, body: string) => {
    announce(body);
    setMessages((list) => list.map((m) => (m.id === msgId ? { ...m, text: body } : m)));
  };

  const confirm = () => {
    if (!draft) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editing) removeExpense(groupId, editing.id);
    if (groupId === 'lisboa') addExpense(draft);
    else addToGroup(groupId, draft);
    setSaved(true);
    setPartial({});
    rewrite(standing.current, `${editing ? 'Cambiado' : 'Sumado'}. ${nowIs(balancesFor([draft, ...ledger]).tu)}.`);
  };

  // «Deshacer» on the notice (3.6): the expense goes back to being a draft to review.
  const undo = () => {
    if (!draft) return;
    removeExpense(groupId, draft.id);
    // Undoing an edit puts the expense back as it was.
    if (editing) (groupId === 'lisboa' ? addExpense : (e: Expense) => addToGroup(groupId, e))(editing);
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
    const among = e.splitWith.length === members.length ? String(members.length) : nameList(e.splitWith);
    const usd = e.originalUsd ? ` · ${e.originalUsd.toFixed(2).replace('.', ',')}\u00A0US$` : '';
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
      <View style={[styles.header, { paddingTop: insets.top }]} onLayout={(e) => setMenuTop(e.nativeEvent.layout.y + e.nativeEvent.layout.height + 8)}>
        <IconButton name="x" label="Cerrar" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        {/* The title is centred on the close button's 44 pt row; the group pill sits 12 under it. */}
        <View style={{ flex: 1, alignItems: 'center', gap: 12 }}>
          <View style={styles.titleRow}>
            <T v="section" color={t.ink} accessibilityRole="header">
              {editing ? 'Editar gasto' : 'Nuevo gasto'}
            </T>
          </View>
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
            <Turn open={picking}>
              <Icon name="chevron-right" size={16} color={t.inkSoft} />
            </Turn>
          </Tap>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {listening ? (
        <Animated.View entering={FadeIn.duration(motion.standard)} style={{ flex: 1, paddingHorizontal: 20, paddingBottom: insets.bottom }}>
          <T v="label" color={t.inkMuted} style={{ marginTop: 28 }}>
            Di qué pagaste, cuánto y para quién.
          </T>
          <LiveWords text={spoken} count={heard ? heard.split(' ').length : 0} />
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
          <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: chat ? 20 : 28, paddingBottom: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
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
              <BottomFade style={styles.fade} />
            ) : null}
            {saved && draft ? (
              <Animated.View entering={FadeInDown.duration(motion.standard)} exiting={FadeOut.duration(120)} style={styles.notice}>
                <Frost fill={t.glass} radius={24} intensity={20} />
                <T v="label" color={t.ink} style={{ flex: 1, fontWeight: '500' }}>
                  {editing ? 'Cambiado en' : 'Sumado en'} {groupName}
                </T>
                <Tap onPress={undo} accessibilityRole="button" accessibilityLabel={`Deshacer: quitar ${draft.title}`} style={styles.undo}>
                  <Icon name="undo" size={16} color={t.lime} />
                  <T v="labelStrong" color={t.lime}>
                    Deshacer
                  </T>
                </Tap>
              </Animated.View>
            ) : null}
            <View style={[styles.bar, typing && styles.barTyping]}>
              <Frost fill={t.glass} radius={typing ? 28 : 30} intensity={20} />
              <TextInput
                maxFontSizeMultiplier={2}
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

      {picking ? (
        <>
          {/* Tapping anywhere else closes the menu, as on iOS. */}
          <Tap onPress={() => setPicking(false)} accessibilityRole="button" accessibilityLabel="Cerrar el menú" style={StyleSheet.absoluteFill}>
            {null}
          </Tap>
          {/* A glass menu that floats over the conversation and grows out of the pill above it. */}
          <Animated.View entering={surface(reduceMotion)} exiting={recede(reduceMotion, 140)} style={[styles.menu, { top: menuTop }]}>
            {/* Dark glass, like an iOS menu: what's behind shows through as a blurred wash, never through the words. */}
            <Frost fill="rgba(34,34,38,0.84)" radius={24} intensity={60} />
            {options.map((o, i) => (
              <View key={o.id}>
                {i > 0 ? <View style={[styles.menuLine, { backgroundColor: t.hairline }]} /> : null}
                <Tap
                  highlight
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
                  accessibilityLabel={`${o.name}, ${plural(o.people, 'persona')}`}
                  style={styles.menuRow}
                >
                  <View style={{ flex: 1 }}>
                    <T v="bodyStrong" color={t.ink} numberOfLines={1}>
                      {o.name}
                    </T>
                    <T v="caption" color={t.inkMuted}>
                      {plural(o.people, 'persona')}
                    </T>
                  </View>
                  {o.id === groupId ? <Icon name="check" size={18} color={t.lime} /> : null}
                </Tap>
              </View>
            ))}
          </Animated.View>
        </>
      ) : null}
    </KeyboardAvoidingView>
  );
}

/** The pill's chevron turns towards the menu instead of flipping. */
function Turn({ open, children }: { open: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();
  const turn = useSharedValue(open ? -90 : 90);
  useEffect(() => {
    turn.value = reduce ? (open ? -90 : 90) : withTiming(open ? -90 : 90, { duration: motion.standard, easing: EASE });
  }, [open, reduce, turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
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
  liveWords: { flexDirection: 'row', flexWrap: 'wrap' },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16 },
  titleRow: { height: 44, justifyContent: 'center' },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderRadius: 22, borderWidth: 1, paddingLeft: 16, paddingRight: 12 },
  // iOS-style menu: 280 wide under the pill, glass with a white 8 % edge and a soft shadow.
  menu: {
    position: 'absolute',
    alignSelf: 'center',
    width: 280,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    transformOrigin: 'top',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 8 },
  menuLine: { height: 1, marginHorizontal: 8 },
  listenGlow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 852, overflow: 'hidden' },
  stop: { width: 72, height: 72, borderRadius: 36, marginTop: 36, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.22, shadowRadius: 11, shadowOffset: { width: 0, height: 6 } },
  stopSquare: { width: 22, height: 22, borderRadius: 6 },
  write: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, marginTop: 12 },
  bubble: { maxWidth: '80%', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10 },
  preparing: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  draft: { borderRadius: 28, padding: 16, gap: 12 },
  glowLime: { borderRadius: 28, backgroundColor: aurora.glow, shadowColor: aurora.glow, shadowOpacity: 0.3, shadowRadius: 28, shadowOffset: { width: 0, height: 22 } },
  glowDark: { borderRadius: 28, backgroundColor: '#1E1E22', shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 9, shadowOffset: { width: 0, height: 8 } },
  fade: { height: 126 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 48, borderRadius: 24, paddingLeft: 16, paddingRight: 4, marginBottom: 16 },
  // A lime text button, like the notice on Lisboa (3.2): no pill squeezed into the 48 pt notice.
  undo: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 12 },
  bar: { height: 60, borderRadius: 30, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 6 },
  barTyping: { height: 56, borderRadius: 28, gap: 8 },
  input: { flex: 1, fontSize: 17, height: 48 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  micGlow: { borderRadius: 24, shadowColor: aurora.glow, shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 5 } },
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

/**
 * The dictated sentence, word by word. The whole sentence is laid out from the
 * start (invisible), so lines never re-wrap as words arrive; each word then
 * fades in and rises 6 pt on a soft ease-out. Instant with Reduce Motion.
 */
function LiveWords({ text, count }: { text: string; count: number }) {
  const words = text.split(' ');
  return (
    <View style={{ marginTop: 12, minHeight: 68 }} accessible accessibilityLiveRegion="polite" accessibilityLabel={count ? words.slice(0, count).join(' ') : 'Zerow te escucha'}>
      <View style={styles.liveWords}>
        {words.map((w, i) => (
          <LiveWord key={i} word={w} shown={i < count} last={i === words.length - 1} delay={i === 0 ? 120 : 0} />
        ))}
      </View>
    </View>
  );
}

function LiveWord({ word, shown, last, delay }: { word: string; shown: boolean; last: boolean; delay: number }) {
  const { t } = useTheme();
  const reduce = useReducedMotion();
  const p = useSharedValue(shown ? 1 : 0);
  useEffect(() => {
    const to = shown ? 1 : 0;
    // The first word arrives a beat after the orb starts listening.
    p.value = reduce || !shown ? to : withDelay(delay, withTiming(1, { duration: 380, easing: Easing.bezier(0.23, 1, 0.32, 1) }));
  }, [shown, reduce, p, delay]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: 2 + (1 - p.value) * 6 }] })); // +2: titleL's own nudge
  return (
    <Animated.Text style={[type.titleL, { color: t.ink }, style]} maxFontSizeMultiplier={1.3} importantForAccessibility="no">
      {word}
      {last ? '' : ' '}
    </Animated.Text>
  );
}
