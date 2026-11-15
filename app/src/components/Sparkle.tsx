import Svg, { Path } from 'react-native-svg';

/** Figma «Destello»: the four-point star (inner radius 32 %) that marks what Zerow prepared, «Por revisar». */
export function Sparkle({ size = 14, color }: { size?: number; color: string }) {
  const c = size / 2;
  const i = c * 0.32 * Math.SQRT1_2;
  const d = `M${c} 0L${c + i} ${c - i}L${size} ${c}L${c + i} ${c + i}L${c} ${size}L${c - i} ${c + i}L0 ${c}L${c - i} ${c - i}Z`;
  return (
    <Svg width={size} height={size} accessibilityElementsHidden>
      <Path d={d} fill={color} />
    </Svg>
  );
}
