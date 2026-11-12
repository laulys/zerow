import { Image, StyleSheet, Text, View } from 'react-native';
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
export function Avatar({ id, size = 32, decorative = true, bg, on = 'dark' }: { id: PersonId; size?: number; decorative?: boolean; bg?: string; on?: AvatarOn }) {
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
      <Image source={people[id].avatar} style={{ width: size * 1.08, height: size * 1.08, marginTop: size * 0.02 }} resizeMode="contain" />
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

const styles = StyleSheet.create({
  ring: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onLime: { backgroundColor: '#D9F29A', borderWidth: 2, borderColor: '#E9F9B8' },
});
