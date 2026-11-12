import type { BottomTabBarProps } from 'expo-router/tabs';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { BrandGradient } from './BrandGradient';
import { Glass } from './Glass';
import { Icon, type IconName } from './Icon';
import { T, Tap } from './ui';

const tabs: { route: string; label: string; icon: IconName }[] = [
  { route: 'grupos', label: 'Grupos', icon: 'users' },
  { route: 'actividad', label: 'Actividad', icon: 'activity' },
  { route: 'perfil', label: 'Perfil', icon: 'user' },
];

/** Floating pill tab bar (Liquid Glass on iOS 26) with a label on every tab, plus the round capture button. */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index]?.name;
  const bottom = Math.max(insets.bottom - 8, 12);
  return (
    <>
      {/* Lists end in a fade above the floating bar instead of running under its labels. */}
      <View pointerEvents="none" style={[styles.fade, { height: bottom + 64 + 48 }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="tabfade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.page} stopOpacity={0} />
              <Stop offset="0.5" stopColor={t.page} stopOpacity={0.88} />
              <Stop offset="1" stopColor={t.page} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#tabfade)" />
        </Svg>
      </View>
      <View style={[styles.row, { bottom }]} pointerEvents="box-none">
        <Glass fallback={t.panelRaised} style={styles.pill} accessibilityRole="tablist">
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
                <T v="caption" color={color} style={styles.tabLabel} maxFontSizeMultiplier={1}>
                  {tab.label}
                </T>
              </Tap>
            );
          })}
        </Glass>
        <Tap onPress={() => router.push('/nuevo')} accessibilityRole="button" accessibilityLabel="Dictar un gasto" style={styles.capture}>
          <BrandGradient style={styles.captureInner} seed={11}>
            <Icon name="mic" size={26} color={t.inkFixed} />
          </BrandGradient>
        </Tap>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  row: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: {
    flex: 1,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  tab: { flex: 1, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontSize: 11, lineHeight: 13, fontWeight: '600' },
  // The capture button glows softly in lime (18 %), centred under it.
  capture: { width: 64, height: 64, borderRadius: 32, shadowColor: '#CBF26B', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  captureInner: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
