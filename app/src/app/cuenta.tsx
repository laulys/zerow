import { Aurora } from '../components/Aurora';
import { Spread } from '../components/Duo';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Share, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Avatar } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { RollingMoney } from '../components/Money';
import { useStatusVeil } from '../components/StatusVeil';
import { Button, Chip, IconButton, T, Tap } from '../components/ui';
import { eurText, people, useTrip, type Currency, type PersonId } from '../data/trip';
import { font, motion } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const everyone: PersonId[] = ['tu', 'ana', 'luis', 'marta'];
const tips = [0, 10, 15];
const name = (p: PersonId) => (p === 'tu' ? 'Tú' : people[p].name);

/** What was typed, the Spanish way: «1.234,50» is 1234.50 (the dot groups thousands), «84,5» and «84.5» are 84.50. */
function parseAmount(text: string) {
  const v = text.trim();
  if (v.includes(',')) return parseFloat(v.replace(/\./g, '').replace(',', '.'));
  return parseFloat(/^\d{1,3}(\.\d{3})+$/.test(v) ? v.replace(/\./g, '') : v);
}

// 2.5 Dividir una cuenta: a one-off bill with no group. The answer to "how much
// do I put in?" is the hero; everything else is a chip you tap to change.
export default function QuickSplit() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { addExpense } = useTrip();
  const [title, setTitle] = useState('Cena en Chiado');
  const [editingTitle, setEditingTitle] = useState(false);
  const [amountText, setAmountText] = useState('84');
  const [editingAmount, setEditingAmount] = useState(false);
  const [tip, setTip] = useState(10);
  const [payer, setPayer] = useState<PersonId>('tu');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [who, setWho] = useState<PersonId[]>(everyone);
  const amountRef = useRef<TextInputInstance>(null);
  const before = useRef('84');
  const veil = useStatusVeil();

  const typed = parseAmount(amountText);
  const base = Math.max(0, Number.isFinite(typed) ? typed : parseAmount(before.current) || 0);
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

  // What you share is read by the others: there «Tú» would be them, so it carries your name.
  const shared = (p: PersonId) => (p === 'tu' ? 'Laura' : people[p].name);
  const shareText = () =>
    `${title}: ${eurText(total, currency)}${tip ? ` con ${tip} % de propina` : ''}, entre ${who.length}.\n` +
    who.map((p) => `${shared(p)}: ${eurText(each, currency)}${p === payer ? ' (pagó)' : ''}`).join('\n') +
    `\nPagó ${shared(payer)}. Hecho con Zerow.`;

  const saveToGroup = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const eur = currency === 'EUR' ? total : Math.round((total / 1.1149) * 100) / 100;
    addExpense({ id: `c${Date.now()}`, title, payer, amountEur: eur, originalUsd: currency === 'USD' ? total : undefined, splitWith: who, note: tip ? `propina ${tip} %` : undefined });
    router.dismissAll();
    router.push('/trip/lisboa');
  };

  const amount = (
    <>
      {/* Like Nuevo gasto: the screen's name is the title of the close button's row, not a small label over the heading. */}
      <View style={styles.navRow}>
        <IconButton name="x" label="Cerrar" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        {/* A navigation title: like iOS's own, it stops growing before it reaches the close button. */}
        <T v="section" color={t.ink} style={styles.navTitle} accessibilityRole="header" maxFontSizeMultiplier={1.3} numberOfLines={1}>
          Dividir una cuenta
        </T>
        <View style={{ width: 44 }} />
      </View>

      {/* Figma «Importe»: a column 8 apart, 20 below the close button's row. */}
      <View style={{ marginTop: 20, gap: 8 }}>
        {editingTitle ? (
          <TextInput
            value={title}
            onChangeText={setTitle}
            autoFocus
            onBlur={() => setEditingTitle(false)}
            onSubmitEditing={() => setEditingTitle(false)}
            returnKeyType="done"
            style={[styles.titleInput, { color: t.ink, borderColor: t.line }]}
            accessibilityLabel="Nombre de la cuenta"
          />
        ) : (
          <Tap onPress={() => setEditingTitle(true)} accessibilityRole="button" accessibilityLabel={`${title}. Cambiar nombre`} style={styles.titleRow} hitSlop={8}>
            <T v="titleM" color={t.ink}>
              {title || 'Sin nombre'}
            </T>
            <Icon name="pen" size={20} color={t.inkSoft} weight={1.75} />
          </Tap>
        )}

        <View style={styles.each} accessible accessibilityLabel={`${eurText(each, currency)} cada uno`}>
          <RollingMoney value={each} size={each >= 1000 ? 56 : 76} color={t.ink} duration={motion.standard} currency={currency} />
          <T v="label" color={t.inkMuted}>
            cada uno
          </T>
        </View>

        <Tap
          onPress={() => amountRef.current?.focus()}
          accessible={false}
          accessibilityRole="none"
          style={[styles.totalField, { backgroundColor: t.fill, borderColor: editingAmount ? t.ink : 'transparent' }]}
        >
          <T v="body" color={t.inkMuted} style={{ flex: 1 }}>
            Cuenta sin propina
          </T>
          <TextInput
            ref={amountRef}
            value={editingAmount ? amountText : eurText(base, currency)}
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
          {/* While typing, the currency stays after the number, a space apart. */}
          {editingAmount ? (
            <T v="bodyStrong" color={t.ink} style={{ marginLeft: -8 }}>
              {currency === 'EUR' ? '€' : 'US$'}
            </T>
          ) : null}
          <Icon name="pen" size={20} color={t.inkSoft} weight={1.75} />
        </Tap>
        <T v="caption" color={t.inkMuted} style={{ marginTop: 12 }}>
          {tip ? `+ ${tip} % de propina = ${eurText(total, currency)} · ` : ''}entre {who.length}
        </T>

        <View style={[styles.pill, { backgroundColor: t.lime }]} accessibilityLiveRegion="polite">
          <T v="caption" color={t.inkFixed} style={{ fontWeight: '600' }}>
            {summary}
          </T>
        </View>
      </View>
    </>
  );
  const choices = (
    <View style={{ gap: 12 }}>
      <T v="labelStrong" color={t.inkMuted}>
        Entre
      </T>
      <View style={styles.wrap}>
        {everyone.map((p) => (
          <Chip key={p} label={name(p)} off={!who.includes(p)} onPress={() => toggle(p)} leading={<Avatar id={p} size={32} bg={t.disc} inset />} />
        ))}
      </View>

      <T v="labelStrong" color={t.inkMuted} style={{ marginTop: 18 }}>
        Ajustes
      </T>
      <View style={styles.wrap}>
        <Chip label={tip ? `Propina ${tip} %` : 'Sin propina'} onPress={() => setTip(tips[(tips.indexOf(tip) + 1) % tips.length])} />
        <Chip label={payer === 'tu' ? 'Pagaste tú' : `Pagó ${name(payer)}`} onPress={nextPayer} />
        <Chip label={currency === 'EUR' ? 'En euros' : 'En dólares'} onPress={() => setCurrency((c) => (c === 'EUR' ? 'USD' : 'EUR'))} />
      </View>
    </View>
  );
  const actions = (
    <>
      <Button label="Compartir lo que pone cada uno" kind="secondary" icon="share" onPress={() => Share.share({ message: shareText() })} />
      <Button label="Guardar en Lisboa 2026" onPress={saveToGroup} />
    </>
  );
  // Figma: 12 above the buttons, 12 between them, 34 under them (the home indicator).
  const bottom = Math.max(insets.bottom, 16);
  const footer = 12 + 56 + 12 + 56 + bottom;
  // With larger text the buttons wrap and the footer grows: the list leaves it that much room.
  const [footerH, setFooterH] = useState(footer);

  // Open iPhone Duo (Figma «Duo abierto · 2.5»): what each one puts in on the left; who and how on the right.
  return (
    <Spread
      phone={
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Aurora preset="onboarding" />
          <View style={{ flex: 1 }}>
            {/* Full screen (Figma): the close button sits at the top inset. */}
            <ScrollView {...veil.scroll} contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: Math.max(footer, footerH) + 6 }} keyboardShouldPersistTaps="handled">
              {amount}
              <View style={{ marginTop: 24 }}>{choices}</View>
            </ScrollView>
            {veil.veil}
            {/* Figma «Fundido»: the page rises from clear behind the buttons, so the list scrolls away under them. */}
            <View pointerEvents="box-none" style={[styles.footer, { minHeight: footer, paddingBottom: bottom }]} onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}>
              <Fundido />
              {actions}
            </View>
          </View>
        </KeyboardAvoidingView>
      }
      left={amount}
      right={<View style={{ marginTop: 40 }}>{choices}</View>}
      footer={<View style={{ gap: 12 }}>{actions}</View>}
    />
  );
}

/** Figma «Fundido»: page colour from clear to solid at 60 %. */
function Fundido() {
  const { t } = useTheme();
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id="cuentaFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.page} stopOpacity={0} />
          <Stop offset="0.6" stopColor={t.page} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#cuentaFade)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  navRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  navTitle: { flex: 1, textAlign: 'center', paddingHorizontal: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  titleInput: { fontFamily: font.medium, fontSize: 22, minHeight: 27, padding: 0, borderBottomWidth: 1 },
  each: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 8 },
  // 1.5 pt focus edge inside the 16 pt padding, so the content sits where Figma has it.
  totalField: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 14.5 },
  totalInput: { fontSize: 17, fontWeight: '600', minWidth: 60, textAlign: 'right', paddingVertical: 0 },
  pill: { alignSelf: 'flex-start', minHeight: 26, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 2, justifyContent: 'center', marginTop: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 20, gap: 12 },
});
