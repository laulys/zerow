import type { BottomTabBarProps } from 'expo-router/tabs';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { BrandGradient } from './BrandGradient';
import { Frost } from './Frost';
import { Glass } from './Glass';
import { RAIL, useScreen } from './Screen';
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
  // Figma: the bar sits 20 pt above the bottom edge (over the home indicator's area).
  const bottom = Math.max(insets.bottom - 14, 12);
  const { form } = useScreen();
  const go = (route: string) => {
    const r = state.routes.find((x) => x.name === route);
    if (r) navigateToTab(r.key);
  };
  if (form !== 'compact') {
    // iPhone Duo: the bar becomes a rail of icons in the control column. On the
    // open Duo, Grupos already has its capture bar in the detail pane, so no mic.
    const mic = !(form === 'split' && current === 'grupos');
    return (
      <View style={[styles.rail, { width: RAIL }]} pointerEvents="box-none">
        <View style={styles.railPill} accessibilityRole="tablist">
          <Frost fill={t.glass} radius={29} intensity={20} />
          {tabs.map((tab, i) => {
            const on = current === tab.route;
            return (
              <Tap
                key={tab.route}
                onPress={() => go(tab.route)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${tab.label}, pestaña ${i + 1} de ${tabs.length}`}
                style={[styles.railTab, on && { backgroundColor: 'rgba(255,255,255,0.16)' }]}
              >
                <Icon name={tab.icon} size={24} color={on ? t.ink : t.inkMuted} />
              </Tap>
            );
          })}
        </View>
        {mic ? (
          <Tap onPress={() => router.push('/nuevo')} accessibilityRole="button" accessibilityLabel="Dictar un gasto" style={[styles.capture, styles.railMic]}>
            <BrandGradient style={styles.captureInner} seed={11}>
              <Icon name="mic" size={24} color={t.inkFixed} />
            </BrandGradient>
          </Tap>
        ) : null}
      </View>
    );
  }
  return (
    <>
      {/* Lists end in a fade above the floating bar instead of running under its labels. */}
      {/* Figma «Fundido»: 110 pt, page colour from clear to solid at 60 %. */}
      <View pointerEvents="none" style={[styles.fade, { height: 110 }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="tabfade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={t.page} stopOpacity={0} />
              <Stop offset="0.6" stopColor={t.page} stopOpacity={1} />
              <Stop offset="1" stopColor={t.page} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#tabfade)" />
        </Svg>
      </View>
      <View style={[styles.row, { bottom }]} pointerEvents="box-none">
        {/* Figma «Barra de pestañas»: white 12 % over a blur, the chosen tab white 16 %, light icons and labels. */}
        <Glass fallback={t.glass} style={styles.pill} accessibilityRole="tablist">
          {tabs.map((tab, i) => {
            const on = current === tab.route;
            const color = on ? t.ink : t.inkSoft;
            return (
              <Tap
                key={tab.route}
                onPress={() => go(tab.route)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${tab.label}, pestaña ${i + 1} de ${tabs.length}`}
                style={[styles.tab, on && { backgroundColor: 'rgba(255,255,255,0.16)' }]}
              >
                <Icon name={tab.icon} size={24} color={color} />
                <T v="mini" color={color} maxFontSizeMultiplier={1}>
                  {tab.label}
                </T>
              </Tap>
            );
          })}
        </Glass>
        <Tap onPress={() => router.push('/nuevo')} accessibilityRole="button" accessibilityLabel="Dictar un gasto" style={styles.capture}>
          <BrandGradient style={styles.captureInner} seed={11}>
            <Icon name="mic" size={24} color={t.inkFixed} />
          </BrandGradient>
        </Tap>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  row: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: {
    flex: 1,
    height: 64,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tab: { flex: 1, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingTop: 1 },
  // Figma «Dictar gasto»: lime glow #B6F03A at 25 %, blur 22, 6 down.
  capture: { width: 64, height: 64, borderRadius: 32, shadowColor: '#B6F03A', shadowOpacity: 0.25, shadowRadius: 11, shadowOffset: { width: 0, height: 6 } },
  captureInner: { flex: 1, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  // The Duo's rail (Figma «Barra de pestañas (vertical)»): 58 wide, 24 from the bottom edge.
  rail: { position: 'absolute', right: 0, bottom: 24, alignItems: 'center', gap: 12 },
  railPill: { width: 58, padding: 5, borderRadius: 29 },
  railTab: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  railMic: { width: 58, height: 58, borderRadius: 29 },
});
