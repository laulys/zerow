import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton, T, Tap } from '../../components/ui';
import { font } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { enterApp, verifyCode } from '../../data/session';

const LENGTH = 6;
const RESEND_AFTER = 30;
const MAX_TRIES = 3;

// 1.9 Código (and 6.8 código incorrecto): six boxes over one hidden field, so
// paste and the iOS one-time-code suggestion both fill every box at once.
export default function Code() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(RESEND_AFTER);
  const [checking, setChecking] = useState(false);
  const [triesLeft, setTriesLeft] = useState(MAX_TRIES);
  const [wrong, setWrong] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const submit = async (value = code) => {
    if (value.length < LENGTH || checking) return;
    setChecking(true);
    const ok = await verifyCode(value);
    setChecking(false);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return enterApp();
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shake.value = withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(-5, { duration: 50 }), withTiming(0, { duration: 50 }));
    setWrong(true);
    setTriesLeft((n) => n - 1);
  };

  const onChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    setWrong(false);
    if (digits.length === LENGTH) submit(digits);
  };

  const resend = () => {
    setLeft(RESEND_AFTER);
    setCode('');
    setWrong(false);
    setTriesLeft(MAX_TRIES);
    input.current?.focus();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
        <IconButton name="chevron-left" label="Volver" bg={t.surface} color={t.ink} onPress={() => router.back()} />
        <T v="titleL" color={t.ink} style={{ marginTop: 16 }} accessibilityRole="header">
          Revisa tu correo
        </T>
        <T v="body" color={t.inkMuted} style={{ marginTop: 6 }}>
          Código enviado a {email}
        </T>
        <Tap onPress={() => router.back()} accessibilityRole="button" style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
          <T v="labelStrong" color={t.ink}>
            Cambiar
          </T>
        </Tap>

        <Tap onPress={() => input.current?.focus()} accessibilityRole="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Animated.View style={[styles.boxes, shakeStyle]}>
            {Array.from({ length: LENGTH }).map((_, i) => {
              const active = i === code.length && !checking;
              return (
                <View key={i} style={[styles.box, { backgroundColor: t.surface, borderColor: wrong ? t.danger : active ? t.ink : 'transparent' }]}>
                  <T v="titleL" color={t.ink} style={{ fontFamily: font.regular }}>
                    {code[i] ?? ''}
                  </T>
                </View>
              );
            })}
          </Animated.View>
        </Tap>
        <TextInput
          ref={input}
          value={code}
          onChangeText={onChange}
          autoFocus
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={LENGTH}
          style={styles.hidden}
          accessibilityLabel={`Código de ${LENGTH} cifras`}
        />

        {wrong ? (
          <T v="label" color={t.danger} style={{ marginTop: 12 }} accessibilityLiveRegion="assertive">
            {triesLeft > 0 ? `Ese código no es correcto. Te quedan ${triesLeft} intento${triesLeft === 1 ? '' : 's'}.` : 'Ese código no es correcto. Pide uno nuevo.'}
          </T>
        ) : null}
        {left > 0 ? (
          <T v="label" color={t.inkMuted} style={{ marginTop: 12 }}>
            ¿No llega? Reenviar en 0:{String(left).padStart(2, '0')}
          </T>
        ) : (
          <Tap onPress={resend} accessibilityRole="button" style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginTop: 4 }}>
            <T v="labelStrong" color={t.ink}>
              Reenviar código
            </T>
          </Tap>
        )}
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 8 }}>
        <Button label={checking ? 'Comprobando…' : 'Entrar'} icon="arrow-right" disabled={code.length < LENGTH || checking || triesLeft <= 0} onPress={() => submit()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', gap: 8, marginTop: 24 },
  box: { flex: 1, height: 64, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
