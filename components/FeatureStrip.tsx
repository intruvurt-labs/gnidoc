import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { Zap, Shield, Box } from 'lucide-react-native';
import Colors from '@/constants/colors';

type IconName = 'bolt' | 'shield' | 'panel';

interface FeatureItem {
  icon: IconName;
  title: string;
  description?: string;
  onPress?: () => void;
  testID?: string;
}

interface FeatureStripProps {
  items: FeatureItem[];
  containerStyle?: StyleProp<ViewStyle>;
}

const ICONS: Record<IconName, JSX.Element> = {
  bolt: <Zap color={Colors.Colors.cyan.primary} size={24} />,
  shield: <Shield color={Colors.Colors.lime.primary} size={24} />,
  panel: <Box color={Colors.Colors.magenta.primary} size={24} />,
};

function FeatureStripComponent({ items, containerStyle }: FeatureStripProps) {
  const safeItems = useMemo(() => items ?? [], [items]);

  if (!safeItems.length) return null;

  return (
    <View style={[styles.container, containerStyle]}>
      {safeItems.map((item, i) => {
        const iconEl = ICONS[item.icon] ?? ICONS.bolt;
        const key = `${item.icon}-${item.title}-${i}`;
        const Wrapper = item.onPress ? TouchableOpacity : View;

        return (
          <Wrapper
            key={key}
            style={styles.featureItem}
            onPress={item.onPress}
            activeOpacity={item.onPress ? 0.85 : 1}
            accessibilityRole={item.onPress ? 'button' : 'text'}
            accessibilityLabel={item.title}
            testID={item.testID}
          >
            {iconEl}
            <Text style={styles.featureTitle}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.featureDescription}>{item.description}</Text>
            ) : null}
          </Wrapper>
        );
      })}
    </View>
  );
}

const FeatureStrip = memo(FeatureStripComponent);
export default FeatureStrip;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
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
    flex: 1,
    alignItems: 'center',
    gap: 8,
    minWidth: 90,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.Colors.text.primary,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 11,
    color: Colors.Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
