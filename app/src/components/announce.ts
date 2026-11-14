import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Says something to the screen reader. `accessibilityLiveRegion` only exists on
 * Android, so on iPhone anything that appears on its own (a notice, Zerow's
 * reply, an error, «A cero») has to be announced by hand.
 */
export function announce(text: string) {
  AccessibilityInfo.announceForAccessibility(text);
}

/** Announces `text` whenever it changes to something. */
export function useAnnounce(text: string | null | false | undefined) {
  useEffect(() => {
    if (text) announce(text);
  }, [text]);
}

/** Whether VoiceOver (or TalkBack) is on: notices that expire stay longer. */
export function useScreenReader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setOn);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => sub.remove();
  }, []);
  return on;
}

/** How long a notice with «Deshacer» stays: 10 s, or 30 s with a screen reader (it takes longer to reach the button). */
export const undoWindow = (screenReader: boolean) => (screenReader ? 30000 : 10000);
