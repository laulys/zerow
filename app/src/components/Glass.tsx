import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

const liquid = isLiquidGlassAvailable();

function useReduceTransparency() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled().then(setOn);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

/**
 * iOS 26 Liquid Glass for controls that float over content (the tab bar, the
 * capture bar). Per Apple's guidance it's only for the navigation layer, never
 * for content. Falls back to the solid `fallback` colour on older iOS, Android,
 * or when the user turns on Reduce Transparency.
 */
export function Glass({ fallback, style, children, ...rest }: ViewProps & { fallback: string; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const reduce = useReduceTransparency();
  if (!liquid || reduce) {
    return (
      <View {...rest} style={[style, { backgroundColor: fallback }]}>
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
