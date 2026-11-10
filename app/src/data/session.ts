import { router } from 'expo-router';

/**
 * Leaves the sign-in flow and opens the app. There's no auth backend yet,
 * so every sign-in method lands here; the real one will check the session first.
 */
export function enterApp() {
  router.dismissAll();
  router.replace('/grupos');
}

/** Stand-in for the API: any 6 digits work until the auth endpoint exists. */
export async function verifyCode(code: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 500));
  return /^\d{6}$/.test(code);
}

/**
 * Closes the sheet in front, then runs the next navigation. Replacing a native
 * sheet in place leaves it half on screen, so the sheet goes first.
 */
export function afterSheet(go: () => void) {
  router.back();
  setTimeout(go, 320);
}
