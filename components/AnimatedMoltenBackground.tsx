import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import OptimizedImage from '@/components/OptimizedImage';

interface AnimatedMoltenBackgroundProps {
  logoUri?: string;
  symbolUri?: string;
  textLogoUri?: string;
  heroBannerUri?: string;
  intensity?: number;
}

const { width, height } = Dimensions.get('window');

const SPARK_COUNT = Platform.OS === 'web' ? 18 : 28;

const AnimatedMoltenBackground: React.FC<AnimatedMoltenBackgroundProps> = React.memo(({
  logoUri,
  symbolUri,
  textLogoUri,
  heroBannerUri,
  intensity = 0.75,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;

  const sparks = useMemo(() => new Array(SPARK_COUNT).fill(null).map((_, i) => ({
    id: `spark-${i}`,
    x: Math.random() * width,
    y: Math.random() * height,
    size: 2 + Math.random() * 4,
    delay: Math.floor(Math.random() * 4000),
    duration: 1500 + Math.floor(Math.random() * 3000),
  })), []);

  const sparkOpacities = useRef(sparks.map(() => new Animated.Value(0))).current;
  const sparkScales = useRef(sparks.map(() => new Animated.Value(0.8))).current;

  useEffect(() => {
    const vibration = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1 + 0.01 * intensity, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1 - 0.01 * intensity, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );

    const glowUp = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0.15, duration: 2400, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      ]),
    );

    const waveAnim = Animated.loop(
      Animated.timing(wave, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: false })
    );

    const sparkAnims = sparks.map((_, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(sparks[i].delay),
          Animated.parallel([
            Animated.timing(sparkOpacities[i], { toValue: 1, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(sparkScales[i], { toValue: 1.6, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ]),
          Animated.timing(sparkOpacities[i], { toValue: 0, duration: sparks[i].duration, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(sparkScales[i], { toValue: 0.8, duration: 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      )
    );

    vibration.start();
    glowUp.start();
    waveAnim.start(() => wave.setValue(0));
    sparkAnims.forEach(a => a.start());

    return () => {
      vibration.stop();
      glowUp.stop();
      sparkAnims.forEach(a => a.stop());
    };
  }, [glow, intensity, scale, sparkOpacities, sparkScales, sparks, wave]);

  const heatCyan = Colors.Colors.cyan.primary;
  const heatOrange = Colors.Colors.orange.primary;
  const heatRed = Colors.Colors.red.primary;

  const glowInterpolate = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.6],
  });

  const waveShift = wave.interpolate({ inputRange: [0, 1], outputRange: [0, width] });

  return (
    <View style={styles.container} pointerEvents="none" testID="animated-molten-bg">
      <Animated.View style={[styles.gradientWrap, { transform: [{ scale }] }]}>        
        <LinearGradient
          colors={[heatCyan, heatOrange, heatRed]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
        <Animated.View style={[styles.overlayGlow, { opacity: glowInterpolate }]} />
      </Animated.View>

      {heroBannerUri && (
        <OptimizedImage
          source={{ uri: heroBannerUri }}
          style={styles.banner}
          containerStyle={styles.bannerContainer}
          resizeMode="cover"
        />
      )}

      {textLogoUri && (
        <OptimizedImage
          source={{ uri: textLogoUri }}
          style={styles.watermark}
          containerStyle={styles.watermarkContainer}
          resizeMode="contain"
        />
      )}

      {symbolUri && (
        <OptimizedImage
          source={{ uri: symbolUri }}
          style={styles.symbol}
          containerStyle={styles.symbolContainer}
          resizeMode="contain"
        />
      )}

      {sparks.map((s, i) => (
        <Animated.View
          key={s.id}
          style={[
            styles.spark,
            {
              left: (s.x + (i % 3 === 0 ? waveShift as unknown as number : 0)) as number,
              top: s.y,
              width: s.size,
              height: s.size,
              opacity: sparkOpacities[i],
              transform: [{ scale: sparkScales[i] }],
            },
          ]}
        />
      ))}

      <View style={styles.mask} />
    </View>
  );
});

AnimatedMoltenBackground.displayName = 'AnimatedMoltenBackground';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  gradientWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    width: '200%',
    height: '200%',
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    opacity: 0.35,
  },
  overlayGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff10',
  },
  bannerContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  banner: {
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
  watermarkContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'flex-start',
  },
  watermark: {
    width: width * 0.7,
    height: width * 0.22,
    opacity: 0.08,
  },
  symbolContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    opacity: 0.08,
  },
  symbol: {
    width: 96,
    height: 96,
  },
  spark: {
    position: 'absolute',
    borderRadius: 8,
    backgroundColor: '#fff',
    shadowColor: Colors.Colors.cyan.primary,
    shadowOpacity: Platform.OS === 'web' ? 0 : 0.6,
    shadowRadius: 6,
  },
  mask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});

export default AnimatedMoltenBackground;
