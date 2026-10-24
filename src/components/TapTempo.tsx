import React, { useState, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';

interface TapTempoProps {
  onTempoCalculated: (bpm: number) => void;
}

export const TapTempo: React.FC<TapTempoProps> = ({ onTempoCalculated }) => {
  const [tapCount, setTapCount] = useState(0);
  const tapTimes = useRef<number[]>([]);
  const resetTimer = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleTap = () => {
    const now = performance.now();

    // Pulse animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Clear reset timer
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }

    // Reset if last tap was more than 2.5 seconds ago
    if (tapTimes.current.length > 0) {
      const lastTap = tapTimes.current[tapTimes.current.length - 1];
      if (now - lastTap > 2500) {
        tapTimes.current = [];
      }
    }

    tapTimes.current.push(now);

    // Keep up to 6 recent taps
    if (tapTimes.current.length > 6) {
      tapTimes.current.shift();
    }

    const count = tapTimes.current.length;
    setTapCount(count);

    if (count >= 2) {
      // Calculate intervals
      const intervals: number[] = [];
      for (let i = 1; i < count; i++) {
        intervals.push(tapTimes.current[i] - tapTimes.current[i - 1]);
      }

      // Average interval
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avgInterval);

      if (bpm >= 20 && bpm <= 320) {
        onTempoCalculated(bpm);
      }
    }

    // Schedule reset
    resetTimer.current = setTimeout(() => {
      tapTimes.current = [];
      setTapCount(0);
    }, 2500);
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleTap}
        style={styles.button}
      >
        <Text style={styles.title}>TAP TEMPO</Text>
        <Text style={styles.subtitle}>
          {tapCount > 1 ? `${tapCount} batidas` : 'Toque no ritmo'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1E2235',
    borderWidth: 1.5,
    borderColor: '#3D4566',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
  },
  title: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  subtitle: {
    color: '#8C98B8',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
});
