import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar as RNStatusBar,
  Platform,
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Song, Playlist } from './src/types';
import { StorageService } from './src/storage/storage';
import { MetronomeScreen } from './src/screens/MetronomeScreen';
import { SongsScreen } from './src/screens/SongsScreen';
import { PlaylistsScreen } from './src/screens/PlaylistsScreen';
import { LiveSetlistScreen } from './src/screens/LiveSetlistScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

type TabType = 'metronome' | 'songs' | 'playlists' | 'live' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('metronome');
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [activeLivePlaylist, setActiveLivePlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    loadData();
  }, []);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="light" />

      {/* Main Screen Container */}
      <View style={styles.screenContainer}>
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
          <SettingsScreen onDataReset={loadData} />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('metronome')}
          style={[styles.navTab, activeTab === 'metronome' && styles.navTabActive]}
        >
          <Text style={[styles.navIcon, activeTab === 'metronome' && styles.navIconActive]}>
            ⏱
          </Text>
          <Text style={[styles.navText, activeTab === 'metronome' && styles.navTextActive]}>
            Metrônomo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('songs')}
          style={[styles.navTab, activeTab === 'songs' && styles.navTabActive]}
        >
          <Text style={[styles.navIcon, activeTab === 'songs' && styles.navIconActive]}>
            🎵
          </Text>
          <Text style={[styles.navText, activeTab === 'songs' && styles.navTextActive]}>
            Músicas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('playlists')}
          style={[styles.navTab, activeTab === 'playlists' && styles.navTabActive]}
        >
          <Text style={[styles.navIcon, activeTab === 'playlists' && styles.navIconActive]}>
            📑
          </Text>
          <Text style={[styles.navText, activeTab === 'playlists' && styles.navTextActive]}>
            Playlists
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('live')}
          style={[styles.navTab, activeTab === 'live' && styles.navTabActive]}
        >
          <Text style={[styles.navIcon, activeTab === 'live' && styles.navIconActive]}>
            🎤
          </Text>
          <Text style={[styles.navText, activeTab === 'live' && styles.navTextActive]}>
            Ao Vivo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('settings')}
          style={[styles.navTab, activeTab === 'settings' && styles.navTabActive]}
        >
          <Text style={[styles.navIcon, activeTab === 'settings' && styles.navIconActive]}>
            ⚙️
          </Text>
          <Text style={[styles.navText, activeTab === 'settings' && styles.navTextActive]}>
            Ajustes
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0E1017',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#12141F',
    borderTopWidth: 1,
    borderTopColor: '#222738',
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navTab: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    minWidth: 62,
  },
  navTabActive: {
    backgroundColor: '#1A2133',
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 2,
    opacity: 0.6,
  },
  navIconActive: {
    opacity: 1,
  },
  navText: {
    color: '#7682A4',
    fontSize: 11,
    fontWeight: '600',
  },
  navTextActive: {
    color: '#00E5FF',
    fontWeight: '800',
  },
});
