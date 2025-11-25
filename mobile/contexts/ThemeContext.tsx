import { Colors, ComponentStyles, Fonts, getTheme, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { createContext, ReactNode, useContext, useState } from 'react';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  colors: typeof Colors.light;
  componentStyles: typeof ComponentStyles.light;
  radius: typeof Radius;
  fonts: typeof Fonts;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemTheme = useColorScheme() ?? 'light';
  const [overrideTheme, setOverrideTheme] = useState<ThemeType | null>(null);

  const currentTheme = overrideTheme || systemTheme;
  const themeData = getTheme(currentTheme);

  const value: ThemeContextType = {
    theme: currentTheme,
    colors: themeData.colors,
    componentStyles: themeData.componentStyles,
    radius: themeData.radius,
    fonts: themeData.fonts,
    setTheme: setOverrideTheme,
    toggleTheme: () => setOverrideTheme(currentTheme === 'light' ? 'dark' : 'light'),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook for backward compatibility with existing useThemeColor
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const { colors } = useTheme();
  const colorFromProps = props[colors === Colors.light ? 'light' : 'dark'];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return colors[colorName];
  }
}