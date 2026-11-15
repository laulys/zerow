import { Aurora } from '../../components/Aurora';
import { router } from 'expo-router';
import { FocusStatusBar } from '../../components/FocusStatusBar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BrandGradient } from '../../components/BrandGradient';
import { AppleMark, GoogleMark } from '../../components/Icon';
import { useScreen } from '../../components/Screen';
import { rise } from '../../components/motion';
import { useAnnounce } from '../../components/announce';
import { Button, IconButton, Lockup, T, Tap, inputStyle } from '../../components/ui';
import { enterApp } from '../../data/session';
import { useTheme } from '../../theme/useTheme';

const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

// 1.7 Iniciar sesión: the graphite page under a wide aurora, the greeting, then the
// form. One email field and a one-time code, no password. On the iPhone there's no
// back button (Figma); the stack's edge swipe goes back.
export default function SignIn() {
  const split = useScreen().form === 'split';
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [focused, setFocused] = useState(false);
  const bad = tried && !looksLikeEmail(email);
  useAnnounce(bad && (email.includes('@') ? 'A este correo le falta el final, como «.com».' : 'A este correo le falta la arroba.'));
  // Signing in happens once, so the screen may arrive as a short cascade: the pieces rise
  // 12 pt about 40–50 ms apart (half the old gaps), all of it settled in under half a second.
  const reduce = useReducedMotion();
  const at = (ms: number) => rise(ms / 2, 12, reduce, 260);

  const send = () => {
    if (!looksLikeEmail(email)) return setTried(true);
    router.push({ pathname: '/entrar/codigo', params: { email: email.trim() } });
  };

  const greeting = (
    <>
      <IconButton name="chevron-left" label="Volver" bg="rgba(18,18,18,0.08)" color={t.inkFixed} onPress={() => router.back()} />
      <Animated.View entering={at(120)} style={{ marginTop: 20 }}>
        <Lockup color={t.inkFixed} size={28} />
      </Animated.View>
      <Animated.View entering={at(200)}>
        <T v="display" color={t.inkFixed} style={styles.hello} accessibilityRole="header">
          Entra en Zerow
        </T>
        <T v="body" color={t.inkMutedFixed}>
          Si es tu primera vez, creamos tu cuenta.
        </T>
      </Animated.View>
    </>
  );
  const hello = (
    <>
      <Animated.View entering={at(120)}>
        <SmallLockup color={t.ink} />
      </Animated.View>
      <Animated.View entering={at(200)}>
        <T v="display" color={t.ink} style={{ marginTop: 28 }} accessibilityRole="header">
          Entra en Zerow
        </T>
        <T v="body" color={t.inkSoft} style={{ marginTop: 8 }}>
          Si es tu primera vez, creamos tu cuenta.
        </T>
      </Animated.View>
    </>
  );
  // Figma «Formulario»: 16 between the title, the field group, the button, the «o», the two logos and the footer.
  const form = (
    <>
      <Animated.View entering={at(300)}>
        {/* One screen for everyone: with a code by email, signing in and signing up are the same step, so there is no second heading and no «create an account» link. */}
        <T v="labelStrong" color={t.ink} style={{ marginBottom: 8 }}>
          Correo
        </T>
        <TextInput
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={send}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType="send"
          placeholder="tu@correo.com"
          placeholderTextColor={t.inkSoft}
          selectionColor={t.lime}
          // Figma «Campo» while typing: white 8 % with a 1.5 pt lime edge (the edge is always there, clear, so the text never moves).
          style={[inputStyle(t), styles.field, focused && { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: t.lime }, bad && { borderColor: t.danger }]}
          accessibilityLabel="Correo"
        />
        <T v="caption" color={bad ? t.danger : t.inkMuted} style={{ marginTop: 8 }} accessibilityLiveRegion="polite">
          {bad ? (email.includes('@') ? 'A este correo le falta el final, como «.com».' : 'A este correo le falta la @.') : 'Te mandamos un código de 6 cifras. Sin contraseñas que olvidar.'}
        </T>
      </Animated.View>

      <Animated.View entering={at(380)}>
        <Button label="Enviar código" style={{ marginTop: 16 }} onPress={send} />
      </Animated.View>

      <Animated.View entering={at(440)} style={styles.divider}>
        <View style={[styles.rule, { backgroundColor: t.hairline }]} />
        <T v="caption" color={t.inkMuted}>
          o
        </T>
        <View style={[styles.rule, { backgroundColor: t.hairline }]} />
      </Animated.View>

      <Animated.View entering={at(500)} style={styles.social}>
        <Tap onPress={enterApp} accessibilityRole="button" accessibilityLabel="Continuar con Apple" style={[styles.round, { backgroundColor: '#FFFFFF' }]}>
          <AppleMark size={26} color="#000000" />
        </Tap>
        {/* Figma: #25252A with a #34343A edge (the v2 graphite line, darker than aurora's). */}
        <Tap onPress={enterApp} accessibilityRole="button" accessibilityLabel="Continuar con Google" style={[styles.round, { backgroundColor: t.surface, borderWidth: 1, borderColor: '#34343A' }]}>
          <GoogleMark size={26} />
        </Tap>
      </Animated.View>
    </>
  );

  // Open iPhone Duo (Figma «Duo abierto · 1.7»): the greeting on the gradient on the left, the form on the right.
  if (split) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.page, flexDirection: 'row' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FocusStatusBar style="dark" />
        <BrandGradient style={{ width: 433, borderTopRightRadius: 36, borderBottomRightRadius: 36 }} seed={4}>
          <View style={{ paddingTop: insets.top + 8, paddingLeft: 50, paddingRight: 30 }}>{greeting}</View>
        </BrandGradient>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 44, paddingLeft: 41, paddingRight: 40, paddingBottom: 32 }}>
          {form}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Figma: the greeting starts 30 under the safe area, the form 60 under the greeting.
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora preset="signin" />
      <FocusStatusBar style="light" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 30, paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}>
        {hello}
        <View style={{ marginTop: 60 }}>{form}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * Figma's small lockup: the coin cropped to its halves (23 × 40), 8 pt, then «zerow»
 * in Título M. The shared Lockup scales the mark with the type, so it can't draw this one.
 */
function SmallLockup({ color }: { color: string }) {
  return (
    <View style={styles.lockup} accessible accessibilityRole="header" accessibilityLabel="Zerow">
      <Svg width={23.2} height={40} viewBox="21 0 58 100">
        <Path d="M47 17A26 26 0 0 0 47 69Z" fill={color} />
        <Path d="M53 31A26 26 0 0 1 53 83Z" fill={color} />
      </Svg>
      <T v="titleM" color={color}>
        zerow
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  hello: { marginTop: 22, marginBottom: 4 },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  field: { borderWidth: 1.5, borderColor: 'transparent' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, height: 18 },
  rule: { flex: 1, height: 1 },
  social: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 },
  round: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
