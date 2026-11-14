import { StyleSheet, View } from 'react-native';
import type { PersonId } from '../data/trip';
import { useTheme } from '../theme/useTheme';
import { Avatar } from './Avatar';
import { T } from './ui';

/**
 * One line of a «what you're about to add» card (Figma 1.4 «Una pregunta», 4.1
 * «¿Sumamos el almuerzo?»): the label on the left; on the right, the faces it
 * concerns and the value. Amounts are Space Grotesk (Título XS); names, Nota fuerte.
 * Faces sit on the translucent disc, inside it, so nothing is cut.
 */
export function Fact({ label, value, faces, amount }: { label: string; value: string; faces?: PersonId[]; amount?: boolean }) {
  const { t } = useTheme();
  return (
    <View style={styles.fact} accessible accessibilityLabel={`${label}: ${value}`}>
      <T v="label" color={t.inkMuted} style={{ flex: 1 }}>
        {label}
      </T>
      {faces ? (
        <View style={styles.faces}>
          {faces.map((id) => (
            <Avatar key={id} id={id} size={28} bg={t.disc} inset />
          ))}
        </View>
      ) : null}
      <T v={amount ? 'titleXS' : 'labelStrong'} color={t.ink} style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  fact: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingVertical: 8 },
  faces: { flexDirection: 'row', gap: 4 },
});
