import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Playlist, Song, TimeSignature, BeatState } from '../types';
import { audioEngine } from '../audio/audioEngine';
import { BeatVisualizer } from '../components/BeatVisualizer';

interface LiveSetlistScreenProps {
  playlist: Playlist | null;
  allPlaylists: Playlist[];
  songs: Song[];
  onSelectPlaylist: (playlist: Playlist) => void;
  onExitLiveMode: () => void;
}

export const LiveSetlistScreen: React.FC<LiveSetlistScreenProps> = ({
  playlist,
  allPlaylists,
  songs,
  onSelectPlaylist,
  onExitLiveMode,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [countInRemaining, setCountInRemaining] = useState(0);
  const [isCountInActive, setIsCountInActive] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [jumpModalVisible, setJumpModalVisible] = useState(false);
  const [accentPattern, setAccentPattern] = useState<BeatState[]>(['accent', 'normal', 'normal', 'normal']);

  // Map of songs by ID
  const songsMap = new Map<string, Song>();
  songs.forEach((s) => songsMap.set(s.id, s));

  // Current active playlist songs
  const playlistSongs: Song[] = playlist
    ? playlist.songIds.map((id) => songsMap.get(id)).filter(Boolean) as Song[]
    : [];

  const currentSong: Song | null = playlistSongs[currentIndex] || null;
  const nextSong: Song | null = playlistSongs[currentIndex + 1] || null;

  // Whenever song or index changes, load parameters into audio engine
  useEffect(() => {
    if (currentSong) {
      const parts = currentSong.timeSignature.split('/');
      const num = parseInt(parts[0], 10) || 4;
      const den = parseInt(parts[1], 10) || 4;

      const pattern: BeatState[] = Array.from({ length: num }, (_, i) =>
        i === 0 ? 'accent' : 'normal'
      );
      setAccentPattern(pattern);

      audioEngine.updateParameters({
        bpm: currentSong.bpm,
        numerator: num,
        denominator: den,
        subdivision: currentSong.subdivision || 1,
        soundType: currentSong.soundType || 'woodblock',
        accentPattern: pattern,
      });

      // If running, restart cleanly with new tempo
      if (isRunning) {
        audioEngine.stop();
        audioEngine.start();
      }
    }
  }, [currentIndex, currentSong]);

  // Audio callback
  useEffect(() => {
    audioEngine.onBeatCallback = (beatIndex, isDownbeat) => {
      setCurrentBeat(beatIndex);
      if (isDownbeat) {
        setIsFlashActive(true);
        setTimeout(() => setIsFlashActive(false), 90);
      }
    };

    return () => {
      audioEngine.onBeatCallback = null;
    };
  }, []);

  const togglePlay = () => {
    if (isRunning) {
      audioEngine.stop();
      setIsRunning(false);
      setCurrentBeat(0);
    } else {
      audioEngine.start();
      setIsRunning(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < playlistSongs.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (!playlist || playlistSongs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🎤</Text>
        <Text style={styles.emptyTitle}>Nenhuma Playlist Selecionada para o Show</Text>
        <Text style={styles.emptyDesc}>
          Selecione uma das suas playlists para entrar no modo de palco com visual ampliado e navegação rápida entre músicas.
        </Text>

        {allPlaylists.length > 0 && (
          <View style={styles.playlistPickerBox}>
            <Text style={styles.pickerBoxTitle}>Escolha uma Playlist:</Text>
            {allPlaylists.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => onSelectPlaylist(p)}
                style={styles.pickerItem}
              >
                <Text style={styles.pickerItemName}>{p.name}</Text>
                <Text style={styles.pickerItemCount}>{p.songIds.length} músicas</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  const parts = currentSong ? currentSong.timeSignature.split('/') : ['4', '4'];
  const numerator = parseInt(parts[0], 10) || 4;

  return (
    <View style={[styles.container, isFlashActive && styles.flashOverlay]}>
      {/* Top Bar with Playlist Name & Jump Menu */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onExitLiveMode} style={styles.exitBtn}>
          <Text style={styles.exitBtnText}>✕ Sair do Show</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setJumpModalVisible(true)} style={styles.playlistBadge}>
          <Text style={styles.playlistBadgeTitle} numberOfLines={1}>
            {playlist.name}
          </Text>
          <Text style={styles.playlistBadgeSub}>Música {currentIndex + 1} de {playlistSongs.length} ▾</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {/* Giant Main Song Card */}
        {currentSong && (
          <View style={styles.mainSongCard}>
            <Text style={styles.songTag}>MÚSICA ATUAL NO PALCO</Text>
            <Text style={styles.songTitle} numberOfLines={2}>
              {currentSong.title}
            </Text>
            <Text style={styles.songArtist}>
              {currentSong.artist}
            </Text>

            {/* Badges in Large View */}
            <View style={styles.largeBadgesRow}>
              {currentSong.key && (
                <View style={[styles.largeBadge, styles.keyBadge]}>
                  <Text style={styles.largeBadgeLabel}>TOM</Text>
                  <Text style={styles.largeBadgeValueKey}>{currentSong.key}</Text>
                </View>
              )}

              <View style={styles.largeBadge}>
                <Text style={styles.largeBadgeLabel}>COMPASSO</Text>
                <Text style={styles.largeBadgeValue}>{currentSong.timeSignature}</Text>
              </View>

              {currentSong.duration && (
                <View style={styles.largeBadge}>
                  <Text style={styles.largeBadgeLabel}>DURAÇÃO</Text>
                  <Text style={styles.largeBadgeValue}>{currentSong.duration}</Text>
                </View>
              )}
            </View>

            {/* Stage Notes if present */}
            {currentSong.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesBoxLabel}>📌 OBSERVAÇÕES DE PALCO</Text>
                <Text style={styles.notesBoxText}>{currentSong.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* BPM Hero Display */}
        <View style={styles.bpmHeroBox}>
          <Text style={styles.bpmHeroNumber}>{currentSong?.bpm || 120}</Text>
          <Text style={styles.bpmHeroUnit}>BPM</Text>
        </View>

        {/* Dynamic Beat Indicators */}
        <BeatVisualizer
          numerator={numerator}
          currentBeat={currentBeat}
          accentPattern={accentPattern}
          onToggleBeatState={() => {}}
          isRunning={isRunning}
        />

        {/* Play/Stop Giant Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={togglePlay}
          style={[styles.playButton, isRunning ? styles.stopButton : styles.startButton]}
        >
          <Text style={styles.playIcon}>{isRunning ? '■' : '▶'}</Text>
          <Text style={styles.playText}>
            {isRunning ? 'PARAR METRÔNOMO' : 'SOLTAR METRÔNOMO'}
          </Text>
        </TouchableOpacity>

        {/* Next Song Preview & Quick Navigation Buttons */}
        <View style={styles.navRow}>
          <TouchableOpacity
            disabled={currentIndex === 0}
            onPress={handlePrev}
            style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          >
            <Text style={styles.navBtnText}>‹ ANTERIOR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={currentIndex === playlistSongs.length - 1}
            onPress={handleNext}
            style={[
              styles.navBtn,
              styles.navBtnNext,
              currentIndex === playlistSongs.length - 1 && styles.navBtnDisabled,
            ]}
          >
            <Text style={[styles.navBtnText, styles.navBtnNextText]}>PRÓXIMA ›</Text>
          </TouchableOpacity>
        </View>

        {/* Next song preview banner */}
        {nextSong ? (
          <View style={styles.nextSongBox}>
            <Text style={styles.nextSongLabel}>A SEGUIR NA SETLIST:</Text>
            <Text style={styles.nextSongTitle} numberOfLines={1}>
              {nextSong.title} — {nextSong.artist}
            </Text>
            <Text style={styles.nextSongMeta}>
              {nextSong.bpm} BPM • {nextSong.timeSignature} {nextSong.key ? `• Tom: ${nextSong.key}` : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.nextSongBox}>
            <Text style={styles.nextSongLabel}>FIM DO REPERTÓRIO</Text>
            <Text style={styles.nextSongTitle}>Última música do show! 🎉</Text>
          </View>
        )}
      </ScrollView>

      {/* Jump Modal to select any song in the playlist */}
      <Modal visible={jumpModalVisible} transparent animationType="slide" onRequestClose={() => setJumpModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ir para Música na Playlist</Text>
              <TouchableOpacity onPress={() => setJumpModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {playlistSongs.map((s, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setCurrentIndex(idx);
                    setJumpModalVisible(false);
                  }}
                  style={[
                    styles.jumpItem,
                    idx === currentIndex && styles.jumpItemActive,
                  ]}
                >
                  <Text style={[styles.jumpItemNum, idx === currentIndex && { color: '#00E5FF' }]}>
                    {idx + 1}.
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.jumpItemTitle, idx === currentIndex && { color: '#00E5FF' }]}>
                      {s.title}
                    </Text>
                    <Text style={styles.jumpItemMeta}>
                      {s.artist} • {s.bpm} BPM
                    </Text>
                  </View>
                  {idx === currentIndex && <Text style={styles.jumpPlaying}>Atual</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0C13',
  },
  flashOverlay: {
    backgroundColor: '#1E2536',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#141724',
    borderBottomWidth: 1,
    borderBottomColor: '#242A3E',
  },
  exitBtn: {
    backgroundColor: '#202538',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  exitBtnText: {
    color: '#FF7043',
    fontSize: 12,
    fontWeight: '700',
  },
  playlistBadge: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 12,
  },
  playlistBadgeTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  playlistBadgeSub: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: '600',
  },
  contentScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  mainSongCard: {
    backgroundColor: '#161926',
    borderWidth: 2,
    borderColor: '#00E5FF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  songTag: {
    color: '#00E5FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  songTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
  },
  songArtist: {
    color: '#A8B4D4',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 12,
  },
  largeBadgesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  largeBadge: {
    backgroundColor: '#202538',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  keyBadge: {
    backgroundColor: '#0D382A',
    borderColor: '#00E676',
    borderWidth: 1,
  },
  largeBadgeLabel: {
    color: '#7682A4',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  largeBadgeValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  largeBadgeValueKey: {
    color: '#00E676',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  notesBox: {
    backgroundColor: '#1D2235',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD600',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  notesBoxLabel: {
    color: '#FFD600',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  notesBoxText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bpmHeroBox: {
    alignItems: 'center',
    marginVertical: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bpmHeroNumber: {
    color: '#FFFFFF',
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -1,
  },
  bpmHeroUnit: {
    color: '#00E5FF',
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 8,
    marginTop: 18,
  },
  playButton: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  startButton: {
    backgroundColor: '#00E5FF',
    shadowColor: '#00E5FF',
  },
  stopButton: {
    backgroundColor: '#FF1744',
    shadowColor: '#FF1744',
  },
  playIcon: {
    color: '#0A0F1D',
    fontSize: 24,
    fontWeight: '900',
  },
  playText: {
    color: '#0A0F1D',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  navBtn: {
    flex: 1,
    backgroundColor: '#202538',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#303854',
  },
  navBtnNext: {
    backgroundColor: '#153648',
    borderColor: '#00E5FF',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  navBtnNextText: {
    color: '#00E5FF',
  },
  nextSongBox: {
    backgroundColor: '#161926',
    borderWidth: 1,
    borderColor: '#262C40',
    borderRadius: 14,
    padding: 14,
  },
  nextSongLabel: {
    color: '#7682A4',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  nextSongTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  nextSongMeta: {
    color: '#8A92B2',
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    color: '#8A92B2',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  playlistPickerBox: {
    width: '100%',
    backgroundColor: '#161926',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#262C40',
  },
  pickerBoxTitle: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  pickerItem: {
    backgroundColor: '#202538',
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerItemName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pickerItemCount: {
    color: '#00E5FF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#181A24',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
    color: '#8A8A9E',
    fontSize: 20,
    fontWeight: 'bold',
  },
  jumpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#242A3E',
  },
  jumpItemActive: {
    backgroundColor: '#153648',
  },
  jumpItemNum: {
    color: '#8C98B8',
    fontSize: 14,
    fontWeight: '800',
    width: 28,
  },
  jumpItemTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  jumpItemMeta: {
    color: '#8C98B8',
    fontSize: 12,
  },
  jumpPlaying: {
    color: '#00E5FF',
    fontSize: 11,
    fontWeight: '800',
  },
});
