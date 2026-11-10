import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field, IconButton, T, inputStyle } from '../../components/ui';
import { useTheme } from '../../theme/useTheme';

const looksLikeEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

// 1.8 Entrar con correo: one field, a one-time code, no password.
export default function Email() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [tried, setTried] = useState(false);
  const bad = tried && !looksLikeEmail(email);

  const send = () => {
    if (!looksLikeEmail(email)) return setTried(true);
    router.push({ pathname: '/entrar/codigo', params: { email: email.trim() } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.page }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingHorizontal: 20 }}>
        <IconButton name="chevron-left" label="Volver" bg={t.surface} color={t.ink} onPress={() => router.back()} />
        <T v="titleL" color={t.ink} style={{ marginTop: 16 }} accessibilityRole="header">
          Entra con tu correo
        </T>
        <T v="body" color={t.inkMuted} style={{ marginTop: 6 }}>
          Te mandamos un código de 6 cifras. Sin contraseñas que olvidar.
        </T>
        <Field label="Correo">
          <TextInput
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={send}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType="send"
            placeholder="tu@correo.com"
            placeholderTextColor={t.inkMuted}
            style={[inputStyle(t), bad && { borderColor: t.danger }]}
            accessibilityLabel="Correo"
          />
          {bad ? (
            <T v="caption" color={t.danger} style={{ marginTop: 6 }} accessibilityLiveRegion="polite">
              {email.includes('@') ? 'A este correo le falta el final, como «.com».' : 'A este correo le falta la @.'}
            </T>
          ) : null}
        </Field>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 8 }}>
        <Button label="Enviar código" icon="arrow-right" disabled={!email.trim()} onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}
