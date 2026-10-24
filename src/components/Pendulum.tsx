import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface PendulumProps {
  isRunning: boolean;
  bpm: number;
  currentBeat: number;
}

export const Pendulum: React.FC<PendulumProps> = ({ isRunning, bpm, currentBeat }) => {
  const swingAnim = useRef(new Animated.Value(0)).current; // -1 to 1

  useEffect(() => {
    if (!isRunning) {
      Animated.timing(swingAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }

    const direction = currentBeat % 2 === 0 ? 1 : -1;
    const beatDurationMs = (60 / bpm) * 1000;

    Animated.timing(swingAnim, {
      toValue: direction,
      duration: Math.min(beatDurationMs * 0.9, 450),
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      useNativeDriver: true,
    }).start();
  }, [isRunning, currentBeat, bpm]);

  const rotation = swingAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-28deg', '0deg', '28deg'],
  });

  return (
    <View style={styles.container}>
      {/* Arc graduation marks */}
      <View style={styles.arcIndicator}>
        <View style={[styles.mark, styles.leftMark]} />
        <View style={[styles.mark, styles.centerMark]} />
        <View style={[styles.mark, styles.rightMark]} />
      </View>

      {/* The swinging needle */}
      <Animated.View
        style={[
          styles.needleArm,
          {
            transform: [
              { translateY: 40 },
              { rotate: rotation },
              { translateY: -40 },
            ],
          },
        ]}
      >
        <View style={styles.weightBob} />
        <View style={styles.needleRod} />
      </Animated.View>

      {/* Pivot base */}
      <View style={styles.pivot} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 100,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    marginBottom: 8,
  },
  arcIndicator: {
    position: 'absolute',
    top: 10,
    width: 180,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  mark: {
    width: 2,
    height: 10,
    backgroundColor: '#38384A',
    borderRadius: 1,
  },
  leftMark: {
    transform: [{ rotate: '-25deg' }],
  },
  centerMark: {
    height: 14,
    backgroundColor: '#00E5FF',
  },
  rightMark: {
    transform: [{ rotate: '25deg' }],
  },
  needleArm: {
    position: 'absolute',
    bottom: 12,
    alignItems: 'center',
    height: 90,
    width: 20,
    zIndex: 1,
  },
  weightBob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00E5FF',
    shadowColor: '#00E5FF',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: -4,
  },
  needleRod: {
    width: 3,
    height: 75,
    backgroundColor: '#90CAF9',
    borderRadius: 1.5,
  },
  pivot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#5C6BC0',
    borderWidth: 2,
    borderColor: '#1E1E28',
    zIndex: 2,
    marginBottom: 6,
  },
});
