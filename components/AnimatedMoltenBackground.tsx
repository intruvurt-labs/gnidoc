import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const SPARK_COUNT = Platform.OS === 'web' ? 24 : 36;
const FLAME_COUNT = Platform.OS === 'web' ? 12 : 18;

type AnimationStage = 'subtle' | 'agitated' | 'glowing' | 'sparking' | 'molten';

const AnimatedMoltenBackground: React.FC<AnimatedMoltenBackgroundProps> = React.memo(({
  logoUri,
  symbolUri,
  textLogoUri,
  heroBannerUri,
  intensity = 0.75,
}) => {
  const [stage, setStage] = useState<AnimationStage>('subtle');
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const heat = useRef(new Animated.Value(0)).current;
  const flameIntensity = useRef(new Animated.Value(0)).current;

  const sparks = useMemo(() => new Array(SPARK_COUNT).fill(null).map((_, i) => ({
    id: `spark-${i}`,
    x: Math.random() * width,
    y: Math.random() * height,
    size: 2 + Math.random() * 5,
    delay: Math.floor(Math.random() * 5000),
    duration: 1200 + Math.floor(Math.random() * 3500),
    color: i % 3 === 0 ? Colors.Colors.cyan.primary : i % 3 === 1 ? Colors.Colors.orange.primary : Colors.Colors.red.primary,
  })), []);

  const flames = useMemo(() => new Array(FLAME_COUNT).fill(null).map((_, i) => ({
    id: `flame-${i}`,
    x: (width / FLAME_COUNT) * i + Math.random() * (width / FLAME_COUNT),
    y: height - Math.random() * 200,
    size: 40 + Math.random() * 80,
    delay: Math.floor(Math.random() * 2000),
    duration: 800 + Math.floor(Math.random() * 1200),
  })), []);

  const sparkOpacities = useRef(sparks.map(() => new Animated.Value(0))).current;
  const sparkScales = useRef(sparks.map(() => new Animated.Value(0.8))).current;
  const flameOpacities = useRef(flames.map(() => new Animated.Value(0))).current;
  const flameScales = useRef(flames.map(() => new Animated.Value(0.5))).current;

  useEffect(() => {
    const stageSequence = setTimeout(() => {
      if (stage === 'subtle') setStage('agitated');
      else if (stage === 'agitated') setStage('glowing');
      else if (stage === 'glowing') setStage('sparking');
      else if (stage === 'sparking') setStage('molten');
    }, stage === 'subtle' ? 3000 : stage === 'agitated' ? 4000 : stage === 'glowing' ? 5000 : stage === 'sparking' ? 6000 : 0);

    return () => clearTimeout(stageSequence);
  }, [stage]);

  useEffect(() => {
    const vibrationIntensity = stage === 'subtle' ? 0.005 : stage === 'agitated' ? 0.015 : stage === 'glowing' ? 0.025 : stage === 'sparking' ? 0.035 : 0.05;
    const vibrationSpeed = stage === 'subtle' ? 1500 : stage === 'agitated' ? 1000 : stage === 'glowing' ? 700 : stage === 'sparking' ? 500 : 300;

    const vibration = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1 + vibrationIntensity * intensity, duration: vibrationSpeed, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1 - vibrationIntensity * intensity, duration: vibrationSpeed, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );

    const glowTarget = stage === 'subtle' ? 0.2 : stage === 'agitated' ? 0.4 : stage === 'glowing' ? 0.7 : stage === 'sparking' ? 0.85 : 1;
    const glowSpeed = stage === 'subtle' ? 3000 : stage === 'agitated' ? 2500 : stage === 'glowing' ? 2000 : stage === 'sparking' ? 1500 : 1000;

    const glowUp = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: glowTarget, duration: glowSpeed, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.timing(glow, { toValue: glowTarget * 0.3, duration: glowSpeed, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      ]),
    );

    const heatAnim = Animated.timing(heat, {
      toValue: stage === 'molten' ? 1 : stage === 'sparking' ? 0.6 : stage === 'glowing' ? 0.3 : 0,
      duration: 2000,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });

    const flameAnim = Animated.timing(flameIntensity, {
      toValue: stage === 'molten' ? 1 : 0,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    const waveAnim = Animated.loop(
      Animated.timing(wave, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: false })
    );

    const sparkAnims = (stage === 'sparking' || stage === 'molten') ? sparks.map((_, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(sparks[i].delay),
          Animated.parallel([
            Animated.timing(sparkOpacities[i], { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(sparkScales[i], { toValue: 2.2, duration: 250, easing: Easing.out(Easing.back(2)), useNativeDriver: true }),
          ]),
          Animated.timing(sparkOpacities[i], { toValue: 0, duration: sparks[i].duration, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(sparkScales[i], { toValue: 0.6, duration: 400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      )
    ) : [];

    const flameAnims = stage === 'molten' ? flames.map((_, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(flames[i].delay),
          Animated.parallel([
            Animated.timing(flameOpacities[i], { toValue: 0.8, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(flameScales[i], { toValue: 1.5, duration: flames[i].duration, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(flameOpacities[i], { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
            Animated.timing(flameScales[i], { toValue: 0.5, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        ]),
      )
    ) : [];

    vibration.start();
    glowUp.start();
    heatAnim.start();
    flameAnim.start();
    waveAnim.start(() => wave.setValue(0));
    sparkAnims.forEach(a => a.start());
    flameAnims.forEach(a => a.start());

    return () => {
      vibration.stop();
      glowUp.stop();
      sparkAnims.forEach(a => a.stop());
      flameAnims.forEach(a => a.stop());
    };
  }, [glow, intensity, scale, sparkOpacities, sparkScales, sparks, wave, stage, heat, flameIntensity, flames, flameOpacities, flameScales]);

  const heatCyan = Colors.Colors.cyan.primary;
  const heatOrange = Colors.Colors.orange.primary;
  const heatRed = Colors.Colors.red.primary;
  const glowCyan = Colors.Colors.cyan.glow;
  const glowRed = Colors.Colors.red.glow;
  const glowOrange = Colors.Colors.orange.glow;

  const glowInterpolate = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.8],
  });

  const heatOpacity = heat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
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

      {(stage === 'sparking' || stage === 'molten') && sparks.map((s, i) => (
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
              backgroundColor: s.color,
              shadowColor: s.color,
            },
          ]}
        />
      ))}

      {stage === 'molten' && flames.map((f, i) => (
        <Animated.View
          key={f.id}
          style={[
            styles.flame,
            {
              left: f.x,
              bottom: 0,
              width: f.size,
              height: f.size * 2,
              opacity: flameOpacities[i],
              transform: [{ scale: flameScales[i] }, { translateY: -50 }],
            },
          ]}
        >
          <LinearGradient
            colors={[heatRed, heatOrange, heatCyan, 'transparent']}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={styles.flameGradient}
          />
        </Animated.View>
      ))}

      <Animated.View style={[styles.heatOverlay, { opacity: heatOpacity }]} />
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
    opacity: 0.45,
  },
  overlayGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.Colors.cyan.glow,
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
    borderRadius: 10,
    shadowOpacity: Platform.OS === 'web' ? 0 : 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  flame: {
    position: 'absolute',
    borderRadius: 100,
    overflow: 'hidden',
  },
  flameGradient: {
    width: '100%',
    height: '100%',
  },
  heatOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.Colors.red.primary,
  },
  mask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});

export default AnimatedMoltenBackground;
