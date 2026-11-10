import { useFocusEffect } from 'expo-router';
import { StatusBar, type StatusBarStyle } from 'expo-status-bar';
import { useCallback, useState } from 'react';

/**
 * Sets the status bar only while this screen is focused. Tab screens stay
 * mounted, so a plain <StatusBar> on one tab would leak onto the others.
 */
export function FocusStatusBar({ style }: { style: StatusBarStyle }) {
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return focused ? <StatusBar style={style} /> : null;
}
