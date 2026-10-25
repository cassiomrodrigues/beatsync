import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeId = 'oled_zero' | 'oled_amber' | 'dark_studio' | 'high_contrast';

export interface ThemeColors {
  id: ThemeId;
  name: string;
  tagline: string;
  isOled: boolean;
  background: string;
  card: string;
  cardElevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSecondary: string;
  navBackground: string;
  navActive: string;
  danger: string;
  success: string;
}

export const THEMES: Record<ThemeId, ThemeColors> = {
  oled_zero: {
    id: 'oled_zero',
    name: 'OLED Zero Luz',
    tagline: 'Preto absoluto #000000 • Máxima discrição em palcos e igrejas',
    isOled: true,
    background: '#000000',
    card: '#0B0B0B',
    cardElevated: '#141414',
    border: '#1F1F1F',
    text: '#F5F5F5',
    textSecondary: '#A0A0A0',
    textMuted: '#606060',
    accent: '#00E5FF',
    accentSecondary: '#00838F',
    navBackground: '#000000',
    navActive: '#1A1A1A',
    danger: '#FF4D4D',
    success: '#00E676',
  },
  oled_amber: {
    id: 'oled_amber',
    name: 'OLED Âmbar (Igreja & Altar)',
    tagline: 'Preto puro com tons âmbar quentes • Suave para visão noturna',
    isOled: true,
    background: '#000000',
    card: '#0D0B05',
    cardElevated: '#1A150A',
    border: '#2E220D',
    text: '#FFE8B8',
    textSecondary: '#C4A46C',
    textMuted: '#7D6438',
    accent: '#FFB300',
    accentSecondary: '#FF8F00',
    navBackground: '#000000',
    navActive: '#1F1705',
    danger: '#FF5252',
    success: '#69F0AE',
  },
  dark_studio: {
    id: 'dark_studio',
    name: 'Dark Studio',
    tagline: 'Azul ardósia profundo • Padrão clássico de estúdio',
    isOled: false,
    background: '#0E1017',
    card: '#161B26',
    cardElevated: '#1F2636',
    border: '#242C3E',
    text: '#FFFFFF',
    textSecondary: '#8B98B5',
    textMuted: '#58637E',
    accent: '#00E5FF',
    accentSecondary: '#00B0FF',
    navBackground: '#12141F',
    navActive: '#1A2133',
    danger: '#FF5252',
    success: '#00E676',
  },
  high_contrast: {
    id: 'high_contrast',
    name: 'Stage High-Vis (Amarelo Neon)',
    tagline: 'Preto puro com amarelo elétrico • Alta visibilidade a distância',
    isOled: true,
    background: '#000000',
    card: '#121212',
    cardElevated: '#1E1E1E',
    border: '#333333',
    text: '#FFFFFF',
    textSecondary: '#D6D6D6',
    textMuted: '#888888',
    accent: '#FFFF00',
    accentSecondary: '#FFD600',
    navBackground: '#050505',
    navActive: '#222222',
    danger: '#FF3333',
    success: '#00FF66',
  },
};

const THEME_STORAGE_KEY = '@beatsync_theme_v1';

interface ThemeContextType {
  currentTheme: ThemeColors;
  setThemeId: (id: ThemeId) => Promise<void>;
  themes: ThemeColors[];
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: THEMES.oled_zero,
  setThemeId: async () => {},
  themes: Object.values(THEMES),
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>('oled_zero');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && (saved in THEMES)) {
          setThemeIdState(saved as ThemeId);
        }
      } catch (e) {
        console.warn('Erro ao carregar tema:', e);
      }
    })();
  }, []);

  const setThemeId = async (id: ThemeId) => {
    setThemeIdState(id);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, id);
    } catch (e) {
      console.warn('Erro ao salvar tema:', e);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme: THEMES[themeId] || THEMES.oled_zero,
        setThemeId,
        themes: Object.values(THEMES),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
