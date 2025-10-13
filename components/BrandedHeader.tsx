import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Animated, Platform } from 'react-native';
import Colors from '@/constants/colors';
import { limeWithOutline } from '@/constants/textStyles';
import TypewriterEffect, { gnidocTercesPhases } from './TypewriterEffect';

interface BrandedHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  rightAction?: React.ReactNode;
  onLogoPress?: () => void;
  enableTypewriter?: boolean;
  typewriterPhrases?: string[];
}

export default function BrandedHeader({
  title,
  subtitle,
  showLogo = true,
  rightAction,
  onLogoPress,
  enableTypewriter = false,
  typewriterPhrases = gnidocTercesPhases,
}: BrandedHeaderProps) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <View style={styles.container}>
      {/* Left spacer to keep the center truly centered */}
      <View style={styles.side} />

      {/* Center stack (logo + titles) */}
      <View style={styles.center}>
        {showLogo && (
          <Pressable
            accessibilityRole={onLogoPress ? 'button' : undefined}
            accessibilityLabel="App logo"
            onPress={onLogoPress}
            disabled={!onLogoPress}
            style={({ pressed }) => [
              styles.logoCircle,
              pressed && Platform.select({ default: { opacity: 0.85 }, web: { opacity: 0.9 } }),
            ]}
            hitSlop={10}
          >
            <Image
              source={{
                uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/3m84a7w7p2uwori7ld5pn',
              }}
              style={styles.logoSymbol}
              resizeMode="contain"
            />
          </Pressable>
        )}

        <Animated.View style={[styles.textContainer, { opacity: fade }]}>
          {title ? <Text style={[styles.title, limeWithOutline]}>{title}</Text> : null}

          {enableTypewriter ? (
            <TypewriterEffect
              phrases={typewriterPhrases}
              style={styles.subtitle}
              typingSpeed={60}
              deletingSpeed={40}
              pauseDuration={2500}
            />
          ) : subtitle ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : null}
        </Animated.View>
      </View>

      {/* Right side action */}
      <View style={styles.side}>{rightAction}</View>
    </View>
  );
}

const HEADER_HEIGHT = 84;

const styles = StyleSheet.create({
  container: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderBottomWidth: 2,
    borderBottomColor: Colors.Colors.cyan.primary,
    paddingHorizontal: 12,
  },
  side: {
    width: 72, // space for symmetry vs. logo width
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  logoSymbol: {
    width: 72,
    height: 72,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.Colors.text.primary,
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.Colors.cyan.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
});
