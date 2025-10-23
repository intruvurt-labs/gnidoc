import React from 'react';
import { Platform } from 'react-native';
import PreviewClient from './_PreviewClient';

export default function PreviewScreen() {
  console.log('[PreviewScreen] render', { platform: Platform.OS });
  return <PreviewClient />;
}
