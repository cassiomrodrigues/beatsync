import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar as RNStatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import './src/theme/global.css';
import { Song, Playlist } from './src/types';
import { StorageService } from './src/storage/storage';
import { MetronomeScreen } from './src/screens/MetronomeScreen';
import { SongsScreen } from './src/screens/SongsScreen';
import { PlaylistsScreen } from './src/screens/PlaylistsScreen';
import { LiveSetlistScreen } from './src/screens/LiveSetlistScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { AuthGuardService, AuthSession } from './src/auth/authGuard';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

type TabType = 'metronome' | 'songs' | 'playlists' | 'live' | 'settings' | 'admin';

function AppContent() {
  const { currentTheme } = useTheme();
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabType>('metronome');
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [activeLivePlaylist, setActiveLivePlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication session on mount
  useEffect(() => {
    AuthGuardService.getSession().then((session) => {
      setAuthSession(session);
      setIsAuthLoading(false);
    });
  }, []);

  // Load data on startup
  const loadData = async () => {
    try {
      const loadedSongs = await StorageService.getSongs();
      const loadedPlaylists = await StorageService.getPlaylists();
      setSongs(loadedSongs);
      setPlaylists(loadedPlaylists);
    } catch (err) {
      console.error('Falha ao carregar dados:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authSession) {
      loadData();
    }
  }, [authSession]);

  const handleLogout = async () => {
    await AuthGuardService.logout();
    setAuthSession(null);
    setActiveTab('metronome');
  };

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Deseja realmente sair do BeatSync?')) {
        handleLogout();
      }
    } else {
      Alert.alert(
        'Sair da Conta',
        'Deseja realmente encerrar a sessão no BeatSync?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: handleLogout },
        ]
      );
    }
  };

  // CRUD SONG HANDLERS
  const handleSaveSong = async (song: Song) => {
    const updated = await StorageService.saveSong(song);
    setSongs(updated);
    if (currentSong && currentSong.id === song.id) {
      setCurrentSong(song);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    const updated = await StorageService.deleteSong(songId);
    setSongs(updated);
    const updatedPlaylists = await StorageService.getPlaylists();
    setPlaylists(updatedPlaylists);
    if (currentSong && currentSong.id === songId) {
      setCurrentSong(null);
    }
  };

  const handleSelectSongForMetronome = useCallback((song: Song) => {
    setCurrentSong(song);
    setActiveTab('metronome');
  }, []);

  const handleClearCurrentSong = useCallback(() => {
    setCurrentSong(null);
  }, []);

  const handleOpenSongsTab = useCallback(() => {
    setActiveTab('songs');
  }, []);

  // CRUD PLAYLIST HANDLERS
  const handleSavePlaylist = async (playlist: Playlist) => {
    const updated = await StorageService.savePlaylist(playlist);
    setPlaylists(updated);
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    const updated = await StorageService.deletePlaylist(playlistId);
    setPlaylists(updated);
    if (activeLivePlaylist && activeLivePlaylist.id === playlistId) {
      setActiveLivePlaylist(null);
    }
  };

  const handleAddSongToPlaylist = async (playlistId: string, songId: string) => {
    const updated = await StorageService.addSongToPlaylist(playlistId, songId);
    setPlaylists(updated);
    alert('Música adicionada à playlist!');
  };

  const handleRemoveSongFromPlaylist = async (playlistId: string, songIndex: number) => {
    const updated = await StorageService.removeSongFromPlaylist(playlistId, songIndex);
    setPlaylists(updated);
  };

  const handleReorderSongInPlaylist = async (
    playlistId: string,
    fromIndex: number,
    toIndex: number
  ) => {
    const updated = await StorageService.reorderPlaylistSongs(playlistId, fromIndex, toIndex);
    setPlaylists(updated);
  };

  const handleOpenLiveMode = (playlist: Playlist) => {
    setActiveLivePlaylist(playlist);
    setActiveTab('live');
  };

  // 1. Initial Authentication Loading State
  if (isAuthLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00E5FF" />
      </SafeAreaView>
    );
  }

  // 2. Unauthenticated Barrier: Redirect to Login Screen
  if (!authSession) {
    return (
      <LoginScreen
        onLoginSuccess={(session) => {
          setAuthSession(session);
        }}
      />
    );
  }

  const isAdmin = authSession.role === 'admin';

  // 3. Authenticated App Experience
  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: currentTheme.background },
      ]}
      // @ts-expect-error web-only className for 100dvh and Tailwind dark mode
      className="dark:bg-black bg-day"
    >
      <ExpoStatusBar style={currentTheme.isDark ? 'light' : 'dark'} />

      {/* Compact Fixed Top Bar with Safe-Area Top Support */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: currentTheme.navBackground,
            borderBottomColor: currentTheme.border,
          },
        ]}
        // @ts-expect-error web-only className for iOS notch safe area
        className="safe-top"
      >
        <View style={styles.topHeaderLeft}>
          <Text style={[styles.topHeaderLogo, { color: currentTheme.accent }]}>BEATSYNC</Text>
          {isAdmin && (
            <View style={[styles.topAdminBadge, { borderColor: currentTheme.accent }]}>
              <Text style={[styles.topAdminBadgeText, { color: currentTheme.accent }]}>ADMIN</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={confirmLogout}
          style={[
            styles.fixedLogoutBtn,
            {
              borderColor: currentTheme.border,
              backgroundColor: currentTheme.card,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Sair do aplicativo"
        >
          <Ionicons name="log-out-outline" size={13} color={currentTheme.textSecondary} />
          <Text style={[styles.fixedLogoutText, { color: currentTheme.textSecondary }]}>Sair</Text>
        </TouchableOpacity>
      </View>

      {/* Main Screen Container */}
      <View style={[styles.screenContainer, { backgroundColor: currentTheme.background }]}>
        {/* Keep MetronomeScreen mounted to preserve active audio engine state & avoid remount lag across tab switches */}
        <View
          style={[
            styles.screenContainer,
            { display: activeTab === 'metronome' ? 'flex' : 'none' },
          ]}
        >
          <MetronomeScreen
            currentSong={currentSong}
            onClearCurrentSong={handleClearCurrentSong}
            onOpenSongsTab={handleOpenSongsTab}
          />
        </View>

        {activeTab === 'songs' && (
          <SongsScreen
            songs={songs}
            playlists={playlists}
            onSaveSong={handleSaveSong}
            onDeleteSong={handleDeleteSong}
            onSelectSongForMetronome={handleSelectSongForMetronome}
            onAddSongToPlaylist={handleAddSongToPlaylist}
            onCreateNewPlaylist={() => setActiveTab('playlists')}
          />
        )}

        {activeTab === 'playlists' && (
          <PlaylistsScreen
            playlists={playlists}
            songs={songs}
            onSavePlaylist={handleSavePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onReorderSong={handleReorderSongInPlaylist}
            onRemoveSongFromPlaylist={handleRemoveSongFromPlaylist}
            onSelectSongForMetronome={handleSelectSongForMetronome}
            onOpenLiveMode={handleOpenLiveMode}
          />
        )}

        {activeTab === 'live' && (
          <LiveSetlistScreen
            playlist={activeLivePlaylist || playlists[0] || null}
            allPlaylists={playlists}
            songs={songs}
            onSelectPlaylist={(p) => setActiveLivePlaylist(p)}
            onExitLiveMode={() => setActiveTab('playlists')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen
            onDataReset={loadData}
            onLogout={handleLogout}
            onOpenAdmin={() => setActiveTab('admin')}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminScreen
            currentSession={authSession}
            onExitAdmin={() => setActiveTab('metronome')}
          />
        )}
      </View>

      {/* Compact Bottom Navigation Bar with Safe-Area Bottom Support */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: currentTheme.navBackground,
            borderTopColor: currentTheme.border,
          },
        ]}
        // @ts-expect-error web-only className for iOS home indicator safe area
        className="safe-bottom"
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('metronome')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'metronome' }}
          accessibilityLabel="Aba Metrônomo"
          style={[
            styles.navTab,
            activeTab === 'metronome' && [
              styles.navTabActive,
              { backgroundColor: currentTheme.navActive },
            ],
          ]}
        >
          <Ionicons
            name={activeTab === 'metronome' ? 'speedometer' : 'speedometer-outline'}
            size={18}
            color={activeTab === 'metronome' ? currentTheme.accent : currentTheme.textSecondary}
          />
          <Text
            style={[
              styles.navText,
              { color: currentTheme.textSecondary },
              activeTab === 'metronome' && [
                styles.navTextActive,
                { color: currentTheme.accent },
              ],
            ]}
          >
            Metrônomo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('songs')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'songs' }}
          accessibilityLabel="Aba Músicas"
          style={[
            styles.navTab,
            activeTab === 'songs' && [
              styles.navTabActive,
              { backgroundColor: currentTheme.navActive },
            ],
          ]}
        >
          <Ionicons
            name={activeTab === 'songs' ? 'musical-notes' : 'musical-notes-outline'}
            size={18}
            color={activeTab === 'songs' ? currentTheme.accent : currentTheme.textSecondary}
          />
          <Text
            style={[
              styles.navText,
              { color: currentTheme.textSecondary },
              activeTab === 'songs' && [
                styles.navTextActive,
                { color: currentTheme.accent },
              ],
            ]}
          >
            Músicas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('playlists')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'playlists' }}
          accessibilityLabel="Aba Playlists"
          style={[
            styles.navTab,
            activeTab === 'playlists' && [
              styles.navTabActive,
              { backgroundColor: currentTheme.navActive },
            ],
          ]}
        >
          <Ionicons
            name={activeTab === 'playlists' ? 'list' : 'list-outline'}
            size={18}
            color={activeTab === 'playlists' ? currentTheme.accent : currentTheme.textSecondary}
          />
          <Text
            style={[
              styles.navText,
              { color: currentTheme.textSecondary },
              activeTab === 'playlists' && [
                styles.navTextActive,
                { color: currentTheme.accent },
              ],
            ]}
          >
            Playlists
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('live')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'live' }}
          accessibilityLabel="Aba Modo Ao Vivo"
          style={[
            styles.navTab,
            activeTab === 'live' && [
              styles.navTabActive,
              { backgroundColor: currentTheme.navActive },
            ],
          ]}
        >
          <Ionicons
            name={activeTab === 'live' ? 'mic' : 'mic-outline'}
            size={18}
            color={activeTab === 'live' ? currentTheme.accent : currentTheme.textSecondary}
          />
          <Text
            style={[
              styles.navText,
              { color: currentTheme.textSecondary },
              activeTab === 'live' && [
                styles.navTextActive,
                { color: currentTheme.accent },
              ],
            ]}
          >
            Ao Vivo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('settings')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'settings' }}
          accessibilityLabel="Aba Ajustes"
          style={[
            styles.navTab,
            activeTab === 'settings' && [
              styles.navTabActive,
              { backgroundColor: currentTheme.navActive },
            ],
          ]}
        >
          <Ionicons
            name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
            size={18}
            color={activeTab === 'settings' ? currentTheme.accent : currentTheme.textSecondary}
          />
          <Text
            style={[
              styles.navText,
              { color: currentTheme.textSecondary },
              activeTab === 'settings' && [
                styles.navTextActive,
                { color: currentTheme.accent },
              ],
            ]}
          >
            Ajustes
          </Text>
        </TouchableOpacity>

        {/* Secret / Dedicated Admin Tab for Administrators */}
        {isAdmin && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('admin')}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'admin' }}
            accessibilityLabel="Aba Admin"
            style={[
              styles.navTab,
              activeTab === 'admin' && [
                styles.navTabActive,
                { backgroundColor: currentTheme.navActive },
              ],
            ]}
          >
            <Ionicons
              name={activeTab === 'admin' ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={18}
              color={activeTab === 'admin' ? currentTheme.accent : currentTheme.textSecondary}
            />
            <Text
              style={[
                styles.navText,
                { color: currentTheme.textSecondary },
                activeTab === 'admin' && [
                  styles.navTextActive,
                  { color: currentTheme.accent },
                ],
              ]}
            >
              Admin
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
    ...(Platform.OS === 'web'
      ? ({
          height: '100dvh',
          maxHeight: '100dvh',
          overflow: 'hidden',
        } as any)
      : {}),
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    flexShrink: 0,
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topHeaderLogo: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  topAdminBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  topAdminBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  fixedLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  fixedLogoutText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  screenContainer: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
    flexShrink: 0,
  },
  navTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    minWidth: 54,
    minHeight: 44,
    gap: 2,
  },
  navTabActive: {},
  navText: {
    fontSize: 10,
    fontWeight: '600',
  },
  navTextActive: {
    fontWeight: '800',
  },
});
