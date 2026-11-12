import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Linking, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaFrameContext, SafeAreaInsetsContext } from 'react-native-safe-area-context';

/**
 * How much room the app has, as the three layouts in Figma (Rediseño v3):
 * - `compact`: iPhone (393 wide). Bottom tab bar.
 * - `rail`: iPhone Duo closed (466 × 678). One column of 382 and, on the right,
 *   the Duo's control column: the tab bar turns into a vertical rail there.
 * - `split`: iPhone Duo open (951 × 669). Two panes (list 340 + detail 527) and
 *   the control column.
 */
export type Form = 'compact' | 'rail' | 'split';

/** Width of the Duo's control column on the right edge (camera, time, the vertical tab bar). */
export const RAIL = 84;
/** The list pane in `split` (the fold sits at its right edge). */
export const LIST_PANE = 340;

export function formFor(width: number): Form {
  if (width >= 860) return 'split';
  if (width >= 460) return 'rail';
  return 'compact';
}

type Screen = { width: number; height: number; form: Form; preview: boolean };
const ScreenContext = createContext<Screen | null>(null);

/** The screen size and layout. Prefer this to `useWindowDimensions` for widths, so the Duo preview works. */
export function useScreen(): Screen {
  const win = useWindowDimensions();
  return useContext(ScreenContext) ?? { width: win.width, height: win.height, form: formFor(win.width), preview: false };
}

/** Room taken on the right by the Duo's control column (0 on iPhone). */
export function useRailInset() {
  return useScreen().form === 'compact' ? 0 : RAIL;
}

// Development only: there's no iPhone Duo simulator yet, so the app can draw
// itself inside a Duo-sized screen on an iPad simulator. Open any link with
// `?device=duo-closed`, `?device=duo-open` or `?device=phone` to switch.
const previews = {
  'duo-closed': { width: 466, height: 678, radius: [8, 48, 48, 8] as const, insets: { top: 20, bottom: 20, left: 0, right: 0 } },
  'duo-open': { width: 951, height: 669, radius: [48, 48, 48, 48] as const, insets: { top: 20, bottom: 20, left: 0, right: 0 } },
};
type Preview = keyof typeof previews;

export function ScreenProvider({ children }: { children: ReactNode }) {
  const win = useWindowDimensions();
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => {
    if (!__DEV__) return;
    const read = (url?: string | null) => {
      const m = url?.match(/[?&]device=(duo-closed|duo-open|phone)/);
      if (m) setPreview(m[1] === 'phone' ? null : (m[1] as Preview));
    };
    Linking.getInitialURL().then(read);
    const sub = Linking.addEventListener('url', (e) => read(e.url));
    return () => sub.remove();
  }, []);

  if (!preview) {
    return <ScreenContext.Provider value={{ width: win.width, height: win.height, form: formFor(win.width), preview: false }}>{children}</ScreenContext.Provider>;
  }
  const p = previews[preview];
  const [tl, tr, br, bl] = p.radius;
  return (
    <View style={styles.stage}>
      <View style={{ width: p.width, height: p.height, overflow: 'hidden', borderTopLeftRadius: tl, borderTopRightRadius: tr, borderBottomRightRadius: br, borderBottomLeftRadius: bl }}>
        <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, width: p.width, height: p.height }}>
          <SafeAreaInsetsContext.Provider value={p.insets}>
            <ScreenContext.Provider value={{ width: p.width, height: p.height, form: formFor(p.width), preview: true }}>{children}</ScreenContext.Provider>
          </SafeAreaInsetsContext.Provider>
        </SafeAreaFrameContext.Provider>
        <StatusColumn closed={preview === 'duo-closed'} />
      </View>
    </View>
  );
}

/** What the Duo itself draws in its control column (camera, time, battery), for the preview only. */
function StatusColumn({ closed }: { closed: boolean }) {
  return (
    <View pointerEvents="none" style={[styles.status, { width: RAIL, paddingTop: closed ? 30 : 34 }]}>
      {closed ? <View style={styles.camera} /> : null}
      <Text style={styles.time}>9:41</Text>
      <View style={styles.battery} />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  status: { position: 'absolute', top: 0, right: 0, alignItems: 'center', gap: 6 },
  camera: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#000', marginBottom: 12 },
  time: { color: '#F4F4F0', fontSize: 15, fontWeight: '600' },
  battery: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#F4F4F0' },
});

/**
 * Side padding for a single centred column: 20 on the iPhone and the closed Duo;
 * on the open Duo the column keeps `width` (Figma: 400) in the middle of the screen.
 */
export function useColumnPadding(width = 400) {
  const { form, width: w } = useScreen();
  return form === 'split' ? Math.max(20, (w - RAIL - width) / 2) : 20;
}
