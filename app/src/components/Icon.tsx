import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Lucide icons (ISC license), 1.75 stroke, same set as the Figma components.
const paths: Record<string, string[]> = {
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  activity: ['M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2'],
  user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'],
  mic: ['M12 19v3', 'M19 10v2a7 7 0 0 1-14 0v-2'],
  keyboard: ['M10 8h.01', 'M12 12h.01', 'M14 8h.01', 'M16 12h.01', 'M18 8h.01', 'M6 8h.01', 'M7 16h10', 'M8 12h.01'],
  'chevron-left': ['m15 18-6-6 6-6'],
  'chevron-right': ['m9 18 6-6-6-6'],
  plus: ['M5 12h14', 'M12 5v14'],
  check: ['M20 6 9 17l-5-5'],
  'arrow-right': ['M5 12h14', 'm12 5 7 7-7 7'],
  'user-plus': ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M19 8v6', 'M22 11h-6'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  house: ['M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8', 'M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  pen: ['M12 20h9', 'M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z'],
  undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
  // Drawn as Figma's «arrow-right-left»: the top arrow points right, the bottom one left.
  'arrow-left-right': ['m16 3 4 4-4 4', 'M20 7H4', 'm8 21-4-4 4-4', 'M4 17h16'],
  receipt: ['M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z', 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8', 'M12 17.5v-11'],
  plane: [
    'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
  ],
  gift: ['M12 8v13', 'M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7', 'M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5'],
  shapes: ['M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z'],
  link: ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'],
  copy: ['M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'],
  share: ['M12 2v13', 'm16 6-4-4-4 4', 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8'],
  mail: ['m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'],
  bell: ['M10.268 21a2 2 0 0 0 3.464 0', 'M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326'],
  'log-out': ['m16 17 5-5-5-5', 'M21 12H9', 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'],
  search: ['m21 21-4.34-4.34'],
  landmark: ['M10 18v-7', 'M11.12 2.198a2 2 0 0 1 1.76.006l7.866 3.847c.476.233.31.949-.22.949H3.474c-.53 0-.695-.716-.22-.949z', 'M14 18v-7', 'M18 18v-7', 'M3 22h18', 'M6 18v-7'],
};

const circles: Record<string, [number, number, number][]> = {
  users: [[9, 7, 4]],
  user: [[12, 7, 4]],
  'user-plus': [[9, 7, 4]],
  shapes: [[17.5, 17.5, 3.5]],
  search: [[11, 11, 8]],
};

const rects: Record<string, [number, number, number, number, number][]> = {
  mic: [[9, 2, 6, 13, 3]],
  keyboard: [[2, 4, 20, 16, 2]],
  gift: [[3, 8, 18, 4, 1]],
  shapes: [[3, 14, 7, 7, 1]],
  copy: [[8, 8, 14, 14, 2]],
  mail: [[2, 4, 20, 16, 2]],
};

export type IconName = keyof typeof paths;

// Figma draws these at 2 pt; every other icon at 1.75 pt.
const heavy = new Set<IconName>(['mic', 'check', 'arrow-right', 'undo', 'pen']);

/**
 * Line icon. Figma's stroke weights are absolute (1.75 pt, 2 pt for the ones in
 * `heavy`) whatever the icon's size, so the stroke is scaled back from the 24
 * box: a 20 pt icon still draws a 1.75 pt line, not 1.46.
 */
export function Icon({ name, size = 20, color, weight }: { name: IconName; size?: number; color: string; weight?: number }) {
  const w = weight ?? (heavy.has(name) ? 2 : 1.75);
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={(w * 24) / size} strokeLinecap="round" strokeLinejoin="round">
      {paths[name].map((d) => (
        <Path key={d} d={d} />
      ))}
      {(circles[name] ?? []).map(([cx, cy, r]) => (
        <Circle key={`${cx}${cy}`} cx={cx} cy={cy} r={r} />
      ))}
      {(rects[name] ?? []).map(([x, y, w, h, rx]) => (
        <Rect key={`${x}${y}`} x={x} y={y} width={w} height={h} rx={rx} />
      ))}
    </Svg>
  );
}

/**
 * Brand marks for the sign-in buttons. Filled, not stroked.
 * The apple's box includes the leaf, so centring the box leaves the body low;
 * it's lifted to its centre of mass (2.3 pt of 26 below the box's middle).
 */
export function AppleMark({ size = 18, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: [{ translateY: -(size * 2.3) / 26 }] }} accessibilityElementsHidden>
      <Path
        fill={color}
        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
      />
    </Svg>
  );
}

export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </Svg>
  );
}
