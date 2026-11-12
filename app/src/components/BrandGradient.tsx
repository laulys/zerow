import { Canvas, Fill, FillType, Group, Shader, Skia, useClock } from '@shopify/react-native-skia';
import { useLowPowerMode } from 'expo-battery';
import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { useDerivedValue, useReducedMotion } from 'react-native-reanimated';
import { gradientStops } from '../theme/tokens';

// The same grainy lime-mint gradient as the Figma texture, as a live shader.
// It drifts slowly (the reel's "slow-moving background") and stands still with
// Low Power Mode or Reduce Motion.
const source = Skia.RuntimeEffect.Make(`
uniform float2 res;
uniform float t;
uniform float3 c0;
uniform float3 c1;
uniform float3 c2;
uniform float3 c3;
uniform float zoom;
uniform float warp;
uniform float2 off;
uniform float bias;
float h(float2 p){ return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
float n(float2 p){ float2 i = floor(p); float2 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h(i), h(i+float2(1,0)), f.x), mix(h(i+float2(0,1)), h(i+float2(1,1)), f.x), f.y); }
float fb(float2 p){ float v = 0.0; float a = 0.5; for (int k = 0; k < 5; k++){ v += a*n(p); p *= 2.0; a *= 0.5; } return v; }
half4 main(float2 xy){
  float2 p = xy / max(res.x, res.y) * zoom + off;
  float2 q = float2(fb(p*1.3 + t*0.04), fb(p*1.3 - t*0.03 + 3.1));
  float v = smoothstep(0.15, 0.85, fb(p*1.1 + q*warp + float2(t*0.02, 0.0)));
  float3 col = mix(c0, c1, smoothstep(0.0, 0.38, v));
  col = mix(col, c2, smoothstep(0.33, 0.7, v));
  col = mix(col, c3, smoothstep(0.62, 1.0, v));
  // Small discs (the mics) see only a patch of the pattern; Figma's read lime-yellow, so they lean to lime.
  col = mix(col, c2, bias);
  col += (h(xy + fract(t)*91.0) - 0.5) * 0.08;
  return half4(half3(col), 1.0);
}`)!;

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const [c0, c1, c2, c3] = gradientStops.map(rgb);

/**
 * `lively` swirls the same colours tighter and harder (a busier pattern), so a
 * second card reads as the same family without being a copy of the first.
 */
export function BrandGradient({
  style,
  children,
  seed = 3,
  lively = false,
  notch,
}: {
  style?: ViewStyle;
  children?: React.ReactNode;
  seed?: number;
  lively?: boolean;
  /** Two half-circle bites cut out of the left and right edges at `y` (a ticket's perforation). What's behind shows through. */
  notch?: { y: number; r: number };
}) {
  const [size, setSize] = useState({ w: 1, h: 1 });
  const clock = useClock();
  const lowPower = useLowPowerMode();
  const reduceMotion = useReducedMotion();
  const still = lowPower || reduceMotion;
  const uniforms = useDerivedValue(() => ({
    res: [size.w, size.h],
    t: still ? seed : seed + (clock.value / 1000) * 0.6,
    c0,
    c1,
    c2,
    c3,
    zoom: lively ? 2.2 : 1.6,
    warp: lively ? 3.0 : 1.6,
    off: lively ? [seed * 1.7, seed * 0.9] : [0, 0],
    bias: Math.min(size.w, size.h) < 100 ? 0.45 : 0,
  }));
  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  // Even-odd: the circles straddle the edges, so the half inside the card is removed
  // and the half outside falls off the canvas.
  const notchY = notch?.y;
  const notchR = notch?.r;
  const clip = useMemo(() => {
    if (notchY == null || notchR == null) return undefined;
    return Skia.PathBuilder.Make()
      .addRect(Skia.XYWHRect(0, 0, size.w, size.h))
      .addCircle(0, notchY, notchR)
      .addCircle(size.w, notchY, notchR)
      .setFillType(FillType.EvenOdd)
      .detach();
  }, [notchY, notchR, size.w, size.h]);
  return (
    // A flat lime underneath: if the shader ever fails to draw (it can after a reload
    // in Expo Go), the card is still lime and its dark text stays readable. Not with
    // notches, whose holes must show what's behind.
    <View style={[styles.wrap, !notch && { backgroundColor: gradientStops[2] }, style]} onLayout={onLayout}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Group clip={clip}>
          <Fill>
            <Shader source={source} uniforms={uniforms} />
          </Fill>
        </Group>
      </Canvas>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { overflow: 'hidden' } });
