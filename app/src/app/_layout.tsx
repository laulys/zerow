import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, useFonts } from '@expo-google-fonts/space-grotesk';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { glassSheets } from '../components/Glass';
import { ScreenProvider, useRailInset, useScreen } from '../components/Screen';
import { watchApiBase } from '../data/api';
import { watchAppState } from '../data/states';
import { TripProvider } from '../data/trip';
import { useTheme } from '../theme/useTheme';

// Short tasks open as native sheets that hug their content (2.4, 5.1). On iOS 26
// they're clear, so the system draws its Liquid Glass (like Revolut's menus);
// older iOS keeps the solid surface.
const sheet = (bg: string) =>
  ({
    presentation: 'formSheet',
    sheetAllowedDetents: 'fitToContents',
    sheetGrabberVisible: true,
    sheetCornerRadius: 28,
    contentStyle: { backgroundColor: glassSheets ? 'transparent' : bg },
  }) as const;

// Development only: `?estado=cargando`, `sin-grupos` or `sin-conexion` in a link show the states the API will bring.
watchAppState();
// Development only: `?api=http://localhost:8000` points the app at an engine, `?api=off` goes back to sample data.
watchApiBase();

export default function RootLayout() {
  const [loaded] = useFonts({ SpaceGrotesk_400Regular, SpaceGrotesk_500Medium });
  const { t, isDark } = useTheme();
  if (!loaded) return <View style={{ flex: 1, backgroundColor: t.page }} />;
  return (
    <SafeAreaProvider>
      <ScreenProvider>
        <TripProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Screens />
        </TripProvider>
      </ScreenProvider>
    </SafeAreaProvider>
  );
}

function Screens() {
  const { t } = useTheme();
  // On the iPhone Duo every screen leaves the right edge to the control column.
  const rail = useRailInset();
  const { form, preview } = useScreen();
  // The open Duo shows these tasks in the detail pane (Figma), not as a modal card.
  // In the Duo preview, modals stay inside the preview's frame instead of covering the iPad.
  const fullScreen = preview ? ('containedModal' as const) : ('fullScreenModal' as const);
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.page, paddingRight: rail }, animation: 'default' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="empezar" />
      {/* The tabs leave room for the control column themselves, because their bar lives in it. */}
      <Stack.Screen name="(tabs)" options={{ animation: 'fade', contentStyle: { backgroundColor: t.page } }} />
      <Stack.Screen name="trip/[id]" />
      <Stack.Screen name="saldar" />
      <Stack.Screen name="pago" options={{ presentation: fullScreen, animation: 'fade' }} />
      {/* Figma draws Nuevo gasto, Dividir una cuenta and Nuevo grupo full screen, not as page sheets. */}
      <Stack.Screen name="nuevo" options={{ presentation: form === 'split' ? 'card' : fullScreen }} />
      <Stack.Screen name="dividir" options={sheet(t.surface)} />
      <Stack.Screen name="invitar" options={sheet(t.surface)} />
      <Stack.Screen name="pagar" options={sheet(t.surface)} />
      <Stack.Screen name="emoji" options={sheet(t.surface)} />
      <Stack.Screen name="persona" options={sheet(t.surface)} />
      <Stack.Screen name="gasto" />
      <Stack.Screen name="resumen" />
      <Stack.Screen name="buscar" options={{ animation: 'fade' }} />
      <Stack.Screen name="entrar/index" />
      <Stack.Screen name="entrar/codigo" />
      <Stack.Screen name="cuenta" options={{ presentation: form === 'split' ? 'card' : fullScreen }} />
      <Stack.Screen name="grupo-nuevo" options={{ presentation: form === 'split' ? 'card' : fullScreen }} />
      <Stack.Screen name="t/[code]" options={{ animation: 'fade' }} />
    </Stack>
  );
}
