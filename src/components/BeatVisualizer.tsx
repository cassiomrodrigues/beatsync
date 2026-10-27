import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BeatState } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface BeatVisualizerProps {
  numerator: number;
  currentBeat: number;
  accentPattern: BeatState[];
  onToggleBeatState: (index: number) => void;
  isRunning: boolean;
}

interface BeatDotProps {
  index: number;
  isActive: boolean;
  state: BeatState;
  isCompact: boolean;
  isDark: boolean;
  textSecondary: string;
  onToggle: (index: number) => void;
}

const STATE_NAMES: Record<BeatState, string> = {
  accent: 'Forte',
  normal: 'Normal',
  ghost: 'Suave',
  mute: 'Mudo',
};

const HIT_SLOP = { top: 6, bottom: 6, left: 4, right: 4 };

const BeatDot: React.FC<BeatDotProps> = React.memo(
  ({ index, isActive, state, isCompact, isDark, textSecondary, onToggle }) => {
    let stateColor = isDark ? '#1E293B' : '#E2E8F0';
    let activeColor = '#00E5FF';
    let symbolColor = '#FFFFFF';
    let labelSymbol = '●';

    if (state === 'accent') {
      stateColor = isDark ? '#991B1B' : '#DC2626';
      activeColor = '#FF1744';
      labelSymbol = '▲';
    } else if (state === 'normal') {
      stateColor = isDark ? '#1D4ED8' : '#2563EB';
      activeColor = isDark ? '#00E5FF' : '#0284C7';
      labelSymbol = '●';
    } else if (state === 'ghost') {
      stateColor = isDark ? '#334155' : '#64748B';
      activeColor = isDark ? '#94A3B8' : '#475569';
      labelSymbol = '◦';
    } else if (state === 'mute') {
      stateColor = isDark ? '#14141B' : '#CBD5E1';
      activeColor = isDark ? '#3F3F46' : '#94A3B8';
      symbolColor = isDark ? '#71717A' : '#475569';
      labelSymbol = '✕';
    }

    const circleSize = isCompact ? 24 : 28;
    const borderRadius = circleSize / 2;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        hitSlop={HIT_SLOP}
        onPress={() => onToggle(index)}
        accessibilityRole="button"
        accessibilityLabel={`Tempo ${index + 1}: ${STATE_NAMES[state]}. Toque para alternar acentuação`}
        accessibilityState={{ selected: isActive }}
        style={[
          styles.dotWrapper,
          isActive && {
            transform: [{ scale: 1.14 }],
            borderColor: activeColor,
          },
        ]}
      >
        <View
          style={[
            styles.dot,
            {
              width: circleSize,
              height: circleSize,
              borderRadius,
              backgroundColor: isActive ? activeColor : stateColor,
            },
          ]}
        >
          <Text style={[styles.symbolText, { color: symbolColor }]}>{labelSymbol}</Text>
        </View>
        <Text
          style={[
            styles.beatNumber,
            { color: isActive ? activeColor : textSecondary },
            isActive && styles.beatNumberActive,
          ]}
        >
          {index + 1}
        </Text>
      </TouchableOpacity>
    );
  }
);

BeatDot.displayName = 'BeatDot';

export const BeatVisualizer: React.FC<BeatVisualizerProps> = React.memo(
  ({ numerator, currentBeat, accentPattern, onToggleBeatState, isRunning }) => {
    const { currentTheme, isDark } = useTheme();
    const isCompact = numerator > 6;

    return (
      <View style={styles.container}>
        <View style={styles.dotsRow}>
          {Array.from({ length: numerator }).map((_, index) => {
            const isActive = isRunning && currentBeat === index;
            const state = accentPattern[index] || (index === 0 ? 'accent' : 'normal');
            return (
              <BeatDot
                key={index}
                index={index}
                isActive={isActive}
                state={state}
                isCompact={isCompact}
                isDark={isDark}
                textSecondary={currentTheme.textSecondary}
                onToggle={onToggleBeatState}
              />
            );
          })}
        </View>
        <Text style={[styles.legend, { color: currentTheme.textMuted }]} numberOfLines={1}>
          Toque no tempo: <Text style={styles.legendAccent}>▲ Forte</Text> •{' '}
          <Text style={styles.legendNormal}>● Normal</Text> • ◦ Suave • ✕ Mudo
        </Text>
      </View>
    );
  }
);

BeatVisualizer.displayName = 'BeatVisualizer';

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    alignItems: 'center',
    width: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  dotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minWidth: 34,
  },
  dot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolText: {
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  beatNumber: {
    fontSize: 10,
    marginTop: 1,
    fontWeight: '600',
    lineHeight: 12,
  },
  beatNumberActive: {
    fontWeight: '900',
  },
  legend: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  legendAccent: {
    color: '#FF5252',
    fontWeight: '700',
  },
  legendNormal: {
    color: '#3B82F6',
    fontWeight: '700',
  },
});
