import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  StatusBar as RNStatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import './src/theme/global.css';
import { AppIcon } from './src/components/AppIcon';
import { Song, Playlist } from './src/types';
import { StorageService } from './src/storage/storage';
import { audioEngine } from './src/audio/audioEngine';
import { MetronomeScreen } from './src/screens/MetronomeScreen';
import { SongsScreen } from './src/screens/SongsScreen';
import { PlaylistsScreen } from './src/screens/PlaylistsScreen';
import { LiveSetlistScreen } from './src/screens/LiveSetlistScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { AuthGuardService, AuthSession } from './src/auth/authGuard';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { CloudLibraryService } from './src/supabase/cloudLibrary';
import { AuthService } from './src/supabase/supabaseClient';

const HORIZONTAL_LOGO = require('./assets/logo-horizontal.png');

type TabType = 'metronome' | 'songs' | 'playlists' | 'live' | 'settings' | 'admin';

function AppContent() {
  const { currentTheme, setIsPlaying, syncSettingsFromCloud, resetThemeAndPreferences } = useTheme();
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabType>('metronome');
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [activeLivePlaylist, setActiveLivePlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isMountedRef = useRef<boolean>(true);
  const loadDataRequestIdRef = useRef<number>(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check authentication session on mount and subscribe to Supabase Auth changes
  useEffect(() => {
    let isMounted = true;

    AuthGuardService.getSession().then((session) => {
      if (!isMounted) return;
      setAuthSession(session);
      setIsAuthLoading(false);
    });

    const sub = AuthService.onAuthStateChange((user) => {
      if (!isMounted) return;
      if (!user) {
        loadDataRequestIdRef.current++;
        audioEngine.destroyContext();
        setIsPlaying(false);
        setAuthSession(null);
        setSongs([]);
        setPlaylists([]);
        setCurrentSong(null);
        setActiveLivePlaylist(null);
        setActiveTab('metronome');
      }
    });

    return () => {
      isMounted = false;
      sub?.unsubscribe();
    };
  }, [setIsPlaying]);

  // Load local + cloud data with safe bidirectional reconciliation (no data loss)
  const loadData = useCallback(async () => {
    const requestId = ++loadDataRequestIdRef.current;
    try {
      const [localSongs, localPlaylists] = await Promise.all([
        StorageService.getSongs(),
        StorageService.getPlaylists(),
      ]);

      if (!isMountedRef.current || requestId !== loadDataRequestIdRef.current) return;

      setSongs(localSongs);
      setPlaylists(localPlaylists);

      const { songs: syncedSongs, playlists: syncedPlaylists } =
        await CloudLibraryService.syncLocalAndCloudLibrary(
          localSongs,
          localPlaylists,
          authSession?.userId
        );

      if (!isMountedRef.current || requestId !== loadDataRequestIdRef.current) return;

      // Preserve any songs or playlists saved locally while the cloud sync request was in flight
      const [latestLocalSongs, latestLocalPlaylists] = await Promise.all([
        StorageService.getSongs(),
        StorageService.getPlaylists(),
      ]);

      const syncedSongIds = new Set(syncedSongs.map((s) => s.id));
      const syncedSongCloudIds = new Set(
        syncedSongs.map((s) => s.cloudId).filter((id): id is string => Boolean(id))
      );
      const addedSongsDuringSync = latestLocalSongs.filter(
        (ls) => !syncedSongIds.has(ls.id) && (!ls.cloudId || !syncedSongCloudIds.has(ls.cloudId))
      );
      const finalSongs = [...addedSongsDuringSync, ...syncedSongs];

      const syncedPlaylistIds = new Set(syncedPlaylists.map((p) => p.id));
      const syncedPlaylistCloudIds = new Set(
        syncedPlaylists.map((p) => p.cloudId).filter((id): id is string => Boolean(id))
      );
      const addedPlaylistsDuringSync = latestLocalPlaylists.filter(
        (lp) =>
          !syncedPlaylistIds.has(lp.id) &&
          (!lp.cloudId || !syncedPlaylistCloudIds.has(lp.cloudId))
      );
      const finalPlaylists = [...addedPlaylistsDuringSync, ...syncedPlaylists];

      await Promise.all([
        StorageService.setSongs(finalSongs),
        StorageService.setPlaylists(finalPlaylists),
      ]);

      if (!isMountedRef.current || requestId !== loadDataRequestIdRef.current) return;

      setSongs(finalSongs);
      setPlaylists(finalPlaylists);
    } catch (err) {
      console.error('Falha ao carregar dados:', err);
    } finally {
      if (isMountedRef.current && requestId === loadDataRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [authSession?.userId]);

  useEffect(() => {
    if (authSession?.userId) {
      Promise.all([loadData(), syncSettingsFromCloud(authSession.userId)]).catch((err) => {
        console.warn('Falha ao sincronizar sessão inicial:', err);
      });
    }
  }, [authSession?.userId, loadData, syncSettingsFromCloud]);

  const handleLogout = useCallback(async () => {
    // 1. Invalidate any in-flight data requests
    loadDataRequestIdRef.current++;

    // 2. Force stop playback and explicitly destroy AudioContext & scheduled nodes
    audioEngine.destroyContext();
    setIsPlaying(false);

    // 3. Reset all global application states in memory
    setAuthSession(null);
    setSongs([]);
    setPlaylists([]);
    setCurrentSong(null);
    setActiveLivePlaylist(null);
    setActiveTab('metronome');

    // 4. Clear persistent session, local cache, and reset ThemeContext preferences
    await Promise.all([
      AuthGuardService.logout(),
      StorageService.clearSessionCache(),
      resetThemeAndPreferences(),
    ]);
  }, [resetThemeAndPreferences, setIsPlaying]);

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
  const handleSaveSong = useCallback(
    async (song: Song): Promise<Song> => {
      const updatedLocal = await StorageService.saveSong(song);
      if (isMountedRef.current) {
        setSongs(updatedLocal);
        setCurrentSong((prev) => (prev && prev.id === song.id ? song : prev));
      }

      const uploaded = await CloudLibraryService.uploadSongToCloud(
        song,
        Boolean(song.isPublic),
        authSession?.userId
      );

      const syncedSong: Song = {
        ...song,
        id: song.id.startsWith('seed-') ? song.id : uploaded.id,
        cloudId: uploaded.id,
        userId: uploaded.userId,
        isPublic: uploaded.isPublic,
      };

      const syncedList = await StorageService.saveSong(syncedSong);
      const updatedPlaylists = await StorageService.getPlaylists();
      if (isMountedRef.current) {
        setSongs(syncedList);
        setPlaylists(updatedPlaylists);
        setCurrentSong((prev) =>
          prev && (prev.id === song.id || prev.id === syncedSong.id) ? syncedSong : prev
        );
      }

      return syncedSong;
    },
    [authSession?.userId]
  );

  const handleCreateSongFromMetronome = useCallback(
    async (song: Song) => {
      try {
        const synced = await handleSaveSong(song);
        if (isMountedRef.current) {
          setCurrentSong(synced);
        }
      } catch (e) {
        console.warn('Erro ao sincronizar música criada no metrônomo:', e);
      }
    },
    [handleSaveSong]
  );

  const handleDeleteSong = async (songId: string) => {
    const targetSong = songs.find((s) => s.id === songId);
    const updated = await StorageService.deleteSong(songId);
    if (!isMountedRef.current) return;
    setSongs(updated);
    const updatedPlaylists = await StorageService.getPlaylists();
    if (!isMountedRef.current) return;
    setPlaylists(updatedPlaylists);
    if (currentSong && currentSong.id === songId) {
      setCurrentSong(null);
    }

    if (targetSong) {
      CloudLibraryService.deleteSongFromCloud(targetSong).catch((e) => {
        console.warn('Erro ao remover música na nuvem:', e);
      });
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

  // Helper to sync a playlist to Supabase and persist its cloudId
  const syncPlaylistToCloudAsync = useCallback(async (playlist: Playlist) => {
    try {
      const uploaded = await CloudLibraryService.uploadPlaylistToCloud(playlist);
      if (!isMountedRef.current) return;
      if (uploaded.cloudId !== playlist.cloudId || uploaded.userId !== playlist.userId) {
        const synced = { ...playlist, cloudId: uploaded.cloudId, userId: uploaded.userId };
        const updatedList = await StorageService.savePlaylist(synced);
        if (!isMountedRef.current) return;
        setPlaylists(updatedList);
      }
    } catch (e) {
      console.warn('Erro ao sincronizar playlist na nuvem:', e);
    }
  }, []);

  // CRUD PLAYLIST HANDLERS
  const handleSavePlaylist = async (playlist: Playlist) => {
    const updated = await StorageService.savePlaylist(playlist);
    if (!isMountedRef.current) return;
    setPlaylists(updated);
    await syncPlaylistToCloudAsync(playlist);
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    const targetPlaylist = playlists.find((p) => p.id === playlistId);
    const updated = await StorageService.deletePlaylist(playlistId);
    if (!isMountedRef.current) return;
    setPlaylists(updated);
    if (activeLivePlaylist && activeLivePlaylist.id === playlistId) {
      setActiveLivePlaylist(null);
    }
    if (targetPlaylist) {
      CloudLibraryService.deletePlaylistFromCloud(targetPlaylist).catch((e) => {
        console.warn('Erro ao remover playlist na nuvem:', e);
      });
    }
  };

  const handleAddSongToPlaylist = async (playlistId: string, songId: string) => {
    const updated = await StorageService.addSongToPlaylist(playlistId, songId);
    if (!isMountedRef.current) return;
    setPlaylists(updated);
    alert('Música adicionada à playlist!');
    const target = updated.find((p) => p.id === playlistId);
    if (target) {
      syncPlaylistToCloudAsync(target);
    }
  };

  const handleRemoveSongFromPlaylist = async (playlistId: string, songIndex: number) => {
    const updated = await StorageService.removeSongFromPlaylist(playlistId, songIndex);
    if (!isMountedRef.current) return;
    setPlaylists(updated);
    const target = updated.find((p) => p.id === playlistId);
    if (target) {
      syncPlaylistToCloudAsync(target);
    }
  };

  const handleReorderSongInPlaylist = async (
    playlistId: string,
    fromIndex: number,
    toIndex: number
  ) => {
    const updated = await StorageService.reorderPlaylistSongs(playlistId, fromIndex, toIndex);
    if (!isMountedRef.current) return;
    setPlaylists(updated);
    const target = updated.find((p) => p.id === playlistId);
    if (target) {
      syncPlaylistToCloudAsync(target);
    }
  };

  const handleOpenLiveMode = (playlist: Playlist) => {
    setActiveLivePlaylist(playlist);
    setActiveTab('live');
  };

  // 1. Initial Authentication Loading State
  if (isAuthLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: currentTheme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={currentTheme.accent} />
      </SafeAreaView>
    );
  }

  // 2. Mandatory Authentication Barrier: Require valid Supabase auth.uid() before releasing metronome
  if (!authSession || !authSession.userId) {
    return (
      <LoginScreen
        onLoginSuccess={(session) => {
          setAuthSession(session);
        }}
      />
    );
  }

  const isAdmin = authSession.role === 'admin';
  const isPulsar = Boolean(currentTheme.hasBrandGradient);

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

      {/* Compact Fixed Top Bar with Official Horizontal Logo & Safe-Area Top Support */}
      <View
        style={[
          styles.topHeader,
          {
            backgroundColor: currentTheme.navBackground,
            borderBottomColor: isPulsar ? currentTheme.accent : currentTheme.border,
          },
          Platform.OS === 'web'
            ? ({
                boxShadow: isPulsar ? '0 1px 10px rgba(137, 242, 27, 0.18)' : 'none',
              } as any)
            : null,
        ]}
        // @ts-expect-error web-only className for iOS notch safe area
        className="safe-top"
      >
        <View style={styles.topHeaderLeft}>
          <View
            style={[
              styles.logoHeaderPill,
              !currentTheme.isDark && styles.logoHeaderPillLight,
            ]}
          >
            <Image
              source={HORIZONTAL_LOGO}
              style={styles.topHeaderLogoImage}
              resizeMode="contain"
              accessibilityLabel="BeatSync Logo"
            />
          </View>
          {isAdmin && (
            <View
              style={[
                styles.topAdminBadge,
                { borderColor: isPulsar ? currentTheme.accentSecondary : currentTheme.accent },
              ]}
            >
              <Text
                style={[
                  styles.topAdminBadgeText,
                  { color: isPulsar ? currentTheme.accentSecondary : currentTheme.accent },
                ]}
              >
                ADMIN
              </Text>
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
          <AppIcon name="log-out-outline" size={14} color={currentTheme.textSecondary} />
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
            key={authSession.userId}
            isActive={activeTab === 'metronome'}
            currentSong={currentSong}
            onClearCurrentSong={handleClearCurrentSong}
            onOpenSongsTab={handleOpenSongsTab}
            onSaveNewSong={handleCreateSongFromMetronome}
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
            borderTopColor: isPulsar ? currentTheme.border : currentTheme.border,
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
              {
                backgroundColor: currentTheme.navActive,
                borderColor: isPulsar ? currentTheme.accent : 'transparent',
              },
            ],
          ]}
        >
          <AppIcon
            name={activeTab === 'metronome' ? 'speedometer' : 'speedometer-outline'}
            size={20}
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
              {
                backgroundColor: currentTheme.navActive,
                borderColor: isPulsar ? currentTheme.accent : 'transparent',
              },
            ],
          ]}
        >
          <AppIcon
            name={activeTab === 'songs' ? 'musical-notes' : 'musical-notes-outline'}
            size={20}
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
              {
                backgroundColor: currentTheme.navActive,
                borderColor: isPulsar ? currentTheme.accent : 'transparent',
              },
            ],
          ]}
        >
          <AppIcon
            name={activeTab === 'playlists' ? 'list' : 'list-outline'}
            size={20}
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
              {
                backgroundColor: currentTheme.navActive,
                borderColor: isPulsar ? currentTheme.accent : 'transparent',
              },
            ],
          ]}
        >
          <AppIcon
            name={activeTab === 'live' ? 'mic' : 'mic-outline'}
            size={20}
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
              {
                backgroundColor: currentTheme.navActive,
                borderColor: isPulsar ? currentTheme.accent : 'transparent',
              },
            ],
          ]}
        >
          <AppIcon
            name={activeTab === 'settings' ? 'settings' : 'settings-outline'}
            size={20}
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
                {
                  backgroundColor: currentTheme.navActive,
                  borderColor: isPulsar ? currentTheme.accent : 'transparent',
                },
              ],
            ]}
          >
            <AppIcon
              name={activeTab === 'admin' ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={20}
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
    paddingVertical: 5,
    borderBottomWidth: 1,
    flexShrink: 0,
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHeaderPillLight: {
    backgroundColor: '#090D16',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  topHeaderLogoImage: {
    width: 96,
    height: 28,
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
    borderWidth: 1,
    borderColor: 'transparent',
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
