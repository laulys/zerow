import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

const liquid = isLiquidGlassAvailable();

/** iOS 26: sheets get the system's Liquid Glass when their background is clear. */
export const glassSheets = liquid;

function useReduceTransparency() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled().then(setOn);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

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
 * iOS 26 Liquid Glass for controls that float over content (the tab bar, the
 * capture bar). Per Apple's guidance it's only for the navigation layer, never
 * for content. Falls back to the solid `fallback` colour on older iOS, Android,
 * or when the user turns on Reduce Transparency or Increase Contrast; the solid
 * version has no outline (v3) unless Increase Contrast asks for one.
 */
export function Glass({ fallback, style, children, ...rest }: ViewProps & { fallback: string; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const { t } = useTheme();
  const reduce = useReduceTransparency();
  const contrast = useIncreaseContrast();
  if (!liquid || reduce || contrast) {
    return (
      <View {...rest} style={[style, { backgroundColor: fallback }, contrast && { borderWidth: 1.5, borderColor: t.inkMuted }]}>
        {children}
      </View>
    );
  }
  return (
    <GlassView {...rest} glassEffectStyle="regular" colorScheme="dark" style={style}>
      {children}
    </GlassView>
  );
}
