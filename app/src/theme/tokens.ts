// Color tokens mirror the "v2 / Color" variables in Figma (Light and Dark modes).
// Keep names in sync with Figma so design and code talk about the same thing.

export type Tokens = {
  page: string;
  surface: string;
  line: string;
  ink: string;
  inkMuted: string;
  panel: string;
  panelRaised: string;
  onPanel: string;
  onPanelMuted: string;
  lime: string;
  onLime: string;
  /** Primary buttons: black in light, lime in dark. */
  action: string;
  onAction: string;
  /** Text that sits on the lime gradient: always dark, in both modes. */
  inkFixed: string;
  inkMutedFixed: string;
  /** Selected chips: neutral, never lime. */
  selected: string;
  onSelected: string;
  danger: string;
  /** Rows, fields and tiles that sit on a glass sheet: translucent so the glass shows. */
  fill: string;
  fillStrong: string;
  /** v3 Aurora. Cards: translucent, no border. */
  card: string;
  /** v3 Aurora. Controls and the card behind in the stack: soft glass, no outline. */
  glass: string;
  /** v3 Aurora. Dark buttons that sit on a lime card. */
  onLimeButton: string;
  mint: string;
  /** v3 «ink-soft»: placeholders, inactive tabs, the line under a title. */
  inkSoft: string;
  /** v3 header and navigation controls (search, round buttons): white 10 % with a white 8 % edge. */
  control: string;
  controlStroke: string;
  /** v3 row dividers inside cards: white 9 %. */
  hairline: string;
  /** v3 faces on a dark card (the page's tone, darker than the card). */
  faceOnCard: string;
  /** v3 translucent disc behind a memoji (white 8 %): the header face, chips, fact rows. */
  disc: string;
  /** A list row under the finger (iOS cell highlight). */
  pressed: string;
  /** v3 «sheet»: sheets and alerts. */
  sheet: string;
  /** The light a lime card or button casts: a lime a touch more saturated than the fill, only ever a shadow colour. */
  glow: string;
};

export const light: Tokens = {
  page: '#F1F5EC',
  surface: '#FFFFFF',
  line: '#E3E3DE',
  ink: '#121212',
  inkMuted: '#66665F',
  panel: '#161616',
  panelRaised: '#242424',
  onPanel: '#FFFFFF',
  onPanelMuted: '#9A9A94',
  lime: '#CBF26B',
  onLime: '#121212',
  action: '#121212',
  onAction: '#FFFFFF',
  inkFixed: '#121212',
  inkMutedFixed: '#3D4A1F',
  selected: '#121212',
  onSelected: '#FFFFFF',
  danger: '#C8372D',
  fill: 'rgba(18,18,18,0.05)',
  fillStrong: 'rgba(18,18,18,0.09)',
  card: '#FFFFFF',
  glass: 'rgba(18,18,18,0.06)',
  inkSoft: '#4A4A45',
  control: 'rgba(18,18,18,0.06)',
  controlStroke: 'rgba(18,18,18,0.08)',
  hairline: 'rgba(18,18,18,0.09)',
  faceOnCard: '#EDEDE8',
  disc: 'rgba(18,18,18,0.05)',
  pressed: 'rgba(18,18,18,0.06)',
  sheet: '#FFFFFF',
  glow: '#B6F03A',
  onLimeButton: '#121212',
  mint: '#7FD8A8',
};

export const dark: Tokens = {
  page: '#0E120D',
  surface: '#1A2017',
  line: '#2C3428',
  ink: '#EEF3E8',
  inkMuted: '#A2AC99',
  panel: '#1E3315',
  panelRaised: '#2A4320',
  onPanel: '#F2F7EC',
  onPanelMuted: '#A9BCA0',
  lime: '#CBF26B',
  onLime: '#121212',
  action: '#CBF26B',
  onAction: '#121212',
  inkFixed: '#121212',
  inkMutedFixed: '#3D4A1F',
  selected: '#EEF3E8',
  onSelected: '#121212',
  danger: '#F0675E',
  fill: 'rgba(255,255,255,0.07)',
  fillStrong: 'rgba(255,255,255,0.12)',
  card: '#1A2017',
  glass: 'rgba(255,255,255,0.12)',
  onLimeButton: '#121212',
  mint: '#7FD8A8',
  inkSoft: '#C9C9C4',
  // Figma draws these as white 10 % + «Glass» (which lightens them); 14 % matches what it renders.
  control: 'rgba(255,255,255,0.14)',
  controlStroke: 'rgba(255,255,255,0.18)',
  hairline: 'rgba(255,255,255,0.09)',
  faceOnCard: '#1E1E22',
  disc: 'rgba(255,255,255,0.08)',
  pressed: 'rgba(255,255,255,0.07)',
  sheet: '#222226',
  glow: '#B6F03A',
};

/**
 * Rediseño v2 ("Dark · Grafito" in Figma): neutral graphite surfaces so lime is
 * the only colour. The old green-tinted `dark` stays for comparison.
 */
export const graphite: Tokens = {
  ...dark,
  // Lifted from near-black (#0B0B0C) so the page reads as a surface, not a hole;
  // every step above it moves up by the same amount to keep the layering.
  // Page lifted a touch from #141416; cards stay one clear step above it (1.16:1, Apple's dark grouped step is
  // 1.23:1); panel and raised keep the same spacing above them, and the line moves
  // up too so dividers still read on the lighter card. Muted text stays ≥ 4.85:1.
  page: '#18181B',
  surface: '#25252A',
  line: '#34343A',
  ink: '#F2F2EE',
  inkMuted: '#A0A09B',
  panel: '#28282D',
  panelRaised: '#323238',
  onPanel: '#F5F5F1',
  onPanelMuted: '#A6A6A1',
  selected: '#F2F2EE',
};

/**
 * Rediseño v3 «Aurora» ("v3 / Color" in Figma): the graphite page of the v2 with
 * the brand gradient as ambient light at the top. Cards are translucent (white
 * 7 %) with no border; controls are soft glass (white 12 %) with no outline;
 * only the group in progress, the expense to review and the closings sit on the
 * gradient itself.
 */
export const aurora: Tokens = {
  ...graphite,
  page: '#18181B',
  surface: '#25252A',
  line: '#3A3A40',
  ink: '#F4F4F0',
  inkMuted: '#A6A6A1',
  panel: '#25252A',
  panelRaised: '#2E2E34',
  onPanel: '#F4F4F0',
  onPanelMuted: '#A6A6A1',
  lime: '#CBF26B',
  onLime: '#111112',
  action: '#CBF26B',
  onAction: '#111112',
  inkFixed: '#111112',
  inkMutedFixed: '#34401A',
  selected: '#F4F4F0',
  onSelected: '#111112',
  danger: '#F0675E',
  fill: 'rgba(255,255,255,0.07)',
  fillStrong: 'rgba(255,255,255,0.12)',
  card: 'rgba(255,255,255,0.07)',
  glass: 'rgba(255,255,255,0.12)',
  onLimeButton: '#25252A',
  mint: '#7FD8A8',
  // v3 / Color: ink-soft, the controls of the header and navigation, dividers, faces on cards, sheets.
  inkSoft: '#C9C9C4',
  // Figma draws these as white 10 % + «Glass» (which lightens them); 14 % matches what it renders.
  control: 'rgba(255,255,255,0.14)',
  controlStroke: 'rgba(255,255,255,0.18)',
  hairline: 'rgba(255,255,255,0.09)',
  faceOnCard: '#1E1E22',
  disc: 'rgba(255,255,255,0.08)',
  pressed: 'rgba(255,255,255,0.07)',
  sheet: '#222226',
  glow: '#B6F03A',
};

/** Sheets, alerts and the share sheet: #26262A at 62 % over a 32 % black veil. */
export const sheetFill = 'rgba(38,38,42,0.62)';

/** The brand gradient (lime + mint), used only for brand moments. */
export const gradientStops = ['#7FD8A8', '#B6EE7A', '#CBF26B', '#EFFBD2'] as const;

/** Space Grotesk is for amounts, headlines and titles; everything else is SF Pro (the system font). */
export const font = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
} as const;

/** 4-pt grid. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24 } as const;
export const radius = { s: 12, m: 16, l: 20, card: 28, xl: 32, xxl: 36 } as const;

/** Motion tokens from the Figma "Motion · especificación" card. */
export const motion = {
  press: 140,
  standard: 220,
  /** Exits are faster than entrances. */
  exit: 160,
  /** Tabs cross-fade: seen many times a day, so barely there. */
  tab: 180,
  sheet: 350,
  numbers: 400,
  bigMoment: 600,
} as const;
