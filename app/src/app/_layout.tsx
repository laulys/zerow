import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, useFonts } from '@expo-google-fonts/space-grotesk';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TripProvider } from '../data/trip';
import { useTheme } from '../theme/useTheme';

// Short tasks open as native sheets that hug their content (2.4, 5.1).
const sheet = (bg: string) =>
  ({
    presentation: 'formSheet',
    sheetAllowedDetents: 'fitToContents',
    sheetGrabberVisible: true,
    sheetCornerRadius: 28,
    contentStyle: { backgroundColor: bg },
  }) as const;

export default function RootLayout() {
  const [loaded] = useFonts({ SpaceGrotesk_400Regular, SpaceGrotesk_500Medium });
  const { t, isDark } = useTheme();
  if (!loaded) return <View style={{ flex: 1, backgroundColor: t.page }} />;
  return (
    <SafeAreaProvider>
        <TripProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.page }, animation: 'default' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="trip/[id]" />
            <Stack.Screen name="saldar" />
            <Stack.Screen name="pago" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="nuevo" options={{ presentation: 'modal' }} />
            <Stack.Screen name="dividir" options={sheet(t.surface)} />
            <Stack.Screen name="invitar" options={sheet(t.surface)} />
            <Stack.Screen name="pagar" options={sheet(t.surface)} />
            <Stack.Screen name="emoji" options={sheet(t.surface)} />
            <Stack.Screen name="persona" options={sheet(t.surface)} />
            <Stack.Screen name="gasto" />
            <Stack.Screen name="entrar/index" />
            <Stack.Screen name="entrar/codigo" />
            <Stack.Screen name="cuenta" options={{ presentation: 'modal' }} />
            <Stack.Screen name="grupo-nuevo" options={{ presentation: 'modal' }} />
            <Stack.Screen name="t/[code]" options={{ animation: 'fade' }} />
          </Stack>
        </TripProvider>
    </SafeAreaProvider>
  );
}
