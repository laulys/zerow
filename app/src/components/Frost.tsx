import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

/** iOS Reduce Transparency: glass turns solid. */
export function useReduceTransparency() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled().then(setOn);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

// What the translucent fills look like over the graphite page, for Reduce Transparency.
const solid: Record<string, string> = {
  'rgba(255,255,255,0.07)': '#2B2B2E',
  'rgba(255,255,255,0.10)': '#303033',
  'rgba(255,255,255,0.14)': '#38383B',
  'rgba(255,255,255,0.12)': '#343437',
};

/**
 * The v3 frosted backdrop: a background blur with the translucent fill on top
 * (white 7 % for cards, 12 % for glass controls), like Figma's background blur.
 * Drop it in as the first child of a container with no background of its own;
 * it fills the container and follows its corners. With Reduce Transparency it
 * turns into the equivalent solid colour.
 */
export function Frost({ fill, radius, intensity = 28 }: { fill: string; radius: number; intensity?: number }) {
  const reduce = useReduceTransparency();
  if (reduce) return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: solid[fill] ?? fill }]} />;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
    </View>
  );
}
