import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MatrixGridBackground from '@/components/MatrixGridBackground';
import Colors from '@/constants/colors';
import { createElectricSweepAnimation } from '@/constants/animations';

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      createElectricSweepAnimation(fadeAnim).start(() => {
        router.replace('/(tabs)' as any);
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <MatrixGridBackground parallax particles />
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <Image
            source={{
              uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/k95rc9dv5sso3otf9ckgb',
            }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>gnidoC terceS</Text>
        <Text style={styles.subtitle}>Initializing multi-model intelligence…</Text>

        <View style={styles.loadingBar}>
          <Animated.View
            style={[
              styles.loadingFill,
              {
                width: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.Colors.black.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 32,
    borderRadius: 60,
    backgroundColor: Colors.Colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.Colors.cyan.primary,
    shadowColor: Colors.Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 42,
    fontWeight: '700' as const,
    color: Colors.Colors.cyan.primary,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 4,
    textShadowColor: Colors.Colors.cyan.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.Colors.lime.primary,
    textAlign: 'center',
    marginBottom: 40,
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingFill: {
    height: '100%',
    backgroundColor: Colors.Colors.cyan.primary,
    shadowColor: Colors.Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
});
