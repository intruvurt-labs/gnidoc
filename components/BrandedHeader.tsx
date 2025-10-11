import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
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
  return (
    <View style={styles.container}>
      {showLogo && (
        <TouchableOpacity 
          style={styles.logoContainer}
          onPress={onLogoPress}
          disabled={!onLogoPress}
        >
          <View style={styles.logoCircle}>
            <Image
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/3m84a7w7p2uwori7ld5pn' }}
              style={styles.logoSymbol}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      )}
      
      <View style={styles.textContainer}>
        {title && (
          <Text style={[styles.title, limeWithOutline]}>{title}</Text>
        )}
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
      </View>

      {rightAction ? (
        <View style={styles.rightAction}>
          {rightAction}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 2,
    borderBottomColor: Colors.Colors.cyan.primary,
  },
  logoContainer: {
    position: 'absolute' as const,
    left: '50%' as any,
    transform: [{ translateX: -48 }],
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSymbol: {
    width: 96,
    height: 96,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    opacity: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.Colors.cyan.primary,
    fontWeight: '500' as const,
  },
  rightAction: {
    marginLeft: 12,
  },
});
