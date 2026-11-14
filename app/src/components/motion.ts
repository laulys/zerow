import { Easing, withDelay, withTiming } from 'react-native-reanimated';
import { motion } from '../theme/tokens';

/**
 * Zerow's motion language, from the design skills (Emil Kowalski's animation rules,
 * Impeccable's «animate» and iOS notes, and the motion notes in Notion):
 *
 * - Pages move the way iOS moves them: a push slides, a sheet rises, a tab cross-fades.
 *   Nothing choreographs on top of a page you open many times a day; it would only make
 *   it feel slow.
 * - What changes moves instead of jumping: rows arrive and leave, numbers roll, the tab
 *   highlight slides to the tab you chose.
 * - About a fifth of a second, a strong ease-out, and exits faster than entrances.
 * - Buttons give under the finger (0.97); list rows light up like iOS cells; tags stay still.
 * - The authored entrances are kept for the rare moments: the welcome, the onboarding,
 *   signing in, an invitation, a payment and «A cero».
 * - Reduce Motion keeps the fades and drops the movement.
 */
export const EASE = Easing.bezier(0.23, 1, 0.32, 1);

/** Fades in while rising `distance` pt. `still` (Reduce Motion) keeps only the fade. */
export const rise =
  (delay = 0, distance = 8, still = false, duration: number = motion.standard) =>
  () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ translateY: still ? 0 : distance }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration, easing: EASE })),
        transform: [{ translateY: withDelay(delay, withTiming(0, { duration, easing: EASE })) }],
      },
    };
  };

/** Leaves by fading and settling back a touch (never shrinking to nothing). */
export const recede =
  (still = false, duration: number = motion.exit) =>
  () => {
    'worklet';
    return {
      initialValues: { opacity: 1, transform: [{ scale: 1 }] },
      animations: {
        opacity: withTiming(0, { duration, easing: EASE }),
        transform: [{ scale: withTiming(still ? 1 : 0.96, { duration, easing: EASE }) }],
      },
    };
  };

/** Arrives from just behind (0.96) for things that appear on top: alerts, menus. */
export const surface =
  (still = false, duration: number = motion.standard) =>
  () => {
    'worklet';
    return {
      initialValues: { opacity: 0, transform: [{ scale: still ? 1 : 0.96 }] },
      animations: {
        opacity: withTiming(1, { duration, easing: EASE }),
        transform: [{ scale: withTiming(1, { duration, easing: EASE }) }],
      },
    };
  };
