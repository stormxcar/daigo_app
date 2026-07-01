export const colors = {
  light: {
    // Backgrounds
    background: '#ffffff',
    surfaceBase: '#f8f9fa',
    surface: '#f0f4ff',
    surfaceAlt: '#dbeafe',

    // Text
    text: '#1e293b',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',

    // Primary Brand Color — Xanh Dương (Blue)
    primary: '#2563eb',
    primaryLight: '#60a5fa',
    primaryDark: '#1d4ed8',

    // Semantic Colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#6366f1',

    // Borders
    border: '#dbeafe',
    borderLight: '#eff6ff',

    // Status
    statusPending: '#f59e0b',
    statusConfirmed: '#2563eb',
    statusCompleted: '#10b981',
    statusCancelled: '#ef4444',
  },
  dark: {
    // Backgrounds
    background: '#0f172a',
    surfaceBase: '#1e293b',
    surface: '#1e3a5f',
    surfaceAlt: '#1d3461',

    // Text
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',

    // Primary Brand Color — Xanh Dương (Blue)
    primary: '#3b82f6',
    primaryLight: '#60a5fa',
    primaryDark: '#2563eb',

    // Semantic Colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#6366f1',

    // Borders
    border: '#1e3a5f',
    borderLight: '#1e293b',

    // Status
    statusPending: '#f59e0b',
    statusConfirmed: '#3b82f6',
    statusCompleted: '#10b981',
    statusCancelled: '#ef4444',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const lineHeight = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 28,
  '2xl': 32,
  '3xl': 36,
  '4xl': 40,
};

export const shadows = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 12,
  },
  '2xl': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 16,
  },
};

export const fontFamily = {
  regular: 'NunitoSans_400Regular',
  medium: 'NunitoSans_500Medium',
  semiBold: 'NunitoSans_600SemiBold',
  bold: 'NunitoSans_700Bold',
  extraBold: 'NunitoSans_800ExtraBold',
  black: 'NunitoSans_900Black',
} as const;

export const fontForWeight = (
  weight?: '400' | '500' | '600' | '700' | '800' | '900' | 400 | 500 | 600 | 700 | 800 | 900,
) => {
  const normalized = String(weight ?? '400');
  const family =
    normalized === '900'
      ? fontFamily.black
      : normalized === '800'
        ? fontFamily.extraBold
        : normalized === '700'
          ? fontFamily.bold
          : normalized === '600'
            ? fontFamily.semiBold
            : normalized === '500'
              ? fontFamily.medium
              : fontFamily.regular;

  return { fontFamily: family };
};

export const typography = {
  h1: {
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['4xl'],
    ...fontForWeight('700'),
  },
  h2: {
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['3xl'],
    ...fontForWeight('700'),
  },
  h3: {
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
    ...fontForWeight('700'),
  },
  h4: {
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    ...fontForWeight('600'),
  },
  h5: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    ...fontForWeight('600'),
  },
  body: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    ...fontForWeight('400'),
  },
  bodySmall: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    ...fontForWeight('400'),
  },
  label: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    ...fontForWeight('600'),
  },
  caption: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    ...fontForWeight('500'),
  },
};
