import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { SheetBody } from '../components/Sheet';
import { Button, T, Tap } from '../components/ui';
import { pastGroups, useTrip } from '../data/trip';
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
    pop.set(withSequence(withTiming(0.85, { duration: 80 }), withSpring(1, { damping: 9, stiffness: 260 })));
  };

  const save = () => {
    setPastEmoji(group.id, chosen);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    // Figma 2.8: the chosen emoji in an 84 pt tile with a lime edge, the group's name and a hint,
    // the suggestions as 80×68 tiles, a field for any other emoji, and «Guardar».
    <SheetBody>
      <View style={{ alignItems: 'center' }}>
        <Animated.View style={[styles.current, { borderColor: chosen ? t.lime : 'transparent' }, popStyle]} accessible accessibilityLabel={chosen ? `Emoji elegido: ${chosen}` : 'Sin emoji'}>
          {chosen ? (
            <Text style={styles.big}>{chosen}</Text>
          ) : (
            <T v="caption" color={t.inkMuted}>
              Sin emoji
            </T>
          )}
        </Animated.View>
        <T v="titleM" color={t.ink} style={{ marginTop: 14 }} accessibilityRole="header">
          {group.name}
        </T>
        <T v="label" color={t.inkMuted}>
          Elige un emoji para el grupo
        </T>
      </View>

      <View style={{ gap: 12 }}>
        <T v="labelStrong" color={t.ink}>
          Sugerencias para {group.name}
        </T>
        <View style={styles.grid}>
          {group.suggestions.map((e) => {
            const on = e === chosen;
            return (
              <Tap
                key={e}
                onPress={() => pick(e)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={e}
                style={[styles.option, { borderColor: on ? t.lime : 'transparent' }]}
              >
                <Text style={styles.mid}>{e}</Text>
              </Tap>
            );
          })}
        </View>
      </View>

      <Tap onPress={() => input.current?.focus()} accessible={false} accessibilityRole="none" style={[styles.field, { backgroundColor: t.card }]}>
        <TextInput
          maxFontSizeMultiplier={2}
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

      <Button label="Guardar" onPress={save} />
    </SheetBody>
  );
}

const styles = StyleSheet.create({
  current: { width: 84, height: 84, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)' },
  big: { fontSize: 46, lineHeight: 56 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: { flexBasis: '22%', flexGrow: 1, height: 68, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  mid: { fontSize: 34, lineHeight: 42 },
  field: { flexDirection: 'row', alignItems: 'center', height: 56, borderRadius: 16, paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 17, height: 56 },
});
