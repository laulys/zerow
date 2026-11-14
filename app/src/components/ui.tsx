import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { font } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Frost } from './Frost';
import { Icon, type IconName } from './Icon';

/**
 * Type scale from the Figma "v3/…" text styles. Space Grotesk Medium for
 * headlines and titles; SF Pro (the system font) for everything you read:
 * body 17, note 15, footnote 13 (the smallest size in the app).
 */
export const type = StyleSheet.create({
  /** v3/Titular */
  // Tight Space Grotesk lines sit ~2 pt higher on iOS than in Figma; nudged down to match.
  display: { fontFamily: font.medium, fontSize: 40, lineHeight: 44, letterSpacing: -0.8, transform: [{ translateY: 2 }] },
  /** v3/Título L */
  titleL: { fontFamily: font.medium, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, transform: [{ translateY: 2 }] },
  /** v3/Título M */
  titleM: { fontFamily: font.medium, fontSize: 22, lineHeight: 27, letterSpacing: -0.22 },
  /** v3/Título S: section headers on a screen (Contactos, Anteriores) and card titles. */
  section: { fontFamily: font.medium, fontSize: 20, lineHeight: 25, letterSpacing: -0.2 },
  /** v3/Título XS: names on the glass strip, amounts in lists. */
  titleXS: { fontFamily: font.medium, fontSize: 17, lineHeight: 22, letterSpacing: -0.085 },
  /** v3/Cuerpo · Cuerpo fuerte */
  body: { fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  /** v3/Nota · Nota fuerte */
  label: { fontSize: 15, lineHeight: 21 },
  labelStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  /** v3/Pie */
  caption: { fontSize: 13, lineHeight: 18 },
  /** v3/Mini: tab labels. */
  mini: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
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
 * `highlight` is for list rows: like an iOS cell, the row lights up under the
 * finger (at once) and fades back when you let go, instead of shrinking away
 * from the card's edges.
 */
const APressable = Animated.createAnimatedComponent(Pressable);
export const pressSpring = { damping: 18, stiffness: 420, mass: 0.6 } as const;

export function Tap({ style, children, onPressIn, onPressOut, highlight = false, ...props }: PressableProps & { style?: StyleProp<ViewStyle>; children: ReactNode; highlight?: boolean }) {
  const { t } = useTheme();
  const scale = useSharedValue(1);
  const lit = useSharedValue(0);
  const reduce = useReducedMotion();
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const litStyle = useAnimatedStyle(() => ({ opacity: lit.value }));
  return (
    <APressable
      {...props}
      onPressIn={(e) => {
        if (highlight) lit.set(withTiming(1, { duration: 60 }));
        else if (!reduce) scale.set(withSpring(0.97, pressSpring));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (highlight) lit.set(withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }));
        else scale.set(withSpring(1, pressSpring));
        onPressOut?.(e);
      }}
      style={highlight ? style : [style, anim]}
    >
      {highlight ? <Animated.View pointerEvents="none" style={[litBox, { backgroundColor: t.pressed }, litStyle]} /> : null}
      {children}
    </APressable>
  );
}

// The highlight reaches 8 pt into the card's padding and keeps clear of the hairlines.
const litBox = { position: 'absolute', top: 2, bottom: 2, left: -8, right: -8, borderRadius: 12 } as const;

/**
 * v3 button kinds (Figma, «Botón …»):
 * - primary: lime, soft lime glow (17 %, blur 24, 8 down).
 * - secondary: glass, white 12 % + blur, no outline.
 * - control: the header and navigation glass, white 10 % with a white 8 % edge.
 * - onGradient: on a lime card, graphite #25252A with white text.
 * - onGradientSoft: on a lime card, see-through dark (#111112 at 12 %) with dark text.
 * - text: no fill.
 * 56 and 48 pt buttons use 17 pt semibold; 44 pt ones, 15 pt.
 */
type ButtonKind = 'primary' | 'secondary' | 'control' | 'onGradient' | 'onGradientSoft' | 'text';

export function Button({
  label,
  onPress,
  kind = 'primary',
  icon,
  iconColor,
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
  /** The icon's own colour when it differs from the label (e.g. the lime arrows in «Saldar»). */
  iconColor?: string;
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
  height?: number;
  color?: string;
  /** Overrides the fill, e.g. the logo's black on the all-lime welcome screen. */
  bg?: string;
  disabled?: boolean;
}) {
  const { t } = useTheme();
  const fills: Record<ButtonKind, string> = {
    primary: t.action,
    secondary: t.glass,
    control: t.control,
    onGradient: t.onLimeButton,
    onGradientSoft: 'rgba(17,17,18,0.12)',
    text: 'transparent',
  };
  const bg = bgProp ?? fills[kind];
  const fg = color ?? (kind === 'primary' ? t.onAction : kind === 'onGradientSoft' ? t.inkFixed : kind === 'onGradient' ? '#FFFFFF' : t.ink);
  const frosted = !bgProp && (kind === 'secondary' || kind === 'control');
  return (
    <Tap
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={[
        disabled && { opacity: 0.4 },
        {
          minHeight: height,
          paddingVertical: 8,
          borderRadius: height / 2,
          backgroundColor: frosted ? undefined : bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: height >= 48 ? 24 : 16,
        },
        kind === 'control' && { borderWidth: 1, borderColor: t.controlStroke },
        kind === 'primary' && !bgProp && !disabled && { shadowColor: t.lime, shadowOpacity: 0.17, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
        style,
      ]}
    >
      {frosted ? <Frost fill={bg} radius={height / 2} intensity={kind === 'control' ? 16 : 20} /> : null}
      {leading}
      {icon ? <Icon name={icon} size={20} color={iconColor ?? fg} /> : null}
      {/* Figma: text buttons («Ya le pagué de otra forma», «Recordárselo») are 17 pt even at 44 tall. */}
      <T v={height >= 48 || kind === 'text' ? 'bodyStrong' : 'labelStrong'} color={fg} style={{ flexShrink: 1, textAlign: 'center' }}>
        {label}
      </T>
    </Tap>
  );
}

/**
 * Round icon button. With `bg={t.glass}` it is the v3 navigation control: white
 * 10 % with a white 8 % edge over a blur (Figma «Atrás», «Invitar», «Cerrar»).
 */
export function IconButton({ name, label, onPress, bg, color, size = 44 }: { name: IconName; label: string; onPress?: () => void; bg: string; color: string; size?: number }) {
  const { t } = useTheme();
  const control = bg === t.glass || bg === t.control;
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: control ? undefined : bg, alignItems: 'center', justifyContent: 'center' },
        control && { borderWidth: 1, borderColor: t.controlStroke },
      ]}
    >
      {control ? <Frost fill={t.control} radius={size / 2} intensity={16} /> : null}
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
  // Translucent cards blur what's behind them (the aurora, content scrolling under).
  const frosted = fill === t.card;
  const r = (StyleSheet.flatten(style)?.borderRadius as number | undefined) ?? 28;
  return (
    <View style={[{ backgroundColor: frosted ? undefined : fill, borderRadius: 28, padding: 16 }, style]}>
      {frosted ? <Frost fill={fill} radius={r} /> : null}
      {children}
    </View>
  );
}

/**
 * v3 «Filete»: a 1 pt white 9 % line across the card's inner width (Figma draws
 * no inset). `color` and `inset` are kept for older callers and ignored.
 */
export function Hairline(_: { color?: string; inset?: number }) {
  const { t } = useTheme();
  return <View style={{ height: 1, backgroundColor: t.hairline }} />;
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
        // v3 chips: glass (white 12 % + blur) or, when chosen, the ink colour with dark text.
        {
          minHeight: 44,
          paddingVertical: 6,
          borderRadius: 22,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingLeft: leading ? 6 : icon ? 12 : 16,
          paddingRight: 16,
          backgroundColor: selected ? t.selected : undefined,
        },
        off && { opacity: 0.4 },
      ]}
    >
      {selected ? null : <Frost fill={t.glass} radius={22} intensity={20} />}
      {leading}
      {icon ? <Icon name={icon} size={20} color={fg} /> : null}
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
            style={{ flex: 1, minHeight: 44, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.lime : 'transparent' }}
          >
            <T v="labelStrong" color={on ? t.onLime : t.ink} style={{ textAlign: 'center' }}>
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
  minHeight: 56,
  borderRadius: 16,
  backgroundColor: t.fill,
  paddingHorizontal: 16,
  color: t.ink,
  fontSize: 17,
});
