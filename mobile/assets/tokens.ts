/**
 * MyCounselor — Design Tokens
 * Single source of truth for the app's visual system.
 *
 * Framework-agnostic plain object. Works with React Native StyleSheet,
 * styled-components, NativeWind (map into theme), or plain web.
 *
 * Fonts: Manrope (display / headings / wordmark / buttons) + Public Sans (body / UI).
 * In Expo:  npx expo install @expo-google-fonts/manrope @expo-google-fonts/public-sans expo-font
 * The RN family strings below assume the @expo-google-fonts naming convention.
 */

export const colors = {
  // Brand — warm, slightly teal-leaning blue
  primary:        '#1E73CE', // main actions, active states, links
  primaryPressed: '#155CAC', // hover / pressed
  primaryLight:   '#3A8AE0',
  primaryTint:    '#E2EEFB', // tinted fills, "In Progress" bg, icon chips
  primaryTintSoft:'#F0F6FE',
  primaryTail:    '#8FBDEC', // logo light tail (two-tone blue)
  navy:           '#14306B', // wordmark, deep headers

  // Identity accents
  teal:           '#199FB0', // avatar hue / subtle accents
  tealOnDark:     '#5FD0DD',
  coral:          '#E0785A', // AI Counselor + warm human accents (use sparingly)
  coralPressed:   '#CC6647',
  coralTint:      '#FBEAE2',

  // Feedback
  danger:         '#E5483B', // destructive (reject / delete)
  dangerPressed:  '#C93B30',

  // Neutrals (cool, slight blue undertone)
  ink900:         '#17233D', // primary text / titles
  ink700:         '#36425A', // body text
  muted500:       '#64728A', // secondary text
  faint400:       '#95A2B6', // captions, placeholders, inactive icons
  border:         '#E6EBF2', // card & input borders
  borderSoft:     '#EEF2F8', // dividers
  canvas:         '#F4F7FB', // app background
  card:           '#FFFFFF',

  // Dark surfaces (splash / marketing / dark headers)
  dark:           '#0E1A33',
  dark2:          '#16294A',

  white:          '#FFFFFF',
};

/** Status badge styles — { bg, text, dot } */
export const status = {
  pending:    { bg: '#FBEFD6', text: '#9A6A12', dot: '#E2A437' },
  inProgress: { bg: '#E2EEFB', text: '#1A63B8', dot: '#2C7FD6' },
  approved:   { bg: '#DCF1E6', text: '#1B8A54', dot: '#27A869' },
  closed:     { bg: '#EAEEF4', text: '#5C6B82', dot: '#94A3B8' },
};

/** Spacing scale — base unit 4 */
export const spacing = {
  xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40,
};

/** Corner radii — tight, modern */
export const radius = {
  chip: 6,
  control: 9,   // buttons, inputs
  card: 12,
  panel: 14,
  sheet: 16,
  pill: 999,
  full: 9999,   // avatars, FABs (use width/2 in RN)
};

export const typography = {
  fontFamily: {
    // RN (@expo-google-fonts). On web use 'Manrope' / 'Public Sans' + weight.
    display:        'Manrope_700Bold',
    displayBold:    'Manrope_800ExtraBold',
    displayMedium:  'Manrope_500Medium',
    text:           'PublicSans_400Regular',
    textMedium:     'PublicSans_500Medium',
    textSemibold:   'PublicSans_600SemiBold',
    textBold:       'PublicSans_700Bold',
  },
  // role: [fontSize, lineHeight, letterSpacing]
  screenTitle:    { fontSize: 28, lineHeight: 30, letterSpacing: -0.6, family: 'Manrope_800ExtraBold' },
  sectionHeading: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2, family: 'Manrope_700Bold' },
  cardTitle:      { fontSize: 17, lineHeight: 22, letterSpacing: 0,    family: 'Manrope_700Bold' },
  body:           { fontSize: 15, lineHeight: 22, letterSpacing: 0,    family: 'PublicSans_400Regular' },
  bodyStrong:     { fontSize: 15, lineHeight: 22, letterSpacing: 0,    family: 'PublicSans_600SemiBold' },
  secondary:      { fontSize: 13, lineHeight: 19, letterSpacing: 0,    family: 'PublicSans_500Medium' },
  caption:        { fontSize: 12, lineHeight: 16, letterSpacing: 0,    family: 'PublicSans_500Medium' },
  eyebrow:        { fontSize: 12, lineHeight: 14, letterSpacing: 1.7,  family: 'PublicSans_700Bold' }, // uppercase
  button:         { fontSize: 15, lineHeight: 18, letterSpacing: 0,    family: 'Manrope_700Bold' },
  tabLabel:       { fontSize: 11, lineHeight: 13, letterSpacing: 0,    family: 'PublicSans_700Bold' },
};

/** React Native shadow presets (iOS shadow* + Android elevation) */
export const shadows = {
  card:          { shadowColor: '#142850', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,  elevation: 1 },
  raised:        { shadowColor: '#142850', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 18, elevation: 6 },
  primaryButton: { shadowColor: '#1E73CE', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 5 },
  fab:           { shadowColor: '#1E73CE', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.34, shadowRadius: 18, elevation: 8 },
  danger:        { shadowColor: '#E5483B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 5 },
};

/** Input focus ring (web): border primary + 0 0 0 3px rgba(30,115,206,.12) */
export const focusRing = 'rgba(30,115,206,0.12)';

/** Deterministic avatar background from a name. White initials on top. */
export const avatarPalette = ['#2C7FD6', '#199FB0', '#E0785A', '#7C6CD6', '#27A869', '#E2A437', '#5C6B82'];

export function getAvatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return avatarPalette[h % avatarPalette.length];
}

export function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default { colors, status, spacing, radius, typography, shadows, focusRing, avatarPalette, getAvatarColor, getInitials };
