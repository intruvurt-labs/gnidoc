import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Colors from '@/constants/colors';
import { limeWithOutline } from '@/constants/textStyles';

interface BrandedHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  rightAction?: React.ReactNode;
  onLogoPress?: () => void;
}

export default function BrandedHeader({
  title,
  subtitle,
  showLogo = true,
  rightAction,
  onLogoPress,
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
        {title && (
          <Text style={[styles.title, limeWithOutline]}>{title}</Text>
        )}
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.Colors.black.tertiary,
    borderWidth: 2,
    borderColor: Colors.Colors.cyan.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.Colors.cyan.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  logoSymbol: {
    width: 36,
    height: 36,
  },
  textContainer: {
    flex: 1,
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
