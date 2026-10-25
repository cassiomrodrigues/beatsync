import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar as RNStatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
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

  const handleSelectSongForMetronome = (song: Song) => {
    setCurrentSong(song);
    setActiveTab('metronome');
  };

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
    >
      <ExpoStatusBar style="light" />

      {/* Main Screen Container */}
      <View style={[styles.screenContainer, { backgroundColor: currentTheme.background }]}>
        {activeTab === 'metronome' && (
          <MetronomeScreen
            currentSong={currentSong}
            onClearCurrentSong={() => setCurrentSong(null)}
            onOpenSongsTab={() => setActiveTab('songs')}
          />
        )}

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

      {/* Bottom Navigation Bar */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: currentTheme.navBackground,
            borderTopColor: currentTheme.border,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('metronome')}
          style={[
            styles.navTab,
            activeTab === 'metronome' && [
              styles.navTabActive,
              { backgroundColor: currentTheme.navActive },
            ],
          ]}
        >
          <Text style={[styles.navIcon, activeTab === 'metronome' && styles.navIconActive]}>
            ⏱
          </Text>
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
          style={[
            styles.navTab,
            activeTab === 'songs' && [
              styles.navTabActive,
              { backgroundColor: currentTheme.navActive },
            ],
          ]}
        >
          <Text style={[styles.navIcon, activeTab === 'songs' && styles.navIconActive]}>
            🎵
          </Text>
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
          style={[
            styles.navTab,
            activeTab === 'playlists' && [
              styles.navTabActive,
              { backgroundColor: currentTheme.navActive },
            ],
          ]}
        >
          <Text style={[styles.navIcon, activeTab === 'playlists' && styles.navIconActive]}>
            📑
          </Text>
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
          style={[
            styles.navTab,
            activeTab === 'live' && [
              styles.navTabActive,
              { backgroundColor: currentTheme.navActive },
            ],
          ]}
        >
          <Text style={[styles.navIcon, activeTab === 'live' && styles.navIconActive]}>
            🎤
          </Text>
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
          style={[
            styles.navTab,
            activeTab === 'settings' && [
              styles.navTabActive,
              { backgroundColor: currentTheme.navActive },
            ],
          ]}
        >
          <Text style={[styles.navIcon, activeTab === 'settings' && styles.navIconActive]}>
            ⚙️
          </Text>
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
            style={[
              styles.navTab,
              activeTab === 'admin' && [
                styles.navTabActive,
                { backgroundColor: currentTheme.navActive },
              ],
            ]}
          >
            <Text style={[styles.navIcon, activeTab === 'admin' && styles.navIconActive]}>
              👑
            </Text>
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
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navTab: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    minWidth: 54,
  },
  navTabActive: {},
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
    opacity: 0.6,
  },
  navIconActive: {
    opacity: 1,
  },
  navText: {
    fontSize: 10,
    fontWeight: '600',
  },
  navTextActive: {
    fontWeight: '800',
  },
});
