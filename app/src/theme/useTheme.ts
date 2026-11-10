import { graphite, type Tokens } from './tokens';

/**
 * Graphite dark (rediseño v2) is Zerow's main design. The light and the older
 * green-tinted dark tokens stay in tokens.ts for a future appearance setting.
 */
export function useTheme(): { t: Tokens; isDark: boolean } {
  return { t: graphite, isDark: true };
}
