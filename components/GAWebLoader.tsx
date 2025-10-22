import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useSettings } from '@/contexts/SettingsContext';

export default function GAWebLoader() {
  const { settings } = useSettings();
  const loadedRef = useRef<boolean>(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const GA_ID = process.env.EXPO_PUBLIC_GA_ID || process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID || '';
    if (!settings.analytics || !GA_ID) {
      if (loadedRef.current) {
        const existing = document.getElementById('gtag-js');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
        const inline = document.getElementById('gtag-inline');
        if (inline && inline.parentNode) inline.parentNode.removeChild(inline);
        loadedRef.current = false;
      }
      return;
    }

    if (loadedRef.current) return;

    const script = document.createElement('script');
    script.id = 'gtag-js';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

    const inline = document.createElement('script');
    inline.id = 'gtag-inline';
    inline.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);} 
      gtag('js', new Date());
      gtag('config', '${GA_ID}');
    `;

    document.head.appendChild(script);
    document.head.appendChild(inline);
    loadedRef.current = true;

    return () => {
      const existing = document.getElementById('gtag-js');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      const inline = document.getElementById('gtag-inline');
      if (inline && inline.parentNode) inline.parentNode.removeChild(inline);
      loadedRef.current = false;
    };
  }, [settings.analytics]);

  return null;
}
