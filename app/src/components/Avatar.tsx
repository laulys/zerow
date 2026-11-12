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
 * A group's faces side by side (v3: no overlap, no ring), 8 pt apart. `max`
 * keeps the row short on a card; the rest fold into a "+n" disc.
 */
export function AvatarStack({ ids, size = 30, gap = 8, max, on }: { ids: PersonId[]; size?: number; gap?: number; max?: number; on?: AvatarOn; overlap?: number; outline?: string }) {
  const { t } = useTheme();
  const shown = max && ids.length > max ? ids.slice(0, max - 1) : ids;
  const rest = ids.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', gap }} importantForAccessibility="no-hide-descendants">
      {shown.map((id) => (
        <Avatar key={id} id={id} size={size} on={on} />
      ))}
      {rest > 0 ? (
        <View style={[styles.ring, on === 'lime' ? styles.onLime : { backgroundColor: t.panelRaised }, { width: size, height: size, borderRadius: size / 2 }]}>
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
  onLime: { backgroundColor: 'rgba(255,255,255,0.3)' },
});
