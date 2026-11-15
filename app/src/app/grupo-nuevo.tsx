import { Aurora } from '../components/Aurora';
import { Spread } from '../components/Duo';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { BottomFade } from '../components/BottomFade';
import { Icon, type IconName } from '../components/Icon';
import { announce } from '../components/announce';
import { useStatusVeil } from '../components/StatusVeil';
import { Button, Chip, IconButton, Segmented, T, inputStyle } from '../components/ui';
import { people, useTrip, type Currency, type GroupKind, type PersonId } from '../data/trip';
import { useTheme } from '../theme/useTheme';

const kinds: { key: GroupKind; label: string; icon?: IconName; who: string; cta: string; placeholder: string }[] = [
  { key: 'viaje', label: 'Viaje', icon: 'plane', who: 'Quiénes viajan', cta: 'Crear viaje', placeholder: 'Lisboa 2026' },
  { key: 'piso', label: 'Piso', icon: 'house', who: 'Quiénes viven', cta: 'Crear piso', placeholder: 'Piso Calle Mayor' },
  { key: 'evento', label: 'Evento', icon: 'gift', who: 'Quiénes participan', cta: 'Crear evento', placeholder: 'Cumple de Marta' },
  { key: 'otro', label: 'Otro', who: 'Quiénes participan', cta: 'Crear grupo', placeholder: 'Nombre del grupo' },
];

const everyone: PersonId[] = ['tu', 'ana', 'luis', 'marta'];

// 2.6 Nuevo grupo: the type changes the wording (and whether dates matter),
// not the mechanics. Every group splits the same way.
export default function NewGroup() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { createGroup } = useTrip();
  const params = useLocalSearchParams<{ tipo?: GroupKind }>();
  const [kind, setKind] = useState<GroupKind>(params.tipo ?? 'viaje');
  const [name, setName] = useState('');
  const [dates, setDates] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [who, setWho] = useState<PersonId[]>(everyone);
  const [tried, setTried] = useState(false);
  const k = kinds.find((x) => x.key === kind)!;
  const showDates = kind === 'viaje' || kind === 'evento';
  const nameMissing = tried && !name.trim();
  const veil = useStatusVeil();

  const create = () => {
    if (!name.trim()) {
      setTried(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      announce('Ponle un nombre para encontrarlo luego.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const g = createGroup({ name: name.trim(), kind, dates: showDates ? dates.trim() : '', currency, members: who });
    router.dismissAll();
    router.push({ pathname: '/trip/[id]', params: { id: g.id } });
  };

  // Figma: chips that carry an icon start it 12 in (the shared chip puts icons 16 in), so the icon goes in as `leading`.
  const iconChip = (icon: IconName | undefined, selected: boolean) =>
    icon ? <View style={{ marginLeft: 6 }}>{<Icon name={icon} size={20} color={selected ? t.onSelected : t.ink} />}</View> : undefined;

  const basics = (
    <View style={{ gap: 16 }}>
      <IconButton name="x" label="Cerrar" bg={t.glass} color={t.ink} onPress={() => router.back()} />
      <T v="titleL" color={t.ink} accessibilityRole="header">
        Nuevo grupo
      </T>

      <Group label="Tipo">
        <View style={styles.wrap}>
          {kinds.map((x) => (
            <Chip key={x.key} label={x.label} leading={iconChip(x.icon, kind === x.key)} selected={kind === x.key} onPress={() => setKind(x.key)} />
          ))}
        </View>
      </Group>

      <Group label="Nombre">
        <TextInput
          maxFontSizeMultiplier={2}
          value={name}
          onChangeText={setName}
          placeholder={k.placeholder}
          placeholderTextColor={t.inkMuted}
          style={[inputStyle(t), nameMissing && { borderColor: t.danger, borderWidth: 1.5 }]}
          accessibilityLabel="Nombre"
          returnKeyType="next"
        />
        {nameMissing ? (
          <T v="caption" color={t.danger} accessibilityLiveRegion="polite">
            Ponle un nombre para encontrarlo luego.
          </T>
        ) : null}
      </Group>

      {showDates ? (
        <Group label="Fechas">
          <TextInput maxFontSizeMultiplier={2} value={dates} onChangeText={setDates} placeholder="12–18 nov 2026" placeholderTextColor={t.inkMuted} style={inputStyle(t)} accessibilityLabel="Fechas" />
        </Group>
      ) : null}
    </View>
  );
  const more = (
    <View style={{ gap: 16 }}>
      <Group label="Moneda principal">
        <Segmented
          options={[
            { key: 'EUR', label: 'Euro · €' },
            { key: 'USD', label: 'Dólar · US$' },
          ]}
          value={currency}
          onChange={setCurrency}
        />
        <T v="caption" color={t.inkMuted}>
          Los gastos en la otra moneda se convierten con el cambio del día.
        </T>
      </Group>

      <Group label={k.who}>
        <View style={styles.wrap}>
          {everyone.map((p) => {
            const on = who.includes(p);
            return (
              <Chip
                key={p}
                label={p === 'tu' ? 'Laura (tú)' : people[p].name}
                off={!on}
                fixed={p === 'tu'}
                onPress={() => p !== 'tu' && setWho((l) => (on ? l.filter((x) => x !== p) : everyone.filter((x) => x === p || l.includes(x))))}
                leading={<Avatar id={p} size={32} bg={t.disc} inset />}
              />
            );
          })}
          <Chip label="Añadir" leading={iconChip('plus', false)} onPress={() => router.push({ pathname: '/invitar', params: { nombre: name.trim() || 'tu grupo' } })} />
        </View>
      </Group>
    </View>
  );
  const action = <Button label={k.cta} icon="check" onPress={create} />;
  // Figma: the fade starts 40 above the button; 34 under it (the home indicator).
  const bottom = Math.max(insets.bottom, 16);

  // Open iPhone Duo (Figma «Duo abierto · 2.6»): type, name and dates on the left; currency and people on the right.
  return (
    <Spread
      phone={
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Aurora preset="onboarding" />
          <View style={{ flex: 1 }}>
            {/* Full screen (Figma): the close button sits at the top inset. */}
            <ScrollView {...veil.scroll} contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 20, paddingBottom: 12 + 56 + bottom, gap: 16 }} keyboardShouldPersistTaps="handled">
              {basics}
              {more}
            </ScrollView>
            {veil.veil}
            <View pointerEvents="box-none" style={[styles.footer, { paddingBottom: bottom }]}>
              <BottomFade style={StyleSheet.absoluteFill} />
              {action}
            </View>
          </View>
        </KeyboardAvoidingView>
      }
      left={basics}
      right={<View style={{ marginTop: 40 }}>{more}</View>}
      footer={action}
    />
  );
}

/** A form group (Figma «Columna»): its label in 15 pt semibold and the control 8 under it. */
function Group({ label, children }: { label: string; children: ReactNode }) {
  const { t } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <T v="labelStrong" color={t.ink}>
        {label}
      </T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 40, paddingHorizontal: 20 },
});
