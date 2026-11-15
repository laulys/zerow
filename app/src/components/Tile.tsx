import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { aurora } from '../theme/tokens';

/** Figma «Emoji» / «Icono»: the 40 pt tile (radius 12, white 8 %) that carries a row's emoji or icon. */
export function Tile({ children }: { children?: ReactNode }) {
  return <View style={styles.tile}>{children}</View>;
}

const styles = StyleSheet.create({
  tile: { width: 40, height: 40, borderRadius: 12, backgroundColor: aurora.disc, alignItems: 'center', justifyContent: 'center' },
});
