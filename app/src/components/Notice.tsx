import { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { motion } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { announce } from './announce';
import { Frost } from './Frost';
import { Icon } from './Icon';
import { T, Tap } from './ui';

/**
 * Figma «Aviso» (3.2, 3.3, Saldar): a 48 pt glass notice that confirms what just
 * happened, with «Deshacer» as a lime text button (no pill squeezed into it).
 * The caller places it (usually absolute, 16 pt above whatever sits at the bottom).
 */
export function UndoNotice({ text, onUndo, style }: { text: string; onUndo: () => void; style?: StyleProp<ViewStyle> }) {
  const { t } = useTheme();
  // iOS has no live regions: the notice says itself when it appears.
  useEffect(() => announce(`${text}. Puedes deshacerlo.`), [text]);
  return (
    <Animated.View entering={FadeInDown.duration(motion.standard)} exiting={FadeOutDown.duration(160)} style={[styles.notice, style]} accessibilityLiveRegion="polite">
      <Frost fill={t.glass} radius={24} intensity={20} />
      <T v="label" color={t.ink} style={{ flex: 1, fontWeight: '500' }} numberOfLines={1}>
        {text}
      </T>
      <Tap onPress={onUndo} accessibilityRole="button" accessibilityLabel={`Deshacer: ${text}`} style={styles.undo}>
        <Icon name="undo" size={16} color={t.lime} />
        <T v="labelStrong" color={t.lime}>
          Deshacer
        </T>
      </Tap>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  notice: { minHeight: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 16, paddingRight: 4 },
  undo: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 12 },
});
