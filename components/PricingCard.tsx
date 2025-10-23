import React, { memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ImageSourcePropType } from 'react-native';

export type Tier = {
  name: string;
  price: string;
  features: string[];
  iconSrc: ImageSourcePropType;
  isHighlighted?: boolean;
  buttonLabel: string;
  onPress: () => void;
};

function PricingCardBase({ tier }: { tier: Tier }) {
  console.log('[PricingCard] render', tier.name);
  return (
    <View style={[styles.card, tier.isHighlighted ? styles.highlight : undefined]} testID="pricing-card">
      <Image source={tier.iconSrc} style={styles.icon} resizeMode="contain" />
      <Text style={styles.title} testID="pricing-card-title">{tier.name}</Text>
      <Text style={styles.price} testID="pricing-card-price">{tier.price}</Text>
      <View style={styles.features}>
        {tier.features.map((f, i) => (
          <Text key={`${tier.name}-feature-${i}`} style={styles.feature} testID={`pricing-card-feature-${i}`}>• {f}</Text>
        ))}
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.8}
        style={styles.button}
        onPress={tier.onPress}
        testID="pricing-card-cta"
      >
        <Text style={styles.buttonText}>{tier.buttonLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

export const PricingCard = memo(PricingCardBase);

const styles = StyleSheet.create({
  card: { backgroundColor: '#0B0B0C', padding: 20, borderRadius: 16, margin: 10, borderColor: 'rgba(255,255,255,0.06)', borderWidth: 1 },
  highlight: { borderColor: '#22C55E', borderWidth: 2 },
  icon: { width: 60, height: 60, marginBottom: 12, alignSelf: 'flex-start' },
  title: { fontSize: 22, color: '#FFFFFF', marginBottom: 6, fontWeight: '700' as const },
  price: { fontSize: 18, color: '#22C55E', marginBottom: 12, fontWeight: '600' as const },
  features: { marginBottom: 16 },
  feature: { color: '#C7C9D1', fontSize: 14, marginVertical: 2, lineHeight: 20 },
  button: { backgroundColor: '#22C55E', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#0B0B0C', fontSize: 16, fontWeight: '700' as const },
});
