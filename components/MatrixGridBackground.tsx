import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import Colors from '@/constants/colors';

const { width, height } = Dimensions.get('window');

interface MatrixGridBackgroundProps {
  parallax?: boolean;
  particles?: boolean;
  tint?: string;
}

export default function MatrixGridBackground({
  parallax = false,
  particles = false,
  tint = Colors.Colors.background.gridGlow,
}: MatrixGridBackgroundProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (parallax) {
      Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: true,
        })
      ).start();
    }

    if (particles) {
      particleAnims.forEach((anim, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(anim, {
              toValue: 1,
              duration: 3000 + Math.random() * 2000,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    }
  }, [parallax, particles]);

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -50],
  });

  return (
    <View style={[styles.container, { backgroundColor: tint }]}>
      <Animated.View
        style={[
          styles.gridContainer,
          parallax && { transform: [{ translateY }] },
        ]}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <View
            key={`v-${i}`}
            style={[
              styles.gridLine,
              styles.verticalLine,
              { left: (i * width) / 20 },
            ]}
          />
        ))}
        {Array.from({ length: 30 }).map((_, i) => (
          <View
            key={`h-${i}`}
            style={[
              styles.gridLine,
              styles.horizontalLine,
              { top: (i * height) / 30 },
            ]}
          />
        ))}
      </Animated.View>

      {particles &&
        particleAnims.map((anim, index) => {
          const opacity = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 1, 0],
          });

          const scale = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 2],
          });

          return (
            <Animated.View
              key={`particle-${index}`}
              style={[
                styles.particle,
                {
                  left: Math.random() * width,
                  top: Math.random() * height,
                  opacity,
                  transform: [{ scale }],
                },
              ]}
            />
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gridContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: Colors.Colors.cyan.primary,
    opacity: 0.1,
  },
  verticalLine: {
    width: 1,
    height: height * 1.5,
  },
  horizontalLine: {
    height: 1,
    width: width,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.Colors.cyan.primary,
  },
});
