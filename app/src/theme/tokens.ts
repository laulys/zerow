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
};

/**
 * Rediseño v2 ("Dark · Grafito" in Figma): neutral graphite surfaces so lime is
 * the only colour. The old green-tinted `dark` stays for comparison.
 */
export const graphite: Tokens = {
  ...dark,
  page: '#0B0B0C',
  surface: '#17171A',
  line: '#2A2A2F',
  ink: '#F2F2EE',
  inkMuted: '#A0A09B',
  panel: '#1E1E22',
  panelRaised: '#2A2A2F',
  onPanel: '#F5F5F1',
  onPanelMuted: '#A6A6A1',
  selected: '#F2F2EE',
};

/** The brand gradient (lime + mint), used only for brand moments. */
export const gradientStops = ['#7FD8A8', '#B6EE7A', '#CBF26B', '#EFFBD2'] as const;

export const font = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
} as const;

/** Motion tokens from the Figma "Motion · especificación" card. */
export const motion = {
  press: 140,
  standard: 220,
  sheet: 350,
  numbers: 400,
  bigMoment: 600,
} as const;
