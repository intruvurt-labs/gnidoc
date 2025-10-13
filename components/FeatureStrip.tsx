import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Zap, Shield, Box } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface FeatureItem {
  icon: 'bolt' | 'shield' | 'panel';
  title: string;
}

interface FeatureStripProps {
  items: FeatureItem[];
}

export default function FeatureStrip({ items }: FeatureStripProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'bolt':
        return <Zap color={Colors.Colors.cyan.primary} size={24} />;
      case 'shield':
        return <Shield color={Colors.Colors.lime.primary} size={24} />;
      case 'panel':
        return <Box color={Colors.Colors.magenta.primary} size={24} />;
      default:
        return <Zap color={Colors.Colors.cyan.primary} size={24} />;
    }
  };

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <View key={`feature-item-${item.icon}-${index}`} style={styles.featureItem}>
          {getIcon(item.icon)}
          <Text style={styles.featureTitle}>{item.title}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: Colors.Colors.background.card,
    borderRadius: 16,
    marginHorizontal: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: Colors.Colors.border.muted,
  },
  featureItem: {
    alignItems: 'center',
    gap: 8,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.Colors.text.primary,
    textAlign: 'center',
  },
});
