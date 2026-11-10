import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarStack } from '../components/Avatar';
import { BrandGradient } from '../components/BrandGradient';
import { RollingMoney } from '../components/Money';
import { Button, Lockup, T, type as tp } from '../components/ui';
import { light } from '../theme/tokens';

// 1.2 Bienvenida: the balance counts down from 485,44 € to 0,00 € on open.
// It always sits on the brand gradient, so it uses the fixed dark ink in both modes.
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const ink = light.inkFixed;
  return (
    <BrandGradient style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <View style={[styles.wrap, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }]}>
        <Lockup color={ink} size={30} />
        <View style={{ marginTop: 56 }}>
          <T v="label" color={ink}>
            Lisboa 2026 · lo que falta por saldar
          </T>
          <RollingMoney value={0} from={485.44} duration={1800} size={128} color={ink} centsColor={light.inkMutedFixed} />
          <View style={{ marginTop: 18 }}>
            <AvatarStack ids={['tu', 'ana', 'luis', 'marta']} size={56} overlap={-8} />
          </View>
        </View>
        <View style={{ flex: 1 }} />
        <T v="titleL" color={ink} style={styles.headline}>
          Cuentas claras entre amigos.
        </T>
        <Button label="Empezar" icon="arrow-right" kind="onGradient" onPress={() => router.replace('/grupos')} />
        <Button label="Ya tengo cuenta" kind="text" color={ink} height={48} onPress={() => router.push('/entrar')} style={{ marginTop: 6 }} />
      </View>
    </BrandGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 20 },
  headline: { ...tp.titleL, fontSize: 40, lineHeight: 42, letterSpacing: -1.2, marginBottom: 24 },
});
