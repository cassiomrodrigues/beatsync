import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Song, Playlist } from '../types';
import { SongModal } from '../components/SongModal';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { ShareSongModal } from '../components/ShareSongModal';
import { CloudLibraryService } from '../supabase/cloudLibrary';
import { AuthService } from '../supabase/supabaseClient';
import { useTheme } from '../theme/ThemeContext';

interface SongsScreenProps {
  songs: Song[];
  playlists: Playlist[];
  onSaveSong: (song: Song) => void;
  onDeleteSong: (songId: string) => void;
  onSelectSongForMetronome: (song: Song) => void;
  onAddSongToPlaylist: (playlistId: string, songId: string) => void;
  onCreateNewPlaylist: () => void;
}

type LibraryTab = 'my_songs' | 'global' | 'shared';
type SortOption = 'recent' | 'title' | 'artist' | 'bpmAsc' | 'bpmDesc';

export const SongsScreen: React.FC<SongsScreenProps> = ({
  songs,
  playlists,
  onSaveSong,
  onDeleteSong,
  onSelectSongForMetronome,
  onAddSongToPlaylist,
  onCreateNewPlaylist,
}) => {
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<LibraryTab>('my_songs');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [selectedSongToEdit, setSelectedSongToEdit] = useState<Song | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [playlistModalSong, setPlaylistModalSong] = useState<Song | null>(null);
  const [shareModalSong, setShareModalSong] = useState<Song | null>(null);

  // Cloud state (per-tab loading/error so concurrent fetches don't clobber each other)
  const [globalSongs, setGlobalSongs] = useState<Song[]>([]);
  const [sharedSongs, setSharedSongs] = useState<Song[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [isLoadingShared, setIsLoadingShared] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const globalRequestIdRef = useRef(0);

  const loadGlobalSongs = useCallback(async () => {
    const requestId = ++globalRequestIdRef.current;
    setIsLoadingGlobal(true);
    setGlobalError(null);
    try {
      const list = await CloudLibraryService.fetchGlobalSongs();
      // Ignore stale responses from superseded requests
      if (requestId === globalRequestIdRef.current) {
        setGlobalSongs(list);
      }
    } catch (e: unknown) {
      console.warn('Erro ao carregar músicas globais:', e);
      if (requestId === globalRequestIdRef.current) {
        setGlobalError('Não foi possível carregar a Biblioteca Global. Verifique sua conexão e tente novamente.');
      }
    } finally {
      if (requestId === globalRequestIdRef.current) {
        setIsLoadingGlobal(false);
      }
    }
  }, []);

  const loadSharedSongs = useCallback(async () => {
    setIsLoadingShared(true);
    try {
      const list = await CloudLibraryService.fetchSharedWithMe();
      setSharedSongs(list);
    } catch (e: unknown) {
      console.warn('Erro ao carregar compartilhadas:', e);
    } finally {
      setIsLoadingShared(false);
    }
  }, []);

  useEffect(() => {
    AuthService.getCurrentUser().then((user) => {
      setIsLoggedIn(Boolean(user));
    });

    const sub = AuthService.onAuthStateChange((user) => {
      setIsLoggedIn(Boolean(user));
      if (user) {
        loadSharedSongs();
      } else {
        setSharedSongs([]);
      }
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [loadSharedSongs]);

  useEffect(() => {
    if (activeTab === 'global') {
      loadGlobalSongs();
    } else if (activeTab === 'shared') {
      loadSharedSongs();
    }
  }, [activeTab, loadGlobalSongs, loadSharedSongs]);

  const isLoadingCloud =
    (activeTab === 'global' && isLoadingGlobal) || (activeTab === 'shared' && isLoadingShared);

  // Determine active song source
  const currentList = useMemo(() => {
    if (activeTab === 'global') return globalSongs;
    if (activeTab === 'shared') return sharedSongs;
    return songs;
  }, [activeTab, songs, globalSongs, sharedSongs]);

  // Filtered & sorted songs
  const filteredSongs = useMemo(() => {
    let result = currentList.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        (s.key && s.key.toLowerCase().includes(q)) ||
        s.timeSignature.includes(q)
      );
    });

    switch (sortOption) {
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'artist':
        result.sort((a, b) => a.artist.localeCompare(b.artist));
        break;
      case 'bpmAsc':
        result.sort((a, b) => a.bpm - b.bpm);
        break;
      case 'bpmDesc':
        result.sort((a, b) => b.bpm - a.bpm);
        break;
      case 'recent':
      default:
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }
    return result;
  }, [currentList, searchQuery, sortOption]);

  const confirmDelete = (song: Song) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Tem certeza que deseja remover "${song.title}" da biblioteca?`)) {
        onDeleteSong(song.id);
      }
    } else {
      Alert.alert(
        'Remover Música',
        `Tem certeza que deseja remover "${song.title}" da biblioteca?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Remover', style: 'destructive', onPress: () => onDeleteSong(song.id) },
        ]
      );
    }
  };

  const handleImportSong = async (song: Song) => {
    const importedSong: Song = {
      ...song,
      id: `song-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: Date.now(),
      isPublic: false,
      isShared: false,
      // Imported copy is a new, unsynced song owned by the current user
      cloudId: undefined,
      userId: undefined,
      sharedBy: undefined,
    };
    onSaveSong(importedSong);
    try {
      const uploaded = await CloudLibraryService.uploadSongToCloud(importedSong, false);
      onSaveSong({ ...importedSong, cloudId: uploaded.cloudId, userId: uploaded.userId });
    } catch (e: unknown) {
      console.warn('Erro ao sincronizar música importada na nuvem:', e);
    }
    alert(`"${song.title}" foi importada com sucesso para o seu repertório pessoal!`);
  };

  const handleSaveSongWithCloud = async (song: Song) => {
    onSaveSong(song);

    if (!isLoggedIn) {
      // Publishing requires a Supabase session; without it the song would silently stay local
      if (song.isPublic) {
        alert(
          'Música salva apenas neste dispositivo. Para publicá-la na Biblioteca Global, conecte sua conta na nuvem em Configurações e toque em "Sincronizar".'
        );
      }
      return;
    }

    try {
      const uploaded = await CloudLibraryService.uploadSongToCloud(song, Boolean(song.isPublic));
      // Persist the cloud UUID locally so future edits update the same row
      if (uploaded.cloudId !== song.cloudId) {
        onSaveSong({ ...song, cloudId: uploaded.cloudId, userId: uploaded.userId });
      }
      // Visibility may have changed: refresh the global listing
      loadGlobalSongs();
    } catch (e: unknown) {
      console.warn('Erro ao sincronizar música na nuvem:', e);
      alert('A música foi salva no dispositivo, mas não foi possível sincronizá-la com a nuvem. Tente novamente mais tarde.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Top Library Type Navigation */}
      <View style={[styles.subTabsContainer, { backgroundColor: currentTheme.card, borderBottomColor: currentTheme.border }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('my_songs')}
          style={[
            styles.subTab,
            activeTab === 'my_songs' && [styles.subTabActive, { borderBottomColor: currentTheme.accent }],
          ]}
        >
          <Text
            style={[
              styles.subTabText,
              { color: currentTheme.textSecondary },
              activeTab === 'my_songs' && [styles.subTabTextActive, { color: currentTheme.accent }],
            ]}
          >
            🎵 Meu Repertório ({songs.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('global')}
          style={[
            styles.subTab,
            activeTab === 'global' && [styles.subTabActive, { borderBottomColor: currentTheme.accent }],
          ]}
        >
          <Text
            style={[
              styles.subTabText,
              { color: currentTheme.textSecondary },
              activeTab === 'global' && [styles.subTabTextActive, { color: currentTheme.accent }],
            ]}
          >
            🌐 Biblioteca Global
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('shared')}
          style={[
            styles.subTab,
            activeTab === 'shared' && [styles.subTabActive, { borderBottomColor: currentTheme.accent }],
          ]}
        >
          <Text
            style={[
              styles.subTabText,
              { color: currentTheme.textSecondary },
              activeTab === 'shared' && [styles.subTabTextActive, { color: currentTheme.accent }],
            ]}
          >
            👥 Compartilhadas {sharedSongs.length > 0 ? `(${sharedSongs.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Header */}
      <View style={[styles.headerBox, { backgroundColor: currentTheme.card, borderBottomColor: currentTheme.border }]}>
        <View style={[styles.searchBarContainer, { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: currentTheme.text }]}
            placeholder={
              activeTab === 'global'
                ? 'Buscar músicas na Biblioteca Global...'
                : activeTab === 'shared'
                ? 'Buscar músicas compartilhadas com você...'
                : 'Buscar por música, artista, tom...'
            }
            placeholderTextColor={currentTheme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={[styles.clearSearch, { color: currentTheme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sort Chips */}
        <View style={styles.sortRow}>
          <Text style={[styles.sortLabel, { color: currentTheme.textSecondary }]}>Ordenar:</Text>
          <TouchableOpacity
            onPress={() => setSortOption('recent')}
            style={[
              styles.sortChip,
              { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
              sortOption === 'recent' && { borderColor: currentTheme.accent, backgroundColor: currentTheme.isOled ? '#000000' : currentTheme.navActive },
            ]}
          >
            <Text
              style={[
                styles.sortChipText,
                { color: currentTheme.textSecondary },
                sortOption === 'recent' && { color: currentTheme.accent, fontWeight: '700' },
              ]}
            >
              Recentes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSortOption('title')}
            style={[
              styles.sortChip,
              { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
              sortOption === 'title' && { borderColor: currentTheme.accent, backgroundColor: currentTheme.isOled ? '#000000' : currentTheme.navActive },
            ]}
          >
            <Text
              style={[
                styles.sortChipText,
                { color: currentTheme.textSecondary },
                sortOption === 'title' && { color: currentTheme.accent, fontWeight: '700' },
              ]}
            >
              A-Z
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSortOption('artist')}
            style={[
              styles.sortChip,
              { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
              sortOption === 'artist' && { borderColor: currentTheme.accent, backgroundColor: currentTheme.isOled ? '#000000' : currentTheme.navActive },
            ]}
          >
            <Text
              style={[
                styles.sortChipText,
                { color: currentTheme.textSecondary },
                sortOption === 'artist' && { color: currentTheme.accent, fontWeight: '700' },
              ]}
            >
              Artista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSortOption(sortOption === 'bpmAsc' ? 'bpmDesc' : 'bpmAsc')}
            style={[
              styles.sortChip,
              { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
              (sortOption === 'bpmAsc' || sortOption === 'bpmDesc') && { borderColor: currentTheme.accent, backgroundColor: currentTheme.isOled ? '#000000' : currentTheme.navActive },
            ]}
          >
            <Text
              style={[
                styles.sortChipText,
                { color: currentTheme.textSecondary },
                (sortOption === 'bpmAsc' || sortOption === 'bpmDesc') && { color: currentTheme.accent, fontWeight: '700' },
              ]}
            >
              BPM {sortOption === 'bpmDesc' ? '↓' : '↑'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading state for cloud tabs (full-screen only on first load; afterwards pull-to-refresh) */}
      {isLoadingCloud && currentList.length === 0 ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={currentTheme.accent} />
          <Text style={[styles.loadingText, { color: currentTheme.textSecondary }]}>
            Carregando músicas da nuvem...
          </Text>
        </View>
      ) : (
        /* Song List */
        <FlatList
          data={filteredSongs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            activeTab === 'my_songs' ? undefined : (
              <RefreshControl
                refreshing={isLoadingCloud}
                onRefresh={activeTab === 'global' ? loadGlobalSongs : loadSharedSongs}
                tintColor={currentTheme.accent}
                colors={[currentTheme.accent]}
                progressBackgroundColor={currentTheme.background}
              />
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>
                {activeTab === 'global' ? '🌐' : activeTab === 'shared' ? '👥' : '🎸'}
              </Text>
              <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>
                {activeTab === 'global'
                  ? globalError
                    ? 'Falha ao carregar a Biblioteca Global'
                    : 'Nenhuma música na Biblioteca Global'
                  : activeTab === 'shared'
                  ? 'Nenhuma música compartilhada com você'
                  : searchQuery
                  ? 'Nenhuma música encontrada'
                  : 'Sua biblioteca está vazia'}
              </Text>
              <Text
                style={[styles.emptyDesc, { color: activeTab === 'global' && globalError ? currentTheme.danger : currentTheme.textSecondary }]}
                accessibilityLiveRegion={activeTab === 'global' && globalError ? 'polite' : 'none'}
              >
                {activeTab === 'global'
                  ? globalError ??
                    (isLoggedIn
                      ? 'Músicas marcadas como públicas por você e outros músicos aparecerão aqui!'
                      : 'Músicas públicas da comunidade aparecerão aqui. Para publicar as suas, conecte sua conta na nuvem em Configurações.')
                  : activeTab === 'shared'
                  ? 'Quando alguém compartilhar uma música usando seu e-mail, ela aparecerá aqui!'
                  : 'Toque no botão abaixo para adicionar sua primeira música'}
              </Text>
              {activeTab === 'global' && globalError && (
                <TouchableOpacity
                  onPress={loadGlobalSongs}
                  accessibilityRole="button"
                  accessibilityLabel="Tentar carregar a Biblioteca Global novamente"
                  style={[styles.retryBtn, { borderColor: currentTheme.accent }]}
                >
                  <Text style={[styles.retryBtnText, { color: currentTheme.accent }]}>Tentar novamente</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.songCard,
                { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
              ]}
            >
              <View style={styles.songMainRow}>
                {/* Song Title and Artist */}
                <View style={styles.songInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.songTitle, { color: currentTheme.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.isPublic && (
                      <Text style={styles.publicBadge} accessibilityLabel="Pública na Biblioteca Global">
                        🌐
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.songArtist, { color: currentTheme.textSecondary }]} numberOfLines={1}>
                    {item.artist}
                  </Text>
                </View>

                {/* BPM Highlight Badge */}
                <View
                  style={[
                    styles.bpmBadge,
                    {
                      borderColor: currentTheme.accent,
                      backgroundColor: currentTheme.isOled ? '#000000' : currentTheme.navActive,
                    },
                  ]}
                >
                  <Text style={[styles.bpmNumber, { color: currentTheme.accent }]}>{item.bpm}</Text>
                  <Text style={[styles.bpmUnit, { color: currentTheme.textSecondary }]}>BPM</Text>
                </View>
              </View>

              {/* Badges Row */}
              <View style={styles.badgesRow}>
                <View style={[styles.badge, { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border }]}>
                  <Text style={[styles.badgeLabel, { color: currentTheme.textSecondary }]}>Compasso:</Text>
                  <Text style={[styles.badgeValue, { color: currentTheme.text }]}>{item.timeSignature}</Text>
                </View>

                {item.key && (
                  <View style={[styles.badge, { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border }]}>
                    <Text style={[styles.badgeLabel, { color: currentTheme.textSecondary }]}>Tom:</Text>
                    <Text style={[styles.badgeValue, { color: currentTheme.success }]}>{item.key}</Text>
                  </View>
                )}

                {item.duration && (
                  <View style={[styles.badge, { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border }]}>
                    <Text style={[styles.badgeLabel, { color: currentTheme.textSecondary }]}>⏱</Text>
                    <Text style={[styles.badgeValue, { color: currentTheme.text }]}>{item.duration}</Text>
                  </View>
                )}

                {item.subdivision && item.subdivision > 1 && (
                  <View style={[styles.badge, { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border }]}>
                    <Text style={[styles.badgeLabel, { color: currentTheme.textSecondary }]}>Sub:</Text>
                    <Text style={[styles.badgeValue, { color: currentTheme.text }]}>
                      {item.subdivision === 2 ? '1/8' : item.subdivision === 3 ? '3T' : '1/16'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Notes preview if present */}
              {item.notes && (
                <Text style={[styles.notesText, { color: currentTheme.textSecondary }]} numberOfLines={2}>
                  📝 {item.notes}
                </Text>
              )}

              {/* Actions Row */}
              <View style={styles.actionsRow}>
                {/* Play in metronome */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => onSelectSongForMetronome(item)}
                  style={[styles.playBtn, { backgroundColor: currentTheme.accent }]}
                >
                  <Text style={[styles.playBtnIcon, { color: currentTheme.isDark ? '#000000' : '#FFFFFF' }]}>▶</Text>
                  <Text style={[styles.playBtnText, { color: currentTheme.isDark ? '#000000' : '#FFFFFF' }]}>Metrônomo</Text>
                </TouchableOpacity>

                {/* If on global or shared tab, offer import to my library */}
                {activeTab !== 'my_songs' ? (
                  <TouchableOpacity
                    onPress={() => handleImportSong(item)}
                    style={[styles.actionIconBtn, { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border }]}
                  >
                    <Text style={[styles.actionIconText, { color: currentTheme.accent }]}>
                      📥 Salvar no Meu Repertório
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    {/* Add to Playlist */}
                    <TouchableOpacity
                      onPress={() => setPlaylistModalSong(item)}
                      style={[styles.actionIconBtn, { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border }]}
                    >
                      <Text style={[styles.actionIconText, { color: currentTheme.text }]}>➕ Setlist</Text>
                    </TouchableOpacity>

                    {/* Share Modal Trigger */}
                    <TouchableOpacity
                      onPress={() => setShareModalSong(item)}
                      style={[styles.actionIconBtn, { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border }]}
                    >
                      <Text style={[styles.actionIconText, { color: currentTheme.accent }]}>🔗 Compartilhar</Text>
                    </TouchableOpacity>

                    {/* Edit */}
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedSongToEdit(item);
                        setIsModalVisible(true);
                      }}
                      style={[styles.actionIconBtn, { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border }]}
                    >
                      <Text style={styles.actionIconText}>✏️</Text>
                    </TouchableOpacity>

                    {/* Delete */}
                    <TouchableOpacity
                      onPress={() => confirmDelete(item)}
                      style={[styles.actionIconBtn, { backgroundColor: currentTheme.isDark ? '#351114' : '#FEE2E2', borderColor: currentTheme.danger }]}
                    >
                      <Text style={styles.deleteIconText}>🗑</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Floating Add Song Button (visible on My Songs) */}
      {activeTab === 'my_songs' && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            setSelectedSongToEdit(null);
            setIsModalVisible(true);
          }}
          style={[styles.fab, { backgroundColor: currentTheme.accent }]}
        >
          <Text style={[styles.fabIcon, { color: currentTheme.isDark ? '#000000' : '#FFFFFF' }]}>+</Text>
          <Text style={[styles.fabText, { color: currentTheme.isDark ? '#000000' : '#FFFFFF' }]}>Nova Música</Text>
        </TouchableOpacity>
      )}

      {/* Song Create/Edit Modal */}
      <SongModal
        visible={isModalVisible}
        songToEdit={selectedSongToEdit}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedSongToEdit(null);
        }}
        onSave={handleSaveSongWithCloud}
      />

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        visible={!!playlistModalSong}
        song={playlistModalSong}
        playlists={playlists}
        onClose={() => setPlaylistModalSong(null)}
        onSelectPlaylist={onAddSongToPlaylist}
        onCreateNewPlaylist={onCreateNewPlaylist}
      />

      {/* Share Song Modal */}
      <ShareSongModal
        visible={!!shareModalSong}
        song={shareModalSong}
        onClose={() => setShareModalSong(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subTabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  subTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: '#00E5FF',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7682A4',
  },
  subTabTextActive: {
    color: '#00E5FF',
  },
  headerBox: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  clearSearch: {
    fontSize: 16,
    padding: 4,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sortChip: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  songCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  songMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  songInfo: {
    flex: 1,
    marginRight: 10,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  publicBadge: {
    fontSize: 14,
  },
  songArtist: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  bpmBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
    minWidth: 64,
  },
  bpmNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  bpmUnit: {
    fontSize: 9,
    fontWeight: '800',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginRight: 4,
  },
  badgeValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  playBtnIcon: {
    fontSize: 12,
    fontWeight: '900',
  },
  playBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionIconBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: '#351114',
    borderColor: '#FF5252',
  },
  deleteIconText: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    gap: 6,
  },
  fabIcon: {
    fontSize: 20,
    fontWeight: '900',
  },
  fabText: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});