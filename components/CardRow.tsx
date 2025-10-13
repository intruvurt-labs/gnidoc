import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Colors, { Shadows } from '@/constants/colors';

interface Card {
  title: string;
  style: 'lime_shadow' | 'magenta_red' | 'cyan_glow';
  route: string;
}

interface CardRowProps {
  cards: Card[];
}

export default function CardRow({ cards }: CardRowProps) {
  const router = useRouter();

  const getCardStyle = (style: Card['style']) => {
    switch (style) {
      case 'lime_shadow':
        return {
          backgroundColor: Colors.Colors.lime.primary,
          ...Shadows.glowLime,
        };
      case 'magenta_red':
        return {
          backgroundColor: Colors.Colors.magenta.primary,
          ...Shadows.glowMagenta,
        };
      case 'cyan_glow':
        return {
          backgroundColor: Colors.Colors.cyan.primary,
          ...Shadows.glowCyan,
        };
    }
  };

  return (
    <View style={styles.container}>
      {cards.map((card, index) => (
        <TouchableOpacity
          key={`card-${index}`}
          style={[styles.card, getCardStyle(card.style)]}
          onPress={() => router.push(card.route as any)}
        >
          <Text style={styles.cardTitle}>{card.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginVertical: 16,
  },
  card: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.Colors.text.inverse,
    textAlign: 'center',
  },
});
