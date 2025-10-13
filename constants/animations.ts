import { Animated, Easing } from 'react-native';

export const AnimationConfig = {
  electricSweep: {
    type: 'diagonal_sweep' as const,
    durationMs: 600,
    easing: Easing.inOut(Easing.quad),
    glowColor: '#00FFFF',
  },
  neonArc: {
    type: 'arc_reveal' as const,
    durationMs: 500,
    easing: Easing.out(Easing.cubic),
    glowColor: '#FF33CC',
  },
  gridParallax: {
    type: 'parallax_grid' as const,
    depth: 0.35,
    speed: 0.6,
  },
  rippleCyan: {
    type: 'tap_ripple' as const,
    color: '#00FFFF',
    durationMs: 260,
  },
  waveSuccess: {
    type: 'horizontal_wave' as const,
    durationMs: 700,
    color: '#B3FF00',
  },
};

export const createElectricSweepAnimation = (animatedValue: Animated.Value) => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration: AnimationConfig.electricSweep.durationMs,
    easing: AnimationConfig.electricSweep.easing,
    useNativeDriver: true,
  });
};

export const createNeonArcAnimation = (animatedValue: Animated.Value) => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration: AnimationConfig.neonArc.durationMs,
    easing: AnimationConfig.neonArc.easing,
    useNativeDriver: true,
  });
};

export const createRippleAnimation = (animatedValue: Animated.Value) => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration: AnimationConfig.rippleCyan.durationMs,
    easing: Easing.out(Easing.ease),
    useNativeDriver: true,
  });
};

export const createWaveAnimation = (animatedValue: Animated.Value) => {
  return Animated.timing(animatedValue, {
    toValue: 1,
    duration: AnimationConfig.waveSuccess.durationMs,
    easing: Easing.inOut(Easing.ease),
    useNativeDriver: true,
  });
};

export const createPulseAnimation = (animatedValue: Animated.Value) => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.1,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ])
  );
};
