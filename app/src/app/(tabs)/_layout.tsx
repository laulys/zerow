import { Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';
import { useTheme } from '../../theme/useTheme';

export default function TabsLayout() {
  const { t } = useTheme();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.page } }}>
      <Tabs.Screen name="grupos" />
      <Tabs.Screen name="actividad" />
      <Tabs.Screen name="perfil" />
    </Tabs>
  );
}
