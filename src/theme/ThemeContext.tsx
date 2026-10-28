import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SoundType } from '../types';
import { CloudLibraryService } from '../supabase/cloudLibrary';
import { AuthService } from '../supabase/supabaseClient';

export type ThemeId =
  | 'oled_zero'
  | 'pulsar_cyber_lime'
  | 'light_day'
  | 'oled_amber'
  | 'dark_studio'
  | 'high_contrast';

export interface ThemeColors {
  id: ThemeId;
  name: string;
  tagline: string;
  isOled: boolean;
  isDark: boolean;
  hasBrandGradient?: boolean;
  gradientStart?: string;
  gradientEnd?: string;
  glowColor?: string;
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
  pulsar_cyber_lime: {
    id: 'pulsar_cyber_lime',
    name: 'Pulsar (Cyber Lime)',
    tagline: 'Preto absoluto #000000 • Degradê oficial Verde-Limão & Laranja Neon',
    isOled: true,
    isDark: true,
    hasBrandGradient: true,
    gradientStart: '#FF5E00',
    gradientEnd: '#89F21B',
    glowColor: '#89F21B',
    background: '#000000',
    card: '#000000',
    cardElevated: '#070E03',
    border: '#2A4510',
    text: '#F7FEE7',
    textSecondary: '#B5E477',
    textMuted: '#6E9938',
    accent: '#89F21B',
    accentSecondary: '#FF5E00',
    navBackground: '#000000',
    navActive: '#0F1F05',
    danger: '#FF3D00',
    success: '#89F21B',
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
const SOUND_STORAGE_KEY = '@beatsync_default_sound_v1';
const THEME_LIST: ThemeColors[] = Object.values(THEMES);
const VALID_SOUNDS: ReadonlyArray<SoundType> = ['beep', 'woodblock', 'rimshot', 'mechanical'];

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
  root.style.setProperty('--bg-primary', theme.background);
  root.style.setProperty('--bg-card', theme.card);
  root.style.setProperty('--bg-elevated', theme.cardElevated);
  root.style.setProperty('--border-color', theme.border);
  root.style.setProperty('--text-primary', theme.text);
  root.style.setProperty('--text-secondary', theme.textSecondary);
  root.style.setProperty('--text-muted', theme.textMuted);
  root.style.setProperty('--accent-color', theme.accent);
  root.style.setProperty('--accent-secondary', theme.accentSecondary);
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

  // Ensure PWA manifest and apple-touch-icon links exist for home screen installation
  if (document.head) {
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = '/manifest.json';
      document.head.appendChild(manifestLink);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      appleIcon.href = '/apple-touch-icon.png';
      document.head.appendChild(appleIcon);
    }
  }
}

// Initialize OLED zero-light (#000000) class immediately before first hydration/render
if (typeof document !== 'undefined') {
  syncDocumentTheme(THEMES.oled_zero);
}

interface ThemeContextType {
  currentTheme: ThemeColors;
  isDark: boolean;
  defaultSoundType: SoundType;
  flashEnabled: boolean;
  hapticsEnabled: boolean;
  setThemeId: (id: ThemeId) => Promise<void>;
  toggleLightTheme: () => Promise<void>;
  setDefaultSoundType: (sound: SoundType) => Promise<void>;
  setFlashEnabledPref: (enabled: boolean) => Promise<void>;
  setHapticsEnabledPref: (enabled: boolean) => Promise<void>;
  syncSettingsFromCloud: (userId?: string) => Promise<void>;
  themes: ThemeColors[];
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: THEMES.oled_zero,
  isDark: true,
  defaultSoundType: 'woodblock',
  flashEnabled: true,
  hapticsEnabled: true,
  setThemeId: async () => {},
  toggleLightTheme: async () => {},
  setDefaultSoundType: async () => {},
  setFlashEnabledPref: async () => {},
  setHapticsEnabledPref: async () => {},
  syncSettingsFromCloud: async () => {},
  themes: THEME_LIST,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Strictly default and initial theme: OLED zero luz (#000000)
  const [themeId, setThemeIdState] = useState<ThemeId>('oled_zero');
  const [defaultSoundType, setDefaultSoundTypeState] = useState<SoundType>('woodblock');
  const [flashEnabled, setFlashEnabledState] = useState<boolean>(true);
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(true);
  const activeUserIdRef = useRef<string | undefined>(undefined);

  const syncSettingsFromCloud = useCallback(async (userId?: string) => {
    try {
      if (userId) {
        activeUserIdRef.current = userId;
      }
      const remoteSettings = await CloudLibraryService.fetchUserSettings(userId || activeUserIdRef.current);
      if (!remoteSettings) return;

      activeUserIdRef.current = remoteSettings.userId;

      if (remoteSettings.themeId && remoteSettings.themeId in THEMES) {
        const resolvedId = remoteSettings.themeId as ThemeId;
        setThemeIdState(resolvedId);
        syncDocumentTheme(THEMES[resolvedId]);
        await AsyncStorage.setItem(THEME_STORAGE_KEY, resolvedId);
      }

      if (
        remoteSettings.defaultSoundType &&
        VALID_SOUNDS.includes(remoteSettings.defaultSoundType)
      ) {
        setDefaultSoundTypeState(remoteSettings.defaultSoundType);
        await AsyncStorage.setItem(SOUND_STORAGE_KEY, remoteSettings.defaultSoundType);
      }

      setFlashEnabledState(remoteSettings.flashEnabled);
      setHapticsEnabledState(remoteSettings.hapticsEnabled);
    } catch (e) {
      console.warn('Erro ao sincronizar user_settings da nuvem:', e);
    }
  }, []);

  // Load fast local cache & subscribe to Supabase Auth changes to pull cloud user_settings
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        // Parallel local read + auth session check (eliminates waterfall per react-performance)
        const [savedTheme, savedSound, currentUser] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(SOUND_STORAGE_KEY),
          AuthService.getCurrentUser(),
        ]);

        if (!isMounted) return;

        if (savedTheme && savedTheme in THEMES) {
          const loadedThemeId = savedTheme as ThemeId;
          setThemeIdState(loadedThemeId);
          syncDocumentTheme(THEMES[loadedThemeId]);
        } else {
          syncDocumentTheme(THEMES.oled_zero);
        }

        if (savedSound && VALID_SOUNDS.includes(savedSound as SoundType)) {
          setDefaultSoundTypeState(savedSound as SoundType);
        }

        if (currentUser?.id) {
          activeUserIdRef.current = currentUser.id;
          await syncSettingsFromCloud(currentUser.id);
        }
      } catch (e) {
        console.warn('Erro ao inicializar preferências:', e);
      }
    })();

    const sub = AuthService.onAuthStateChange((user) => {
      if (user?.id) {
        activeUserIdRef.current = user.id;
        syncSettingsFromCloud(user.id);
      } else {
        activeUserIdRef.current = undefined;
      }
    });

    return () => {
      isMounted = false;
      sub?.unsubscribe();
    };
  }, [syncSettingsFromCloud]);

  const setThemeId = useCallback(async (id: ThemeId) => {
    const resolvedTheme = THEMES[id] || THEMES.oled_zero;
    setThemeIdState(resolvedTheme.id);
    syncDocumentTheme(resolvedTheme);
    try {
      await Promise.all([
        AsyncStorage.setItem(THEME_STORAGE_KEY, resolvedTheme.id),
        CloudLibraryService.saveUserSettings(
          { themeId: resolvedTheme.id },
          activeUserIdRef.current
        ),
      ]);
    } catch (e) {
      console.warn('Erro ao salvar tema no Supabase:', e);
    }
  }, []);

  const toggleLightTheme = useCallback(async () => {
    let nextResolvedId: ThemeId = 'oled_zero';
    setThemeIdState((prevId) => {
      const nextId: ThemeId = prevId === 'light_day' ? 'oled_zero' : 'light_day';
      nextResolvedId = nextId;
      syncDocumentTheme(THEMES[nextId]);
      return nextId;
    });

    try {
      await Promise.all([
        AsyncStorage.setItem(THEME_STORAGE_KEY, nextResolvedId),
        CloudLibraryService.saveUserSettings(
          { themeId: nextResolvedId },
          activeUserIdRef.current
        ),
      ]);
    } catch (e) {
      console.warn('Erro ao alternar tema no Supabase:', e);
    }
  }, []);

  const setDefaultSoundType = useCallback(async (sound: SoundType) => {
    setDefaultSoundTypeState(sound);
    try {
      await Promise.all([
        AsyncStorage.setItem(SOUND_STORAGE_KEY, sound),
        CloudLibraryService.saveUserSettings(
          { defaultSoundType: sound },
          activeUserIdRef.current
        ),
      ]);
    } catch (e) {
      console.warn('Erro ao salvar timbre padrão no Supabase:', e);
    }
  }, []);

  const setFlashEnabledPref = useCallback(async (enabled: boolean) => {
    setFlashEnabledState(enabled);
    try {
      await CloudLibraryService.saveUserSettings(
        { flashEnabled: enabled },
        activeUserIdRef.current
      );
    } catch (e) {
      console.warn('Erro ao salvar preferência de flash no Supabase:', e);
    }
  }, []);

  const setHapticsEnabledPref = useCallback(async (enabled: boolean) => {
    setHapticsEnabledState(enabled);
    try {
      await CloudLibraryService.saveUserSettings(
        { hapticsEnabled: enabled },
        activeUserIdRef.current
      );
    } catch (e) {
      console.warn('Erro ao salvar preferência háptica no Supabase:', e);
    }
  }, []);

  const currentTheme = THEMES[themeId] || THEMES.oled_zero;

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      currentTheme,
      isDark: currentTheme.isDark,
      defaultSoundType,
      flashEnabled,
      hapticsEnabled,
      setThemeId,
      toggleLightTheme,
      setDefaultSoundType,
      setFlashEnabledPref,
      setHapticsEnabledPref,
      syncSettingsFromCloud,
      themes: THEME_LIST,
    }),
    [
      currentTheme,
      defaultSoundType,
      flashEnabled,
      hapticsEnabled,
      setThemeId,
      toggleLightTheme,
      setDefaultSoundType,
      setFlashEnabledPref,
      setHapticsEnabledPref,
      syncSettingsFromCloud,
    ]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
