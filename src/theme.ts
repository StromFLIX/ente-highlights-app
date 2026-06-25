// Dark, modern theme tokens.
export const colors = {
  bg: '#0B0B0F',
  surface: '#15151C',
  surface2: '#1E1E28',
  border: '#2A2A36',
  text: '#F5F5FA',
  textDim: '#9A9AB0',
  textFaint: '#6A6A80',
  primary: '#7C5CFF',
  primary2: '#A98BFF',
  accent: '#FF5C8A',
  success: '#3DD68C',
  warning: '#FFC857',
  danger: '#FF5C5C',
  overlay: 'rgba(0,0,0,0.6)',
  storyRing1: '#FF5C8A',
  storyRing2: '#7C5CFF',
};

export const spacing = (n: number) => n * 4;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '800' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  title: { fontSize: 16, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 14, fontWeight: '500' as const, color: colors.text },
  label: { fontSize: 13, fontWeight: '600' as const, color: colors.textDim },
  caption: { fontSize: 11, fontWeight: '600' as const, color: colors.textFaint },
};
