import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';

/**
 * The v3 ambient light: the brand's lime and mint as two soft radial glows at
 * the top of a screen, fading into the graphite page. The stops are eased (no
 * visible band) and it is drawn inside the screen's own bounds, so nothing is
 * cut. `overscroll` extends it upwards for screens where it scrolls with the
 * content and the list can be pulled down.
 */
export function Aurora({ height = 460, overscroll = 0, strength = 1 }: { height?: number; overscroll?: number; strength?: number }) {
  const { t } = useTheme();
  const { width } = useWindowDimensions();
  const h = height + overscroll;
  // Eased fall-off: most of the light sits near the centre and the tail is long.
  const stops = (color: string, peak: number) => [
    <Stop key="0" offset="0" stopColor={color} stopOpacity={peak * strength} />,
    <Stop key="1" offset="0.25" stopColor={color} stopOpacity={peak * 0.74 * strength} />,
    <Stop key="2" offset="0.5" stopColor={color} stopOpacity={peak * 0.4 * strength} />,
    <Stop key="3" offset="0.75" stopColor={color} stopOpacity={peak * 0.13 * strength} />,
    <Stop key="4" offset="1" stopColor={color} stopOpacity={0} />,
  ];
  return (
    <Svg pointerEvents="none" style={[styles.wrap, { top: -overscroll }]} width={width} height={h}>
      <Defs>
        <RadialGradient id="auroraLime" cx={width * 0.24} cy={overscroll + height * 0.06} rx={width * 0.95} ry={height * 0.82} gradientUnits="userSpaceOnUse">
          {stops(t.lime, 0.34)}
        </RadialGradient>
        <RadialGradient id="auroraMint" cx={width * 0.92} cy={overscroll + height * 0.2} rx={width * 0.8} ry={height * 0.7} gradientUnits="userSpaceOnUse">
          {stops(t.mint, 0.26)}
        </RadialGradient>
      </Defs>
      <Rect width={width} height={h} fill="url(#auroraLime)" />
      <Rect width={width} height={h} fill="url(#auroraMint)" />
    </Svg>
  );
}

const styles = StyleSheet.create({ wrap: { position: 'absolute', left: 0 } });
