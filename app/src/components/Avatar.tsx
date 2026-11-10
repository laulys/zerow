import { Image, StyleSheet, View } from 'react-native';
import { people, type PersonId } from '../data/trip';

/** Memoji in a translucent circle. Decorative next to a visible name. */
export function Avatar({ id, size = 32, decorative = true }: { id: PersonId; size?: number; decorative?: boolean }) {
  return (
    <View
      style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : people[id].name}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
    >
      <Image source={people[id].avatar} style={{ width: size * 1.08, height: size * 1.08, marginTop: size * 0.02 }} resizeMode="contain" />
    </View>
  );
}

/**
 * Faces that overlap like a small group photo. Each face gets a thin ring in
 * the colour behind the stack (`outline`), so the overlap reads as a cut-out
 * instead of circles piled on top of each other.
 */
export function AvatarStack({ ids, size = 30, overlap, outline }: { ids: PersonId[]; size?: number; overlap?: number; outline?: string }) {
  const ov = overlap ?? Math.round(size * 0.34);
  const ring = outline ? 2 : 0;
  return (
    <View style={{ flexDirection: 'row' }} importantForAccessibility="no-hide-descendants">
      {ids.map((id, i) => (
        <View
          key={id}
          style={{
            marginLeft: i === 0 ? 0 : -ov,
            zIndex: ids.length - i,
            borderRadius: (size + ring * 2) / 2,
            borderWidth: ring,
            borderColor: outline ?? 'transparent',
          }}
        >
          <Avatar id={id} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
