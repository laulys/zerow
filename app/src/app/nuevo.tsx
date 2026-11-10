import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandGradient } from '../components/BrandGradient';
import { Icon } from '../components/Icon';
import { Money } from '../components/Money';
import { Button, Card, IconButton, T, Tap } from '../components/ui';
import { interpret, missing, type Partial } from '../data/interpret';
import { balancesFor, eurText, people, useTrip, type Expense } from '../data/trip';
import { font, light, motion } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Msg = { id: number; from: 'me' | 'zerow'; text: string };

const examples = ['Pagué el tranvía de todos', 'Pagué la cena, 84 euros, entre todos', 'Pagué el taxi, 45 dólares, para Ana y para mí'];

// 3.5 Nuevo gasto: say or type what you paid. Zerow asks for what's missing instead
// of guessing, shows a skeleton while it prepares the draft, then the draft itself.
export default function NewExpense() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, addExpense } = useTrip();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [partial, setPartial] = useState<Partial>({});
  const [preparing, setPreparing] = useState(false);
  const [draft, setDraft] = useState<Expense | null>(null);
  const [saved, setSaved] = useState(false);
  const id = useRef(0);
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
      const e: Expense = { id: `n${Date.now()}`, title: next.title!, payer: 'tu', amountEur: next.amountEur!, originalUsd: next.originalUsd, splitWith: next.splitWith ?? ['tu', 'ana', 'luis', 'marta'] };
      const before = balancesFor(expenses).tu;
      const after = balancesFor([e, ...expenses]).tu;
      setPreparing(false);
      setDraft(e);
      say('zerow', `Así quedas: te deberán ${eurText(after)} en vez de ${eurText(before)}.`);
    }, 900);
  };

  const confirm = () => {
    if (!draft) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addExpense(draft);
    setSaved(true);
    setPartial({});
    say('zerow', `Guardado en Lisboa 2026.`);
  };

  const discard = () => {
    setDraft(null);
    setPartial({});
    say('zerow', 'Descartado. No he guardado nada.');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: 16 }]}>
        <IconButton name="x" label="Cerrar" bg={t.surface} color={t.ink} onPress={() => router.back()} />
        <View style={{ alignItems: 'center' }}>
          <T v="bodyStrong" color={t.ink}>
            Nuevo gasto
          </T>
          <T v="caption" color={t.inkMuted}>
            Lisboa 2026
          </T>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 10 }} keyboardShouldPersistTaps="handled">
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
                  «{ex}»
                </T>
              </Tap>
            ))}
          </View>
        ) : null}

        {messages.map((m) => (
          <Animated.View key={m.id} entering={FadeInDown.duration(motion.standard)} style={{ alignItems: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
            {m.from === 'zerow' ? (
              <T v="caption" color={t.inkMuted} style={{ marginBottom: 4, marginLeft: 4 }}>
                Zerow
              </T>
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
            <T v="caption" color={t.inkMuted} style={{ marginTop: 8 }}>
              Preparando el borrador…
            </T>
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
                <Button label="Volver a Lisboa" height={48} style={{ marginTop: 14 }} onPress={() => router.back()} />
              </Card>
            ) : (
              <BrandGradient style={styles.draft} seed={9}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Icon name="pen" size={14} color={light.inkFixed} />
                  <T v="caption" color={light.inkFixed}>
                    Borrador: aún no cuenta
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
                  {draft.splitWith.length === 4 ? '4' : draft.splitWith.map((p) => (p === 'tu' ? 'tú' : people[p].name)).join(' y ')}
                  {draft.originalUsd ? ` · ${draft.originalUsd.toFixed(2).replace('.', ',')} US$` : ''}
                </T>
                <View style={[styles.rowBetween, { marginTop: 16, gap: 8 }]}>
                  <Button label="Descartar" kind="text" color={light.inkFixed} height={48} onPress={discard} style={{ paddingHorizontal: 12 }} />
                  <Button label="Confirmar" icon="check" kind="onGradient" height={48} onPress={confirm} style={{ flex: 1 }} />
                </View>
              </BrandGradient>
            )}
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={[styles.bar, { backgroundColor: t.panel, marginBottom: Math.max(insets.bottom - 8, 12) }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => send()}
          placeholder={messages.length ? 'Responde o dicta…' : 'Cuéntame un gasto…'}
          placeholderTextColor={t.onPanelMuted}
          style={[styles.input, { color: t.onPanel }]}
          returnKeyType="send"
          accessibilityLabel="Cuéntame un gasto"
        />
        <Tap onPress={() => send()} accessibilityRole="button" accessibilityLabel={text ? 'Enviar' : 'Dictar'} style={[styles.send, { backgroundColor: text ? t.lime : t.onPanel }]}>
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
  draft: { borderRadius: 22, padding: 18 },
  bar: { marginHorizontal: 20, height: 64, borderRadius: 32, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, gap: 10 },
  input: { flex: 1, fontFamily: font.regular, fontSize: 16, height: 48 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
