import { Canvas, Picture, Skia, createPicture, useClock } from '@shopify/react-native-skia';
import { useLowPowerMode } from 'expo-battery';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useDerivedValue, useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';

export type OrbState = 'breathing' | 'listening' | 'composing';

/** Points spread evenly over a unit sphere (golden-angle spiral), as in Figma. */
function sphere(n: number): number[] {
  const out: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    out.push(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r);
  }
  return out;
}

const speed: Record<OrbState, number> = { breathing: 0.06, listening: 0.1, composing: 0.3 };

/**
 * Zerow's face: a sphere of dots that turns while the agent works (inspired by
 * Thinking Orbs). Front dots are lime, back dots fade to ink. On the brand
 * gradient pass `onGradient` so every dot is dark ink. Still with Reduce Motion
 * or Low Power Mode.
 */
export function Orb({ size = 64, state = 'breathing', onGradient = false, label }: { size?: number; state?: OrbState; onGradient?: boolean; label?: string }) {
  const { t } = useTheme();
  const clock = useClock();
  const lowPower = useLowPowerMode();
  const reduceMotion = useReducedMotion();
  const still = lowPower || reduceMotion;
  const n = size >= 40 ? 72 : 26;
  const pts = useMemo(() => sphere(n), [n]);
  const dot = size >= 40 ? size * 0.078 : size * 0.12;
  const front = onGradient ? t.inkFixed : t.lime;
  const back = onGradient ? t.inkFixed : t.ink;

  const picture = useDerivedValue(() =>
    createPicture(
      (canvas) => {
        const sec = still ? 0.6 : clock.value / 1000;
        const ang = sec * speed[state] * Math.PI * 2;
        const pulse = still ? 1 : state === 'listening' ? 1 + 0.06 * (1 - Math.cos((sec * Math.PI * 2) / 0.8)) : state === 'breathing' ? 1 + 0.015 * (1 - Math.cos((sec * Math.PI * 2) / 3)) : 1;
        const R = (size / 2 - dot) * pulse;
        const tilt = 0.45;
        const ca = Math.cos(ang),
          sa = Math.sin(ang),
          ct = Math.cos(tilt),
          st = Math.sin(tilt);
        const paint = Skia.Paint();
        const cFront = Skia.Color(front);
        const cBack = Skia.Color(back);
        for (let i = 0; i < pts.length; i += 3) {
          const x = pts[i] * ca - pts[i + 2] * sa;
          const z = pts[i] * sa + pts[i + 2] * ca;
          const y = pts[i + 1] * ct - z * st;
          const z2 = pts[i + 1] * st + z * ct;
          const depth = (z2 + 1) / 2;
          const isFront = depth > 0.55;
          paint.setColor(isFront ? cFront : cBack);
          // Figma: the back dots are near-white (#F2F2EE) and clearly visible, not faded to grey.
          paint.setAlphaf(onGradient ? Math.min(1, 0.3 + depth * 0.7) : isFront ? 0.35 + 0.65 * depth : 0.45 + 0.55 * depth);
          canvas.drawCircle(size / 2 + x * R, size / 2 + y * R, (dot * (0.5 + 0.7 * depth)) / 2, paint);
        }
      },
      { width: size, height: size },
    ),
  );

  return (
    <View style={{ width: size, height: size }} accessible={!!label} accessibilityLabel={label} importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}>
      <Canvas style={{ width: size, height: size }} pointerEvents="none">
        <Picture picture={picture} />
      </Canvas>
    </View>
  );
}
