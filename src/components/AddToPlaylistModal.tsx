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
  if (!song) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Adicionar à Playlist</Text>
              <Text style={styles.songSub}>
                {song.title} • {song.artist} ({song.bpm} BPM)
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {playlists.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma playlist criada ainda.</Text>
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
                      alreadyHasSong && styles.playlistItemDisabled,
                    ]}
                  >
                    <View style={styles.iconCircle}>
                      <Text style={styles.iconText}>🎵</Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.playlistName}>{pl.name}</Text>
                      <Text style={styles.playlistCount}>
                        {pl.songIds.length} {pl.songIds.length === 1 ? 'música' : 'músicas'}
                      </Text>
                    </View>
                    {alreadyHasSong ? (
                      <Text style={styles.alreadyBadge}>Já adicionada</Text>
                    ) : (
                      <Text style={styles.addBtnText}>+ Adicionar</Text>
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
              style={styles.newPlaylistBtn}
            >
              <Text style={styles.newPlaylistBtnText}>+ Criar Nova Playlist</Text>
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
    backgroundColor: '#181A24',
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
    borderBottomColor: '#282B3C',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  songSub: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    color: '#8A8A9E',
    fontSize: 20,
    fontWeight: 'bold',
  },
  list: {
    marginBottom: 10,
  },
  emptyText: {
    color: '#707897',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 14,
  },
  playlistItem: {
    backgroundColor: '#202436',
    borderWidth: 1,
    borderColor: '#30364F',
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
    backgroundColor: '#161926',
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  playlistCount: {
    color: '#8A92B2',
    fontSize: 12,
    marginTop: 2,
  },
  alreadyBadge: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '600',
  },
  addBtnText: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '700',
  },
  newPlaylistBtn: {
    borderWidth: 1.5,
    borderColor: '#3D4566',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  newPlaylistBtnText: {
    color: '#00E5FF',
    fontSize: 14,
    fontWeight: '700',
  },
});
