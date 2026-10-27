import React, { useState, useRef, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface TapTempoProps {
  onTempoCalculated: (bpm: number) => void;
}

export const TapTempo: React.FC<TapTempoProps> = React.memo(({ onTempoCalculated }) => {
  const { currentTheme } = useTheme();
  const [tapCount, setTapCount] = useState(0);
  const tapTimes = useRef<number[]>([]);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleTap = useCallback(() => {
    const now = performance.now();

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 95,
        useNativeDriver: true,
      }),
    ]).start();

    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }

    if (tapTimes.current.length > 0) {
      const lastTap = tapTimes.current[tapTimes.current.length - 1];
      if (now - lastTap > 2500) {
        tapTimes.current = [];
      }
    }

    tapTimes.current.push(now);

    if (tapTimes.current.length > 6) {
      tapTimes.current.shift();
    }

    const count = tapTimes.current.length;
    setTapCount(count);

    if (count >= 2) {
      let sumIntervals = 0;
      for (let i = 1; i < count; i++) {
        sumIntervals += tapTimes.current[i] - tapTimes.current[i - 1];
      }
      const avgInterval = sumIntervals / (count - 1);
      const calculatedBpm = Math.round(60000 / avgInterval);

      if (calculatedBpm >= 20 && calculatedBpm <= 320) {
        onTempoCalculated(calculatedBpm);
      }
    }

    resetTimer.current = setTimeout(() => {
      tapTimes.current = [];
      setTapCount(0);
    }, 2500);
  }, [onTempoCalculated, scaleAnim]);

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={handleTap}
        accessibilityRole="button"
        accessibilityLabel="Tap Tempo: toque repetidamente no ritmo para calcular o BPM"
        style={[
          styles.button,
          {
            backgroundColor: currentTheme.cardElevated,
            borderColor: tapCount > 0 ? currentTheme.accent : currentTheme.border,
          },
        ]}
      >
        <View style={styles.row}>
          <Text style={[styles.title, { color: currentTheme.accent }]}>TAP TEMPO</Text>
          {tapCount > 1 ? (
            <View style={[styles.badge, { backgroundColor: currentTheme.accent }]}>
              <Text style={[styles.badgeText, { color: currentTheme.isDark ? '#000000' : '#FFFFFF' }]}>
                {tapCount}x
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

TapTempo.displayName = 'TapTempo';

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: 108,
    maxWidth: 150,
  },
  button: {
    height: 44,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
});
