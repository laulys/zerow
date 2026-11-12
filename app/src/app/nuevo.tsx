import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { Aurora } from '../components/Aurora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandGradient } from '../components/BrandGradient';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';
import { Orb } from '../components/Orb';
import { Button, Card, IconButton, T, Tap } from '../components/ui';
import { interpret, missing, type Partial } from '../data/interpret';
import { balancesFor, eurText, people, useTrip, type Expense } from '../data/trip';
import { light, motion } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Msg = { id: number; from: 'me' | 'zerow'; text: string };

const examples = ['Pagué el tranvía de todos', 'Pagué la cena, 84 euros, entre todos', 'Pagué el taxi, 45 dólares, para Ana y para mí'];

// 3.5 Nuevo gasto: say or type what you paid. Zerow asks for what's missing instead
// of guessing, shows a skeleton while it prepares the draft, then the draft itself.
export default function NewExpense() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, addExpense, groups, groupExpenses, addToGroup } = useTrip();
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
  const [partial, setPartial] = useState<Partial>({});
  const [preparing, setPreparing] = useState(false);
  const [draft, setDraft] = useState<Expense | null>(null);
  const [saved, setSaved] = useState(false);
  const id = useRef(0);
  const input = useRef<TextInputInstance>(null);
  // 3.4 Dictando. There is no speech recognition in this build yet: while the
  // orb listens, the first example is written out word by word as a stand-in
  // for the transcript, and stopping sends it like any typed sentence.
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  useEffect(() => {
    if (!listening) return;
    const words = examples[0].split(' ');
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
  const scroll = useRef<ScrollViewInstance>(null);

  const say = (from: Msg['from'], body: string) => {
    setMessages((m) => [...m, { id: ++id.current, from, text: body }]);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  };

  const send = (raw?: string) => {
    const body = (raw ?? text).trim();
    if (!body || preparing) return;
    setText('');
    setDraft(null);
    setSaved(false);
    say('me', body);
    const next = interpret(body, partial);
    setPartial(next);
    const gap = missing(next);
    if (gap === 'title') return setTimeout(() => say('zerow', '¿Qué pagaste? Dime el concepto y el importe.'), 350);
    if (gap === 'amount') return setTimeout(() => say('zerow', '¿Cuánto fue? Prefiero preguntarte a adivinarlo.'), 350);
    setPreparing(true);
    setTimeout(() => {
      const e: Expense = {
        id: `n${Date.now()}`,
        title: next.title!,
        payer: 'tu',
        amountEur: next.amountEur!,
        originalUsd: next.originalUsd,
        splitWith: (next.splitWith ?? members).filter((p) => members.includes(p)),
      };
      if (!e.splitWith.length) e.splitWith = members;
      const before = balancesFor(ledger).tu;
      const after = balancesFor([e, ...ledger]).tu;
      setPreparing(false);
      setDraft(e);
      say('zerow', `Así quedas: te deberán ${eurText(after)} en vez de ${eurText(before)}.`);
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

  const confirm = () => {
    if (!draft) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (groupId === 'lisboa') addExpense(draft);
    else addToGroup(groupId, draft);
    setSaved(true);
    setPartial({});
    say('zerow', `Guardado en ${groupName}.`);
  };

  const discard = () => {
    setDraft(null);
    setPartial({});
    say('zerow', 'Descartado. No he guardado nada.');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: 16 }]}>
        <IconButton name="x" label="Cerrar" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        <View style={{ alignItems: 'center' }}>
          <T v="bodyStrong" color={t.ink}>
            Nuevo gasto
          </T>
          <Tap
            onPress={() => setPicking((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={`Grupo: ${groupName}. Cambiar`}
            accessibilityState={{ expanded: picking }}
            style={[styles.picker, { backgroundColor: t.glass }]}
          >
            <T v="caption" color={t.ink} style={{ fontWeight: '600' }}>
              {groupName}
            </T>
            <View style={{ transform: [{ rotate: picking ? '-90deg' : '90deg' }] }}>
              <Icon name="chevron-right" size={14} color={t.inkMuted} />
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
        <Animated.View entering={FadeIn.duration(motion.standard)} style={{ flex: 1, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 12) }}>
          <View pointerEvents="none" style={styles.listenGlow}>
            <Aurora height={360} strength={0.6} />
          </View>
          <T v="label" color={t.inkMuted} style={{ marginTop: 20 }}>
            Di qué pagaste, cuánto y para quién.
          </T>
          <T v="titleL" color={heard ? t.ink : t.inkMuted} style={{ marginTop: 12, minHeight: 68 }} accessibilityLiveRegion="polite">
            {heard || 'Te escucho…'}
          </T>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Orb size={112} state="listening" label="Zerow te escucha" />
            <T v="label" color={t.inkMuted} style={{ marginTop: 16 }}>
              Zerow te escucha…
            </T>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Tap onPress={stop} accessibilityRole="button" accessibilityLabel="Parar y enviar" style={[styles.stop, { backgroundColor: t.lime, shadowColor: t.lime }]}>
              <View style={[styles.stopSquare, { backgroundColor: t.onLime }]} />
            </Tap>
            <Tap onPress={write} accessibilityRole="button" accessibilityLabel="Escribir en vez de dictar" style={styles.write}>
              <Icon name="keyboard" size={20} color={t.ink} />
              <T v="labelStrong" color={t.ink}>
                Escribir
              </T>
            </Tap>
          </View>
        </Animated.View>
      ) : null}

      <ScrollView ref={scroll} style={listening && { display: 'none' }} contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 10 }} keyboardShouldPersistTaps="handled">
        {messages.length === 0 ? (
          <View>
            <T v="body" color={t.inkMuted}>
              Di qué pagaste, cuánto y para quién.
            </T>
            <T v="caption" color={t.inkMuted} style={{ marginTop: 24, marginBottom: 8 }}>
              Por ejemplo
            </T>
            {examples.map((ex) => (
              <Tap key={ex} onPress={() => send(ex)} accessibilityRole="button" style={[styles.example, { backgroundColor: t.surface }]}>
                <T v="label" color={t.ink}>
                  «{ex.replace(' euros', ' €')}»
                </T>
              </Tap>
            ))}
          </View>
        ) : null}

        {messages.map((m) => (
          <Animated.View key={m.id} entering={FadeInDown.duration(motion.standard)} style={{ alignItems: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
            {m.from === 'zerow' ? (
              <View style={styles.speaker}>
                <Orb size={16} />
                <T v="caption" color={t.inkMuted}>
                  Zerow
                </T>
              </View>
            ) : null}
            <View style={[styles.bubble, m.from === 'me' ? { backgroundColor: t.action, borderBottomRightRadius: 6 } : { backgroundColor: t.surface, borderBottomLeftRadius: 6 }]}>
              <T v="body" color={m.from === 'me' ? t.onAction : t.ink}>
                {m.text}
              </T>
            </View>
          </Animated.View>
        ))}

        {preparing ? (
          <Animated.View entering={FadeIn.duration(motion.standard)} exiting={FadeOut.duration(120)}>
            <Card bg={t.surface} style={{ gap: 12 }}>
              <Skel w={120} h={12} />
              <View style={styles.rowBetween}>
                <Skel w={150} h={20} />
                <Skel w={80} h={34} />
              </View>
              <Skel w={220} h={12} />
            </Card>
            <View style={[styles.speaker, { marginTop: 10 }]}>
              <Orb size={20} state="composing" label="Zerow está preparando el gasto" />
              <T v="caption" color={t.inkMuted}>
                Zerow está preparando el gasto…
              </T>
            </View>
          </Animated.View>
        ) : null}

        {draft ? (
          <Animated.View entering={FadeInDown.duration(motion.standard)}>
            {saved ? (
              <Card bg={t.surface}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="check" size={14} color={t.inkMuted} />
                  <T v="caption" color={t.inkMuted}>
                    Confirmado por ti
                  </T>
                </View>
                <View style={[styles.rowBetween, { marginTop: 8 }]}>
                  <T v="titleM" color={t.ink}>
                    {draft.title}
                  </T>
                  <Money value={draft.amountEur} size={32} color={t.ink} centsColor={t.inkMuted} />
                </View>
                <Button label={`Volver a ${groupName}`} height={48} style={{ marginTop: 14 }} onPress={() => router.back()} />
              </Card>
            ) : (
              <BrandGradient style={styles.draft} seed={9}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Orb size={18} onGradient />
                  <T v="caption" color={light.inkFixed}>
                    Por revisar · aún no cuenta
                  </T>
                </View>
                <View style={[styles.rowBetween, { marginTop: 10 }]}>
                  <T v="titleM" color={light.inkFixed}>
                    {draft.title}
                  </T>
                  <Money value={draft.amountEur} size={34} color={light.inkFixed} centsColor={light.inkMutedFixed} />
                </View>
                <T v="caption" color={light.inkMutedFixed} style={{ marginTop: 4 }}>
                  Pagaste tú · {eurText(draft.amountEur / draft.splitWith.length)} cada uno, entre{' '}
                  {draft.splitWith.length === members.length ? String(members.length) : draft.splitWith.map((p) => (p === 'tu' ? 'tú' : people[p].name)).join(' y ')}
                  {draft.originalUsd ? ` · ${draft.originalUsd.toFixed(2).replace('.', ',')} US$` : ''}
                </T>
                <View style={[styles.rowBetween, { marginTop: 16, gap: 8 }]}>
                  <Button label="No es así" kind="text" color={light.inkFixed} height={48} onPress={discard} style={{ paddingHorizontal: 12 }} />
                  <Button label="Sí, sumarlo" icon="check" kind="onGradient" height={48} onPress={confirm} style={{ flex: 1 }} />
                </View>
              </BrandGradient>
            )}
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={[styles.bar, { backgroundColor: t.panelRaised, marginBottom: Math.max(insets.bottom - 8, 12) }, listening && { display: 'none' }]}>
        <TextInput
          ref={input}
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => send()}
          placeholder={messages.length ? 'Responde o dicta…' : 'Cuéntame un gasto…'}
          placeholderTextColor={t.onPanelMuted}
          style={[styles.input, { color: t.onPanel }]}
          returnKeyType="send"
          accessibilityLabel="Cuéntame un gasto"
        />
        <Tap onPress={() => (text ? send() : listen())} accessibilityRole="button" accessibilityLabel={text ? 'Enviar' : 'Dictar'} style={[styles.send, { backgroundColor: t.lime }]}>
          <Icon name={text ? 'arrow-right' : 'mic'} size={22} color={t.inkFixed} />
        </Tap>
      </View>
    </KeyboardAvoidingView>
  );
}

function Skel({ w, h }: { w: number; h: number }) {
  const { t } = useTheme();
  return <View style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: t.line }} />;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  example: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, alignSelf: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listenGlow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 360, transform: [{ scaleY: -1 }] },
  stop: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  stopSquare: { width: 24, height: 24, borderRadius: 7 },
  write: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, marginTop: 12 },
  draft: { borderRadius: 28, padding: 16 },
  bar: { marginHorizontal: 20, height: 64, borderRadius: 32, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, gap: 10 },
  input: { flex: 1, fontSize: 17, height: 48 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingLeft: 12, paddingRight: 8, height: 32, borderRadius: 16 },
  menu: { marginHorizontal: 20, borderRadius: 20, paddingVertical: 4, marginBottom: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 16 },
  speaker: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 2 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
