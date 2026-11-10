import type { BottomTabBarProps } from 'expo-router/tabs';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { BrandGradient } from './BrandGradient';
import { Icon, type IconName } from './Icon';
import { T, Tap } from './ui';

const tabs: { route: string; label: string; icon: IconName }[] = [
  { route: 'grupos', label: 'Grupos', icon: 'users' },
  { route: 'actividad', label: 'Actividad', icon: 'activity' },
  { route: 'perfil', label: 'Perfil', icon: 'user' },
];

/** Floating pill tab bar with a label on every tab, plus the round capture button. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  return (
    <View style={[styles.row, { bottom: Math.max(insets.bottom - 8, 12) }]} pointerEvents="box-none">
      <View style={[styles.pill, { backgroundColor: t.panel }]} accessibilityRole="tablist">
        {tabs.map((tab, i) => {
          const on = current === tab.route;
          const color = on ? t.inkFixed : t.onPanelMuted;
          return (
            <Tap
              key={tab.route}
              onPress={() => {
                const route = state.routes.find((r) => r.name === tab.route);
                if (route) navigateToTab(route.key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${tab.label}, pestaña ${i + 1} de ${tabs.length}`}
              style={[styles.tab, on && { backgroundColor: t.onPanel }]}
            >
              <Icon name={tab.icon} size={20} color={color} />
              <T v="caption" color={color} style={styles.tabLabel}>
                {tab.label}
              </T>
            </Tap>
          );
        })}
      </View>
      <Tap onPress={() => router.push('/nuevo')} accessibilityRole="button" accessibilityLabel="Dictar un gasto" style={styles.capture}>
        <BrandGradient style={styles.captureInner} seed={11}>
          <Icon name="mic" size={26} color={t.inkFixed} />
        </BrandGradient>
      </Tap>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: { flex: 1, height: 64, borderRadius: 32, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  tab: { flex: 1, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontSize: 11, lineHeight: 13, fontFamily: 'SpaceGrotesk_500Medium' },
  capture: { width: 64, height: 64, borderRadius: 32, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  captureInner: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
