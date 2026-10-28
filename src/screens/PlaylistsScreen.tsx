import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
} from 'react-native';
import { Playlist, Song } from '../types';
import { PlaylistModal } from '../components/PlaylistModal';
import { useTheme } from '../theme/ThemeContext';

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
  const { currentTheme } = useTheme();
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

  const btnTextColor = currentTheme.isDark ? '#000000' : '#FFFFFF';
  const selectedFill = currentTheme.isOled ? '#000000' : currentTheme.navActive;

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* If a playlist is selected, show detail view */}
      {selectedPlaylist ? (
        <View style={styles.detailContainer}>
          {/* Header */}
          <View
            style={[
              styles.detailHeader,
              { backgroundColor: currentTheme.card, borderBottomColor: currentTheme.border },
            ]}
          >
            <TouchableOpacity
              onPress={() => setSelectedPlaylistId(null)}
              style={styles.backBtn}
            >
              <Text style={[styles.backBtnText, { color: currentTheme.accent }]}>
                ‹ Voltar às Playlists
              </Text>
            </TouchableOpacity>

            <View style={styles.detailTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: currentTheme.text }]}>
                  {selectedPlaylist.name}
                </Text>
                {selectedPlaylist.description && (
                  <Text style={[styles.detailDesc, { color: currentTheme.textSecondary }]}>
                    {selectedPlaylist.description}
                  </Text>
                )}
                <Text style={[styles.detailStats, { color: currentTheme.success }]}>
                  {selectedPlaylist.songIds.length} músicas no repertório
                </Text>
              </View>

              <View style={styles.detailActions}>
                <TouchableOpacity
                  onPress={() => {
                    setPlaylistToEdit(selectedPlaylist);
                    setIsModalVisible(true);
                  }}
                  style={[
                    styles.iconBtn,
                    { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
                  ]}
                >
                  <Text style={styles.iconBtnText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDeletePlaylist(selectedPlaylist)}
                  style={[
                    styles.iconBtn,
                    {
                      backgroundColor: currentTheme.isDark ? '#2A1215' : '#FEE2E2',
                      borderColor: currentTheme.danger,
                    },
                  ]}
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
                style={[
                  styles.liveModeLaunchBtn,
                  { backgroundColor: selectedFill, borderColor: currentTheme.accent },
                ]}
              >
                <Text style={styles.liveModeLaunchIcon}>🎤</Text>
                <View>
                  <Text style={[styles.liveModeLaunchText, { color: currentTheme.accent }]}>
                    ABRIR MODO AO VIVO / SHOW
                  </Text>
                  <Text style={[styles.liveModeLaunchSub, { color: currentTheme.textSecondary }]}>
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
                <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>
                  Nenhuma música nesta playlist
                </Text>
                <Text style={[styles.emptyDesc, { color: currentTheme.textSecondary }]}>
                  Vá até a aba "Músicas" e toque em "+ Setlist" em qualquer música para adicioná-la aqui!
                </Text>
              </View>
            }
            renderItem={({ item: songId, index }) => {
              const song = songsMap.get(songId);
              if (!song) return null;

              return (
                <View
                  style={[
                    styles.playlistSongRow,
                    { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
                  ]}
                >
                  {/* Order Index */}
                  <View
                    style={[
                      styles.orderBadge,
                      { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
                    ]}
                  >
                    <Text style={[styles.orderNumber, { color: currentTheme.accent }]}>
                      {index + 1}
                    </Text>
                  </View>

                  {/* Song Info */}
                  <View style={styles.playlistSongInfo}>
                    <Text
                      style={[styles.playlistSongTitle, { color: currentTheme.text }]}
                      numberOfLines={1}
                    >
                      {song.title}
                    </Text>
                    <Text
                      style={[styles.playlistSongMeta, { color: currentTheme.textSecondary }]}
                      numberOfLines={1}
                    >
                      {song.artist} •{' '}
                      <Text style={{ color: currentTheme.accent, fontWeight: '700' }}>
                        {song.bpm} BPM
                      </Text>{' '}
                      • {song.timeSignature} {song.key ? `• ${song.key}` : ''}
                    </Text>
                  </View>

                  {/* Quick Play */}
                  <TouchableOpacity
                    onPress={() => onSelectSongForMetronome(song)}
                    style={[styles.quickPlayBtn, { backgroundColor: currentTheme.accent }]}
                  >
                    <Text style={[styles.quickPlayIcon, { color: btnTextColor }]}>▶</Text>
                  </TouchableOpacity>

                  {/* Reorder Buttons */}
                  <View style={styles.reorderCol}>
                    <TouchableOpacity
                      disabled={index === 0}
                      onPress={() => onReorderSong(selectedPlaylist.id, index, index - 1)}
                      style={[
                        styles.reorderBtn,
                        { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
                        index === 0 && { opacity: 0.3 },
                      ]}
                    >
                      <Text style={[styles.reorderText, { color: currentTheme.textSecondary }]}>
                        ▲
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={index === selectedPlaylist.songIds.length - 1}
                      onPress={() => onReorderSong(selectedPlaylist.id, index, index + 1)}
                      style={[
                        styles.reorderBtn,
                        { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
                        index === selectedPlaylist.songIds.length - 1 && { opacity: 0.3 },
                      ]}
                    >
                      <Text style={[styles.reorderText, { color: currentTheme.textSecondary }]}>
                        ▼
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Remove */}
                  <TouchableOpacity
                    onPress={() => onRemoveSongFromPlaylist(selectedPlaylist.id, index)}
                    style={styles.removeSongBtn}
                  >
                    <Text style={[styles.removeSongText, { color: currentTheme.danger }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>
      ) : (
        /* Playlists List View */
        <View style={{ flex: 1 }}>
          <View
            style={[
              styles.header,
              { backgroundColor: currentTheme.card, borderBottomColor: currentTheme.border },
            ]}
          >
            <Text style={[styles.headerTitle, { color: currentTheme.text }]}>
              Minhas Playlists & Setlists
            </Text>
            <Text style={[styles.headerSubtitle, { color: currentTheme.textSecondary }]}>
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
                <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>
                  Nenhuma playlist cadastrada
                </Text>
                <Text style={[styles.emptyDesc, { color: currentTheme.textSecondary }]}>
                  Crie sua primeira playlist para agrupar as músicas que você vai tocar no show ou ensaio.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedPlaylistId(item.id)}
                  style={[
                    styles.playlistCard,
                    { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
                  ]}
                >
                  <View style={styles.playlistCardHeader}>
                    <View
                      style={[
                        styles.playlistIconBox,
                        { backgroundColor: selectedFill, borderColor: currentTheme.border },
                      ]}
                    >
                      <Text style={styles.playlistIcon}>🎼</Text>
                    </View>
                    <View style={styles.playlistMainInfo}>
                      <Text style={[styles.playlistCardName, { color: currentTheme.text }]}>
                        {item.name}
                      </Text>
                      {item.description && (
                        <Text
                          style={[styles.playlistCardDesc, { color: currentTheme.textSecondary }]}
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.cardArrow, { color: currentTheme.textMuted }]}>›</Text>
                  </View>

                  {/* Footer with badges */}
                  <View style={[styles.playlistCardFooter, { borderTopColor: currentTheme.border }]}>
                    <View
                      style={[
                        styles.cardBadge,
                        { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
                      ]}
                    >
                      <Text style={[styles.cardBadgeText, { color: currentTheme.textSecondary }]}>
                        {item.songIds.length} {item.songIds.length === 1 ? 'música' : 'músicas'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        onOpenLiveMode(item);
                      }}
                      style={[styles.cardLiveBtn, { backgroundColor: currentTheme.accent }]}
                    >
                      <Text style={[styles.cardLiveBtnText, { color: btnTextColor }]}>
                        Modo Show ▶
                      </Text>
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
            style={[styles.fab, { backgroundColor: currentTheme.accent }]}
          >
            <Text style={[styles.fabIcon, { color: btnTextColor }]}>+</Text>
            <Text style={[styles.fabText, { color: btnTextColor }]}>Nova Playlist</Text>
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
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  playlistsList: {
    padding: 16,
    paddingBottom: 90,
  },
  playlistCard: {
    borderWidth: 1,
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
    borderWidth: 1,
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
    fontSize: 17,
    fontWeight: '800',
  },
  playlistCardDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  cardArrow: {
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
  },
  cardBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  cardBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardLiveBtn: {
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  cardLiveBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    marginBottom: 10,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  detailDesc: {
    fontSize: 13,
    marginTop: 4,
  },
  detailStats: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
  },
  iconBtnText: {
    fontSize: 13,
  },
  liveModeLaunchBtn: {
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
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  liveModeLaunchSub: {
    fontSize: 11,
    marginTop: 1,
  },
  playlistSongsList: {
    padding: 16,
    paddingBottom: 60,
  },
  playlistSongRow: {
    borderWidth: 1,
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
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  orderNumber: {
    fontSize: 13,
    fontWeight: '800',
  },
  playlistSongInfo: {
    flex: 1,
    marginRight: 6,
  },
  playlistSongTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  playlistSongMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  quickPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  quickPlayIcon: {
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
    borderWidth: 1,
    borderRadius: 4,
  },
  reorderText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  removeSongBtn: {
    padding: 6,
  },
  removeSongText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fabIcon: {
    fontSize: 20,
    fontWeight: '900',
  },
  fabText: {
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
});
