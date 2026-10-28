import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { AppIcon } from '../components/AppIcon';
import { audioEngine } from '../audio/audioEngine';
import { BeatVisualizer } from '../components/BeatVisualizer';
import { TapTempo } from '../components/TapTempo';
import { TimeSignatureModal } from '../components/TimeSignatureModal';
import { BeatState, Song, SoundType, Subdivision, TimeSignature } from '../types';
import { useTheme, ThemeColors } from '../theme/ThemeContext';

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
] as const;

const SUBDIVISION_OPTIONS: ReadonlyArray<{ val: Subdivision; label: string }> = [
  { val: 1, label: '1/4' },
  { val: 2, label: '1/8' },
  { val: 3, label: '3T' },
  { val: 4, label: '1/16' },
];

const SOUND_OPTIONS: ReadonlyArray<{ id: SoundType; name: string }> = [
  { id: 'woodblock', name: 'Madeira' },
  { id: 'beep', name: 'Digital' },
  { id: 'rimshot', name: 'Rimshot' },
  { id: 'mechanical', name: 'Mecânico' },
];

const INITIAL_TIME_SIGNATURE: TimeSignature = {
  numerator: 4,
  denominator: 4,
  label: '4/4',
};

const INITIAL_ACCENT_PATTERN: BeatState[] = ['accent', 'normal', 'normal', 'normal'];

function getTempoName(bpm: number): string {
  for (let i = 0; i < TEMPO_MARKINGS.length; i++) {
    const item = TEMPO_MARKINGS[i];
    if (bpm >= item.min && bpm <= item.max) {
      return item.name;
    }
  }
  return 'Allegro';
}

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Isolated Practice Timer leaf component.
 * Prevents 1Hz timer ticks from re-rendering MetronomeScreen or any sibling controls.
 */
const PracticeTimerBadge: React.FC<{ isRunning: boolean; theme: ThemeColors }> = React.memo(
  ({ isRunning, theme }) => {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
      if (!isRunning) return;
      const intervalId = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(intervalId);
    }, [isRunning]);

    return (
      <View
        style={[
          styles.utilityPill,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
        accessibilityLabel={`Tempo de treino: ${formatTimer(seconds)}`}
      >
        <AppIcon name="time-outline" size={14} color={theme.success} />
        <Text style={[styles.timerValueText, { color: theme.success }]}>
          {formatTimer(seconds)}
        </Text>
      </View>
    );
  }
);
PracticeTimerBadge.displayName = 'PracticeTimerBadge';

/**
 * Isolated Beat Visualizer & Downbeat Flash section.
 * Subscribes directly to audioEngine.onBeatCallback so high-frequency beat updates
 * never re-render the parent MetronomeScreen, BPM display, steppers, or bottom selectors.
 */
interface LiveBeatSectionProps {
  numerator: number;
  accentPattern: BeatState[];
  onToggleBeatState: (index: number) => void;
  isRunning: boolean;
  flashEnabled: boolean;
  theme: ThemeColors;
}

const LiveBeatSection: React.FC<LiveBeatSectionProps> = React.memo(
  ({ numerator, accentPattern, onToggleBeatState, isRunning, flashEnabled, theme }) => {
    const [currentBeat, setCurrentBeat] = useState(0);
    const [isFlashActive, setIsFlashActive] = useState(false);
    const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (!isRunning) {
        setCurrentBeat(0);
        setIsFlashActive(false);
      }
    }, [isRunning]);

    useEffect(() => {
      audioEngine.onBeatCallback = (beatIndex, isDownbeat) => {
        setCurrentBeat(beatIndex);
        if (isDownbeat && flashEnabled) {
          setIsFlashActive(true);
          if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
          flashTimeoutRef.current = setTimeout(() => {
            setIsFlashActive(false);
          }, 80);
        }
      };

      return () => {
        audioEngine.onBeatCallback = null;
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      };
    }, [flashEnabled]);

    return (
      <View
        style={[
          styles.beatVisualizerBox,
          {
            backgroundColor: isFlashActive
              ? theme.isDark
                ? '#112233'
                : '#E0F2FE'
              : theme.card,
            borderColor: isFlashActive ? theme.accent : theme.border,
          },
        ]}
      >
        <BeatVisualizer
          numerator={numerator}
          currentBeat={currentBeat}
          accentPattern={accentPattern}
          onToggleBeatState={onToggleBeatState}
          isRunning={isRunning}
        />
      </View>
    );
  }
);
LiveBeatSection.displayName = 'LiveBeatSection';

/**
 * Memoized single horizontal line of BPM steppers (-5, -1, TAP TEMPO, +1, +5).
 */
interface BpmControlsRowProps {
  onStepMinus5: () => void;
  onStepMinus1: () => void;
  onStepPlus1: () => void;
  onStepPlus5: () => void;
  onTapTempo: (newBpm: number) => void;
  theme: ThemeColors;
}

const BpmControlsRow: React.FC<BpmControlsRowProps> = React.memo(
  ({ onStepMinus5, onStepMinus1, onStepPlus1, onStepPlus5, onTapTempo, theme }) => {
    return (
      <View style={styles.steppersRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onStepMinus5}
          accessibilityRole="button"
          accessibilityLabel="Diminuir 5 BPM"
          style={[
            styles.stepBtn,
            { backgroundColor: theme.cardElevated, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.stepBtnText, { color: theme.text }]}>−5</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onStepMinus1}
          accessibilityRole="button"
          accessibilityLabel="Diminuir 1 BPM"
          style={[
            styles.stepBtn,
            { backgroundColor: theme.cardElevated, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.stepBtnText, { color: theme.text }]}>−1</Text>
        </TouchableOpacity>

        <TapTempo onTempoCalculated={onTapTempo} />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onStepPlus1}
          accessibilityRole="button"
          accessibilityLabel="Aumentar 1 BPM"
          style={[
            styles.stepBtn,
            { backgroundColor: theme.cardElevated, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.stepBtnText, { color: theme.text }]}>+1</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onStepPlus5}
          accessibilityRole="button"
          accessibilityLabel="Aumentar 5 BPM"
          style={[
            styles.stepBtn,
            { backgroundColor: theme.cardElevated, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.stepBtnText, { color: theme.text }]}>+5</Text>
        </TouchableOpacity>
      </View>
    );
  }
);
BpmControlsRow.displayName = 'BpmControlsRow';

/**
 * Memoized Bottom Scrollable Container for Compasso, Subdivisão, and Timbre.
 * Independent internal scroll (overflow-y-auto) keeps upper critical controls locked.
 */
interface BottomParametersContainerProps {
  timeSignature: TimeSignature;
  subdivision: Subdivision;
  soundType: SoundType;
  onOpenTimeSignatureModal: () => void;
  onSelectSubdivision: (sub: Subdivision) => void;
  onSelectSoundType: (sound: SoundType) => void;
  theme: ThemeColors;
}

const BottomParametersContainer: React.FC<BottomParametersContainerProps> = React.memo(
  ({
    timeSignature,
    subdivision,
    soundType,
    onOpenTimeSignatureModal,
    onSelectSubdivision,
    onSelectSoundType,
    theme,
  }) => {
    const activeTextColor = theme.isDark ? '#000000' : '#FFFFFF';

    return (
      <View
        style={[
          styles.bottomContainerWrapper,
          { borderTopColor: theme.border, backgroundColor: theme.background },
        ]}
        // @ts-expect-error web-only className for independent scroll and Tailwind dark mode support
        className="overflow-y-auto dark:bg-black"
      >
        <ScrollView
          style={styles.bottomScroll}
          contentContainerStyle={styles.bottomScrollContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {/* Rhythm Controls Row: Compasso & Subdivisão */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onOpenTimeSignatureModal}
              accessibilityRole="button"
              accessibilityLabel={`Compasso atual ${timeSignature.label}. Toque para alterar`}
              style={[
                styles.timeSigButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.controlLabel, { color: theme.textSecondary }]}>
                COMPASSO
              </Text>
              <Text style={[styles.timeSigValue, { color: theme.accent }]}>
                {timeSignature.label}
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.subdivisionsBox,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.controlLabel, { color: theme.textSecondary }]}>
                SUBDIVISÃO
              </Text>
              <View style={styles.subRow}>
                {SUBDIVISION_OPTIONS.map((sub) => {
                  const isSelected = subdivision === sub.val;
                  return (
                    <TouchableOpacity
                      key={sub.val}
                      activeOpacity={0.75}
                      onPress={() => onSelectSubdivision(sub.val)}
                      accessibilityRole="button"
                      accessibilityLabel={`Subdivisão ${sub.label}`}
                      accessibilityState={{ selected: isSelected }}
                      style={[
                        styles.subBtn,
                        {
                          backgroundColor: isSelected
                            ? theme.accent
                            : theme.cardElevated,
                          borderColor: isSelected ? theme.accent : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.subBtnText,
                          { color: isSelected ? activeTextColor : theme.textSecondary },
                          isSelected && styles.subBtnTextActive,
                        ]}
                      >
                        {sub.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Sound / Timbre Selector Card */}
          <View
            style={[
              styles.soundSelectorCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.controlLabel, { color: theme.textSecondary }]}>
              TIMBRE DO METRÔNOMO
            </Text>
            <View style={styles.soundButtonsRow}>
              {SOUND_OPTIONS.map((s) => {
                const isSelected = soundType === s.id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    activeOpacity={0.75}
                    onPress={() => onSelectSoundType(s.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Timbre ${s.name}`}
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.soundChip,
                      {
                        backgroundColor: isSelected
                          ? theme.accent
                          : theme.cardElevated,
                        borderColor: isSelected ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.soundChipText,
                        { color: isSelected ? activeTextColor : theme.textSecondary },
                        isSelected && styles.soundChipTextActive,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }
);
BottomParametersContainer.displayName = 'BottomParametersContainer';

export const MetronomeScreen: React.FC<MetronomeScreenProps> = ({
  currentSong,
  onClearCurrentSong,
  onOpenSongsTab,
}) => {
  const { currentTheme } = useTheme();
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>(INITIAL_TIME_SIGNATURE);
  const [subdivision, setSubdivision] = useState<Subdivision>(1);
  const [soundType, setSoundType] = useState<SoundType>('woodblock');
  const [volume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [accentPattern, setAccentPattern] = useState<BeatState[]>(INITIAL_ACCENT_PATTERN);
  const [flashEnabled, setFlashEnabled] = useState(true);
  const [tsModalVisible, setTsModalVisible] = useState(false);

  // Sync parameters with Web Audio API engine (decoupled from theme changes)
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

  // Load song parameters when a song is selected from the library
  useEffect(() => {
    if (!currentSong) return;
    const nextBpm = currentSong.bpm;
    const nextSub = currentSong.subdivision || 1;
    const nextSound = currentSong.soundType || 'woodblock';

    setBpm(nextBpm);
    if (currentSong.subdivision) setSubdivision(currentSong.subdivision);
    if (currentSong.soundType) setSoundType(currentSong.soundType);

    const parts = currentSong.timeSignature.split('/');
    const num = parseInt(parts[0], 10) || 4;
    const den = parseInt(parts[1], 10) || 4;
    setTimeSignature({
      numerator: num,
      denominator: den,
      label: currentSong.timeSignature,
    });

    const defaultPattern: BeatState[] = Array.from({ length: num }, (_, i) =>
      i === 0 ? 'accent' : 'normal'
    );
    setAccentPattern(defaultPattern);

    // Synchronously push song parameters into audioEngine so immediate play uses them
    audioEngine.updateParameters({
      bpm: nextBpm,
      numerator: num,
      denominator: den,
      subdivision: nextSub,
      soundType: nextSound,
      accentPattern: defaultPattern,
    });
  }, [currentSong]);

  // Stable callbacks to prevent child re-renders
  const handleStepMinus5 = useCallback(() => {
    setBpm((b) => {
      const next = Math.max(20, b - 5);
      audioEngine.updateParameters({ bpm: next });
      return next;
    });
  }, []);

  const handleStepMinus1 = useCallback(() => {
    setBpm((b) => {
      const next = Math.max(20, b - 1);
      audioEngine.updateParameters({ bpm: next });
      return next;
    });
  }, []);

  const handleStepPlus1 = useCallback(() => {
    setBpm((b) => {
      const next = Math.min(320, b + 1);
      audioEngine.updateParameters({ bpm: next });
      return next;
    });
  }, []);

  const handleStepPlus5 = useCallback(() => {
    setBpm((b) => {
      const next = Math.min(320, b + 5);
      audioEngine.updateParameters({ bpm: next });
      return next;
    });
  }, []);

  const handleTapTempoCalculated = useCallback((newBpm: number) => {
    setBpm(newBpm);
    audioEngine.updateParameters({ bpm: newBpm });
  }, []);

  const handleSelectTimeSignature = useCallback((newTs: TimeSignature) => {
    setTimeSignature(newTs);
    const newPattern: BeatState[] = Array.from(
      { length: newTs.numerator },
      (_, i) => (i === 0 ? 'accent' : 'normal')
    );
    setAccentPattern(newPattern);
    audioEngine.updateParameters({
      numerator: newTs.numerator,
      denominator: newTs.denominator,
      accentPattern: newPattern,
    });
  }, []);

  const handleToggleBeatState = useCallback((index: number) => {
    const cycle: BeatState[] = ['normal', 'ghost', 'mute', 'accent'];
    setAccentPattern((prev) => {
      const current = prev[index] || (index === 0 ? 'accent' : 'normal');
      const nextIndex = (cycle.indexOf(current) + 1) % cycle.length;
      const copy = [...prev];
      copy[index] = cycle[nextIndex];
      audioEngine.updateParameters({ accentPattern: copy });
      return copy;
    });
  }, []);

  const handleOpenTsModal = useCallback(() => {
    setTsModalVisible(true);
  }, []);

  const handleCloseTsModal = useCallback(() => {
    setTsModalVisible(false);
  }, []);

  const handleSelectSubdivision = useCallback((sub: Subdivision) => {
    setSubdivision(sub);
    audioEngine.updateParameters({ subdivision: sub });
  }, []);

  const handleSelectSoundType = useCallback((type: SoundType) => {
    setSoundType(type);
    audioEngine.updateParameters({ soundType: type });
    audioEngine.playSinglePreviewSound(type);
  }, []);

  const handleToggleFlash = useCallback(() => {
    setFlashEnabled((prev) => !prev);
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      audioEngine.updateParameters({ isMuted: next });
      return next;
    });
  }, []);

  const togglePlay = useCallback(() => {
    setIsRunning((prevRunning) => {
      if (prevRunning) {
        audioEngine.stop();
        return false;
      } else {
        // Ensure latest state parameters are synced right before starting
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
        audioEngine.start();
        return true;
      }
    });
  }, [bpm, timeSignature, subdivision, soundType, volume, isMuted, accentPattern]);

  const playBtnTextColor = currentTheme.isDark ? '#000000' : '#FFFFFF';

  return (
    <View
      style={[styles.container, { backgroundColor: currentTheme.background }]}
      // @ts-expect-error web-only className for Tailwind dark mode
      className="dark:bg-black bg-day"
    >
      {/* LOCKED UPPER STAGE: Always visible on 4.7" screens (iPhone SE) without vertical page scroll */}
      <View style={styles.upperLockedSection}>
        {/* 1. Compact Header & Notice Row */}
        <View style={styles.topBarRow}>
          {currentSong ? (
            <View
              style={[
                styles.compactSongBanner,
                {
                  backgroundColor: currentTheme.card,
                  borderColor: currentTheme.accent,
                },
              ]}
            >
              <AppIcon name="musical-notes" size={14} color={currentTheme.accent} />
              <Text
                style={[styles.compactSongTitle, { color: currentTheme.text }]}
                numberOfLines={1}
              >
                {currentSong.title}
                {currentSong.key ? ` (${currentSong.key})` : ''}
              </Text>
              <TouchableOpacity
                onPress={onClearCurrentSong}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Liberar música ativa"
                style={styles.clearSongInlineBtn}
              >
                <AppIcon name="close-circle" size={16} color={currentTheme.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onOpenSongsTab}
              accessibilityRole="button"
              accessibilityLabel="Modo Livre: toque para carregar uma música da biblioteca"
              style={[
                styles.compactFreeBanner,
                {
                  backgroundColor: currentTheme.card,
                  borderColor: currentTheme.border,
                },
              ]}
            >
              <AppIcon
                name="library-outline"
                size={14}
                color={currentTheme.textSecondary}
              />
              <Text
                style={[styles.compactFreeText, { color: currentTheme.textSecondary }]}
                numberOfLines={1}
              >
                Modo Livre • Carregar música
              </Text>
            </TouchableOpacity>
          )}

          {/* Quick Utility Pills: Flash, Mute, Timer */}
          <View style={styles.utilitiesGroup}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleToggleFlash}
              accessibilityRole="switch"
              accessibilityState={{ checked: flashEnabled }}
              accessibilityLabel="Alternar flash visual no primeiro tempo"
              style={[
                styles.utilityBtn,
                {
                  backgroundColor: flashEnabled
                    ? currentTheme.isDark
                      ? '#26220A'
                      : '#FEF9C3'
                    : currentTheme.card,
                  borderColor: flashEnabled ? '#EAB308' : currentTheme.border,
                },
              ]}
            >
              <AppIcon
                name={flashEnabled ? 'flash' : 'flash-off-outline'}
                size={16}
                color={flashEnabled ? '#EAB308' : currentTheme.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleToggleMute}
              accessibilityRole="switch"
              accessibilityState={{ checked: !isMuted }}
              accessibilityLabel={isMuted ? 'Ativar som do metrônomo' : 'Silenciar metrônomo'}
              style={[
                styles.utilityBtn,
                {
                  backgroundColor: isMuted
                    ? currentTheme.isDark
                      ? '#2A1215'
                      : '#FEE2E2'
                    : currentTheme.card,
                  borderColor: isMuted ? currentTheme.danger : currentTheme.border,
                },
              ]}
            >
              <AppIcon
                name={isMuted ? 'volume-mute' : 'volume-high'}
                size={16}
                color={isMuted ? currentTheme.danger : currentTheme.textSecondary}
              />
            </TouchableOpacity>

            <PracticeTimerBadge isRunning={isRunning} theme={currentTheme} />
          </View>
        </View>

        {/* 2. Highlighted Centered BPM Display & Single-Line Controls */}
        <View
          style={[
            styles.bpmCard,
            {
              backgroundColor: currentTheme.card,
              borderColor: currentTheme.border,
            },
          ]}
        >
          <View style={styles.bpmHeroCenter}>
            <Text style={[styles.tempoMarkingText, { color: currentTheme.accent }]}>
              {getTempoName(bpm).toUpperCase()}
            </Text>
            <View style={styles.bpmDisplayRow}>
              <Text style={[styles.bpmNumber, { color: currentTheme.text }]}>
                {bpm}
              </Text>
              <Text style={[styles.bpmUnit, { color: currentTheme.textSecondary }]}>
                BPM
              </Text>
            </View>
          </View>

          {/* 3. Single Horizontal Controls Line (-5, -1, TAP TEMPO, +1, +5) */}
          <BpmControlsRow
            onStepMinus5={handleStepMinus5}
            onStepMinus1={handleStepMinus1}
            onStepPlus1={handleStepPlus1}
            onStepPlus5={handleStepPlus5}
            onTapTempo={handleTapTempoCalculated}
            theme={currentTheme}
          />
        </View>

        {/* 4. Compact Beat Visualizer */}
        <LiveBeatSection
          numerator={timeSignature.numerator}
          accentPattern={accentPattern}
          onToggleBeatState={handleToggleBeatState}
          isRunning={isRunning}
          flashEnabled={flashEnabled}
          theme={currentTheme}
        />

        {/* 5. Main Action Button fixed immediately below Beat Visualizer */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={togglePlay}
          accessibilityRole="button"
          accessibilityState={{ busy: isRunning }}
          accessibilityLabel={isRunning ? 'Parar Metrônomo' : 'Iniciar Metrônomo'}
          style={[
            styles.playButton,
            {
              backgroundColor: isRunning ? currentTheme.danger : currentTheme.accent,
              shadowColor: isRunning ? currentTheme.danger : currentTheme.accent,
            },
          ]}
        >
          <AppIcon
            name={isRunning ? 'stop' : 'play'}
            size={20}
            color={isRunning ? '#FFFFFF' : playBtnTextColor}
          />
          <Text
            style={[
              styles.playText,
              { color: isRunning ? '#FFFFFF' : playBtnTextColor },
            ]}
          >
            {isRunning ? 'PARAR METRÔNOMO' : 'INICIAR METRÔNOMO'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 6. Independent Scrollable Bottom Container (Compasso, Subdivisão, Timbre) */}
      <BottomParametersContainer
        timeSignature={timeSignature}
        subdivision={subdivision}
        soundType={soundType}
        onOpenTimeSignatureModal={handleOpenTsModal}
        onSelectSubdivision={handleSelectSubdivision}
        onSelectSoundType={handleSelectSoundType}
        theme={currentTheme}
      />

      {/* Time Signature Selection Modal */}
      <TimeSignatureModal
        visible={tsModalVisible}
        current={timeSignature}
        onClose={handleCloseTsModal}
        onSelect={handleSelectTimeSignature}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  upperLockedSection: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 6,
    flexShrink: 0,
    gap: 6,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    minHeight: 32,
  },
  compactSongBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    gap: 6,
    minHeight: 32,
  },
  compactSongTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  clearSongInlineBtn: {
    padding: 2,
  },
  compactFreeBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    gap: 5,
    minHeight: 32,
  },
  compactFreeText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  utilitiesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  utilityBtn: {
    width: 34,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityPill: {
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerValueText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  bpmCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  bpmHeroCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tempoMarkingText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  bpmDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  bpmNumber: {
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 68,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  bpmUnit: {
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 6,
  },
  steppersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    width: '100%',
  },
  stepBtn: {
    borderWidth: 1,
    borderRadius: 10,
    height: 44,
    minWidth: 46,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  beatVisualizerBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  playText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bottomContainerWrapper: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    borderTopWidth: 1,
  },
  bottomScroll: {
    flex: 1,
    width: '100%',
  },
  bottomScrollContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 14,
    gap: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
  },
  timeSigButton: {
    flex: 0.9,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  controlLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  timeSigValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  subdivisionsBox: {
    flex: 1.7,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 64,
  },
  subRow: {
    flexDirection: 'row',
    gap: 5,
    width: '100%',
    justifyContent: 'center',
  },
  subBtn: {
    flex: 1,
    borderRadius: 8,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subBtnTextActive: {
    fontWeight: '900',
  },
  soundSelectorCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  soundButtonsRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    justifyContent: 'center',
  },
  soundChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  soundChipTextActive: {
    fontWeight: '800',
  },
});
