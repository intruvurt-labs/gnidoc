import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Colors, { Shadows } from '@/constants/colors';

interface Card {
  title: string;
  style: 'lime_shadow' | 'magenta_red' | 'cyan_glow';
  route: string; // e.g. '/settings' or '(tabs)/home'
  testID?: string;
}

interface CardRowProps {
  cards: Card[];
}

const CardRow = ({ cards }: CardRowProps) => {
  const router = useRouter();

  const getCardStyle = useCallback(
    (style: Card['style']): ViewStyle => {
      switch (style) {
        case 'lime_shadow':
          return { backgroundColor: Colors.Colors.lime.primary, ...Shadows.glowLime } as ViewStyle;
        case 'magenta_red':
          return { backgroundColor: Colors.Colors.magenta.primary, ...Shadows.glowMagenta } as ViewStyle;
        case 'cyan_glow':
        default:
          return { backgroundColor: Colors.Colors.cyan.primary, ...Shadows.glowCyan } as ViewStyle;
      }
    },
    []
  );

  if (!cards?.length) return null;

  return (
    <View style={styles.container}>
      {cards.map((card) => {
        const style = getCardStyle(card.style);
        const key = `${card.route}-${card.title}`;

        return (
          <Pressable
            key={key}
            onPress={() => router.push(card.route as any)}
            style={({ pressed }) => [
              styles.card,
              style,
              pressed && styles.cardPressed,
            ]}
            android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false }}
            accessibilityRole="button"
            accessibilityLabel={card.title}
            testID={card.testID ?? `card-${card.title.replace(/\s+/g, '-').toLowerCase()}`}
            hitSlop={8}
          >
            <Text style={styles.cardTitle}>{card.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default memo(CardRow);

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
    ...Platform.select({
      web: { cursor: 'pointer' } as any,
      default: {},
    }),
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.Colors.text.inverse,
    textAlign: 'center',
  },
});
