import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BrandGradient } from '../../components/BrandGradient';
import { AppleMark, GoogleMark } from '../../components/Icon';
import { StretchyScroll } from '../../components/StretchyScroll';
import { Button, IconButton, Lockup, T, Tap, inputStyle } from '../../components/ui';
import { enterApp } from '../../data/session';
import { light } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const HEADER = 372;
const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

// 1.7 Iniciar sesión: the brand gradient on top, cut by a sweeping curve, and the
// form on graphite. One email field and a one-time code, no password. Pull down
// and the gradient stretches, then springs back.
export default function SignIn() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const [focused, setFocused] = useState(false);
  const bad = tried && !looksLikeEmail(email);
  const at = (ms: number) => FadeInDown.delay(ms).duration(300);

  const send = () => {
    if (!looksLikeEmail(email)) return setTried(true);
    router.push({ pathname: '/entrar/codigo', params: { email: email.trim() } });
  };

  const header = (
    <View style={{ flex: 1 }}>
      <BrandGradient style={StyleSheet.absoluteFill} seed={4} />
      <Svg width="100%" height="100%" viewBox={`0 0 393 ${HEADER}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Path d={`M0 318 C205 372 330 330 393 196 L393 ${HEADER} L0 ${HEADER} Z`} fill={t.page} />
      </Svg>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <StretchyScroll background={header} backgroundHeight={HEADER} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 24, height: HEADER - 24 }}>
          <IconButton name="chevron-left" label="Volver" bg="rgba(18,18,18,0.08)" color={light.inkFixed} onPress={() => router.back()} />
          <Animated.View entering={at(120)} style={{ marginTop: 20 }}>
            <Lockup color={light.inkFixed} size={28} />
          </Animated.View>
          <Animated.View entering={at(200)}>
            <T v="display" color={light.inkFixed} style={styles.hello}>
              Hola de nuevo.
            </T>
            <T v="body" color={light.inkMutedFixed}>
              Entra para ver tus grupos.
            </T>
          </Animated.View>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <Animated.View entering={at(300)}>
            <T v="titleL" color={t.ink} accessibilityRole="header">
              Iniciar sesión
            </T>
            <T v="labelStrong" color={t.ink} style={{ marginTop: 18, marginBottom: 8 }}>
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
              placeholderTextColor={t.inkMuted}
              selectionColor={t.lime}
              style={[inputStyle(t), focused && { borderColor: t.ink, borderWidth: 1.5 }, bad && { borderColor: t.danger }]}
              accessibilityLabel="Correo"
            />
            <T v="caption" color={bad ? t.danger : t.inkMuted} style={{ marginTop: 8 }} accessibilityLiveRegion="polite">
              {bad ? (email.includes('@') ? 'A este correo le falta el final, como «.com».' : 'A este correo le falta la @.') : 'Te mandamos un código de 6 cifras. Sin contraseñas que olvidar.'}
            </T>
          </Animated.View>

          <Animated.View entering={at(380)}>
            <Button label="Enviar código" style={{ marginTop: 20 }} onPress={send} />
          </Animated.View>

          <Animated.View entering={at(440)} style={styles.divider}>
            <View style={[styles.rule, { backgroundColor: t.line }]} />
            <T v="label" color={t.inkMuted}>
              o
            </T>
            <View style={[styles.rule, { backgroundColor: t.line }]} />
          </Animated.View>

          <Animated.View entering={at(500)} style={styles.social}>
            <Tap onPress={enterApp} accessibilityRole="button" accessibilityLabel="Continuar con Apple" style={[styles.round, { backgroundColor: '#FFFFFF' }]}>
              <AppleMark size={24} color="#000000" />
            </Tap>
            <Tap onPress={enterApp} accessibilityRole="button" accessibilityLabel="Continuar con Google" style={[styles.round, { backgroundColor: t.surface, borderWidth: 1, borderColor: t.line }]}>
              <GoogleMark size={24} />
            </Tap>
          </Animated.View>

          <Animated.View entering={at(560)} style={styles.footer}>
            <T v="label" color={t.inkMuted}>
              ¿Aún no tienes cuenta?
            </T>
            <Tap onPress={() => router.replace('/grupos')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <T v="labelStrong" color={t.ink}>
                Crear una
              </T>
            </Tap>
          </Animated.View>
        </View>
      </StretchyScroll>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hello: { marginTop: 22, marginBottom: 4 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth * 2 },
  social: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 24 },
  round: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 28 },
});
