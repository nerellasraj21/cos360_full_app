/**
 * Comprehensive theme constants adapted from CSS for React Native.
 * Supports light and dark modes with easy switching.
 * Includes colors, radius values, and adapted component styles.
 */

import { Platform } from 'react-native';

// Color palette adapted from CSS variables
export const Colors = {
  light: {
    background: '#ffffff',
    foreground: '#0f1419',
    card: '#ffffff',
    'card-foreground': '#0f1419',
    popover: '#ffffff',
    'popover-foreground': '#0f1419',
    primary: '#556ee6',
    'primary-foreground': '#f8f9fa',
    secondary: '#f8f9fa',
    'secondary-foreground': '#1a1a2e',
    muted: '#f8f9fa',
    'muted-foreground': '#6c757d',
    accent: '#f8f9fa',
    'accent-foreground': '#1a1a2e',
    destructive: '#dc3545',
    border: '#e9ecef',
    input: '#e9ecef',
    ring: '#6c757d',
    'chart-1': '#ff6b6b',
    'chart-2': '#4ecdc4',
    'chart-3': '#45b7d1',
    'chart-4': '#f9ca24',
    'chart-5': '#f0932b',
    sidebar: '#f8f9fa',
    'sidebar-foreground': '#0f1419',
    'sidebar-primary': '#1a1a2e',
    'sidebar-primary-foreground': '#f8f9fa',
    'sidebar-accent': '#f8f9fa',
    'sidebar-accent-foreground': '#1a1a2e',
    'sidebar-border': '#e9ecef',
    'sidebar-ring': '#6c757d',
    // Legacy colors for compatibility
    text: '#0f1419',
    tint: '#556ee6',
    icon: '#6c757d',
    tabIconDefault: '#6c757d',
    tabIconSelected: '#556ee6',
  },
  dark: {
    background: '#0f1419',
    foreground: '#f8f9fa',
    card: '#1a1a2e',
    'card-foreground': '#f8f9fa',
    popover: '#1a1a2e',
    'popover-foreground': '#f8f9fa',
    primary: '#556ee6',
    'primary-foreground': '#1a1a2e',
    secondary: '#2d3748',
    'secondary-foreground': '#f8f9fa',
    muted: '#2d3748',
    'muted-foreground': '#6c757d',
    accent: '#2d3748',
    'accent-foreground': '#f8f9fa',
    destructive: '#e53e3e',
    border: 'rgba(255,255,255,0.1)',
    input: 'rgba(255,255,255,0.15)',
    ring: '#4a5568',
    'chart-1': '#3182ce',
    'chart-2': '#63b3ed',
    'chart-3': '#f6ad55',
    'chart-4': '#9f7aea',
    'chart-5': '#e53e3e',
    sidebar: '#1a1a2e',
    'sidebar-foreground': '#f8f9fa',
    'sidebar-primary': '#3182ce',
    'sidebar-primary-foreground': '#f8f9fa',
    'sidebar-accent': '#2d3748',
    'sidebar-accent-foreground': '#f8f9fa',
    'sidebar-border': 'rgba(255,255,255,0.1)',
    'sidebar-ring': '#4a5568',
    // Legacy colors for compatibility
    text: '#f8f9fa',
    tint: '#f8f9fa',
    icon: '#6c757d',
    tabIconDefault: '#6c757d',
    tabIconSelected: '#f8f9fa',
  },
};

// Radius values
export const Radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  default: 10,
};

// Fonts (unchanged)
export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Component-specific styles adapted for React Native
export const ComponentStyles = {
  light: {
    textInput: {
      backgroundColor: Colors.light.card,
      borderColor: Colors.light.border,
      borderWidth: 1,
      borderRadius: Radius.default,
      color: Colors.light['card-foreground'],
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
    },
    picker: {
      backgroundColor: Colors.light.card,
      borderColor: Colors.light.border,
      borderWidth: 1,
      borderRadius: Radius.default,
      color: Colors.light['card-foreground'],
    },
    button: {
      backgroundColor: Colors.light.primary,
      borderRadius: Radius.default,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    buttonText: {
      color: Colors.light['primary-foreground'],
      fontSize: 14,
      fontWeight: '600',
    },
    card: {
      backgroundColor: Colors.light.card,
      borderColor: Colors.light.border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: 16,
    },
    table: {
      backgroundColor: Colors.light.card,
      borderColor: Colors.light.border,
      borderWidth: 1,
      borderRadius: Radius.default,
    },
    tableHeader: {
      backgroundColor: Colors.light.muted,
      borderBottomColor: Colors.light.border,
      borderBottomWidth: 1,
    },
    tableHeaderText: {
      color: Colors.light['muted-foreground'],
      fontSize: 14,
      fontWeight: '600',
    },
    tableRow: {
      borderBottomColor: Colors.light.border,
      borderBottomWidth: 1,
      backgroundColor: Colors.light.card,
    },
    tableRowText: {
      color: Colors.light['card-foreground'],
      fontSize: 14,
    },
    tableRowHover: {
      backgroundColor: Colors.light.accent,
    },
    tableRowHoverText: {
      color: Colors.light['accent-foreground'],
    },
  },
  dark: {
    textInput: {
      backgroundColor: Colors.dark.card,
      borderColor: Colors.dark.border,
      borderWidth: 1,
      borderRadius: Radius.default,
      color: Colors.dark['card-foreground'],
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
    },
    picker: {
      backgroundColor: Colors.dark.card,
      borderColor: Colors.dark.border,
      borderWidth: 1,
      borderRadius: Radius.default,
      color: Colors.dark['card-foreground'],
    },
    button: {
      backgroundColor: Colors.dark.primary,
      borderRadius: Radius.default,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    buttonText: {
      color: Colors.dark['primary-foreground'],
      fontSize: 14,
      fontWeight: '600',
    },
    card: {
      backgroundColor: Colors.dark.card,
      borderColor: Colors.dark.border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: 16,
    },
    table: {
      backgroundColor: Colors.dark.card,
      borderColor: Colors.dark.border,
      borderWidth: 1,
      borderRadius: Radius.default,
    },
    tableHeader: {
      backgroundColor: Colors.dark.muted,
      borderBottomColor: Colors.dark.border,
      borderBottomWidth: 1,
    },
    tableHeaderText: {
      color: Colors.dark['muted-foreground'],
      fontSize: 14,
      fontWeight: '600',
    },
    tableRow: {
      borderBottomColor: Colors.dark.border,
      borderBottomWidth: 1,
      backgroundColor: Colors.dark.card,
    },
    tableRowText: {
      color: Colors.dark['card-foreground'],
      fontSize: 14,
    },
    tableRowHover: {
      backgroundColor: Colors.dark.accent,
    },
    tableRowHoverText: {
      color: Colors.dark['accent-foreground'],
    },
  },
};

// Function to get theme based on mode
export const getTheme = (mode: 'light' | 'dark') => ({
  colors: Colors[mode],
  radius: Radius,
  fonts: Fonts,
  componentStyles: ComponentStyles[mode],
});

// Default theme (can be switched)
export const Theme = getTheme('light');
