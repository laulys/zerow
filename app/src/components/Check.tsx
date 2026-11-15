import Svg, { Path } from 'react-native-svg';

/** The «done» check («Sumado por ti», a paid row), 16 pt with Figma's heavier 2.25 stroke; `heavy` is the 2.5 of the «A cero» badge. */
export function Check({ color, heavy }: { color: string; heavy?: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={heavy ? 3.75 : 3.375} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}
