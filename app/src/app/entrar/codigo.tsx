import { Aurora } from '../../components/Aurora';
import { useColumnPadding } from '../../components/Screen';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { FocusStatusBar } from '../../components/FocusStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { announce } from '../../components/announce';
import { Button, IconButton, T, Tap } from '../../components/ui';
import { font } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { enterApp, verifyCode } from '../../data/session';

const LENGTH = 6;
const RESEND_AFTER = 30;
const MAX_TRIES = 3;

// 1.8 Código (and 6.8 código incorrecto): six boxes over one hidden field, so
// paste and the iOS one-time-code suggestion both fill every box at once.
export default function Code() {
  // Open iPhone Duo (Figma «Duo abierto · 1.8»): one 400-wide column in the middle.
  const side = useColumnPadding();
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
    shake.set(withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(-5, { duration: 50 }), withTiming(0, { duration: 50 })));
    setWrong(true);
    announce('Ese código no es correcto. Revísalo o pide otro.');
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

  // «Entrar» is the glass button at half strength until there are six new digits (Figma 1.8 and 6.8).
  const ready = code.length === LENGTH && !checking && !wrong && triesLeft > 0;
  const resendLink = (
    <Tap onPress={resend} accessibilityRole="button" style={styles.link}>
      <T v="labelStrong" color={t.ink}>
        Enviar un código nuevo
      </T>
    </Tap>
  );

  // Figma «Código»: 8 between the lines, plus «Aire» spacers (10 above the boxes, 6 under them).
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora preset="onboarding" />
      <FocusStatusBar style="light" />
      <View style={{ flex: 1, paddingTop: insets.top, paddingHorizontal: side }}>
        <IconButton name="x" label="Cerrar" bg={t.glass} color={t.ink} onPress={() => router.back()} />
        <T v="titleL" color={t.ink} style={{ marginTop: 16 }} accessibilityRole="header">
          Revisa tu correo
        </T>
        <T v="label" color={t.inkMuted} style={{ marginTop: 8 }}>
          Código enviado a {email}
        </T>
        <Tap onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Cambiar el correo" style={[styles.link, { marginTop: 8 }]}>
          <T v="labelStrong" color={t.ink}>
            Cambiar
          </T>
        </Tap>

        <Tap onPress={() => input.current?.focus()} accessibilityRole="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Animated.View style={[styles.boxes, shakeStyle]}>
            {Array.from({ length: LENGTH }).map((_, i) => {
              const active = i === code.length && !checking;
              // Typing: white 8 % with a lime edge and the caret; wrong: every box gets the red edge.
              const edge = wrong ? t.danger : active ? t.lime : 'transparent';
              return (
                <View key={i} style={[styles.box, { backgroundColor: wrong || active ? 'rgba(255,255,255,0.08)' : t.fill, borderColor: edge }]}>
                  {active ? (
                    <Caret color={t.lime} />
                  ) : (
                    <Text style={[styles.digit, { color: t.ink }]} maxFontSizeMultiplier={1.15}>
                      {code[i] ?? ''}
                    </Text>
                  )}
                </View>
              );
            })}
          </Animated.View>
        </Tap>
        <TextInput
          maxFontSizeMultiplier={2}
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
          <>
            <View style={styles.error} accessible accessibilityLiveRegion="assertive">
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={t.danger} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
                <Path d="M12 8v4" />
                <Path d="M12 16h.01" />
              </Svg>
              <T v="caption" color={t.danger} style={{ fontWeight: '500', flex: 1 }}>
                Ese código no es correcto. Revísalo o pide otro.
              </T>
            </View>
            <View style={{ marginTop: 8 }}>{resendLink}</View>
          </>
        ) : left > 0 ? (
          <T v="caption" color={t.inkMuted} style={{ marginTop: 22 }}>
            ¿No llega? Reenviar en 0:{String(left).padStart(2, '0')}
          </T>
        ) : (
          // 10 down, so the link's text (centred in its 44 pt row) lines up with where the countdown was.
          <View style={{ marginTop: 10 }}>{resendLink}</View>
        )}
      </View>
      <View style={{ paddingHorizontal: side, paddingBottom: insets.bottom }}>
        <Button label={checking ? 'Comprobando…' : 'Entrar'} kind={ready ? 'primary' : 'secondary'} disabled={!ready} style={!ready && { opacity: 0.5 }} onPress={() => submit()} />
      </View>
    </KeyboardAvoidingView>
  );
}

/** The lime caret in the box being typed (2 × 26), blinking like the system one; steady with Reduce Motion. */
function Caret({ color }: { color: string }) {
  const reduce = useReducedMotion();
  const on = useSharedValue(1);
  useEffect(() => {
    if (!reduce) on.value = withRepeat(withSequence(withTiming(1, { duration: 500 }), withTiming(0, { duration: 0 }), withTiming(0, { duration: 500 }), withTiming(1, { duration: 0 })), -1);
  }, [reduce, on]);
  const style = useAnimatedStyle(() => ({ opacity: on.value }));
  return <Animated.View style={[{ width: 2, height: 26, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  link: { alignSelf: 'flex-start', height: 44, paddingRight: 12, justifyContent: 'center' },
  boxes: { flexDirection: 'row', gap: 8, marginTop: 26 },
  box: { flex: 1, height: 60, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  // v3/Importe XS: Space Grotesk Regular 28, −2 %. Its natural line height, centred in the box, puts the figure where
  // Figma does; a 28 pt line box draws it 3 pt high.
  digit: { fontFamily: font.regular, fontSize: 28, letterSpacing: -0.56 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22 },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
