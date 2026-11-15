import { Fragment, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { glassSheets } from './Glass';
import { Icon, type IconName } from './Icon';
import { Tile } from './Tile';
import { Card, Hairline, T, Tap } from './ui';

/**
 * The inside of a v3 sheet (Figma «Hoja»): 20 pt sides, the content starting
 * below the system grabber, 16 pt between blocks and 40 pt at the bottom.
 */
export function SheetBody({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return <View style={[styles.body, { paddingBottom: Math.max(insets.bottom + 6, 40), backgroundColor: glassSheets ? 'transparent' : t.sheet }, style]}>{children}</View>;
}

export type SheetRowItem = {
  key: string;
  title: string;
  sub?: string;
  /** e.g. lime for «Te debe …». */
  subColor?: string;
  icon?: IconName;
  emoji?: string;
  lead?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  label?: string;
};

/**
 * A v3 list card (Figma «Tarjeta» in sheets): white 7 % frosted, 4/16 padding,
 * 64–66 pt rows with a 40 pt tile (white 8 %, r12), Cuerpo fuerte title, Pie
 * detail and a chevron, separated by full-width dividers.
 */
export function SheetList({ rows }: { rows: SheetRowItem[] }) {
  const { t } = useTheme();
  return (
    <Card style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
      {rows.map((r, i) => {
        const body = (
          <View style={styles.row}>
            {r.lead ?? (
              <Tile>
                {r.emoji ? (
                  <Text style={styles.emoji} maxFontSizeMultiplier={1.3}>
                    {r.emoji}
                  </Text>
                ) : r.icon ? (
                  <Icon name={r.icon} size={20} color={t.ink} />
                ) : null}
              </Tile>
            )}
            <View style={{ flex: 1 }}>
              <T v="bodyStrong" color={t.ink} numberOfLines={1}>
                {r.title}
              </T>
              {r.sub ? (
                <T v="caption" color={r.subColor ?? t.inkMuted} numberOfLines={1}>
                  {r.sub}
                </T>
              ) : null}
            </View>
            {r.right ?? (r.onPress ? <Icon name="chevron-right" size={16} color={t.inkMuted} /> : null)}
          </View>
        );
        return (
          <Fragment key={r.key}>
            {i > 0 ? <Hairline /> : null}
            {r.onPress ? (
              <Tap onPress={r.onPress} accessibilityRole="button" accessibilityLabel={r.label ?? [r.title, r.sub].filter(Boolean).join('. ')}>
                {body}
              </Tap>
            ) : (
              body
            )}
          </Fragment>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 26, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12 },
  emoji: { fontSize: 22, lineHeight: 28 },
});
