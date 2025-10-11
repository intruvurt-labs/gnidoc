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
              source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/k95rc9dv5sso3otf9ckgb' }}
              style={styles.logoSymbol}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      )}
      
      <View style={styles.textContainer}>
        <Image
          source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/1nutezip17rqx39f27nrb' }}
          style={styles.textLogo}
          resizeMode="contain"
        />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.Colors.background.secondary,
    borderBottomWidth: 2,
    borderBottomColor: Colors.Colors.cyan.primary,
  },
  logoContainer: {
    marginRight: 12,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.Colors.black.tertiary,
    borderWidth: 3,
    borderColor: Colors.Colors.cyan.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 12,
  },
  logoSymbol: {
    width: 72,
    height: 72,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  textLogo: {
    width: 180,
    height: 40,
    marginBottom: 4,
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
