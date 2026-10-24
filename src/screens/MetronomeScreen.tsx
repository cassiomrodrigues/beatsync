import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { audioEngine } from '../audio/audioEngine';
import { BeatVisualizer } from '../components/BeatVisualizer';
import { Pendulum } from '../components/Pendulum';
import { TapTempo } from '../components/TapTempo';
import { TimeSignatureModal } from '../components/TimeSignatureModal';
import { BeatState, Song, SoundType, Subdivision, TimeSignature } from '../types';

interface MetronomeScreenProps {
  currentSong: Song | null;
  onClearCurrentSong: () => void;
  onOpenSongsTab: () => void;
}

const TEMPO_MARKINGS = [
  { min: 20, max: 40, name: 'Grave' },
  { min: 40, max: 60, name: 'Largo' },
  { min: 60, max: 76, name: 'Adagio' },
  { min: 76, max: 108, name: 'Andante' },
  { min: 108, max: 120, name: 'Moderato' },
  { min: 120, max: 156, name: 'Allegro' },
  { min: 156, max: 176, name: 'Vivace' },
  { min: 176, max: 200, name: 'Presto' },
  { min: 200, max: 320, name: 'Prestissimo' },
];

function getTempoName(bpm: number): string {
  const match = TEMPO_MARKINGS.find((t) => bpm >= t.min && bpm <= t.max);
  return match ? match.name : 'Allegro';
}

export const MetronomeScreen: React.FC<MetronomeScreenProps> = ({
  currentSong,
  onClearCurrentSong,
  onOpenSongsTab,
}) => {
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>({
    numerator: 4,
    denominator: 4,
    label: '4/4',
  });
  const [subdivision, setSubdivision] = useState<Subdivision>(1);
  const [soundType, setSoundType] = useState<SoundType>('woodblock');
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [accentPattern, setAccentPattern] = useState<BeatState[]>([
    'accent',
    'normal',
    'normal',
    'normal',
  ]);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [tsModalVisible, setTsModalVisible] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Timer interval
  const practiceTimerRef = useRef<any>(null);

  // Sync parameters with audio engine
  useEffect(() => {
    audioEngine.updateParameters({
      bpm,
      numerator: timeSignature.numerator,
      denominator: timeSignature.denominator,
      subdivision,
      soundType,
      volume,
      isMuted,
      accentPattern,
    });
  }, [bpm, timeSignature, subdivision, soundType, volume, isMuted, accentPattern]);

  // Audio engine visual callbacks
  useEffect(() => {
    audioEngine.onBeatCallback = (beatIndex, isDownbeat) => {
      setCurrentBeat(beatIndex);
      if (isDownbeat && flashEnabled) {
        setIsFlashActive(true);
        setTimeout(() => setIsFlashActive(false), 80);
      }
    };

    return () => {
      audioEngine.onBeatCallback = null;
    };
  }, [flashEnabled]);

  // If a song is loaded, update metronome state
  useEffect(() => {
    if (currentSong) {
      setBpm(currentSong.bpm);
      if (currentSong.subdivision) setSubdivision(currentSong.subdivision);
      if (currentSong.soundType) setSoundType(currentSong.soundType);

      // Parse time signature like "4/4", "6/8", etc.
      const parts = currentSong.timeSignature.split('/');
      const num = parseInt(parts[0], 10) || 4;
      const den = parseInt(parts[1], 10) || 4;
      const newTs: TimeSignature = {
        numerator: num,
        denominator: den,
        label: currentSong.timeSignature,
      };
      setTimeSignature(newTs);

      // Update accent pattern
      const defaultPattern: BeatState[] = Array.from({ length: num }, (_, i) =>
        i === 0 ? 'accent' : 'normal'
      );
      setAccentPattern(defaultPattern);
    }
  }, [currentSong]);

  // Practice timer logic
  useEffect(() => {
    if (isRunning) {
      practiceTimerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (practiceTimerRef.current) {
        clearInterval(practiceTimerRef.current);
        practiceTimerRef.current = null;
      }
    }
    return () => {
      if (practiceTimerRef.current) clearInterval(practiceTimerRef.current);
    };
  }, [isRunning]);

  // When time signature changes, ensure accentPattern matches length
  const handleSelectTimeSignature = (newTs: TimeSignature) => {
    setTimeSignature(newTs);
    const newPattern: BeatState[] = Array.from(
      { length: newTs.numerator },
      (_, i) => (i === 0 ? 'accent' : 'normal')
    );
    setAccentPattern(newPattern);
  };

  const handleToggleBeatState = (index: number) => {
    const cycle: BeatState[] = ['normal', 'ghost', 'mute', 'accent'];
    const current = accentPattern[index] || (index === 0 ? 'accent' : 'normal');
    const nextIndex = (cycle.indexOf(current) + 1) % cycle.length;
    const nextState = cycle[nextIndex];

    const copy = [...accentPattern];
    copy[index] = nextState;
    setAccentPattern(copy);
  };

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

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, isFlashActive && styles.flashOverlay]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Song Banner */}
        {currentSong ? (
          <View style={styles.songBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.songBannerTag}>MÚSICA ATIVA DA BIBLIOTECA</Text>
              <Text style={styles.songBannerTitle} numberOfLines={1}>
                {currentSong.title}
              </Text>
              <Text style={styles.songBannerArtist} numberOfLines={1}>
                {currentSong.artist} {currentSong.key ? `• Tom: ${currentSong.key}` : ''}
              </Text>
              {currentSong.notes && (
                <Text style={styles.songBannerNotes} numberOfLines={2}>
                  📝 {currentSong.notes}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClearCurrentSong} style={styles.clearSongBtn}>
              <Text style={styles.clearSongBtnText}>✕ Liberar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={onOpenSongsTab} style={styles.freeModeBanner}>
            <Text style={styles.freeModeText}>
              💡 Modo Livre • Toque para carregar uma música da biblioteca
            </Text>
          </TouchableOpacity>
        )}

        {/* Pendulum Animation */}
        <Pendulum isRunning={isRunning} bpm={bpm} currentBeat={currentBeat} />

        {/* BPM Display Card */}
        <View style={styles.bpmCard}>
          <Text style={styles.tempoMarkingText}>{getTempoName(bpm).toUpperCase()}</Text>
          <View style={styles.bpmDisplayRow}>
            <Text style={styles.bpmNumber}>{bpm}</Text>
            <Text style={styles.bpmUnit}>BPM</Text>
          </View>

          {/* Stepper Buttons (-5, -1, +1, +5) */}
          <View style={styles.steppersRow}>
            <TouchableOpacity
              onPress={() => setBpm((b) => Math.max(20, b - 5))}
              style={styles.stepBtn}
            >
              <Text style={styles.stepBtnText}>−5</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBpm((b) => Math.max(20, b - 1))}
              style={styles.stepBtn}
            >
              <Text style={styles.stepBtnText}>−1</Text>
            </TouchableOpacity>
            <TapTempo onTempoCalculated={(newBpm) => setBpm(newBpm)} />
            <TouchableOpacity
              onPress={() => setBpm((b) => Math.min(320, b + 1))}
              style={styles.stepBtn}
            >
              <Text style={styles.stepBtnText}>+1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBpm((b) => Math.min(320, b + 5))}
              style={styles.stepBtn}
            >
              <Text style={styles.stepBtnText}>+5</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Beat Visualizer with interactive beat states */}
        <BeatVisualizer
          numerator={timeSignature.numerator}
          currentBeat={currentBeat}
          accentPattern={accentPattern}
          onToggleBeatState={handleToggleBeatState}
          isRunning={isRunning}
        />

        {/* Rhythm Controls: Compasso & Subdivisões */}
        <View style={styles.controlsRow}>
          {/* Time signature button */}
          <TouchableOpacity
            onPress={() => setTsModalVisible(true)}
            style={styles.timeSigButton}
          >
            <Text style={styles.controlLabel}>COMPASSO</Text>
            <Text style={styles.timeSigValue}>{timeSignature.label}</Text>
          </TouchableOpacity>

          {/* Subdivisions */}
          <View style={styles.subdivisionsBox}>
            <Text style={styles.controlLabel}>SUBDIVISÃO</Text>
            <View style={styles.subRow}>
              {[
                { val: 1, label: '1/4' },
                { val: 2, label: '1/8' },
                { val: 3, label: '3T' },
                { val: 4, label: '1/16' },
              ].map((sub) => (
                <TouchableOpacity
                  key={sub.val}
                  onPress={() => setSubdivision(sub.val as Subdivision)}
                  style={[
                    styles.subBtn,
                    subdivision === sub.val && styles.subBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.subBtnText,
                      subdivision === sub.val && styles.subBtnTextActive,
                    ]}
                  >
                    {sub.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Sound Selection Row */}
        <View style={styles.soundSelectorCard}>
          <Text style={styles.controlLabel}>TIMBRE DO METRÔNOMO</Text>
          <View style={styles.soundButtonsRow}>
            {[
              { id: 'woodblock', name: 'Madeira' },
              { id: 'beep', name: 'Digital' },
              { id: 'rimshot', name: 'Rimshot' },
              { id: 'mechanical', name: 'Mecânico' },
            ].map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => {
                  setSoundType(s.id as SoundType);
                  audioEngine.playSinglePreviewSound(s.id as SoundType);
                }}
                style={[
                  styles.soundChip,
                  soundType === s.id && styles.soundChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.soundChipText,
                    soundType === s.id && styles.soundChipTextActive,
                  ]}
                >
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Toggles: Flash & Timer */}
        <View style={styles.extraControlsRow}>
          <TouchableOpacity
            onPress={() => setFlashEnabled(!flashEnabled)}
            style={[styles.toggleBtn, flashEnabled && styles.toggleBtnActive]}
          >
            <Text style={styles.toggleIcon}>{flashEnabled ? '⚡' : '⚪'}</Text>
            <Text style={styles.toggleText}>Flash Visual</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsMuted(!isMuted)}
            style={[styles.toggleBtn, isMuted && styles.toggleBtnMuted]}
          >
            <Text style={styles.toggleIcon}>{isMuted ? '🔇' : '🔊'}</Text>
            <Text style={styles.toggleText}>{isMuted ? 'Mudo' : 'Som Ativo'}</Text>
          </TouchableOpacity>

          <View style={styles.timerDisplay}>
            <Text style={styles.timerLabel}>TREINO</Text>
            <Text style={styles.timerText}>{formatTimer(timerSeconds)}</Text>
          </View>
        </View>

        {/* Giant Main Play/Stop Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={togglePlay}
          style={[styles.playButton, isRunning ? styles.stopButton : styles.startButton]}
        >
          <Text style={styles.playIcon}>{isRunning ? '■' : '▶'}</Text>
          <Text style={styles.playText}>
            {isRunning ? 'PARAR METRÔNOMO' : 'INICIAR METRÔNOMO'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Time Signature Modal */}
      <TimeSignatureModal
        visible={tsModalVisible}
        current={timeSignature}
        onClose={() => setTsModalVisible(false)}
        onSelect={handleSelectTimeSignature}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1017',
  },
  flashOverlay: {
    backgroundColor: '#1E2838',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  songBanner: {
    width: '100%',
    backgroundColor: '#162235',
    borderWidth: 1.5,
    borderColor: '#00E5FF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  songBannerTag: {
    color: '#00E5FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  songBannerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  songBannerArtist: {
    color: '#9EABC7',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  songBannerNotes: {
    color: '#E0E0E0',
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  clearSongBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#223048',
    borderRadius: 8,
    marginLeft: 10,
  },
  clearSongBtnText: {
    color: '#FF7043',
    fontSize: 12,
    fontWeight: '700',
  },
  freeModeBanner: {
    width: '100%',
    backgroundColor: '#151722',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#24293D',
  },
  freeModeText: {
    color: '#8A92B2',
    fontSize: 12,
    fontWeight: '600',
  },
  bpmCard: {
    width: '100%',
    backgroundColor: '#161924',
    borderWidth: 1,
    borderColor: '#262C40',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  tempoMarkingText: {
    color: '#00E5FF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 4,
  },
  bpmDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bpmNumber: {
    color: '#FFFFFF',
    fontSize: 76,
    fontWeight: '900',
    lineHeight: 82,
    letterSpacing: -1,
  },
  bpmUnit: {
    color: '#7682A4',
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 8,
  },
  steppersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  stepBtn: {
    backgroundColor: '#202538',
    borderWidth: 1,
    borderColor: '#303854',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 42,
    alignItems: 'center',
  },
  stepBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 12,
  },
  timeSigButton: {
    flex: 1,
    backgroundColor: '#161924',
    borderWidth: 1,
    borderColor: '#262C40',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabel: {
    color: '#7C88AB',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  timeSigValue: {
    color: '#00E5FF',
    fontSize: 26,
    fontWeight: '900',
  },
  subdivisionsBox: {
    flex: 1.6,
    backgroundColor: '#161924',
    borderWidth: 1,
    borderColor: '#262C40',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  subRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  subBtn: {
    backgroundColor: '#202538',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#303854',
  },
  subBtnActive: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  subBtnText: {
    color: '#8C98B8',
    fontSize: 12,
    fontWeight: '700',
  },
  subBtnTextActive: {
    color: '#0B111D',
  },
  soundSelectorCard: {
    width: '100%',
    backgroundColor: '#161924',
    borderWidth: 1,
    borderColor: '#262C40',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  soundButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    width: '100%',
    justifyContent: 'center',
  },
  soundChip: {
    flex: 1,
    backgroundColor: '#202538',
    borderWidth: 1,
    borderColor: '#303854',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  soundChipActive: {
    backgroundColor: '#11354A',
    borderColor: '#00E5FF',
  },
  soundChipText: {
    color: '#8C98B8',
    fontSize: 12,
    fontWeight: '600',
  },
  soundChipTextActive: {
    color: '#00E5FF',
    fontWeight: '800',
  },
  extraControlsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: '#161924',
    borderWidth: 1,
    borderColor: '#262C40',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  toggleBtnActive: {
    borderColor: '#FFD600',
    backgroundColor: '#262518',
  },
  toggleBtnMuted: {
    borderColor: '#FF5252',
    backgroundColor: '#2A1818',
  },
  toggleIcon: {
    fontSize: 14,
  },
  toggleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  timerDisplay: {
    flex: 1,
    backgroundColor: '#161924',
    borderWidth: 1,
    borderColor: '#262C40',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  timerLabel: {
    color: '#7C88AB',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timerText: {
    color: '#00E676',
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  playButton: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowOpacity: 0.5,
    shadowRadius: 12,
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
    fontSize: 22,
    fontWeight: '900',
  },
  playText: {
    color: '#0A0F1D',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
