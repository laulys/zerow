import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppleMark, GoogleMark } from '../../components/Icon';
import { Button, T } from '../../components/ui';
import { useTheme } from '../../theme/useTheme';
import { afterSheet, enterApp } from '../../data/session';

// 1.7 Iniciar sesión: a sheet over the welcome screen, so the counted-down
// 0,00 € stays visible behind it. Apple first, mail as the fallback.
export default function SignIn() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: Math.max(insets.bottom - 8, 16), backgroundColor: t.surface }}>
      <T v="titleM" color={t.ink} accessibilityRole="header">
        Hola de nuevo
      </T>
      <T v="body" color={t.inkMuted} style={{ marginTop: 4, marginBottom: 20 }}>
        Entra para ver tus grupos.
      </T>
      <Button label="Continuar con Apple" leading={<AppleMark color="#000000" />} color="#000000" style={{ backgroundColor: '#FFFFFF' }} onPress={enterApp} />
      <Button label="Continuar con Google" kind="secondary" leading={<GoogleMark />} style={{ marginTop: 10, backgroundColor: 'transparent' }} onPress={enterApp} />
      <Button label="Usar mi correo" kind="text" height={48} style={{ marginTop: 8 }} onPress={() => afterSheet(() => router.push('/entrar/correo'))} />
      <T v="caption" color={t.inkMuted} style={{ textAlign: 'center', marginTop: 12 }}>
        Al continuar aceptas las condiciones y la política de privacidad.
      </T>
    </View>
  );
}
