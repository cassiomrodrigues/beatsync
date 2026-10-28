import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeId = 'oled_zero' | 'light_day' | 'oled_amber' | 'dark_studio' | 'high_contrast';

export interface ThemeColors {
  id: ThemeId;
  name: string;
  tagline: string;
  isOled: boolean;
  isDark: boolean;
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
    isDark: true,
    background: '#000000',
    card: '#000000',
    cardElevated: '#000000',
    border: '#1F1F1F',
    text: '#F5F5F5',
    textSecondary: '#A8A8A8',
    textMuted: '#757575',
    accent: '#00E5FF',
    accentSecondary: '#00838F',
    navBackground: '#000000',
    navActive: '#000000',
    danger: '#FF4D4D',
    success: '#00E676',
  },
  light_day: {
    id: 'light_day',
    name: 'Tema Claro (Diurno)',
    tagline: 'Fundo claro de alto contraste • Ideal para estudo diurno e salas iluminadas',
    isOled: false,
    isDark: false,
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardElevated: '#F1F5F9',
    border: '#CBD5E1',
    text: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#475569',
    accent: '#0284C7',
    accentSecondary: '#0369A1',
    navBackground: '#FFFFFF',
    navActive: '#E0F2FE',
    danger: '#DC2626',
    success: '#15803D',
  },
  oled_amber: {
    id: 'oled_amber',
    name: 'OLED Âmbar (Igreja & Altar)',
    tagline: 'Preto puro com tons âmbar quentes • Suave para visão noturna',
    isOled: true,
    isDark: true,
    background: '#000000',
    card: '#000000',
    cardElevated: '#000000',
    border: '#2E220D',
    text: '#FFE8B8',
    textSecondary: '#C4A46C',
    textMuted: '#8F7342',
    accent: '#FFB300',
    accentSecondary: '#FF8F00',
    navBackground: '#000000',
    navActive: '#000000',
    danger: '#FF5252',
    success: '#69F0AE',
  },
  dark_studio: {
    id: 'dark_studio',
    name: 'Dark Studio',
    tagline: 'Azul ardósia profundo • Padrão clássico de estúdio',
    isOled: false,
    isDark: true,
    background: '#0E1017',
    card: '#161B26',
    cardElevated: '#1F2636',
    border: '#242C3E',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
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
    isDark: true,
    background: '#000000',
    card: '#000000',
    cardElevated: '#000000',
    border: '#333333',
    text: '#FFFFFF',
    textSecondary: '#D6D6D6',
    textMuted: '#888888',
    accent: '#FFFF00',
    accentSecondary: '#FFD600',
    navBackground: '#000000',
    navActive: '#000000',
    danger: '#FF3333',
    success: '#00FF66',
  },
};

const THEME_STORAGE_KEY = '@beatsync_theme_v1';
const THEME_LIST: ThemeColors[] = Object.values(THEMES);

function syncDocumentTheme(theme: ThemeColors): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  if (theme.isDark) {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }

  root.dataset.theme = theme.id;
  root.style.backgroundColor = theme.background;
  if (document.body) {
    document.body.style.backgroundColor = theme.background;
  }

  // Ensure mobile-native viewport-fit=cover and theme-color tags are present
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (viewportMeta) {
    const content = viewportMeta.getAttribute('content') || '';
    if (!content.includes('viewport-fit=cover')) {
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content'
      );
    }
  }

  const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
  if (themeMetas.length > 0) {
    themeMetas.forEach((meta) => meta.setAttribute('content', theme.background));
  } else if (document.head) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = theme.background;
    document.head.appendChild(meta);
  }
}

// Initialize OLED zero-light (#000000) class immediately before first hydration/render
if (typeof document !== 'undefined') {
  syncDocumentTheme(THEMES.oled_zero);
}

interface ThemeContextType {
  currentTheme: ThemeColors;
  isDark: boolean;
  setThemeId: (id: ThemeId) => Promise<void>;
  toggleLightTheme: () => Promise<void>;
  themes: ThemeColors[];
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: THEMES.oled_zero,
  isDark: true,
  setThemeId: async () => {},
  toggleLightTheme: async () => {},
  themes: THEME_LIST,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Strictly default and initial theme: OLED zero luz (#000000)
  const [themeId, setThemeIdState] = useState<ThemeId>('oled_zero');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isMounted && saved && saved in THEMES) {
          const loadedThemeId = saved as ThemeId;
          setThemeIdState(loadedThemeId);
          syncDocumentTheme(THEMES[loadedThemeId]);
        } else {
          syncDocumentTheme(THEMES.oled_zero);
        }
      } catch (e) {
        console.warn('Erro ao carregar tema:', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const setThemeId = useCallback(async (id: ThemeId) => {
    const resolvedTheme = THEMES[id] || THEMES.oled_zero;
    setThemeIdState(resolvedTheme.id);
    syncDocumentTheme(resolvedTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, resolvedTheme.id);
    } catch (e) {
      console.warn('Erro ao salvar tema:', e);
    }
  }, []);

  const toggleLightTheme = useCallback(async () => {
    setThemeIdState((prevId) => {
      const nextId: ThemeId = prevId === 'light_day' ? 'oled_zero' : 'light_day';
      const nextTheme = THEMES[nextId];
      syncDocumentTheme(nextTheme);
      AsyncStorage.setItem(THEME_STORAGE_KEY, nextId).catch((e) => {
        console.warn('Erro ao alternar tema:', e);
      });
      return nextId;
    });
  }, []);

  const currentTheme = THEMES[themeId] || THEMES.oled_zero;

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      currentTheme,
      isDark: currentTheme.isDark,
      setThemeId,
      toggleLightTheme,
      themes: THEME_LIST,
    }),
    [currentTheme, setThemeId, toggleLightTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
