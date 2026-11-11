import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Text, View, type TextStyle } from 'react-native';
import { eurText, formatEur, type Currency } from '../data/trip';
import { font } from '../theme/tokens';
import { NumericText } from './NumericText';

/** Giant numeral with smaller, dimmer cents: "36,23 €". */
/** Text at 28 pt and up is display type: cap its growth at 1.15x so the layout holds at the largest sizes. */
export const displayCap = (size: number) => (size >= 28 ? 1.15 : undefined);

export function Money({ value, size = 64, color, centsColor, currency = 'EUR' }: { value: number; size?: number; color: string; centsColor: string; currency?: Currency }) {
  const { whole, cents } = formatEur(value, currency);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }} accessible accessibilityLabel={eurText(value, currency)}>
      {/* Display-size figures are already large, so they grow only a little with Dynamic Type. */}
      <Text style={[numStyle(size), { color }]} maxFontSizeMultiplier={displayCap(size)}>
        {whole}
      </Text>
      <Text style={[numStyle(size / 2), { color: centsColor }]} maxFontSizeMultiplier={displayCap(size)}>
        {cents}
      </Text>
    </View>
  );
}

const numStyle = (size: number): TextStyle => ({
  fontFamily: font.regular,
  fontSize: size,
  lineHeight: size * 1.05,
  letterSpacing: -size * 0.03,
  fontVariant: ['tabular-nums'],
});

const easeOutQuart = (x: number) => 1 - Math.pow(1 - x, 4);

/**
 * A number that rolls to its new value instead of jumping (the reel's first tip).
 * Respects Reduce Motion: it then swaps instantly.
 */
export function useRollingNumber(target: number, duration = 400, from?: number): number {
  const [shown, setShown] = useState(from ?? target);
  const startRef = useRef(from ?? target);
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        setShown(target);
        startRef.current = target;
        return;
      }
      const start = startRef.current;
      const t0 = Date.now();
      const tick = () => {
        const k = Math.min(1, (Date.now() - t0) / duration);
        const v = start + (target - start) * easeOutQuart(k);
        setShown(v);
        if (k < 1) raf = requestAnimationFrame(tick);
        else startRef.current = target;
      };
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [target, duration]);
  return Math.round(shown * 100) / 100;
}

/**
 * Money that changes on screen (the cards, a group's balance): the digits that
 * change roll like SwiftUI's numericText, up or down with the value.
 */
export function RollingMoney({
  value,
  size = 64,
  color,
  centsColor,
  currency = 'EUR',
}: {
  value: number;
  size?: number;
  color: string;
  centsColor: string;
  duration?: number;
  from?: number;
  currency?: Currency;
}) {
  const last = useRef(value);
  const down = value < last.current;
  useEffect(() => {
    last.current = value;
  }, [value]);
  const { whole, cents } = formatEur(value, currency);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }} accessible accessibilityLabel={eurText(value, currency)}>
      <NumericText text={whole} countsDown={down} style={[numStyle(size), { color }]} label={eurText(value, currency)} />
      <NumericText text={cents} countsDown={down} style={[numStyle(size / 2), { color: centsColor }]} label="" />
    </View>
  );
}

/** A small amount (a row's balance) with the same numeric transition. */
export function RollingAmount({ value, style, currency = 'EUR' }: { value: number; style: TextStyle | TextStyle[]; currency?: Currency }) {
  const last = useRef(value);
  const down = value < last.current;
  useEffect(() => {
    last.current = value;
  }, [value]);
  return <NumericText text={eurText(value, currency)} countsDown={down} style={style} />;
}
