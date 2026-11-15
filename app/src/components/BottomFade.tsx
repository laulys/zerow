import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';

/**
 * Figma «Fundido»: the page colour rising from clear to solid at 60 %, so content
 * scrolls away under the bottom controls. It sits along the bottom edge of its
 * parent. Pass `height` for a band that tall (in points); without it the fade is
 * as tall as its parent, and `style` places it (e.g. `StyleSheet.absoluteFill`).
 */
export function BottomFade({ height, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const { t } = useTheme();
  const h = height ?? '100%';
  return (
    <Svg pointerEvents="none" style={StyleSheet.flatten([styles.fade, height !== undefined && { height }, style])} width="100%" height={h}>
      <Defs>
        <LinearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.page} stopOpacity={0} />
          <Stop offset="0.6" stopColor={t.page} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height={h} fill="url(#bottomFade)" />
    </Svg>
  );
}

const styles = StyleSheet.create({ fade: { position: 'absolute', left: 0, right: 0, bottom: 0 } });
