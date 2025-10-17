import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('[Sentry] DSN not configured. Error tracking disabled.');
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[Sentry] Skipping initialization in development mode');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: false,
    environment: process.env.NODE_ENV || 'production',
    release: Constants.expoConfig?.version || '1.0.0',
    dist: Platform.OS === 'ios' ? Constants.expoConfig?.ios?.buildNumber : Constants.expoConfig?.android?.versionCode?.toString(),
    
    tracesSampleRate: 0.2,
    
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    
    beforeSend(event: any, hint: any) {
      if (event.exception) {
        console.error('[Sentry] Capturing exception:', hint?.originalException);
      }
      return event;
    },
  });

  console.log('[Sentry] Initialized successfully');
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'development') {
    console.error('[Sentry] Exception (dev mode):', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, any>) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Sentry] Message (${level}, dev mode):`, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

export function clearUser() {
  Sentry.setUser(null);
}

export function addBreadcrumb(breadcrumb: {
  message: string;
  category?: string;
  level?: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}) {
  Sentry.addBreadcrumb(breadcrumb);
}

export { Sentry };
