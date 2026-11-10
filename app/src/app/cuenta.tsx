import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { RollingMoney } from '../components/Money';
import { Button, Chip, IconButton, T, Tap } from '../components/ui';
import { eurText, people, useTrip, type Currency, type PersonId } from '../data/trip';
import { font, motion } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const everyone: PersonId[] = ['tu', 'ana', 'luis', 'marta'];
const tips = [0, 10, 15];
const name = (p: PersonId) => (p === 'tu' ? 'Tú' : people[p].name);

// 2.5 Dividir una cuenta: a one-off bill with no group. The answer to "how much
// do I put in?" is the hero; everything else is a chip you tap to change.
export default function QuickSplit() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { addExpense } = useTrip();
  const [title, setTitle] = useState('Cena en Casa Pepe');
  const [editingTitle, setEditingTitle] = useState(false);
  const [amountText, setAmountText] = useState('84');
  const [editingAmount, setEditingAmount] = useState(false);
  const [tip, setTip] = useState(10);
  const [payer, setPayer] = useState<PersonId>('tu');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [who, setWho] = useState<PersonId[]>(everyone);
  const amountRef = useRef<TextInputInstance>(null);
  const before = useRef('84');

  const typed = parseFloat(amountText.replace(',', '.'));
  const base = Math.max(0, Number.isFinite(typed) ? typed : parseFloat(before.current.replace(',', '.')) || 0);
  const total = Math.round(base * (1 + tip / 100) * 100) / 100;
  const each = who.length ? Math.round((total / who.length) * 100) / 100 : 0;
  const owedToPayer = who.includes(payer) ? total - each : total;

  const summary =
    payer === 'tu'
      ? `Pagaste tú · te deben ${eurText(owedToPayer, currency)}`
      : who.includes('tu')
        ? `Pagó ${name(payer)} · le debes ${eurText(each, currency)}`
        : `Pagó ${name(payer)} · a ti no te toca`;

  const toggle = (p: PersonId) => {
    Haptics.selectionAsync();
    setWho((list) => (list.includes(p) ? (list.length > 1 ? list.filter((x) => x !== p) : list) : everyone.filter((x) => x === p || list.includes(x))));
    if (payer === p && who.includes(p) && who.length > 1) setPayer(who.find((x) => x !== p)!);
  };

  const nextPayer = () => {
    Haptics.selectionAsync();
    const i = who.indexOf(payer);
    setPayer(who[(i + 1) % who.length] ?? who[0]);
  };

  const shareText = () =>
    `${title}: ${eurText(total, currency)}${tip ? ` con ${tip} % de propina` : ''}, entre ${who.length}.\n` +
    who.map((p) => `${name(p)}: ${eurText(each, currency)}${p === payer ? ' (pagó)' : ''}`).join('\n') +
    `\nPagó ${name(payer)}. Hecho con Zerow.`;

  const saveToGroup = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const eur = currency === 'EUR' ? total : Math.round(total * (40.36 / 45) * 100) / 100;
    addExpense({ id: `c${Date.now()}`, title, payer, amountEur: eur, originalUsd: currency === 'USD' ? total : undefined, splitWith: who, note: tip ? `propina ${tip} %` : undefined });
    router.dismissAll();
    router.push('/trip/lisboa');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <IconButton name="x" label="Cerrar" bg={t.surface} color={t.ink} onPress={() => router.back()} />

        <T v="label" color={t.inkMuted} style={{ marginTop: 24 }}>
          Dividir una cuenta
        </T>
        {editingTitle ? (
          <TextInput value={title} onChangeText={setTitle} autoFocus onBlur={() => setEditingTitle(false)} onSubmitEditing={() => setEditingTitle(false)} returnKeyType="done" style={[styles.titleInput, { color: t.ink, borderColor: t.line }]} accessibilityLabel="Nombre de la cuenta" />
        ) : (
          <Tap onPress={() => setEditingTitle(true)} accessibilityRole="button" accessibilityLabel={`${title}. Cambiar nombre`} style={styles.titleRow}>
            <T v="titleM" color={t.ink}>
              {title || 'Sin nombre'}
            </T>
            <Icon name="pen" size={16} color={t.inkMuted} />
          </Tap>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 20 }} accessible accessibilityLabel={`${eurText(each, currency)} cada uno`}>
          <RollingMoney value={each} size={each >= 1000 ? 60 : 88} color={t.ink} centsColor={t.inkMuted} duration={motion.standard} currency={currency} />
          <T v="body" color={t.inkMuted} style={{ marginLeft: 8 }}>
            cada uno
          </T>
        </View>

        <Tap onPress={() => amountRef.current?.focus()} accessibilityRole="none" style={[styles.totalField, { backgroundColor: t.surface, borderColor: editingAmount ? t.ink : t.line }]}>
          <T v="label" color={t.inkMuted} style={{ flex: 1 }}>
            Total de la cuenta
          </T>
          <TextInput
            ref={amountRef}
            value={editingAmount ? amountText : eurText(base, currency).replace(/ (€|US\$)$/, '')}
            placeholder={eurText(base, currency).replace(/ (€|US\$)$/, '')}
            placeholderTextColor={t.inkMuted}
            onChangeText={(v) => setAmountText(v.replace(/[^0-9.,]/g, ''))}
            onFocus={() => {
              before.current = amountText;
              setAmountText('');
              setEditingAmount(true);
            }}
            onBlur={() => {
              if (!amountText.trim()) setAmountText(before.current);
              setEditingAmount(false);
            }}
            keyboardType="decimal-pad"
            style={[styles.totalInput, { color: t.ink }]}
            accessibilityLabel="Total de la cuenta, sin propina"
          />
          <T v="bodyStrong" color={t.ink}>
            {currency === 'EUR' ? '€' : 'US$'}
          </T>
          <Icon name="pen" size={16} color={t.inkMuted} />
        </Tap>
        <T v="caption" color={t.inkMuted} style={{ marginTop: 8 }}>
          {tip ? `+ ${tip} % de propina = ${eurText(total, currency)} · ` : ''}entre {who.length}
        </T>

        <View style={[styles.pill, { backgroundColor: t.lime }]} accessibilityLiveRegion="polite">
          <T v="labelStrong" color={t.onLime}>
            {summary}
          </T>
        </View>

        <T v="label" color={t.inkMuted} style={styles.section}>
          Entre
        </T>
        <View style={styles.wrap}>
          {everyone.map((p) => (
            <Chip key={p} label={name(p)} off={!who.includes(p)} onPress={() => toggle(p)} leading={<Avatar id={p} size={32} />} />
          ))}
        </View>

        <T v="label" color={t.inkMuted} style={styles.section}>
          Ajustes
        </T>
        <View style={styles.wrap}>
          <Chip label={tip ? `Propina ${tip} %` : 'Sin propina'} onPress={() => setTip(tips[(tips.indexOf(tip) + 1) % tips.length])} />
          <Chip label={payer === 'tu' ? 'Pagaste tú' : `Pagó ${name(payer)}`} onPress={nextPayer} />
          <Chip label={currency === 'EUR' ? 'En euros' : 'En dólares'} onPress={() => setCurrency((c) => (c === 'EUR' ? 'USD' : 'EUR'))} />
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 8, gap: 10 }}>
        <Button label="Guardar en Lisboa 2026" kind="secondary" onPress={saveToGroup} />
        <Button label="Compartir lo que pone cada uno" icon="share" onPress={() => Share.share({ message: shareText() })} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, alignSelf: 'flex-start', minHeight: 44 },
  titleInput: { fontFamily: font.medium, fontSize: 22, marginTop: 4, height: 44, borderBottomWidth: 1 },
  totalField: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 52, borderRadius: 16, borderWidth: 1, paddingLeft: 16, paddingRight: 14, marginTop: 16 },
  totalInput: { fontFamily: font.medium, fontSize: 17, minWidth: 60, textAlign: 'right', paddingVertical: 0 },
  pill: { alignSelf: 'flex-start', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginTop: 12 },
  section: { marginTop: 28, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
