import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { Frost } from './Frost';

const liquid = isLiquidGlassAvailable();

/** iOS 26: sheets get the system's Liquid Glass when their background is clear. */
export const glassSheets = liquid;

export { useReduceTransparency } from './Frost';

/** iOS "Increase Contrast" (darker system colours): glass turns solid with a visible edge. */
function useIncreaseContrast() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isDarkerSystemColorsEnabled?.().then(setOn);
    const sub = AccessibilityInfo.addEventListener('darkerSystemColorsChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

/**
 * The v3 glass for things that float (the header controls, the tab bar, the
 * capture bar): a translucent white fill over a background blur, as in Figma,
 * where these are drawn with «Background blur» and, in the header and the
 * navigation, a white 8 % edge (`stroke`). The system Liquid Glass read darker
 * than the design, so it is no longer used here. With Increase Contrast the
 * edge turns solid; Reduce Transparency is handled by `Frost`.
 */
export function Glass({ fallback, stroke, style, children, ...rest }: ViewProps & { fallback: string; stroke?: boolean; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const { t } = useTheme();
  const contrast = useIncreaseContrast();
  const r = (StyleSheet.flatten(style)?.borderRadius as number | undefined) ?? 0;
  return (
    <View {...rest} style={[style, stroke && { borderWidth: 1, borderColor: t.controlStroke }, contrast && { borderWidth: 1.5, borderColor: t.inkMuted }]}>
      <Frost fill={fallback} radius={r} intensity={stroke ? 16 : 20} />
      {children}
    </View>
  );
}
