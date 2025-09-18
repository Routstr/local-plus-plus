import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Appearance } from 'react-native';
import type { ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeColors {
  primary: string
  background: string
  surface: string
  card: string
  white: string
  black: string
  text: string
  textSecondary: string
  border: string
  error: string
  disabled: string
  inputBackground: string
  shadow: string
  buttonBackground: string
  valid: string
}

export interface Theme {
  colors: ThemeColors
  dark: boolean
}

const lightColors: ThemeColors = {
  primary: '#111111',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#F7F7F8',
  white: '#FFFFFF',
  black: '#000000',
  text: '#0A0A0A',
  textSecondary: '#71717A',
  border: '#E4E4E7',
  error: '#EF4444',
  disabled: '#D4D4D8',
  inputBackground: '#FFFFFF',
  shadow: '#000000',
  buttonBackground: '#111111',
  valid: '#16A34A',
};

const darkColors: ThemeColors = {
  primary: '#3F3F46',
  background: '#09090B',
  surface: '#0F0F10',
  card: '#111113',
  white: '#FFFFFF',
  black: '#000000',
  text: '#FAFAFA',
  textSecondary: '#A1A1AA',
  border: '#27272A',
  error: '#EF4444',
  disabled: '#3F3F46',
  inputBackground: '#0F0F10',
  shadow: '#000000',
  buttonBackground: '#18181B',
  valid: '#22C55E',
};

export const lightTheme: Theme = {
  colors: lightColors,
  dark: false,
};

export const darkTheme: Theme = {
  colors: darkColors,
  dark: true,
};

interface ThemeContextType {
  theme: Theme
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@llama_theme_mode';

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemColorScheme, setSystemColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme()
  );

  const getEffectiveTheme = (mode: ThemeMode, systemScheme: ColorSchemeName): Theme => {
    if (mode === 'system') {
      return systemScheme === 'dark' ? darkTheme : lightTheme;
    }
    return mode === 'dark' ? darkTheme : lightTheme;
  };

  const theme = getEffectiveTheme(themeMode, systemColorScheme);
  const isDark = theme.dark;

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  const loadThemeMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme mode:', error);
    }
  };

  useEffect(() => {
    loadThemeMode();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  const contextValue: ThemeContextType = {
    theme,
    themeMode,
    setThemeMode,
    isDark,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
