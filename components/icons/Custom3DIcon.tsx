import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

export type IconType =  | 'eye'
  | 'settings'
  | 'cubes'
  | 'logo'
  | 'documents';

const ICON_SOURCES: Record<IconType, string> = {
  eye: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/p84vv1h6pnj7nhoyt6b8x',
  settings: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kjoglz1ae0g7ubmbewlq5',
  cubes: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kvgx0nb03vmefcjnszy1u',
  logo: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/jcc68ln3yhkys8ygmpkak',
  documents: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/y6et2704m0ivjae027ho7',
};

interface Custom3DIconProps {
  type: IconType;
  size?: number;
  style?: StyleProp<ImageStyle>;
  tintColor?: string;
}

export default function Custom3DIcon({
  type,
  size = 32,
  style,
  tintColor,
}: Custom3DIconProps) {
  return (
    <Image
      source={{ uri: ICON_SOURCES[type] }}
      style={[
        {
          width: size,
          height: size,
          resizeMode: 'contain',
        },
        tintColor && { tintColor },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${type} icon`}
    />
  );
}
