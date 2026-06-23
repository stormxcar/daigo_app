import { useColorScheme } from 'react-native';
import { create } from 'zustand';
import { colors } from './tokens';

type ColorScheme = 'light' | 'dark';

interface ThemeStore {
  colorScheme: ColorScheme;
  isDark: boolean;
  colors: typeof colors.light;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  colorScheme: 'light',
  isDark: false,
  colors: colors.light,
  toggleTheme: () =>
    set((state) => {
      const newScheme = state.colorScheme === 'light' ? 'dark' : 'light';
      return {
        colorScheme: newScheme,
        isDark: newScheme === 'dark',
        colors: newScheme === 'dark' ? colors.dark : colors.light,
      };
    }),
  setColorScheme: (scheme: ColorScheme) =>
    set({
      colorScheme: scheme,
      isDark: scheme === 'dark',
      colors: scheme === 'dark' ? colors.dark : colors.light,
    }),
}));

export const useTheme = () => {
  const theme = useThemeStore();
  return {
    colors: theme.colors,
    isDark: theme.isDark,
    colorScheme: theme.colorScheme,
    toggleTheme: theme.toggleTheme,
    setColorScheme: theme.setColorScheme,
  };
};

// Hook to use theme with system preference detection
export const useThemedColors = () => {
  useColorScheme();
  const { colors: themeColors, colorScheme } = useThemeStore();

  return {
    colors: themeColors,
    isDark: colorScheme === 'dark',
  };
};
