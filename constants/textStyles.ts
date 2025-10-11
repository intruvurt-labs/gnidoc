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

export const cyanWithOutline: TextStyle = textWithOutline('#00FFFF', '#000000');
export const limeWithOutline: TextStyle = textWithOutline('#CCFF00', '#000000');
export const yellowLimeWithOutline: TextStyle = textWithOutline('#BFFF00', '#000000');
