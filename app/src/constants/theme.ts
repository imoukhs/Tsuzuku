import '@/global.css';

/**
 * Tsuzuku is a single always-dark theme (Sumi/ink background), not a
 * light/dark pair — a manga reader stays dark regardless of system
 * appearance. `light` and `dark` both point at the same palette so
 * `useColorScheme()`-driven code elsewhere keeps working without a
 * separate light variant to maintain.
 */
const palette = {
  sumi: '#0B0B0D', // ink black — reading surface + app background
  washi: '#F3EEE2', // paper white — primary text
  hanko: '#B23A2E', // seal red — the one loud accent (CTAs, unread badges, source tags)
  kohaku: '#C68A3D', // amber sepia — reserved for the chapter-complete transition
  nezumi: '#7A766D', // gray — metadata (chapter counts, timestamps)
};

const theme = {
  text: palette.washi,
  textSecondary: palette.nezumi,
  background: palette.sumi,
  backgroundElement: '#151318',
  backgroundSelected: '#1F1B20',
  accent: palette.hanko,
  highlight: palette.kohaku,
  border: 'rgba(243, 238, 226, 0.12)',
} as const;

export const Colors = {
  light: theme,
  dark: theme,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  /** Shippori Mincho — manga titles, wordmark. Used sparingly. */
  display: 'ShipporiMincho_600SemiBold',
  displayMedium: 'ShipporiMincho_500Medium',
  /** Manrope — library grids, chapter lists, all app chrome. */
  body: 'Manrope_400Regular',
  bodyMedium: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  /** JetBrains Mono — page counts, source tags, timestamps. */
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = 0;
export const MaxContentWidth = 800;
