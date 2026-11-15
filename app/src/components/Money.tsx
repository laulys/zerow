import { useState } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import { eurText, formatEur, type Currency } from '../data/trip';
import { font } from '../theme/tokens';
import { NumericText } from './NumericText';

/** Text at 28 pt and up is display type: cap its growth at 1.15x so the layout holds at the largest sizes. */
export const displayCap = (size: number) => (size >= 28 ? 1.15 : undefined);

/** Giant numeral with smaller, dimmer cents: "36,23 €". */
export function Money({ value, size = 64, color, currency = 'EUR' }: { value: number; size?: number; color: string; currency?: Currency }) {
  const { whole, cents } = formatEur(value, currency);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }} accessible accessibilityLabel={eurText(value, currency)}>
      {/* Display-size figures are already large, so they grow only a little with Dynamic Type. */}
      <Text style={[numStyle(size), { color }]} maxFontSizeMultiplier={displayCap(size)}>
        {whole}
      </Text>
      <Text style={[numStyle(size * CENTS), centsStyle(color)]} maxFontSizeMultiplier={displayCap(size)}>
        {cents}
      </Text>
    </View>
  );
}

/** Cents are 45 % of the figure (v3 "Importe" styles). */
const CENTS = 0.45;
/** v3: the cents are the figure's own colour at 62 %, 1 pt after it. */
const centsStyle = (color: string): TextStyle => ({ color, opacity: 0.62, marginLeft: 1 });

// Amounts are Space Grotesk Regular; tracking tightens with size (−3 % at 56 and up, −2 % at 36 and under).
const numStyle = (size: number): TextStyle => ({
  fontFamily: font.regular,
  fontSize: size,
  lineHeight: size,
  // With the line height equal to the size, iOS draws Space Grotesk about 9 % higher than Figma does.
  transform: [{ translateY: Math.round(size * 0.085) }],
  letterSpacing: -size * (size >= 56 ? 0.03 : size >= 44 ? 0.025 : 0.02), // v3/Importe XL–XS
  fontVariant: ['tabular-nums'],
});

/**
 * Whether the amount on screen just went down: true on the render where `value`
 * is lower than the one shown before, which is when the digits read it.
 */
function useCountsDown(value: number, currency: Currency): boolean {
  const [seen, setSeen] = useState({ value, currency, down: false });
  if (!Object.is(seen.value, value) || seen.currency !== currency) setSeen({ value, currency, down: value < seen.value });
  return seen.down;
}

/**
 * Money that changes on screen (the cards, a group's balance): the digits that
 * change roll like SwiftUI's numericText, up or down with the value.
 */
export function RollingMoney({ value, size = 64, color, currency = 'EUR' }: { value: number; size?: number; color: string; currency?: Currency }) {
  const down = useCountsDown(value, currency);
  const { whole, cents } = formatEur(value, currency);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }} accessible accessibilityLabel={eurText(value, currency)}>
      <NumericText text={whole} countsDown={down} style={[numStyle(size), { color }]} label={eurText(value, currency)} />
      <NumericText text={cents} countsDown={down} style={[numStyle(size * CENTS), centsStyle(color)]} label="" />
    </View>
  );
}

/** A small amount (a row's balance) with the same numeric transition. */
export function RollingAmount({ value, style, currency = 'EUR' }: { value: number; style: TextStyle | TextStyle[]; currency?: Currency }) {
  const down = useCountsDown(value, currency);
  return <NumericText text={eurText(value, currency)} countsDown={down} style={style} />;
}
