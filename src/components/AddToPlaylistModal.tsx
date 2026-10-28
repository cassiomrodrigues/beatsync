import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Song, Playlist } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface AddToPlaylistModalProps {
  visible: boolean;
  song: Song | null;
  playlists: Playlist[];
  onClose: () => void;
  onSelectPlaylist: (playlistId: string, songId: string) => void;
  onCreateNewPlaylist: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  visible,
  song,
  playlists,
  onClose,
  onSelectPlaylist,
  onCreateNewPlaylist,
}) => {
  const { currentTheme } = useTheme();

  if (!song) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: currentTheme.border }]}>
            <View>
              <Text style={[styles.title, { color: currentTheme.text }]}>Adicionar à Playlist</Text>
              <Text style={[styles.songSub, { color: currentTheme.accent }]}>
                {song.title} • {song.artist} ({song.bpm} BPM)
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.closeBtn, { color: currentTheme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {playlists.length === 0 ? (
              <Text style={[styles.emptyText, { color: currentTheme.textMuted }]}>
                Nenhuma playlist criada ainda.
              </Text>
            ) : (
              playlists.map((pl) => {
                const alreadyHasSong = pl.songIds.includes(song.id);
                return (
                  <TouchableOpacity
                    key={pl.id}
                    disabled={alreadyHasSong}
                    onPress={() => {
                      onSelectPlaylist(pl.id, song.id);
                      onClose();
                    }}
                    style={[
                      styles.playlistItem,
                      { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
                      alreadyHasSong && styles.playlistItemDisabled,
                    ]}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
                      ]}
                    >
                      <Text style={styles.iconText}>🎵</Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={[styles.playlistName, { color: currentTheme.text }]}>{pl.name}</Text>
                      <Text style={[styles.playlistCount, { color: currentTheme.textSecondary }]}>
                        {pl.songIds.length} {pl.songIds.length === 1 ? 'música' : 'músicas'}
                      </Text>
                    </View>
                    {alreadyHasSong ? (
                      <Text style={[styles.alreadyBadge, { color: currentTheme.success }]}>Já adicionada</Text>
                    ) : (
                      <Text style={[styles.addBtnText, { color: currentTheme.accent }]}>+ Adicionar</Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                onClose();
                onCreateNewPlaylist();
              }}
              style={[styles.newPlaylistBtn, { borderColor: currentTheme.border }]}
            >
              <Text style={[styles.newPlaylistBtnText, { color: currentTheme.accent }]}>
                + Criar Nova Playlist
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  songSub: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  list: {
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 14,
  },
  playlistItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  playlistItemDisabled: {
    opacity: 0.5,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 16,
  },
  infoCol: {
    flex: 1,
  },
  playlistName: {
    fontSize: 15,
    fontWeight: '700',
  },
  playlistCount: {
    fontSize: 12,
    marginTop: 2,
  },
  alreadyBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  newPlaylistBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  newPlaylistBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
