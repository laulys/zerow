import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { font } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon, type IconName } from './Icon';

/**
 * Type scale from the Figma "v3/…" text styles. Space Grotesk Medium for
 * headlines and titles; SF Pro (the system font) for everything you read:
 * body 17, note 15, footnote 13 (the smallest size in the app).
 */
export const type = StyleSheet.create({
  display: { fontFamily: font.medium, fontSize: 40, lineHeight: 44, letterSpacing: -0.8 },
  titleL: { fontFamily: font.medium, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  titleM: { fontFamily: font.medium, fontSize: 22, lineHeight: 26, letterSpacing: -0.3 },
  /** Section headers on a screen (Contactos, Anteriores): a step under the card titles, like iOS grouped headers. */
  section: { fontFamily: font.medium, fontSize: 20, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  bodyStrong: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2, fontWeight: '600' },
  label: { fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  labelStrong: { fontSize: 15, lineHeight: 20, letterSpacing: -0.1, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18 },
});

/** Emphasis inside SF Pro text (replaces switching to Space Grotesk Medium). */
export const strong = { fontWeight: '600' } as const;

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

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  leading,
  style,
  height = 56,
  color,
  bg: bgProp,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  kind?: ButtonKind;
  icon?: IconName;
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
  height?: number;
  color?: string;
  /** Overrides the fill, e.g. the logo's black on the all-lime welcome screen. */
  bg?: string;
  disabled?: boolean;
}) {
  const { t } = useTheme();
  // Primary is lime with a soft lime glow; secondary is glass with no outline;
  // on a lime card the dark button takes the graphite of the cards.
  const bg = bgProp ?? (kind === 'primary' ? t.action : kind === 'onGradient' ? t.onLimeButton : kind === 'secondary' ? t.glass : 'transparent');
  const fg = color ?? (kind === 'primary' ? t.onAction : kind === 'onGradient' ? t.ink : t.ink);
  return (
    <Tap
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        disabled && { opacity: 0.4 },
        { height, borderRadius: height / 2, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
        kind === 'primary' && !bgProp && !disabled && { shadowColor: t.lime, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
        style,
      ]}
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
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
    >
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

/**
 * v3 Aurora cards: translucent white (7 %) so the page and its glow show
 * through, radius 28, no border and no sheen. Pass `bg` only for the cards that
 * are not the standard surface (a lime one, a raised one).
 */
export function Card({ children, style, bg }: { children: ReactNode; style?: StyleProp<ViewStyle>; bg?: string; sheen?: boolean }) {
  const { t } = useTheme();
  const fill = !bg || bg === t.surface || bg === t.panel ? t.card : bg;
  return <View style={[{ backgroundColor: fill, borderRadius: 28, padding: 16 }, style]}>{children}</View>;
}

export function Hairline({ color, inset = 0 }: { color: string; inset?: number }) {
  // Soft: rows are already separated by spacing; the line only hints at the break.
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: color, marginLeft: inset, opacity: 0.35 }} />;
}

/** Pill used for choices (type, people, settings). Selected is neutral, never lime. */
export function Chip({
  label,
  selected,
  onPress,
  icon,
  leading,
  dashed,
  off,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  leading?: ReactNode;
  dashed?: boolean;
  off?: boolean;
}) {
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
        dashed && { backgroundColor: t.glass },
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
    <View style={{ flexDirection: 'row', backgroundColor: t.card, borderRadius: 16, padding: 4 }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Tap
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={{ flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.lime : 'transparent' }}
          >
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

/** Fields are 56 pt tall, translucent like the cards, with no outline. */
export const inputStyle = (t: { fill: string; ink: string }) => ({
  height: 56,
  borderRadius: 16,
  backgroundColor: t.fill,
  paddingHorizontal: 16,
  color: t.ink,
  fontSize: 17,
});
