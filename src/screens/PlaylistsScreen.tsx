import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Playlist, Song } from '../types';
import { PlaylistModal } from '../components/PlaylistModal';

interface PlaylistsScreenProps {
  playlists: Playlist[];
  songs: Song[];
  onSavePlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (playlistId: string) => void;
  onReorderSong: (playlistId: string, fromIndex: number, toIndex: number) => void;
  onRemoveSongFromPlaylist: (playlistId: string, songIndex: number) => void;
  onSelectSongForMetronome: (song: Song) => void;
  onOpenLiveMode: (playlist: Playlist) => void;
}

export const PlaylistsScreen: React.FC<PlaylistsScreenProps> = ({
  playlists,
  songs,
  onSavePlaylist,
  onDeletePlaylist,
  onReorderSong,
  onRemoveSongFromPlaylist,
  onSelectSongForMetronome,
  onOpenLiveMode,
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId) || null;

  // Map of songs by ID for fast lookup
  const songsMap = new Map<string, Song>();
  songs.forEach((s) => songsMap.set(s.id, s));

  const confirmDeletePlaylist = (playlist: Playlist) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Excluir a playlist "${playlist.name}"?`)) {
        if (selectedPlaylistId === playlist.id) setSelectedPlaylistId(null);
        onDeletePlaylist(playlist.id);
      }
    } else {
      Alert.alert(
        'Excluir Playlist',
        `Tem certeza que deseja excluir "${playlist.name}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: () => {
              if (selectedPlaylistId === playlist.id) setSelectedPlaylistId(null);
              onDeletePlaylist(playlist.id);
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* If a playlist is selected, show detail view */}
      {selectedPlaylist ? (
        <View style={styles.detailContainer}>
          {/* Header */}
          <View style={styles.detailHeader}>
            <TouchableOpacity
              onPress={() => setSelectedPlaylistId(null)}
              style={styles.backBtn}
            >
              <Text style={styles.backBtnText}>‹ Voltar às Playlists</Text>
            </TouchableOpacity>

            <View style={styles.detailTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{selectedPlaylist.name}</Text>
                {selectedPlaylist.description && (
                  <Text style={styles.detailDesc}>{selectedPlaylist.description}</Text>
                )}
                <Text style={styles.detailStats}>
                  {selectedPlaylist.songIds.length} músicas no repertório
                </Text>
              </View>

              <View style={styles.detailActions}>
                <TouchableOpacity
                  onPress={() => {
                    setPlaylistToEdit(selectedPlaylist);
                    setIsModalVisible(true);
                  }}
                  style={styles.iconBtn}
                >
                  <Text style={styles.iconBtnText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDeletePlaylist(selectedPlaylist)}
                  style={[styles.iconBtn, styles.deleteBtn]}
                >
                  <Text style={styles.iconBtnText}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Launch Live Mode Button */}
            {selectedPlaylist.songIds.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onOpenLiveMode(selectedPlaylist)}
                style={styles.liveModeLaunchBtn}
              >
                <Text style={styles.liveModeLaunchIcon}>🎤</Text>
                <View>
                  <Text style={styles.liveModeLaunchText}>ABRIR MODO AO VIVO / SHOW</Text>
                  <Text style={styles.liveModeLaunchSub}>
                    Player de palco com visual grande e troca rápida
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Songs list in this playlist */}
          <FlatList
            data={selectedPlaylist.songIds}
            keyExtractor={(_, index) => `item-${index}`}
            contentContainerStyle={styles.playlistSongsList}
            ListEmptyComponent={
              <View style={styles.emptyPlaylist}>
                <Text style={styles.emptyEmoji}>📋</Text>
                <Text style={styles.emptyTitle}>Nenhuma música nesta playlist</Text>
                <Text style={styles.emptyDesc}>
                  Vá até a aba "Músicas" e toque em "+ Setlist" em qualquer música para adicioná-la aqui!
                </Text>
              </View>
            }
            renderItem={({ item: songId, index }) => {
              const song = songsMap.get(songId);
              if (!song) return null;

              return (
                <View style={styles.playlistSongRow}>
                  {/* Order Index */}
                  <View style={styles.orderBadge}>
                    <Text style={styles.orderNumber}>{index + 1}</Text>
                  </View>

                  {/* Song Info */}
                  <View style={styles.playlistSongInfo}>
                    <Text style={styles.playlistSongTitle} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={styles.playlistSongMeta} numberOfLines={1}>
                      {song.artist} • <Text style={{ color: '#00E5FF' }}>{song.bpm} BPM</Text> •{' '}
                      {song.timeSignature} {song.key ? `• ${song.key}` : ''}
                    </Text>
                  </View>

                  {/* Quick Play */}
                  <TouchableOpacity
                    onPress={() => onSelectSongForMetronome(song)}
                    style={styles.quickPlayBtn}
                  >
                    <Text style={styles.quickPlayIcon}>▶</Text>
                  </TouchableOpacity>

                  {/* Reorder Buttons */}
                  <View style={styles.reorderCol}>
                    <TouchableOpacity
                      disabled={index === 0}
                      onPress={() => onReorderSong(selectedPlaylist.id, index, index - 1)}
                      style={[styles.reorderBtn, index === 0 && { opacity: 0.3 }]}
                    >
                      <Text style={styles.reorderText}>▲</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={index === selectedPlaylist.songIds.length - 1}
                      onPress={() => onReorderSong(selectedPlaylist.id, index, index + 1)}
                      style={[
                        styles.reorderBtn,
                        index === selectedPlaylist.songIds.length - 1 && { opacity: 0.3 },
                      ]}
                    >
                      <Text style={styles.reorderText}>▼</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Remove */}
                  <TouchableOpacity
                    onPress={() => onRemoveSongFromPlaylist(selectedPlaylist.id, index)}
                    style={styles.removeSongBtn}
                  >
                    <Text style={styles.removeSongText}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>
      ) : (
        /* Playlists List View */
        <View style={{ flex: 1 }}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Minhas Playlists & Setlists</Text>
            <Text style={styles.headerSubtitle}>
              Organize suas apresentações, repertórios e rotinas de treino
            </Text>
          </View>

          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.playlistsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyPlaylistsBox}>
                <Text style={styles.emptyEmoji}>📁</Text>
                <Text style={styles.emptyTitle}>Nenhuma playlist cadastrada</Text>
                <Text style={styles.emptyDesc}>
                  Crie sua primeira playlist para agrupar as músicas que você vai tocar no show ou ensaio.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedPlaylistId(item.id)}
                  style={styles.playlistCard}
                >
                  <View style={styles.playlistCardHeader}>
                    <View style={styles.playlistIconBox}>
                      <Text style={styles.playlistIcon}>🎼</Text>
                    </View>
                    <View style={styles.playlistMainInfo}>
                      <Text style={styles.playlistCardName}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.playlistCardDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.cardArrow}>›</Text>
                  </View>

                  {/* Footer with badges */}
                  <View style={styles.playlistCardFooter}>
                    <View style={styles.cardBadge}>
                      <Text style={styles.cardBadgeText}>
                        {item.songIds.length} {item.songIds.length === 1 ? 'música' : 'músicas'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onOpenLiveMode(item);
                      }}
                      style={styles.cardLiveBtn}
                    >
                      <Text style={styles.cardLiveBtnText}>Modo Show ▶</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {/* Floating Button for New Playlist */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setPlaylistToEdit(null);
              setIsModalVisible(true);
            }}
            style={styles.fab}
          >
            <Text style={styles.fabIcon}>+</Text>
            <Text style={styles.fabText}>Nova Playlist</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Playlist Create/Edit Modal */}
      <PlaylistModal
        visible={isModalVisible}
        playlistToEdit={playlistToEdit}
        onClose={() => {
          setIsModalVisible(false);
          setPlaylistToEdit(null);
        }}
        onSave={onSavePlaylist}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1017',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#161924',
    borderBottomWidth: 1,
    borderBottomColor: '#262C40',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#8A92B2',
    fontSize: 13,
    marginTop: 2,
  },
  playlistsList: {
    padding: 16,
    paddingBottom: 90,
  },
  playlistCard: {
    backgroundColor: '#161924',
    borderWidth: 1,
    borderColor: '#262C40',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  playlistCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1A2E44',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistIcon: {
    fontSize: 20,
  },
  playlistMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  playlistCardName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  playlistCardDesc: {
    color: '#8A92B2',
    fontSize: 12,
    marginTop: 4,
  },
  cardArrow: {
    color: '#657194',
    fontSize: 26,
    fontWeight: '300',
  },
  playlistCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#202538',
  },
  cardBadge: {
    backgroundColor: '#202538',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  cardBadgeText: {
    color: '#BAC4DE',
    fontSize: 12,
    fontWeight: '600',
  },
  cardLiveBtn: {
    backgroundColor: '#00E5FF',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  cardLiveBtnText: {
    color: '#0A101D',
    fontSize: 12,
    fontWeight: '800',
  },
  // DETAIL STYLES
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    backgroundColor: '#161924',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262C40',
  },
  backBtn: {
    marginBottom: 10,
  },
  backBtnText: {
    color: '#00E5FF',
    fontSize: 14,
    fontWeight: '700',
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  detailTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  detailDesc: {
    color: '#8A92B2',
    fontSize: 13,
    marginTop: 4,
  },
  detailStats: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    backgroundColor: '#202538',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#303854',
  },
  deleteBtn: {
    borderColor: '#543038',
  },
  iconBtnText: {
    fontSize: 13,
  },
  liveModeLaunchBtn: {
    backgroundColor: '#11354A',
    borderColor: '#00E5FF',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  liveModeLaunchIcon: {
    fontSize: 24,
  },
  liveModeLaunchText: {
    color: '#00E5FF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  liveModeLaunchSub: {
    color: '#9EABC7',
    fontSize: 11,
    marginTop: 1,
  },
  playlistSongsList: {
    padding: 16,
    paddingBottom: 60,
  },
  playlistSongRow: {
    backgroundColor: '#161924',
    borderWidth: 1,
    borderColor: '#262C40',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#202538',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  orderNumber: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '800',
  },
  playlistSongInfo: {
    flex: 1,
    marginRight: 6,
  },
  playlistSongTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  playlistSongMeta: {
    color: '#8A92B2',
    fontSize: 12,
    marginTop: 2,
  },
  quickPlayBtn: {
    backgroundColor: '#00E5FF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  quickPlayIcon: {
    color: '#0A101D',
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 2,
  },
  reorderCol: {
    marginRight: 8,
    gap: 2,
  },
  reorderBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#202538',
    borderRadius: 4,
  },
  reorderText: {
    color: '#8A92B2',
    fontSize: 10,
    fontWeight: 'bold',
  },
  removeSongBtn: {
    padding: 6,
  },
  removeSongText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: 'bold',
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
  emptyPlaylistsBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyPlaylist: {
    alignItems: 'center',
    paddingVertical: 40,
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
