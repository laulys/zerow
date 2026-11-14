import { createContext, useContext, type ReactNode } from 'react';
import { useReducedMotion, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';

/**
 * The tab bar gets out of the way while you read, like Revolut's (and iOS 26's
 * «minimise on scroll»): scroll down and it shrinks to its icons; scroll back up,
 * reach the top or change tab and it comes back. `minimized` goes 0 → 1.
 */
type Chrome = { minimized: SharedValue<number>; target: SharedValue<number> };

const TabChrome = createContext<Chrome | null>(null);

export function TabChromeProvider({ children }: { children: ReactNode }) {
  const minimized = useSharedValue(0);
  const target = useSharedValue(0);
  return <TabChrome.Provider value={{ minimized, target }}>{children}</TabChrome.Provider>;
}

export function useTabChrome() {
  return useContext(TabChrome);
}

// A spring with no bounce: it shrinks and grows like a sheet settling, about 0.4 s.
const settle = { duration: 380, dampingRatio: 1 } as const;

/** Moves the bar towards `to` (0 full, 1 shrunk), once per change. Worklet-safe. */
export function setMinimized(chrome: Chrome | null, to: number, still: boolean) {
  'worklet';
  if (!chrome || chrome.target.value === to) return;
  chrome.target.value = to;
  chrome.minimized.value = still ? to : withSpring(to, settle);
}

/**
 * For a tab's scroll view: returns a worklet to call from its scroll handler with
 * (offset, content height, visible height). A few points of travel decide the
 * direction, so a slow drift doesn't flicker the bar; the bounce at either end is ignored.
 */
export function useMinimizeOnScroll() {
  const chrome = useContext(TabChrome);
  const still = useReducedMotion();
  const last = useSharedValue(0);
  return (y: number, content: number, view: number) => {
    'worklet';
    const dy = y - last.value;
    last.value = y;
    if (y <= 24) return setMinimized(chrome, 0, still);
    if (y + view >= content - 2) return;
    if (dy > 3) setMinimized(chrome, 1, still);
    else if (dy < -3) setMinimized(chrome, 0, still);
  };
}
