export const colors = {
  light: {
    // Backgrounds
    background: '#ffffff',
    surfaceBase: '#f8f9fa',
    surface: '#f1f5f9',
    surfaceAlt: '#e2e8f0',

    // Text
    text: '#1e293b',
    textSecondary: '#475569',
    textTertiary: '#94a3b8',

    // Primary Brand Color (Xanh SM Green)
    primary: '#22c55e',
    primaryLight: '#4ade80',
    primaryDark: '#16a34a',

    // Semantic Colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Borders
    border: '#e2e8f0',
    borderLight: '#f1f5f9',

    // Status
    statusPending: '#f59e0b',
    statusConfirmed: '#3b82f6',
    statusCompleted: '#10b981',
    statusCancelled: '#ef4444',
  },
  dark: {
    // Backgrounds
    background: '#0f172a',
    surfaceBase: '#1e293b',
    surface: '#334155',
    surfaceAlt: '#475569',

    // Text
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',

    // Primary Brand Color
    primary: '#22c55e',
    primaryLight: '#4ade80',
    primaryDark: '#16a34a',

    // Semantic Colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Borders
    border: '#334155',
    borderLight: '#475569',

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

export const typography = {
  h1: {
    fontSize: fontSize['4xl'],
    lineHeight: lineHeight['4xl'],
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['3xl'],
    fontWeight: '700' as const,
  },
  h3: {
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
    fontWeight: '700' as const,
  },
  h4: {
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    fontWeight: '600' as const,
  },
  h5: {
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    fontWeight: '500' as const,
  },
};
