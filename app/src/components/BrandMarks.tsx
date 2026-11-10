import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Payment brand marks, from Simple Icons (CC0 paths); trademarks belong to their
// owners and are shown only to label the payment method.
// PayPal: the two-tone monogram in its brand blues. Revolut: white R on its ink.

const PAYPAL_BACK = 'M7.016 19.198h-4.2a.562.562 0 0 1-.555-.65L5.093.584A.692.692 0 0 1 5.776 0h7.222c3.417 0 5.904 2.488 5.846 5.5-.006.25-.027.5-.066.747A6.794 6.794 0 0 1 12.071 12H8.743a.69.69 0 0 0-.682.583l-.325 2.056-.013.083-.692 4.39-.015.087z';
const PAYPAL_FRONT = 'M19.79 6.142c-.01.087-.01.175-.023.261a7.76 7.76 0 0 1-7.695 6.598H9.007l-.283 1.795-.013.083-.692 4.39-.134.843-.014.088H6.86l-.497 3.15a.562.562 0 0 0 .555.65h3.612c.34 0 .63-.249.683-.585l.952-6.031a.692.692 0 0 1 .683-.584h2.126a6.793 6.793 0 0 0 6.707-5.752c.306-1.95-.466-3.744-1.89-4.906z';
const REVOLUT = 'M20.9133 6.9566C20.9133 3.1208 17.7898 0 13.9503 0H2.424v3.8605h10.9782c1.7376 0 3.177 1.3651 3.2087 3.043.016.84-.2994 1.633-.8878 2.2324-.5886.5998-1.375.9303-2.2144.9303H9.2322a.2756.2756 0 0 0-.2755.2752v3.431c0 .0585.018.1142.052.1612L16.2646 24h5.3114l-7.2727-10.094c3.6625-.1838 6.61-3.2612 6.61-6.9494zM6.8943 5.9229H2.424V24h4.4704z';

export function PayPalTile({ size = 40 }: { size?: number }) {
  const m = size * 0.5;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
      <Svg width={m} height={m} viewBox="0 0 24 24">
        <Path d={PAYPAL_BACK} fill="#003087" />
        <Path d={PAYPAL_FRONT} fill="#009CDE" />
      </Svg>
    </View>
  );
}

export function RevolutTile({ size = 40 }: { size?: number }) {
  const m = size * 0.46;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: '#191C1F', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden>
      <Svg width={m} height={m} viewBox="0 0 24 24">
        <Path d={REVOLUT} fill="#FFFFFF" />
      </Svg>
    </View>
  );
}
