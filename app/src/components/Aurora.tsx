import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/useTheme';
import { useScreen } from './Screen';

/** One Figma «Aurora» ellipse in the 393-wide frame: x, y, width, height and the opacity at its centre. */
type Ellipse = readonly [x: number, y: number, w: number, h: number, peak: number];
type Preset = { clip: number; lime: Ellipse; mint: Ellipse };

/**
 * The «Aurora» frames of Figma's iPhone screens, measured exactly. Each kind of
 * screen has its own: bigger and stronger behind the groups, softer on forms,
 * rising from the bottom while dictating.
 */
export const auroraPresets = {
  /** 2.1 Inicio and the sheets over it. */
  inicio: { clip: 340, lime: [-204, -260, 722, 600, 0.34], mint: [72, -200, 570, 520, 0.26] },
  /** 1.2 Bienvenida · cuéntaselo. */
  welcome: { clip: 360, lime: [-204, -240, 722, 600, 0.27], mint: [72, -180, 570, 520, 0.2] },
  /** 1.3–1.6 onboarding, 1.8 código, 2.5 dividir, 2.6 nuevo grupo, 6.8. */
  onboarding: { clip: 180, lime: [-124, -300, 578, 480, 0.2], mint: [97, -252, 456, 416, 0.15] },
  /** 1.7 iniciar sesión. */
  signin: { clip: 415, lime: [-265, -275, 830, 690, 0.34], mint: [53, -206, 656, 598, 0.26] },
  /** 2.2 Actividad, 5.2 te invitaron. */
  tab: { clip: 230, lime: [-164, -310, 650, 540, 0.24], mint: [84, -256, 513, 468, 0.18] },
  /** 2.12 buscar, 3.5–3.7, 3.9, 4.1–4.6, 6.3, 6.6: screens about one task. */
  task: { clip: 180, lime: [-124, -300, 578, 480, 0.17], mint: [97, -252, 456, 416, 0.13] },
  /** 3.1–3.3, 3.8 a group, 5.1, 5.3, 6.7. */
  group: { clip: 235, lime: [-144, -275, 614, 510, 0.34], mint: [90, -224, 485, 442, 0.26] },
  /** 3.4 dictando: the light rises from the bottom. */
  dictation: { clip: 852, lime: [-245, 552, 794, 660, 0.3], mint: [59, 618, 627, 572, 0.23] },
  /** 4.4 a cero. */
  zero: { clip: 595, lime: [-265, -95, 830, 690, 0.34], mint: [53, -26, 656, 598, 0.26] },
  /** 4.7–4.8 pago enviado. */
  receipt: { clip: 390, lime: [-164, -150, 650, 540, 0.27], mint: [84, -96, 513, 468, 0.2] },
  /** 5.4 te uniste, 6.5 viaje sin gastos. */
  joined: { clip: 235, lime: [-144, -275, 614, 510, 0.27], mint: [90, -224, 485, 442, 0.2] },
  /** 6.1 inicio cargando. */
  loading: { clip: 340, lime: [-204, -260, 722, 600, 0.2], mint: [72, -200, 570, 520, 0.15] },
} satisfies Record<string, Preset>;
export type AuroraPreset = keyof typeof auroraPresets;

// Figma's radial stops: the centre's opacity eased out to nothing (0, .12, .25, … 1).
const STOPS = [
  [0, 1],
  [0.12, 0.88],
  [0.25, 0.71],
  [0.4, 0.5],
  [0.55, 0.29],
  [0.7, 0.15],
  [0.85, 0.06],
  [1, 0],
] as const;

/**
 * The v3 ambient light: the brand's lime and mint as two soft radial glows,
 * fading into the graphite page. Pass `preset` to get a screen's exact Figma
 * light (positions scale with the screen's width; heights stay in points).
 * Without it, the older parametric glow (`height`, `strength`) is drawn.
 * `overscroll` extends it upwards for screens where it scrolls with the
 * content and the list can be pulled down.
 */
export function Aurora({ preset, height = 460, overscroll = 0, strength = 1 }: { preset?: AuroraPreset; height?: number; overscroll?: number; strength?: number }) {
  const { t } = useTheme();
  // The whole screen's width, so on the Duo the light also reaches the control column.
  const { width } = useScreen();
  const p: Preset = preset
    ? auroraPresets[preset]
    : {
        clip: height,
        lime: [width * 0.24 - width * 0.95, height * 0.06 - height * 0.82, width * 1.9, height * 1.64, 0.34 * strength],
        mint: [width * 0.92 - width * 0.8, height * 0.2 - height * 0.7, width * 1.6, height * 1.4, 0.26 * strength],
      };
  // Presets are measured on a 393-wide frame; legacy ellipses are already in this screen's points.
  const k = preset ? width / 393 : 1;
  const h = p.clip + overscroll;
  const grad = (id: string, [x, y, w, eh, peak]: Ellipse, color: string) => (
    <RadialGradient id={id} cx={(x + w / 2) * k} cy={overscroll + y + eh / 2} rx={(w / 2) * k} ry={eh / 2} gradientUnits="userSpaceOnUse">
      {STOPS.map(([o, f]) => (
        <Stop key={o} offset={o} stopColor={color} stopOpacity={peak * f} />
      ))}
    </RadialGradient>
  );
  return (
    <Svg pointerEvents="none" style={[styles.wrap, { top: -overscroll }]} width={width} height={h}>
      <Defs>
        {grad('auroraLime', p.lime, t.lime)}
        {grad('auroraMint', p.mint, t.mint)}
      </Defs>
      <Rect width={width} height={h} fill="url(#auroraLime)" />
      <Rect width={width} height={h} fill="url(#auroraMint)" />
    </Svg>
  );
}

const styles = StyleSheet.create({ wrap: { position: 'absolute', left: 0 } });
