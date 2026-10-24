import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BeatState } from '../types';

interface BeatVisualizerProps {
  numerator: number;
  currentBeat: number;
  accentPattern: BeatState[];
  onToggleBeatState: (index: number) => void;
  isRunning: boolean;
}

export const BeatVisualizer: React.FC<BeatVisualizerProps> = ({
  numerator,
  currentBeat,
  accentPattern,
  onToggleBeatState,
  isRunning,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.dotsRow}>
        {Array.from({ length: numerator }).map((_, index) => {
          const isActive = isRunning && currentBeat === index;
          const state = accentPattern[index] || (index === 0 ? 'accent' : 'normal');

          let stateColor = '#3A3A4C';
          let activeColor = '#00E5FF';
          let labelSymbol = '●';

          if (state === 'accent') {
            stateColor = '#FF5252';
            activeColor = '#FF1744';
            labelSymbol = '▲';
          } else if (state === 'normal') {
            stateColor = '#2979FF';
            activeColor = '#00E5FF';
            labelSymbol = '●';
          } else if (state === 'ghost') {
            stateColor = '#607D8B';
            activeColor = '#B0BEC5';
            labelSymbol = '◦';
          } else if (state === 'mute') {
            stateColor = '#21212B';
            activeColor = '#424250';
            labelSymbol = '✕';
          }

          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.7}
              onPress={() => onToggleBeatState(index)}
              style={[
                styles.dotWrapper,
                isActive && {
                  transform: [{ scale: 1.18 }],
                  borderColor: activeColor,
                },
              ]}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? activeColor : stateColor,
                    shadowColor: isActive ? activeColor : 'transparent',
                    shadowOpacity: isActive ? 0.9 : 0,
                    shadowRadius: isActive ? 10 : 0,
                    elevation: isActive ? 8 : 0,
                  },
                ]}
              >
                <Text style={styles.symbolText}>{labelSymbol}</Text>
              </View>
              <Text style={[styles.beatNumber, isActive && { color: activeColor, fontWeight: '800' }]}>
                {index + 1}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.legend}>
        Toque no tempo para alternar: <Text style={{ color: '#FF5252' }}>▲ Forte</Text> •{' '}
        <Text style={{ color: '#2979FF' }}>● Normal</Text> •{' '}
        <Text style={{ color: '#90A4AE' }}>◦ Suave</Text> •{' '}
        <Text style={{ color: '#757585' }}>✕ Mudo</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  dotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
  },
  dotWrapper: {
    alignItems: 'center',
    padding: 4,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  beatNumber: {
    color: '#8A8A9E',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  legend: {
    color: '#6E6E82',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
});
