import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { Song, Playlist } from '../types';
import { SongModal } from '../components/SongModal';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';

interface SongsScreenProps {
  songs: Song[];
  playlists: Playlist[];
  onSaveSong: (song: Song) => void;
  onDeleteSong: (songId: string) => void;
  onSelectSongForMetronome: (song: Song) => void;
  onAddSongToPlaylist: (playlistId: string, songId: string) => void;
  onCreateNewPlaylist: () => void;
}

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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [selectedSongToEdit, setSelectedSongToEdit] = useState<Song | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [playlistModalSong, setPlaylistModalSong] = useState<Song | null>(null);

  // Filtered & sorted songs
  const filteredSongs = useMemo(() => {
    let result = songs.filter((s) => {
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
  }, [songs, searchQuery, sortOption]);

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

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.headerBox}>
        <View style={styles.searchBarContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por música, artista, tom..."
            placeholderTextColor="#6D789B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sort Chips */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Ordenar:</Text>
          <TouchableOpacity
            onPress={() => setSortOption('recent')}
            style={[styles.sortChip, sortOption === 'recent' && styles.sortChipActive]}
          >
            <Text style={[styles.sortChipText, sortOption === 'recent' && styles.sortChipTextActive]}>
              Recentes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSortOption('title')}
            style={[styles.sortChip, sortOption === 'title' && styles.sortChipActive]}
          >
            <Text style={[styles.sortChipText, sortOption === 'title' && styles.sortChipTextActive]}>
              A-Z
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSortOption('artist')}
            style={[styles.sortChip, sortOption === 'artist' && styles.sortChipActive]}
          >
            <Text style={[styles.sortChipText, sortOption === 'artist' && styles.sortChipTextActive]}>
              Artista
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSortOption(sortOption === 'bpmAsc' ? 'bpmDesc' : 'bpmAsc')}
            style={[
              styles.sortChip,
              (sortOption === 'bpmAsc' || sortOption === 'bpmDesc') && styles.sortChipActive,
            ]}
          >
            <Text
              style={[
                styles.sortChipText,
                (sortOption === 'bpmAsc' || sortOption === 'bpmDesc') && styles.sortChipTextActive,
              ]}
            >
              BPM {sortOption === 'bpmDesc' ? '↓' : '↑'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Song List */}
      <FlatList
        data={filteredSongs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🎸</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'Nenhuma música encontrada' : 'Sua biblioteca está vazia'}
            </Text>
            <Text style={styles.emptyDesc}>
              {searchQuery
                ? 'Tente outro termo de busca'
                : 'Toque no botão abaixo para adicionar sua primeira música'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.songCard}>
            <View style={styles.songMainRow}>
              {/* Song Title and Artist */}
              <View style={styles.songInfo}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.songArtist} numberOfLines={1}>
                  {item.artist}
                </Text>
              </View>

              {/* BPM Highlight Badge */}
              <View style={styles.bpmBadge}>
                <Text style={styles.bpmNumber}>{item.bpm}</Text>
                <Text style={styles.bpmUnit}>BPM</Text>
              </View>
            </View>

            {/* Badges Row */}
            <View style={styles.badgesRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>Compasso:</Text>
                <Text style={styles.badgeValue}>{item.timeSignature}</Text>
              </View>

              {item.key && (
                <View style={[styles.badge, styles.keyBadge]}>
                  <Text style={styles.badgeLabel}>Tom:</Text>
                  <Text style={[styles.badgeValue, { color: '#00E676' }]}>{item.key}</Text>
                </View>
              )}

              {item.duration && (
                <View style={styles.badge}>
                  <Text style={styles.badgeLabel}>⏱</Text>
                  <Text style={styles.badgeValue}>{item.duration}</Text>
                </View>
              )}

              {item.subdivision && item.subdivision > 1 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeLabel}>Sub:</Text>
                  <Text style={styles.badgeValue}>
                    {item.subdivision === 2 ? '1/8' : item.subdivision === 3 ? '3T' : '1/16'}
                  </Text>
                </View>
              )}
            </View>

            {/* Notes preview if present */}
            {item.notes && (
              <Text style={styles.notesText} numberOfLines={2}>
                📝 {item.notes}
              </Text>
            )}

            {/* Actions Row */}
            <View style={styles.actionsRow}>
              {/* Play in metronome */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onSelectSongForMetronome(item)}
                style={styles.playBtn}
              >
                <Text style={styles.playBtnIcon}>▶</Text>
                <Text style={styles.playBtnText}>Tocar no Metrônomo</Text>
              </TouchableOpacity>

              {/* Add to Playlist */}
              <TouchableOpacity
                onPress={() => setPlaylistModalSong(item)}
                style={styles.actionIconBtn}
              >
                <Text style={styles.actionIconText}>➕ Setlist</Text>
              </TouchableOpacity>

              {/* Edit */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedSongToEdit(item);
                  setIsModalVisible(true);
                }}
                style={styles.actionIconBtn}
              >
                <Text style={styles.actionIconText}>✏️</Text>
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                onPress={() => confirmDelete(item)}
                style={[styles.actionIconBtn, styles.deleteBtn]}
              >
                <Text style={styles.deleteIconText}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Floating Add Song Button */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          setSelectedSongToEdit(null);
          setIsModalVisible(true);
        }}
        style={styles.fab}
      >
        <Text style={styles.fabIcon}>+</Text>
        <Text style={styles.fabText}>Nova Música</Text>
      </TouchableOpacity>

      {/* Song Create/Edit Modal */}
      <SongModal
        visible={isModalVisible}
        songToEdit={selectedSongToEdit}
        onClose={() => {
          setIsModalVisible(false);
          setSelectedSongToEdit(null);
        }}
        onSave={onSaveSong}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1017',
  },
  headerBox: {
    backgroundColor: '#161924',
    borderBottomWidth: 1,
    borderBottomColor: '#262C40',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#202538',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#303854',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  clearSearch: {
    color: '#8C98B8',
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
    color: '#7682A4',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sortChip: {
    backgroundColor: '#202538',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#303854',
  },
  sortChipActive: {
    backgroundColor: '#11354A',
    borderColor: '#00E5FF',
  },
  sortChipText: {
    color: '#8C98B8',
    fontSize: 11,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: '#00E5FF',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  songCard: {
    backgroundColor: '#161924',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262C40',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  songArtist: {
    color: '#9EABC7',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  bpmBadge: {
    backgroundColor: '#11354A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00E5FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
    minWidth: 64,
  },
  bpmNumber: {
    color: '#00E5FF',
    fontSize: 18,
    fontWeight: '900',
  },
  bpmUnit: {
    color: '#8C98B8',
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
    backgroundColor: '#202538',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  keyBadge: {
    backgroundColor: '#133328',
    borderColor: '#00E676',
    borderWidth: 0.5,
  },
  badgeLabel: {
    color: '#7682A4',
    fontSize: 11,
    fontWeight: '600',
  },
  badgeValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  notesText: {
    color: '#BAC4DE',
    fontSize: 12,
    marginBottom: 10,
    backgroundColor: '#1E2333',
    padding: 8,
    borderRadius: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  playBtn: {
    flex: 1,
    backgroundColor: '#00E5FF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  playBtnIcon: {
    color: '#0A101D',
    fontSize: 12,
    fontWeight: '900',
  },
  playBtnText: {
    color: '#0A101D',
    fontSize: 12,
    fontWeight: '800',
  },
  actionIconBtn: {
    backgroundColor: '#202538',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#303854',
  },
  actionIconText: {
    color: '#BAC4DE',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    borderColor: '#543038',
  },
  deleteIconText: {
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#00E5FF',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#00E5FF',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: {
    color: '#0A101D',
    fontSize: 20,
    fontWeight: '900',
  },
  fabText: {
    color: '#0A101D',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyDesc: {
    color: '#7682A4',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
});
