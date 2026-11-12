import { aurora, type Tokens } from './tokens';

/**
 * Aurora (rediseño v3) is Zerow's main design: the graphite page of the v2 with
 * the brand gradient as ambient light. The light, green-tinted dark and graphite
 * tokens stay in tokens.ts for a future appearance setting.
 */
export function useTheme(): { t: Tokens; isDark: boolean } {
  return { t: aurora, isDark: true };
}
