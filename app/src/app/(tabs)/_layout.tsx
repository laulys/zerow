import { Tabs } from 'expo-router';
import { Easing } from 'react-native';
import { useRailInset } from '../../components/Screen';
import { TabBar } from '../../components/TabBar';
import { TabChromeProvider } from '../../components/TabChrome';
import { motion } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

// Switching tabs is something you do many times a day, so the page just cross-fades,
// quickly (180 ms, strong ease-out), while the highlight in the bar slides to the new tab.
const crossFade = { animation: 'timing', config: { duration: motion.tab, easing: Easing.bezier(0.23, 1, 0.32, 1) } } as const;

export default function TabsLayout() {
  const { t } = useTheme();
  const rail = useRailInset();
  return (
    <TabChromeProvider>
      <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.page, paddingRight: rail }, animation: 'fade', transitionSpec: crossFade }}>
        <Tabs.Screen name="grupos" />
        <Tabs.Screen name="actividad" />
        <Tabs.Screen name="perfil" />
      </Tabs>
    </TabChromeProvider>
  );
}
