import { dark, type Tokens } from './tokens';

/**
 * Dark is Zerow's main design. The light tokens stay in tokens.ts so a
 * "follow the iPhone / light / dark" setting can be added later.
 */
export function useTheme(): { t: Tokens; isDark: boolean } {
  return { t: dark, isDark: true };
}
