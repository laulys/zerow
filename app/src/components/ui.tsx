import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { font } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon, type IconName } from './Icon';

/** Type scale from the Figma text styles. */
export const type = StyleSheet.create({
  display: { fontFamily: font.medium, fontSize: 40, lineHeight: 44, letterSpacing: -1.2 },
  titleL: { fontFamily: font.medium, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  titleM: { fontFamily: font.medium, fontSize: 22, lineHeight: 26, letterSpacing: -0.3 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: font.medium, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: font.regular, fontSize: 14, lineHeight: 18 },
  labelStrong: { fontFamily: font.medium, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: font.regular, fontSize: 13, lineHeight: 17 },
});

export function T({ v, color, style, children, ...rest }: Omit<TextProps, 'style'> & { v: keyof typeof type; color: string; style?: StyleProp<TextStyle>; children: ReactNode }) {
  return (
    <Text style={[type[v], { color }, style]} {...rest}>
      {children}
    </Text>
  );
}

/**
 * Any tappable thing. It sinks to 0.97 and comes back on a spring (Apple's
 * interruptible press feel), not an instant jump. Still with Reduce Motion.
 */
const APressable = Animated.createAnimatedComponent(Pressable);
export const pressSpring = { damping: 18, stiffness: 420, mass: 0.6 } as const;

export function Tap({ style, children, onPressIn, onPressOut, ...props }: PressableProps & { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const scale = useSharedValue(1);
  const reduce = useReducedMotion();
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <APressable
      {...props}
      onPressIn={(e) => {
        if (!reduce) scale.value = withSpring(0.97, pressSpring);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, pressSpring);
        onPressOut?.(e);
      }}
      style={[style, anim]}
    >
      {children}
    </APressable>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'onGradient' | 'text';

export function Button({ label, onPress, kind = 'primary', icon, leading, style, height = 56, color, disabled }: { label: string; onPress?: () => void; kind?: ButtonKind; icon?: IconName; leading?: ReactNode; style?: StyleProp<ViewStyle>; height?: number; color?: string; disabled?: boolean }) {
  const { t } = useTheme();
  const bg = kind === 'primary' ? t.action : kind === 'onGradient' ? t.inkFixed : kind === 'secondary' ? t.fill : 'transparent';
  const fg = color ?? (kind === 'primary' ? t.onAction : kind === 'onGradient' ? '#FFFFFF' : t.ink);
  return (
    <Tap
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={[disabled && { opacity: 0.4 }, { height, borderRadius: height / 2, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 }, kind === 'secondary' && { borderWidth: 1, borderColor: t.line }, style]}
    >
      {leading}
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <T v="labelStrong" color={fg}>
        {label}
      </T>
    </Tap>
  );
}

export function IconButton({ name, label, onPress, bg, color, size = 44 }: { name: IconName; label: string; onPress?: () => void; bg: string; color: string; size?: number }) {
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={20} color={color} />
    </Tap>
  );
}

/** Logo: two offset halves of a coin. */
export function ZerowMark({ size = 32, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden>
      <Path d="M47 17A26 26 0 0 0 47 69Z" fill={color} />
      <Path d="M53 31A26 26 0 0 1 53 83Z" fill={color} />
    </Svg>
  );
}

export function Lockup({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessible accessibilityRole="header" accessibilityLabel="Zerow">
      <ZerowMark size={size * 1.1} color={color} />
      <Text style={{ fontFamily: font.medium, fontSize: size, letterSpacing: -size * 0.04, color }}>zerow</Text>
    </View>
  );
}

export function Card({ children, style, bg }: { children: ReactNode; style?: StyleProp<ViewStyle>; bg: string }) {
  return <View style={[{ backgroundColor: bg, borderRadius: 20, padding: 16 }, style]}>{children}</View>;
}

export function Hairline({ color, inset = 0 }: { color: string; inset?: number }) {
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: color, marginLeft: inset, opacity: 0.6 }} />;
}

/** Pill used for choices (type, people, settings). Selected is neutral, never lime. */
export function Chip({ label, selected, onPress, icon, leading, dashed, off }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; leading?: ReactNode; dashed?: boolean; off?: boolean }) {
  const { t } = useTheme();
  const fg = selected ? t.onSelected : t.ink;
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: off === undefined ? !!selected : !off }}
      accessibilityLabel={label}
      style={[
        { height: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: leading ? 6 : 14, paddingRight: 14, backgroundColor: selected ? t.selected : t.fill },
        dashed && { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.line },
        off && { opacity: 0.4 },
      ]}
    >
      {leading}
      {icon ? <Icon name={icon} size={16} color={fg} /> : null}
      <T v="labelStrong" color={fg}>
        {label}
      </T>
    </Tap>
  );
}

/** Two-option switch, e.g. Euro / Dólar. The chosen side is lime. */
export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.surface, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: t.line }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Tap key={o.key} onPress={() => onChange(o.key)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.lime : 'transparent' }}>
            <T v="labelStrong" color={on ? t.onLime : t.ink}>
              {o.label}
            </T>
          </Tap>
        );
      })}
    </View>
  );
}

/** Labelled text field. The label stays visible above the input. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const { t } = useTheme();
  return (
    <View style={{ marginTop: 20 }}>
      <T v="labelStrong" color={t.ink} style={{ marginBottom: 8 }}>
        {label}
      </T>
      {children}
    </View>
  );
}

export const inputStyle = (t: { surface: string; line: string; ink: string }) => ({
  height: 56,
  borderRadius: 16,
  backgroundColor: t.surface,
  borderWidth: 1,
  borderColor: t.line,
  paddingHorizontal: 16,
  color: t.ink,
  fontFamily: font.regular,
  fontSize: 16,
});
