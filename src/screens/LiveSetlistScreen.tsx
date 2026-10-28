import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Playlist, Song, BeatState } from '../types';
import { audioEngine } from '../audio/audioEngine';
import { BeatVisualizer } from '../components/BeatVisualizer';
import { useTheme } from '../theme/ThemeContext';

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
  const { currentTheme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [jumpModalVisible, setJumpModalVisible] = useState(false);
  const [accentPattern, setAccentPattern] = useState<BeatState[]>(['accent', 'normal', 'normal', 'normal']);

  // Map of songs by ID
  const songsMap = new Map<string, Song>();
  songs.forEach((s) => songsMap.set(s.id, s));

  // Current active playlist songs
  const playlistSongs: Song[] = playlist
    ? (playlist.songIds.map((id) => songsMap.get(id)).filter(Boolean) as Song[])
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

  const selectedFill = currentTheme.isOled ? '#000000' : currentTheme.navActive;
  const playBtnTextColor = currentTheme.isDark ? '#000000' : '#FFFFFF';

  if (!playlist || playlistSongs.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: currentTheme.background }]}>
        <Text style={styles.emptyEmoji}>🎤</Text>
        <Text style={[styles.emptyTitle, { color: currentTheme.text }]}>
          Nenhuma Playlist Selecionada para o Show
        </Text>
        <Text style={[styles.emptyDesc, { color: currentTheme.textSecondary }]}>
          Selecione uma das suas playlists para entrar no modo de palco com visual ampliado e navegação rápida entre músicas.
        </Text>

        {allPlaylists.length > 0 && (
          <View
            style={[
              styles.playlistPickerBox,
              { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
            ]}
          >
            <Text style={[styles.pickerBoxTitle, { color: currentTheme.accent }]}>
              Escolha uma Playlist:
            </Text>
            {allPlaylists.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => onSelectPlaylist(p)}
                style={[
                  styles.pickerItem,
                  { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
                ]}
              >
                <Text style={[styles.pickerItemName, { color: currentTheme.text }]}>{p.name}</Text>
                <Text style={[styles.pickerItemCount, { color: currentTheme.accent }]}>
                  {p.songIds.length} músicas
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  const parts = currentSong ? currentSong.timeSignature.split('/') : ['4', '4'];
  const numerator = parseInt(parts[0], 10) || 4;
  const flashBg = currentTheme.isDark ? '#1E2536' : '#E0F2FE';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isFlashActive ? flashBg : currentTheme.background },
      ]}
    >
      {/* Top Bar with Playlist Name & Jump Menu */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: currentTheme.card, borderBottomColor: currentTheme.border },
        ]}
      >
        <TouchableOpacity
          onPress={onExitLiveMode}
          style={[
            styles.exitBtn,
            { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
          ]}
        >
          <Text style={[styles.exitBtnText, { color: currentTheme.danger }]}>✕ Sair do Show</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setJumpModalVisible(true)} style={styles.playlistBadge}>
          <Text style={[styles.playlistBadgeTitle, { color: currentTheme.text }]} numberOfLines={1}>
            {playlist.name}
          </Text>
          <Text style={[styles.playlistBadgeSub, { color: currentTheme.accent }]}>
            Música {currentIndex + 1} de {playlistSongs.length} ▾
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {/* Giant Main Song Card */}
        {currentSong && (
          <View
            style={[
              styles.mainSongCard,
              { backgroundColor: currentTheme.card, borderColor: currentTheme.accent },
            ]}
          >
            <Text style={[styles.songTag, { color: currentTheme.accent }]}>
              MÚSICA ATUAL NO PALCO
            </Text>
            <Text style={[styles.songTitle, { color: currentTheme.text }]} numberOfLines={2}>
              {currentSong.title}
            </Text>
            <Text style={[styles.songArtist, { color: currentTheme.textSecondary }]}>
              {currentSong.artist}
            </Text>

            {/* Badges in Large View */}
            <View style={styles.largeBadgesRow}>
              {currentSong.key && (
                <View
                  style={[
                    styles.largeBadge,
                    {
                      backgroundColor: currentTheme.isDark ? '#0D382A' : '#DCFCE7',
                      borderColor: currentTheme.success,
                    },
                  ]}
                >
                  <Text style={[styles.largeBadgeLabel, { color: currentTheme.textSecondary }]}>
                    TOM
                  </Text>
                  <Text style={[styles.largeBadgeValueKey, { color: currentTheme.success }]}>
                    {currentSong.key}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.largeBadge,
                  { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
                ]}
              >
                <Text style={[styles.largeBadgeLabel, { color: currentTheme.textSecondary }]}>
                  COMPASSO
                </Text>
                <Text style={[styles.largeBadgeValue, { color: currentTheme.text }]}>
                  {currentSong.timeSignature}
                </Text>
              </View>

              {currentSong.duration && (
                <View
                  style={[
                    styles.largeBadge,
                    { backgroundColor: currentTheme.cardElevated, borderColor: currentTheme.border },
                  ]}
                >
                  <Text style={[styles.largeBadgeLabel, { color: currentTheme.textSecondary }]}>
                    DURAÇÃO
                  </Text>
                  <Text style={[styles.largeBadgeValue, { color: currentTheme.text }]}>
                    {currentSong.duration}
                  </Text>
                </View>
              )}
            </View>

            {/* Stage Notes if present */}
            {currentSong.notes && (
              <View
                style={[
                  styles.notesBox,
                  {
                    backgroundColor: currentTheme.cardElevated,
                    borderColor: currentTheme.border,
                    borderLeftColor: currentTheme.isDark ? '#FFD600' : '#D97706',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.notesBoxLabel,
                    { color: currentTheme.isDark ? '#FFD600' : '#B45309' },
                  ]}
                >
                  📌 OBSERVAÇÕES DE PALCO
                </Text>
                <Text style={[styles.notesBoxText, { color: currentTheme.text }]}>
                  {currentSong.notes}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* BPM Hero Display */}
        <View style={styles.bpmHeroBox}>
          <Text style={[styles.bpmHeroNumber, { color: currentTheme.text }]}>
            {currentSong?.bpm || 120}
          </Text>
          <Text style={[styles.bpmHeroUnit, { color: currentTheme.accent }]}>BPM</Text>
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
          style={[
            styles.playButton,
            {
              backgroundColor: isRunning ? currentTheme.danger : currentTheme.accent,
              shadowColor: isRunning ? currentTheme.danger : currentTheme.accent,
            },
          ]}
        >
          <Text style={[styles.playIcon, { color: isRunning ? '#FFFFFF' : playBtnTextColor }]}>
            {isRunning ? '■' : '▶'}
          </Text>
          <Text style={[styles.playText, { color: isRunning ? '#FFFFFF' : playBtnTextColor }]}>
            {isRunning ? 'PARAR METRÔNOMO' : 'SOLTAR METRÔNOMO'}
          </Text>
        </TouchableOpacity>

        {/* Next Song Preview & Quick Navigation Buttons */}
        <View style={styles.navRow}>
          <TouchableOpacity
            disabled={currentIndex === 0}
            onPress={handlePrev}
            style={[
              styles.navBtn,
              { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
              currentIndex === 0 && styles.navBtnDisabled,
            ]}
          >
            <Text style={[styles.navBtnText, { color: currentTheme.text }]}>‹ ANTERIOR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={currentIndex === playlistSongs.length - 1}
            onPress={handleNext}
            style={[
              styles.navBtn,
              { backgroundColor: selectedFill, borderColor: currentTheme.accent },
              currentIndex === playlistSongs.length - 1 && styles.navBtnDisabled,
            ]}
          >
            <Text style={[styles.navBtnText, { color: currentTheme.accent }]}>PRÓXIMA ›</Text>
          </TouchableOpacity>
        </View>

        {/* Next song preview banner */}
        {nextSong ? (
          <View
            style={[
              styles.nextSongBox,
              { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
            ]}
          >
            <Text style={[styles.nextSongLabel, { color: currentTheme.textSecondary }]}>
              A SEGUIR NA SETLIST:
            </Text>
            <Text style={[styles.nextSongTitle, { color: currentTheme.text }]} numberOfLines={1}>
              {nextSong.title} — {nextSong.artist}
            </Text>
            <Text style={[styles.nextSongMeta, { color: currentTheme.textSecondary }]}>
              {nextSong.bpm} BPM • {nextSong.timeSignature}{' '}
              {nextSong.key ? `• Tom: ${nextSong.key}` : ''}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.nextSongBox,
              { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
            ]}
          >
            <Text style={[styles.nextSongLabel, { color: currentTheme.textSecondary }]}>
              FIM DO REPERTÓRIO
            </Text>
            <Text style={[styles.nextSongTitle, { color: currentTheme.text }]}>
              Última música do show! 🎉
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Jump Modal to select any song in the playlist */}
      <Modal
        visible={jumpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setJumpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: currentTheme.card, borderColor: currentTheme.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                Ir para Música na Playlist
              </Text>
              <TouchableOpacity onPress={() => setJumpModalVisible(false)}>
                <Text style={[styles.modalClose, { color: currentTheme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {playlistSongs.map((s, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setCurrentIndex(idx);
                      setJumpModalVisible(false);
                    }}
                    style={[
                      styles.jumpItem,
                      { borderBottomColor: currentTheme.border },
                      isActive && {
                        backgroundColor: selectedFill,
                        borderColor: currentTheme.accent,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.jumpItemNum,
                        { color: isActive ? currentTheme.accent : currentTheme.textSecondary },
                      ]}
                    >
                      {idx + 1}.
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.jumpItemTitle,
                          { color: isActive ? currentTheme.accent : currentTheme.text },
                        ]}
                      >
                        {s.title}
                      </Text>
                      <Text style={[styles.jumpItemMeta, { color: currentTheme.textSecondary }]}>
                        {s.artist} • {s.bpm} BPM
                      </Text>
                    </View>
                    {isActive && (
                      <Text style={[styles.jumpPlaying, { color: currentTheme.accent }]}>
                        Atual
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
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
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  exitBtn: {
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  exitBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  playlistBadge: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 12,
  },
  playlistBadgeTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  playlistBadgeSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  contentScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  mainSongCard: {
    borderWidth: 2,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  songTag: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  songTitle: {
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
  },
  songArtist: {
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
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  largeBadgeLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  largeBadgeValue: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  largeBadgeValueKey: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  notesBox: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  notesBoxLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  notesBoxText: {
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
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -1,
  },
  bpmHeroUnit: {
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
  playIcon: {
    fontSize: 24,
    fontWeight: '900',
  },
  playText: {
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
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  nextSongBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  nextSongLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  nextSongTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  nextSongMeta: {
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
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  playlistPickerBox: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  pickerBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  pickerItem: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerItemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  pickerItemCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderWidth: 1,
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
    fontSize: 18,
    fontWeight: '700',
  },
  modalClose: {
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
  },
  jumpItemNum: {
    fontSize: 14,
    fontWeight: '800',
    width: 28,
  },
  jumpItemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  jumpItemMeta: {
    fontSize: 12,
  },
  jumpPlaying: {
    fontSize: 11,
    fontWeight: '800',
  },
});
