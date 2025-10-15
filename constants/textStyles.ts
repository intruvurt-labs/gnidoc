import { TextStyle } from 'react-native';

export const textWithOutline = (color: string, outlineColor: string = '#000000'): TextStyle => ({
  color,
  textShadowColor: outlineColor,
  textShadowOffset: { width: -1, height: -1 },
  textShadowRadius: 1,
});

export const textWithStrongOutline = (color: string, outlineColor: string = '#000000'): TextStyle => ({
  color,
  textShadowColor: outlineColor,
  textShadowOffset: { width: -2, height: -2 },
  textShadowRadius: 2,
});

export const cyanWithOutline: TextStyle = textWithOutline('#00D9FF', '#0A0614');
export const purpleWithOutline: TextStyle = textWithOutline('#9D4EDD', '#0A0614');
export const magentaWithOutline: TextStyle = textWithOutline('#E933FF', '#0A0614');
