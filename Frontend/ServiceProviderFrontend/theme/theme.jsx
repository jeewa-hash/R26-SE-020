import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { Colors } from './colors';

export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    secondary: Colors.secondary,
    background: Colors.background,
    surface: Colors.surface,
    error: Colors.error,
    onPrimary: Colors.onPrimary,
    onSurface: Colors.onSurface,
  },
};

export const DarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.primary,
    secondary: Colors.secondary,
  },
};