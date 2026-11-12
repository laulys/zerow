import { Aurora } from '../components/Aurora';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import type { IconName } from '../components/Icon';
import { Button, Chip, Field, IconButton, Segmented, T, inputStyle } from '../components/ui';
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

  const create = () => {
    if (!name.trim()) {
      setTried(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const g = createGroup({ name: name.trim(), kind, dates: showDates ? dates.trim() : '', currency, members: who });
    router.dismissAll();
    router.push({ pathname: '/trip/[id]', params: { id: g.id } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora height={380} strength={0.75} />
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <IconButton name="x" label="Cerrar" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        <T v="titleL" color={t.ink} style={{ marginTop: 16 }} accessibilityRole="header">
          Nuevo grupo
        </T>

        <T v="label" color={t.inkMuted} style={{ marginTop: 20, marginBottom: 8 }}>
          Tipo
        </T>
        <View style={styles.wrap}>
          {kinds.map((x) => (
            <Chip key={x.key} label={x.label} icon={x.icon} selected={kind === x.key} onPress={() => setKind(x.key)} />
          ))}
        </View>

        <Field label="Nombre">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={k.placeholder}
            placeholderTextColor={t.inkMuted}
            style={[inputStyle(t), nameMissing && { borderColor: t.danger, borderWidth: 1.5 }]}
            accessibilityLabel="Nombre"
            returnKeyType="next"
          />
          {nameMissing ? (
            <T v="caption" color={t.danger} style={{ marginTop: 6 }} accessibilityLiveRegion="polite">
              Ponle un nombre para encontrarlo luego.
            </T>
          ) : null}
        </Field>

        {showDates ? (
          <Field label="Fechas">
            <TextInput value={dates} onChangeText={setDates} placeholder="12 – 18 nov 2026" placeholderTextColor={t.inkMuted} style={inputStyle(t)} accessibilityLabel="Fechas" />
          </Field>
        ) : null}

        <Field label="Moneda principal">
          <Segmented
            options={[
              { key: 'EUR', label: 'Euro · €' },
              { key: 'USD', label: 'Dólar · US$' },
            ]}
            value={currency}
            onChange={setCurrency}
          />
          <T v="caption" color={t.inkMuted} style={{ marginTop: 8 }}>
            Los gastos en la otra moneda se convierten con el cambio del día.
          </T>
        </Field>

        <Field label={k.who}>
          <View style={styles.wrap}>
            {everyone.map((p) => {
              const on = who.includes(p);
              return (
                <Chip
                  key={p}
                  label={p === 'tu' ? 'Laura (tú)' : people[p].name}
                  off={!on}
                  onPress={() => p !== 'tu' && setWho((l) => (on ? l.filter((x) => x !== p) : everyone.filter((x) => x === p || l.includes(x))))}
                  leading={<Avatar id={p} size={32} />}
                />
              );
            })}
            <Chip label="Añadir" icon="plus" dashed onPress={() => router.push({ pathname: '/invitar', params: { nombre: name.trim() || 'tu grupo' } })} />
          </View>
        </Field>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 8 }}>
        <Button label={k.cta} icon="check" onPress={create} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
