import { Tabs } from 'expo-router';
import { useRailInset } from '../../components/Screen';
import { TabBar } from '../../components/TabBar';
import { useTheme } from '../../theme/useTheme';

export default function TabsLayout() {
  const { t } = useTheme();
  const rail = useRailInset();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.page, paddingRight: rail } }}>
      <Tabs.Screen name="grupos" />
      <Tabs.Screen name="actividad" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
