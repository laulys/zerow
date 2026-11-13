import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { people, type PersonId } from '../data/trip';
import { useTheme } from '../theme/useTheme';

/** What the face sits on: the graphite UI (default) or a lime brand card. */
export type AvatarOn = 'dark' | 'lime';

/**
 * Memoji in a circle. Decorative next to a visible name. On the graphite UI the
 * disc is solid, a step lighter than the page, with no ring; on the lime cards
 * (`on="lime"`) it is translucent white, also with no ring.
 * `bg` overrides the disc colour, e.g. `t.surface` for faces sitting on the page.
 */
export function Avatar({
  id,
  size = 32,
  decorative = true,
  bg,
  on = 'dark',
  inset,
}: {
  id: PersonId;
  size?: number;
  decorative?: boolean;
  bg?: string;
  on?: AvatarOn;
  /** The face sits a little inside the disc instead of filling it, so hair and chin aren't cut (use with `t.disc`). */
  inset?: boolean;
}) {
  const { t } = useTheme();
  // v3: on a lime card the face sits on pale lime with a lighter 2 pt ring (Figma «Avatar»
  // #D9F29A, stroke #E9F9B8); on the graphite UI it is a solid disc with no ring.
  const disc = on === 'lime' ? styles.onLime : { backgroundColor: bg ?? t.panelRaised };
  return (
    <View
      style={[styles.ring, disc, { width: size, height: size, borderRadius: size / 2 }]}
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : people[id].name}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    >
      <Image source={people[id].avatar} style={inset ? insetFace(size) : { width: size * 1.08, height: size * 1.08, marginTop: size * 0.02 }} resizeMode="contain" />
    </View>
  );
}

/**
 * A group's faces: on a lime card they overlap with a ring; on graphite, 8 pt apart. `max`
 * keeps the row short on a card; the rest fold into a "+n" disc.
 */
export function AvatarStack({ ids, size = 30, gap: gapProp, max, on }: { ids: PersonId[]; size?: number; gap?: number; max?: number; on?: AvatarOn; overlap?: number; outline?: string }) {
  const { t } = useTheme();
  // On lime cards the faces overlap by 9 pt, each with its ring (Figma «Personas», spacing −9).
  const gap = gapProp ?? (on === 'lime' ? -9 : 8);
  const shown = max && ids.length > max ? ids.slice(0, max - 1) : ids;
  const rest = ids.length - shown.length;
  return (
    // Flexbox gaps can't be negative, so overlapping faces pull left with a margin instead.
    <View style={{ flexDirection: 'row', gap: Math.max(0, gap) }} importantForAccessibility="no-hide-descendants">
      {shown.map((id, i) => (
        <View key={id} style={gap < 0 && i > 0 ? { marginLeft: gap } : undefined}>
          <Avatar id={id} size={size} on={on} />
        </View>
      ))}
      {rest > 0 ? (
        <View style={[styles.ring, on === 'lime' ? styles.onLime : { backgroundColor: t.panelRaised }, { width: size, height: size, borderRadius: size / 2 }, gap < 0 && { marginLeft: gap }]}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: on === 'lime' ? t.inkFixed : t.ink }} maxFontSizeMultiplier={1}>
            +{rest}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Figma «Avatar · laura» (the header's face, and the payer in Saldar's question):
 * a glass disc (white 8 %) with the memoji sitting a little inside it, not cropped,
 * and a ring drawn OUTSIDE the disc, diagonal from lime (top left) through mint
 * to a faint lime (bottom right). Measured at 44 pt with a 1.5 pt ring; scales.
 */
export function RingAvatar({ id, size = 44, stroke = 1.5 }: { id: PersonId; size?: number; stroke?: number }) {
  const { t } = useTheme();
  const box = size + stroke * 2;
  const gid = `ring-${id}-${size}`;
  return (
    <View style={{ width: size, height: size }} importantForAccessibility="no-hide-descendants">
      <Avatar id={id} size={size} bg={t.disc} inset />
      <Svg width={box} height={box} style={{ position: 'absolute', left: -stroke, top: -stroke }} pointerEvents="none">
        <Defs>
          <LinearGradient id={gid} x1={box * 0.164} y1={box * 0.164} x2={box * 0.834} y2={box * 0.834} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={t.lime} stopOpacity={1} />
            <Stop offset="0.55" stopColor={t.mint} stopOpacity={0.9} />
            <Stop offset="1" stopColor={t.lime} stopOpacity={0.2} />
          </LinearGradient>
        </Defs>
        <Circle cx={box / 2} cy={box / 2} r={(size + stroke) / 2} stroke={`url(#${gid})`} strokeWidth={stroke} fill="none" />
      </Svg>
    </View>
  );
}

// Inside the disc: Figma's 40-in-44 for big faces; small ones (chips, rows) a touch fuller, still uncut.
const insetFace = (size: number) => {
  const k = size >= 44 ? 40 / 44 : 1.02;
  return { width: size * k, height: size * k, marginTop: size >= 44 ? (size * 2) / 44 : size * 0.04 };
};

const styles = StyleSheet.create({
  ring: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onLime: { backgroundColor: '#D9F29A', borderWidth: 2, borderColor: '#E9F9B8' },
});
