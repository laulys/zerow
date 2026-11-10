import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, T, Tap } from '../components/ui';
import { pastGroups, useTrip } from '../data/trip';
import { font } from '../theme/tokens';
import { glassSheets } from '../components/Glass';
import { useTheme } from '../theme/useTheme';

/** The last real emoji in what was typed: flags, ZWJ families, skin tones, keycaps. */
const EMOJI = /\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic}\uFE0F?)*/gu;
const lastEmoji = (s: string) => {
  const all = s.match(EMOJI);
  return all ? all[all.length - 1] : null;
};

// 2.8 Emoji del grupo (sheet): tap a settled group to give it an emoji. Eight
// suggestions that fit the group, or any emoji from the iOS keyboard.
export default function GroupEmoji() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const group = pastGroups.find((g) => g.id === id) ?? pastGroups[0];
  const { pastEmoji, setPastEmoji } = useTrip();
  const [chosen, setChosen] = useState<string | null>(pastEmoji[group.id] ?? null);
  const [typed, setTyped] = useState('');
  const input = useRef<TextInputInstance>(null);
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const pick = (e: string) => {
    Haptics.selectionAsync();
    setChosen(e);
    pop.value = withSequence(withTiming(0.85, { duration: 80 }), withSpring(1, { damping: 9, stiffness: 260 }));
  };

  const save = () => {
    setPastEmoji(group.id, chosen);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: Math.max(insets.bottom - 8, 16), backgroundColor: glassSheets ? 'transparent' : t.surface }}>
      <View style={{ alignItems: 'center' }}>
        <Animated.View style={[styles.current, { backgroundColor: t.fill, borderColor: chosen ? t.lime : t.line }, popStyle]} accessible accessibilityLabel={chosen ? `Emoji elegido: ${chosen}` : 'Sin emoji'}>
          {chosen ? <Text style={styles.big}>{chosen}</Text> : <T v="caption" color={t.inkMuted}>Sin emoji</T>}
        </Animated.View>
        <T v="titleM" color={t.ink} style={{ marginTop: 14 }} accessibilityRole="header">
          {group.name}
        </T>
        <T v="label" color={t.inkMuted} style={{ marginTop: 2 }}>
          Elige un emoji para el grupo
        </T>
      </View>

      <T v="labelStrong" color={t.inkMuted} style={{ marginTop: 22, marginBottom: 10 }}>
        Sugerencias para {group.name}
      </T>
      <View style={styles.grid}>
        {group.suggestions.map((e) => {
          const on = e === chosen;
          return (
            <Tap key={e} onPress={() => pick(e)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={e} style={[styles.option, { backgroundColor: t.fill, borderColor: on ? t.lime : 'rgba(255,255,255,0.08)' }]}>
              <Text style={styles.mid}>{e}</Text>
            </Tap>
          );
        })}
      </View>

      <Tap onPress={() => input.current?.focus()} accessibilityRole="none" style={[styles.field, { backgroundColor: t.fill, borderColor: t.line }]}>
        <Text style={styles.small}>☺️</Text>
        <TextInput
          ref={input}
          value={typed}
          onChangeText={(v) => {
            const e = lastEmoji(v);
            setTyped('');
            if (e) pick(e);
          }}
          placeholder="Otro emoji del teclado…"
          placeholderTextColor={t.inkMuted}
          selectionColor={t.lime}
          autoCorrect={false}
          returnKeyType="done"
          style={[styles.input, { color: t.ink }]}
          accessibilityLabel="Escribe un emoji con el teclado"
        />
      </Tap>

      <Button label="Guardar" style={{ marginTop: 16 }} onPress={save} />
      {chosen ? (
        <Tap onPress={() => setChosen(null)} accessibilityRole="button" style={styles.remove}>
          <T v="labelStrong" color={t.ink} style={{ fontFamily: font.medium }}>
            Quitar emoji
          </T>
        </Tap>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  current: { width: 88, height: 88, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  big: { fontSize: 48, lineHeight: 58 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  option: { flexBasis: '22%', flexGrow: 1, height: 72, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mid: { fontSize: 34, lineHeight: 42 },
  small: { fontSize: 20 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 56, borderRadius: 28, borderWidth: 1, paddingHorizontal: 16, marginTop: 18 },
  input: { flex: 1, fontFamily: font.regular, fontSize: 16, height: 56 },
  remove: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 4 },
});
